"""API tests for ticket scopes and audited workflow actions."""

from datetime import timedelta

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from catalogs.models import Category, Department, Role, RoleCode

from .constants import (
    TicketHistoryAction,
    TicketPriority,
    TicketStatus,
)
from .models import Ticket, TicketAttachment, TicketHistory
from .services import assign_ticket, change_ticket_status, create_ticket


IN_MEMORY_STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.InMemoryStorage",
    },
    "staticfiles": {
        "BACKEND": (
            "django.contrib.staticfiles.storage.StaticFilesStorage"
        ),
    },
}


class TicketAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.administrator_role = Role.objects.get(
            code=RoleCode.ADMINISTRATOR
        )
        cls.technician_role = Role.objects.get(code=RoleCode.TECHNICIAN)
        cls.employee_role = Role.objects.get(code=RoleCode.EMPLOYEE)
        cls.department = Department.objects.create(
            name="Tickets API Operaciones"
        )
        cls.technology = Department.objects.create(
            name="Tickets API Tecnología"
        )
        cls.category = Category.objects.create(
            name="Tickets API Hardware"
        )
        cls.administrator = User.objects.create_superuser(
            username="tickets-api-admin",
            email="tickets-api-admin@example.com",
            password="TicketsAdministrator!937",
            first_name="Admin",
            last_name="Tickets",
            department=cls.technology,
        )
        cls.technician = User.objects.create_user(
            username="tickets-api-technician",
            email="tickets-api-technician@example.com",
            password="TicketsTechnician!937",
            first_name="Tania",
            last_name="Técnica",
            department=cls.technology,
            role=cls.technician_role,
            must_change_password=False,
        )
        cls.other_technician = User.objects.create_user(
            username="tickets-api-other-technician",
            email="tickets-api-other-technician@example.com",
            password="TicketsOtherTechnician!937",
            first_name="Tomás",
            last_name="Técnico",
            department=cls.technology,
            role=cls.technician_role,
            must_change_password=False,
        )
        cls.employee = User.objects.create_user(
            username="tickets-api-employee",
            email="tickets-api-employee@example.com",
            password="TicketsEmployee!937",
            first_name="Elena",
            last_name="Empleada",
            department=cls.department,
            role=cls.employee_role,
            must_change_password=False,
        )
        cls.other_employee = User.objects.create_user(
            username="tickets-api-other-employee",
            email="tickets-api-other-employee@example.com",
            password="TicketsOtherEmployee!937",
            first_name="Ernesto",
            last_name="Empleado",
            department=cls.department,
            role=cls.employee_role,
            must_change_password=False,
        )

    def setUp(self):
        cache.clear()
        self.client.force_authenticate(self.employee)

    def authenticate(self, user):
        self.client.force_authenticate(user)

    def make_ticket(self, requester=None, **overrides):
        arguments = {
            "requester": requester or self.employee,
            "category": self.category,
            "title": "Equipo sin conexión",
            "description": "El equipo no puede conectarse a la red.",
            "priority": TicketPriority.HIGH,
        }
        arguments.update(overrides)
        return create_ticket(**arguments)

    def test_employee_only_lists_and_retrieves_own_tickets(self):
        own = self.make_ticket()
        other = self.make_ticket(
            requester=self.other_employee,
            title="Ticket de otro empleado",
        )

        response = self.client.get(reverse("tickets_api:ticket-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [item["id"] for item in response.data["results"]],
            [own.pk],
        )

        hidden = self.client.get(
            reverse("tickets_api:ticket-detail", args=(other.pk,))
        )
        self.assertEqual(hidden.status_code, status.HTTP_404_NOT_FOUND)

    def test_administrator_sees_all_tickets(self):
        self.make_ticket()
        self.make_ticket(
            requester=self.other_employee,
            title="Segundo ticket",
        )
        self.authenticate(self.administrator)

        response = self.client.get(reverse("tickets_api:ticket-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_technician_scopes_match_available_mine_and_history_views(self):
        available = self.make_ticket(title="Disponible")
        mine = self.make_ticket(title="Asignado al técnico")
        assign_ticket(
            ticket=mine,
            technician=self.technician,
            actor=self.administrator,
        )
        history = self.make_ticket(title="Histórico del técnico")
        assign_ticket(
            ticket=history,
            technician=self.technician,
            actor=self.administrator,
        )
        change_ticket_status(
            ticket=history,
            status=TicketStatus.COMPLETED,
            actor=self.technician,
        )
        other = self.make_ticket(title="Asignado a otro técnico")
        assign_ticket(
            ticket=other,
            technician=self.other_technician,
            actor=self.administrator,
        )
        self.authenticate(self.technician)

        expected = {
            "available": {available.pk},
            "mine": {mine.pk},
            "history": {history.pk},
            "all": {available.pk, mine.pk, history.pk, other.pk},
        }
        for scope, expected_ids in expected.items():
            with self.subTest(scope=scope):
                response = self.client.get(
                    reverse("tickets_api:ticket-list"),
                    {"scope": scope, "page_size": 100},
                )
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertSetEqual(
                    {item["id"] for item in response.data["results"]},
                    expected_ids,
                )

    def test_list_filters_query_status_priority_dates_and_due_soon(self):
        due_ticket = self.make_ticket(
            title="Impresora crítica tercer piso",
            priority=TicketPriority.CRITICAL,
            due_date=timezone.localdate() + timedelta(days=2),
        )
        self.make_ticket(
            title="No debe coincidir",
            priority=TicketPriority.LOW,
            due_date=timezone.localdate() + timedelta(days=6),
        )

        response = self.client.get(
            reverse("tickets_api:ticket-list"),
            {
                "query": "impresora tercer",
                "status": TicketStatus.OPEN,
                "priority": TicketPriority.CRITICAL,
                "created_from": timezone.localdate().isoformat(),
                "created_to": timezone.localdate().isoformat(),
                "due_soon": "true",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], due_ticket.pk)

    def test_invalid_filter_dates_return_consistent_field_errors(self):
        response = self.client.get(
            reverse("tickets_api:ticket-list"),
            {
                "created_from": "2026-12-31",
                "created_to": "2026-01-01",
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("created_to", response.data["fields"])

    def test_only_employee_creates_ticket_and_department_is_snapshotted(self):
        payload = {
            "title": "Nueva solicitud API",
            "description": "Descripción suficiente para la solicitud.",
            "category": self.category.pk,
            "priority": TicketPriority.MEDIUM,
            "due_date": (timezone.localdate() + timedelta(days=1)).isoformat(),
        }
        response = self.client.post(
            reverse("tickets_api:ticket-list"),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        ticket = Ticket.objects.get(pk=response.data["id"])
        self.assertEqual(ticket.requester, self.employee)
        self.assertEqual(
            ticket.requester_department,
            self.employee.department,
        )
        self.assertTrue(
            ticket.history_entries.filter(
                action_code=TicketHistoryAction.CREATED
            ).exists()
        )

        for forbidden_actor in (self.technician, self.administrator):
            with self.subTest(actor=forbidden_actor.username):
                self.authenticate(forbidden_actor)
                forbidden = self.client.post(
                    reverse("tickets_api:ticket-list"),
                    payload,
                    format="json",
                )
                self.assertEqual(
                    forbidden.status_code,
                    status.HTTP_403_FORBIDDEN,
                )

    def test_due_date_before_creation_is_rejected(self):
        response = self.client.post(
            reverse("tickets_api:ticket-list"),
            {
                "title": "Fecha inválida",
                "description": "No debe crear este ticket.",
                "category": self.category.pk,
                "priority": TicketPriority.MEDIUM,
                "due_date": (
                    timezone.localdate() - timedelta(days=1)
                ).isoformat(),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("due_date", response.data["fields"])

    def test_take_is_atomic_in_service_and_second_technician_gets_conflict(self):
        ticket = self.make_ticket()
        self.authenticate(self.technician)
        first = self.client.post(
            reverse("tickets_api:ticket-take", args=(ticket.pk,)),
            {},
            format="json",
        )
        self.assertEqual(first.status_code, status.HTTP_200_OK)

        self.authenticate(self.other_technician)
        second = self.client.post(
            reverse("tickets_api:ticket-take", args=(ticket.pk,)),
            {},
            format="json",
        )

        self.assertEqual(second.status_code, status.HTTP_409_CONFLICT)
        ticket.refresh_from_db()
        self.assertEqual(ticket.assigned_technician, self.technician)
        self.assertEqual(
            ticket.history_entries.filter(
                action_code=TicketHistoryAction.TAKEN
            ).count(),
            1,
        )

    def test_administrator_assigns_active_technician_with_history(self):
        ticket = self.make_ticket()
        self.authenticate(self.administrator)

        response = self.client.post(
            reverse("tickets_api:ticket-assign", args=(ticket.pk,)),
            {"assigned_technician": self.technician.pk},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ticket.refresh_from_db()
        self.assertEqual(ticket.assigned_technician, self.technician)
        self.assertEqual(ticket.status, TicketStatus.IN_PROGRESS)
        history = ticket.history_entries.get(
            action_code=TicketHistoryAction.ASSIGNED
        )
        self.assertEqual(history.actor, self.administrator)

        self.authenticate(self.technician)
        forbidden = self.client.post(
            reverse("tickets_api:ticket-assign", args=(ticket.pk,)),
            {"assigned_technician": self.other_technician.pk},
            format="json",
        )
        self.assertEqual(
            forbidden.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_status_completed_and_dismissed_close_but_on_hold_does_not(self):
        scenarios = (
            (TicketStatus.COMPLETED, True),
            (TicketStatus.DISMISSED, True),
            (TicketStatus.ON_HOLD, False),
        )
        self.authenticate(self.technician)

        for next_status, should_close in scenarios:
            with self.subTest(status=next_status):
                ticket = self.make_ticket(title=f"Estado {next_status}")
                assign_ticket(
                    ticket=ticket,
                    technician=self.technician,
                    actor=self.administrator,
                )
                response = self.client.post(
                    reverse(
                        "tickets_api:ticket-status",
                        args=(ticket.pk,),
                    ),
                    {"status": next_status},
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                ticket.refresh_from_db()
                self.assertEqual(ticket.status, next_status)
                self.assertEqual(
                    ticket.closed_at is not None,
                    should_close,
                )
                self.assertTrue(
                    ticket.history_entries.filter(
                        action_code=(
                            TicketHistoryAction.STATUS_CHANGED
                        )
                    ).exists()
                )

    def test_technician_cannot_change_ticket_assigned_to_another(self):
        ticket = self.make_ticket()
        assign_ticket(
            ticket=ticket,
            technician=self.other_technician,
            actor=self.administrator,
        )
        self.authenticate(self.technician)

        response = self.client.post(
            reverse("tickets_api:ticket-status", args=(ticket.pk,)),
            {"status": TicketStatus.ON_HOLD},
            format="json",
        )
        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_visible_user_adds_comment_and_history(self):
        ticket = self.make_ticket()
        response = self.client.post(
            reverse("tickets_api:ticket-comments", args=(ticket.pk,)),
            {"message": "  Información adicional del empleado.  "},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response.data["message"],
            "Información adicional del empleado.",
        )
        self.assertEqual(response.data["author"], self.employee.pk)
        self.assertTrue(
            ticket.history_entries.filter(
                action_code=TicketHistoryAction.COMMENT_ADDED
            ).exists()
        )

    @override_settings(STORAGES=IN_MEMORY_STORAGES)
    def test_attachment_validates_type_uploads_and_downloads(self):
        ticket = self.make_ticket()
        uploaded = self.client.post(
            reverse("tickets_api:ticket-attachments", args=(ticket.pk,)),
            {
                "file": SimpleUploadedFile(
                    "evidence.txt",
                    b"dayflow evidence",
                    content_type="text/plain",
                ),
                "description": "Evidencia",
            },
            format="multipart",
        )

        self.assertEqual(uploaded.status_code, status.HTTP_201_CREATED)
        self.assertNotIn("storage_path", uploaded.data)
        attachment = TicketAttachment.objects.get(pk=uploaded.data["id"])
        self.assertTrue(
            ticket.history_entries.filter(
                action_code=TicketHistoryAction.ATTACHMENT_ADDED
            ).exists()
        )

        downloaded = self.client.get(
            reverse(
                "tickets_api:ticket-attachment-download",
                args=(ticket.pk, attachment.pk),
            )
        )
        self.assertEqual(downloaded.status_code, status.HTTP_200_OK)
        self.assertIn(
            "evidence.txt",
            downloaded["Content-Disposition"],
        )
        self.assertEqual(
            b"".join(downloaded.streaming_content),
            b"dayflow evidence",
        )

        invalid = self.client.post(
            reverse("tickets_api:ticket-attachments", args=(ticket.pk,)),
            {
                "file": SimpleUploadedFile(
                    "malware.exe",
                    b"MZ",
                    content_type="application/octet-stream",
                )
            },
            format="multipart",
        )
        self.assertEqual(
            invalid.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("file", invalid.data["fields"])

        spoofed = self.client.post(
            reverse("tickets_api:ticket-attachments", args=(ticket.pk,)),
            {
                "file": SimpleUploadedFile(
                    "fake.pdf",
                    b"this is not a PDF",
                    content_type="application/pdf",
                )
            },
            format="multipart",
        )
        self.assertEqual(
            spoofed.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("file", spoofed.data["fields"])

    @override_settings(
        STORAGES=IN_MEMORY_STORAGES,
        TICKET_ATTACHMENT_MAX_BYTES=4,
    )
    def test_attachment_rejects_files_over_configured_size(self):
        ticket = self.make_ticket()
        response = self.client.post(
            reverse("tickets_api:ticket-attachments", args=(ticket.pk,)),
            {
                "file": SimpleUploadedFile(
                    "large.txt",
                    b"12345",
                    content_type="text/plain",
                )
            },
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("file", response.data["fields"])

    def test_history_endpoint_includes_internal_change_rows_read_only(self):
        ticket = self.make_ticket()
        assign_ticket(
            ticket=ticket,
            technician=self.technician,
            actor=self.administrator,
        )
        self.authenticate(self.technician)
        self.client.post(
            reverse("tickets_api:ticket-status", args=(ticket.pk,)),
            {"status": TicketStatus.COMPLETED},
            format="json",
        )

        response = self.client.get(
            reverse("tickets_api:ticket-history", args=(ticket.pk,)),
            {"page_size": 100},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        actions = {
            item["action_code"]: item
            for item in response.data["results"]
        }
        self.assertIn(TicketHistoryAction.CREATED, actions)
        self.assertIn(TicketHistoryAction.ASSIGNED, actions)
        status_history = actions[TicketHistoryAction.STATUS_CHANGED]
        self.assertTrue(
            any(
                change["field_code"] == "status"
                for change in status_history["changes"]
            )
        )

    def test_ticket_delete_route_is_not_available(self):
        ticket = self.make_ticket()
        response = self.client.delete(
            reverse("tickets_api:ticket-detail", args=(ticket.pk,))
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )
        self.assertTrue(Ticket.objects.filter(pk=ticket.pk).exists())

    def test_required_password_change_blocks_ticket_api(self):
        self.employee.must_change_password = True
        self.employee.save(update_fields=("must_change_password",))

        response = self.client.get(reverse("tickets_api:ticket-list"))

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )
