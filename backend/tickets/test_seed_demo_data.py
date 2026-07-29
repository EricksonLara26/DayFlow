"""Integration tests for the non-destructive academic seed command."""

from datetime import date
from io import StringIO

from django.core.files.storage import default_storage
from django.core.management import call_command
from django.test import TestCase, override_settings

from accounts.models import User
from catalogs.models import Category, Department, Role, RoleCode
from tickets.constants import TicketStatus
from tickets.models import (
    Ticket,
    TicketAttachment,
    TicketComment,
    TicketHistory,
    TicketHistoryChange,
)


class SeedDemoDataCommandTests(TestCase):
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
    def test_command_is_idempotent_and_preserves_existing_rows(self):
        employee_role = Role.objects.get(code=RoleCode.EMPLOYEE)
        operations = Department.objects.get(name="Operaciones")
        sentinel_user = User.objects.create_user(
            username="registro_preexistente",
            email="preexistente@example.test",
            password=None,
            first_name="Registro",
            last_name="Preexistente",
            role=employee_role,
            department=operations,
        )
        sentinel_ticket = Ticket.objects.create(
            title="Ticket preexistente que debe conservarse",
            description="Este registro comprueba el seed no destructivo.",
            category=Category.objects.get(name="Otro"),
            status=TicketStatus.OPEN,
            priority="LOW",
            requester=sentinel_user,
            requester_department=operations,
            due_date=None,
        )

        first_output = StringIO()
        call_command("seed_demo_data", stdout=first_output)
        counts_after_first_run = self._business_counts()

        second_output = StringIO()
        call_command("seed_demo_data", stdout=second_output)
        counts_after_second_run = self._business_counts()

        self.assertEqual(
            counts_after_second_run,
            counts_after_first_run,
        )
        self.assertNotIn("password", first_output.getvalue().lower())
        self.assertNotIn("password", second_output.getvalue().lower())
        self.assertTrue(
            all(
                default_storage.exists(path)
                for path in TicketAttachment.objects.values_list(
                    "storage_path",
                    flat=True,
                )
            )
        )

        self.assertTrue(
            User.objects.filter(pk=sentinel_user.pk).exists()
        )
        self.assertTrue(
            Ticket.objects.filter(pk=sentinel_ticket.pk).exists()
        )
        self.assertEqual(
            set(Role.objects.values_list("code", flat=True)),
            set(RoleCode.values),
        )

        demo_users = User.objects.filter(username__startswith="demo_")
        self.assertEqual(demo_users.count(), 15)
        self.assertTrue(
            all(not user.has_usable_password() for user in demo_users)
        )
        self.assertGreaterEqual(User.objects.count(), 15)

        demo_tickets = Ticket.objects.filter(
            title__startswith="[Demo académico "
        )
        self.assertEqual(demo_tickets.count(), 18)
        self.assertSetEqual(
            set(demo_tickets.values_list("status", flat=True)),
            set(TicketStatus.values),
        )
        self.assertSetEqual(
            set(
                demo_tickets.values_list(
                    "requester_department__name",
                    flat=True,
                )
            ),
            {
                "Tecnología",
                "Soporte Técnico",
                "Administración",
                "Operaciones",
                "Ventas",
            },
        )
        self.assertEqual(
            demo_tickets.exclude(
                assigned_technician=None
            ).values_list(
                "assigned_technician_id",
                flat=True,
            ).distinct().count(),
            5,
        )
        self.assertEqual(
            demo_tickets.values_list(
                "created_at__month",
                flat=True,
            ).distinct().count(),
            7,
        )
        self.assertTrue(
            demo_tickets.filter(
                status__in=(
                    TicketStatus.OPEN,
                    TicketStatus.IN_PROGRESS,
                    TicketStatus.ON_HOLD,
                ),
                due_date__lt=date(2026, 7, 28),
            ).exists()
        )
        self.assertSetEqual(
            set(
                demo_tickets.filter(
                    due_date__in=(
                        date(2026, 7, 29),
                        date(2026, 7, 30),
                        date(2026, 7, 31),
                    )
                ).values_list("due_date", flat=True)
            ),
            {
                date(2026, 7, 29),
                date(2026, 7, 30),
                date(2026, 7, 31),
            },
        )
        self.assertEqual(
            TicketComment.objects.filter(ticket__in=demo_tickets).count(),
            18,
        )
        self.assertEqual(
            TicketAttachment.objects.filter(
                ticket__in=demo_tickets
            ).count(),
            15,
        )
        self.assertGreaterEqual(
            TicketHistory.objects.filter(ticket__in=demo_tickets).count(),
            70,
        )
        self.assertGreaterEqual(
            TicketHistoryChange.objects.filter(
                history__ticket__in=demo_tickets
            ).count(),
            60,
        )

    @staticmethod
    def _business_counts():
        return {
            "users": User.objects.count(),
            "roles": Role.objects.count(),
            "departments": Department.objects.count(),
            "categories": Category.objects.count(),
            "tickets": Ticket.objects.count(),
            "comments": TicketComment.objects.count(),
            "history": TicketHistory.objects.count(),
            "changes": TicketHistoryChange.objects.count(),
            "attachments": TicketAttachment.objects.count(),
        }
