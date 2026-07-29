"""Tests for the DayFlow ticket domain and its business services."""

from datetime import timedelta

from django.contrib import admin
from django.core.exceptions import FieldDoesNotExist, ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError, models, transaction
from django.db.models.deletion import ProtectedError
from django.test import TestCase, override_settings
from django.utils import timezone

from accounts.models import User
from catalogs.models import Category, Department, Role, RoleCode

from .constants import (
    TicketEventType,
    TicketHistoryAction,
    TicketPriority,
    TicketStatus,
)
from .models import (
    Ticket,
    TicketAttachment,
    TicketComment,
    TicketHistory,
    TicketHistoryChange,
)
from .services import (
    TicketBusinessRuleError,
    add_ticket_attachment,
    add_ticket_comment,
    change_ticket_priority,
    change_ticket_status,
    create_ticket,
    take_ticket,
)


class TicketTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.employee_role = Role.objects.get(code=RoleCode.EMPLOYEE)
        cls.technician_role = Role.objects.get(code=RoleCode.TECHNICIAN)
        cls.department = Department.objects.create(name="Operations")
        cls.other_department = Department.objects.create(name="Technology")
        cls.category = Category.objects.create(name="Equipment")
        cls.inactive_category = Category.objects.create(
            name="Inactive category",
            active=False,
        )
        cls.requester = User.objects.create_user(
            username="requester",
            email="requester@example.com",
            password="test-password",
            first_name="Rita",
            last_name="Requester",
            position="Analyst",
            department=cls.department,
            role=cls.employee_role,
        )
        cls.technician = User.objects.create_user(
            username="technician",
            email="technician@example.com",
            password="test-password",
            first_name="Tania",
            last_name="Technician",
            position="Support",
            department=cls.other_department,
            role=cls.technician_role,
        )
        cls.inactive_technician = User.objects.create_user(
            username="inactive-technician",
            email="inactive-technician@example.com",
            password="test-password",
            first_name="Ian",
            last_name="Inactive",
            position="Support",
            department=cls.other_department,
            role=cls.technician_role,
            active=False,
        )

    def create_ticket(self, **overrides):
        arguments = {
            "requester": self.requester,
            "category": self.category,
            "title": "Laptop will not start",
            "description": "The power button does not produce a response.",
            "priority": TicketPriority.HIGH,
        }
        arguments.update(overrides)
        return create_ticket(**arguments)


class TicketModelTests(TicketTestCase):
    def test_physical_table_names_match_the_approved_dbml(self):
        expected_tables = {
            Ticket: "tickets",
            TicketComment: "ticket_comments",
            TicketHistory: "ticket_history",
            TicketHistoryChange: "ticket_history_changes",
            TicketAttachment: "ticket_attachments",
        }

        for model_class, table_name in expected_tables.items():
            with self.subTest(model=model_class.__name__):
                self.assertEqual(model_class._meta.db_table, table_name)

    def test_ticket_fields_and_related_names_are_explicit(self):
        expected_related_names = {
            "category": "tickets",
            "requester": "requested_tickets",
            "assigned_technician": "assigned_tickets",
            "requester_department": "requested_ticket_snapshots",
        }

        self.assertFalse(Ticket._meta.get_field("requester").null)
        self.assertTrue(Ticket._meta.get_field("assigned_technician").null)
        self.assertTrue(Ticket._meta.get_field("due_date").null)
        self.assertTrue(Ticket._meta.get_field("taken_at").null)
        self.assertTrue(Ticket._meta.get_field("closed_at").null)

        for field_name, related_name in expected_related_names.items():
            with self.subTest(field=field_name):
                field = Ticket._meta.get_field(field_name)
                self.assertEqual(field.remote_field.related_name, related_name)
                self.assertIs(field.remote_field.on_delete, models.PROTECT)

    def test_dependent_rows_have_clear_ticket_related_names(self):
        expected_related_names = {
            TicketComment: "comments",
            TicketHistory: "history_entries",
            TicketAttachment: "attachments",
        }

        for model_class, related_name in expected_related_names.items():
            with self.subTest(model=model_class.__name__):
                ticket_field = model_class._meta.get_field("ticket")
                self.assertEqual(
                    ticket_field.remote_field.related_name,
                    related_name,
                )
                self.assertIs(
                    ticket_field.remote_field.on_delete,
                    models.PROTECT,
                )

        history_field = TicketHistoryChange._meta.get_field("history")
        self.assertEqual(history_field.remote_field.related_name, "changes")
        self.assertIs(history_field.remote_field.on_delete, models.PROTECT)

    def test_no_denormalized_user_name_columns_exist(self):
        model_classes = (
            Ticket,
            TicketComment,
            TicketHistory,
            TicketHistoryChange,
            TicketAttachment,
        )

        for model_class in model_classes:
            for field_name in (
                "created_by_name",
                "assigned_to_name",
                "author_name",
            ):
                with self.subTest(
                    model=model_class.__name__,
                    field=field_name,
                ):
                    with self.assertRaises(FieldDoesNotExist):
                        model_class._meta.get_field(field_name)

    def test_ticket_indexes_cover_query_dimensions_and_dates(self):
        index_tuples = {
            tuple(index.fields)
            for index in Ticket._meta.indexes
        }
        index_fields = {
            field_name
            for index in Ticket._meta.indexes
            for field_name in index.fields
        }

        self.assertTrue(
            {
                "status",
                "priority",
                "requester",
                "assigned_technician",
                "category",
                "requester_department",
                "created_at",
                "updated_at",
                "taken_at",
                "closed_at",
                "due_date",
            }.issubset(index_fields)
        )
        for date_field in (
            "created_at",
            "updated_at",
            "taken_at",
            "closed_at",
        ):
            with self.subTest(date_field=date_field):
                self.assertIn((date_field,), index_tuples)

    def test_database_rejects_unknown_status_and_priority(self):
        ticket = self.create_ticket()

        for field_name, invalid_value in (
            ("status", "UNKNOWN"),
            ("priority", "URGENT"),
        ):
            with self.subTest(field=field_name):
                with self.assertRaises(IntegrityError):
                    with transaction.atomic():
                        Ticket.objects.filter(pk=ticket.pk).update(
                            **{field_name: invalid_value}
                        )

    def test_due_date_cannot_precede_created_at_in_django_or_database(self):
        ticket = self.create_ticket()
        invalid_due_date = timezone.localdate() - timedelta(days=1)
        ticket.due_date = invalid_due_date

        with self.assertRaises(ValidationError):
            ticket.full_clean()

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Ticket.objects.filter(pk=ticket.pk).update(
                    due_date=invalid_due_date
                )

    def test_history_change_field_is_unique_per_history_entry(self):
        ticket = self.create_ticket()
        history = ticket.history_entries.get(
            action_code=TicketHistoryAction.CREATED
        )
        TicketHistoryChange.objects.create(
            history=history,
            field_code="status",
            old_value=TicketStatus.OPEN,
            new_value=TicketStatus.IN_PROGRESS,
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                TicketHistoryChange.objects.create(
                    history=history,
                    field_code="status",
                    old_value=TicketStatus.IN_PROGRESS,
                    new_value=TicketStatus.ON_HOLD,
                )

    def test_protect_preserves_ticket_history(self):
        ticket = self.create_ticket()

        with self.assertRaises(ProtectedError):
            ticket.delete()

        self.assertTrue(Ticket.objects.filter(pk=ticket.pk).exists())
        self.assertTrue(
            TicketHistory.objects.filter(ticket=ticket).exists()
        )


class TicketServiceTests(TicketTestCase):
    def test_create_ticket_snapshots_requester_department(self):
        ticket = self.create_ticket(due_date=None)

        self.requester.department = self.other_department
        self.requester.save(update_fields=("department", "updated_at"))
        ticket.refresh_from_db()

        self.assertEqual(ticket.status, TicketStatus.OPEN)
        self.assertEqual(ticket.requester_department, self.department)
        self.assertIsNone(ticket.assigned_technician)
        self.assertIsNone(ticket.due_date)
        history = ticket.history_entries.get()
        self.assertEqual(history.action_code, TicketHistoryAction.CREATED)
        self.assertEqual(history.actor, self.requester)

    def test_create_ticket_requires_active_requester_with_department(self):
        self.requester.active = False
        self.requester.save(update_fields=("active", "updated_at"))

        with self.assertRaisesMessage(
            TicketBusinessRuleError,
            "requester must be active",
        ):
            self.create_ticket()

    def test_create_ticket_requires_active_category(self):
        with self.assertRaisesMessage(
            TicketBusinessRuleError,
            "category must be active",
        ):
            self.create_ticket(category=self.inactive_category)

    def test_create_ticket_rejects_past_due_date(self):
        with self.assertRaisesMessage(
            TicketBusinessRuleError,
            "due_date cannot be in the past",
        ):
            self.create_ticket(
                due_date=timezone.localdate() - timedelta(days=1)
            )

    def test_take_ticket_assigns_only_an_active_technician(self):
        ticket = self.create_ticket()

        taken_ticket = take_ticket(
            ticket=ticket,
            technician=self.technician,
        )

        self.assertEqual(
            taken_ticket.assigned_technician,
            self.technician,
        )
        self.assertEqual(taken_ticket.status, TicketStatus.IN_PROGRESS)
        self.assertIsNotNone(taken_ticket.taken_at)
        history = taken_ticket.history_entries.get(
            action_code=TicketHistoryAction.TAKEN
        )
        self.assertEqual(history.actor, self.technician)
        self.assertSetEqual(
            set(history.changes.values_list("field_code", flat=True)),
            {"assigned_technician_id", "status", "taken_at"},
        )

    def test_take_ticket_rejects_inactive_or_non_technician_user(self):
        for invalid_technician in (
            self.inactive_technician,
            self.requester,
        ):
            with self.subTest(username=invalid_technician.username):
                ticket = self.create_ticket(
                    title=f"Ticket for {invalid_technician.username}"
                )
                with self.assertRaises(TicketBusinessRuleError):
                    take_ticket(
                        ticket=ticket,
                        technician=invalid_technician,
                    )
                ticket.refresh_from_db()
                self.assertIsNone(ticket.assigned_technician)
                self.assertEqual(ticket.status, TicketStatus.OPEN)

    def test_status_change_sets_closed_at_and_records_values(self):
        ticket = self.create_ticket()

        closed_ticket = change_ticket_status(
            ticket=ticket,
            status=TicketStatus.COMPLETED,
            actor=self.technician,
        )

        self.assertEqual(closed_ticket.status, TicketStatus.COMPLETED)
        self.assertIsNotNone(closed_ticket.closed_at)
        history = closed_ticket.history_entries.get(
            action_code=TicketHistoryAction.STATUS_CHANGED
        )
        status_change = history.changes.get(field_code="status")
        self.assertEqual(status_change.old_value, TicketStatus.OPEN)
        self.assertEqual(status_change.new_value, TicketStatus.COMPLETED)
        self.assertTrue(
            history.changes.filter(field_code="closed_at").exists()
        )

    def test_priority_change_records_old_and_new_values(self):
        ticket = self.create_ticket(priority=TicketPriority.LOW)

        changed_ticket = change_ticket_priority(
            ticket=ticket,
            priority=TicketPriority.CRITICAL,
            actor=self.technician,
        )

        self.assertEqual(changed_ticket.priority, TicketPriority.CRITICAL)
        change = changed_ticket.history_entries.get(
            action_code=TicketHistoryAction.PRIORITY_CHANGED
        ).changes.get(field_code="priority")
        self.assertEqual(change.old_value, TicketPriority.LOW)
        self.assertEqual(change.new_value, TicketPriority.CRITICAL)

    def test_comment_snapshots_author_role_and_creates_history(self):
        ticket = self.create_ticket()

        comment = add_ticket_comment(
            ticket=ticket,
            author=self.requester,
            message="  Please call before visiting.  ",
        )
        self.requester.role = self.technician_role
        self.requester.save(update_fields=("role", "updated_at"))
        comment.refresh_from_db()

        self.assertEqual(comment.message, "Please call before visiting.")
        self.assertEqual(comment.author_role, self.employee_role)
        self.assertEqual(ticket.comments.get(), comment)
        self.assertTrue(
            ticket.history_entries.filter(
                action_code=TicketHistoryAction.COMMENT_ADDED,
                actor=self.requester,
            ).exists()
        )

    @override_settings(
        STORAGES={
            "default": {
                "BACKEND": "django.core.files.storage.InMemoryStorage",
            },
            "staticfiles": {
                "BACKEND": (
                    "django.contrib.staticfiles.storage.StaticFilesStorage"
                ),
            },
        }
    )
    def test_attachment_stores_metadata_and_creates_history(self):
        ticket = self.create_ticket()
        uploaded_file = SimpleUploadedFile(
            "evidence.txt",
            b"dayflow attachment",
            content_type="text/plain",
        )

        attachment = add_ticket_attachment(
            ticket=ticket,
            uploaded_by=self.requester,
            uploaded_file=uploaded_file,
            description="  Startup log  ",
        )

        self.assertEqual(attachment.file_name, "evidence.txt")
        self.assertEqual(attachment.mime_type, "text/plain")
        self.assertEqual(
            attachment.size_bytes,
            len(b"dayflow attachment"),
        )
        self.assertEqual(attachment.description, "Startup log")
        self.assertTrue(
            attachment.storage_path.storage.exists(
                attachment.storage_path.name
            )
        )
        self.assertEqual(ticket.attachments.get(), attachment)

        self.assertTrue(
            ticket.history_entries.filter(
                action_code=TicketHistoryAction.ATTACHMENT_ADDED,
                actor=self.requester,
            ).exists()
        )

    def test_history_exposes_derived_event_type_and_action_label(self):
        ticket = self.create_ticket()
        history = ticket.history_entries.get()

        self.assertEqual(history.event_type, TicketEventType.TICKET)
        self.assertEqual(history.action, "Ticket creado")


class TicketAdminTests(TestCase):
    def test_all_ticket_models_are_registered(self):
        for model_class in (
            Ticket,
            TicketComment,
            TicketHistory,
            TicketHistoryChange,
            TicketAttachment,
        ):
            with self.subTest(model=model_class.__name__):
                self.assertIn(model_class, admin.site._registry)

    def test_admin_is_read_only_to_preserve_service_invariants(self):
        for model_class in (
            Ticket,
            TicketComment,
            TicketHistory,
            TicketHistoryChange,
            TicketAttachment,
        ):
            model_admin = admin.site._registry[model_class]
            with self.subTest(model=model_class.__name__):
                self.assertFalse(
                    model_admin.has_add_permission(request=None)
                )
                self.assertFalse(
                    model_admin.has_change_permission(request=None)
                )
                self.assertFalse(
                    model_admin.has_delete_permission(request=None)
                )
