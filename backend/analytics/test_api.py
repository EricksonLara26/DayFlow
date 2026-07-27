"""Aggregation, role-scope, and query-efficiency tests for analytics."""

from datetime import datetime, timedelta, timezone as datetime_timezone

from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from catalogs.models import Category, Department, Role, RoleCode
from tickets.constants import (
    TicketHistoryAction,
    TicketPriority,
    TicketStatus,
)
from tickets.models import Ticket, TicketHistory, TicketHistoryChange
from tickets.services import create_ticket

from .selectors import (
    get_activity_history,
    get_annual_completed_tickets,
    get_technician_ranking,
)
from .serializers import (
    ActivityHistorySerializer,
    AnnualReportTicketSerializer,
)


class AnalyticsDataMixin:
    @classmethod
    def setUpTestData(cls):
        cls.administrator_role = Role.objects.get(
            code=RoleCode.ADMINISTRATOR
        )
        cls.technician_role = Role.objects.get(
            code=RoleCode.TECHNICIAN
        )
        cls.employee_role = Role.objects.get(code=RoleCode.EMPLOYEE)
        cls.technology = Department.objects.create(
            name="Analytics Technology"
        )
        cls.operations = Department.objects.create(
            name="Analytics Operations"
        )
        cls.hardware = Category.objects.create(
            name="Analytics Hardware"
        )
        cls.software = Category.objects.create(
            name="Analytics Software"
        )
        cls.administrator = User.objects.create_superuser(
            username="analytics-admin",
            email="analytics-admin@example.com",
            password="AnalyticsAdmin!937",
            first_name="Ada",
            last_name="Admin",
            department=cls.technology,
        )
        cls.technician = User.objects.create_user(
            username="analytics-technician",
            email="analytics-technician@example.com",
            password="AnalyticsTechnician!937",
            first_name="Tania",
            last_name="Tecnica",
            department=cls.technology,
            role=cls.technician_role,
            must_change_password=False,
        )
        cls.other_technician = User.objects.create_user(
            username="analytics-other-technician",
            email="analytics-other-technician@example.com",
            password="AnalyticsOtherTechnician!937",
            first_name="Omar",
            last_name="Tecnico",
            department=cls.technology,
            role=cls.technician_role,
            must_change_password=False,
        )
        cls.zero_technician = User.objects.create_user(
            username="analytics-zero-technician",
            email="analytics-zero-technician@example.com",
            password="AnalyticsZeroTechnician!937",
            first_name="Zoe",
            last_name="Sin Tickets",
            department=cls.technology,
            role=cls.technician_role,
            must_change_password=False,
        )
        cls.employee = User.objects.create_user(
            username="analytics-employee",
            email="analytics-employee@example.com",
            password="AnalyticsEmployee!937",
            first_name="Elena",
            last_name="Empleada",
            department=cls.operations,
            role=cls.employee_role,
            must_change_password=False,
        )
        cls.other_employee = User.objects.create_user(
            username="analytics-other-employee",
            email="analytics-other-employee@example.com",
            password="AnalyticsOtherEmployee!937",
            first_name="Ernesto",
            last_name="Empleado",
            department=cls.technology,
            role=cls.employee_role,
            must_change_password=False,
        )

    def make_ticket(
        self,
        *,
        requester=None,
        category=None,
        title=None,
        status_value=TicketStatus.OPEN,
        technician=None,
        created_at=None,
        closed_at=None,
        due_date=None,
        priority=TicketPriority.MEDIUM,
    ):
        ticket = create_ticket(
            requester=requester or self.employee,
            category=category or self.hardware,
            title=title or f"Analytics ticket {Ticket.objects.count() + 1}",
            description="Ticket used to verify derived analytics.",
            priority=priority,
        )
        created_at = created_at or timezone.now() - timedelta(hours=1)
        if status_value in (
            TicketStatus.COMPLETED,
            TicketStatus.DISMISSED,
        ):
            closed_at = closed_at or created_at + timedelta(hours=1)
        else:
            closed_at = None
        taken_at = None
        if technician is not None and status_value != TicketStatus.OPEN:
            taken_at = created_at + timedelta(minutes=5)

        Ticket.objects.filter(pk=ticket.pk).update(
            status=status_value,
            assigned_technician=technician,
            created_at=created_at,
            updated_at=closed_at or created_at,
            taken_at=taken_at,
            closed_at=closed_at,
            due_date=due_date,
        )
        TicketHistory.objects.filter(
            ticket=ticket,
            action_code=TicketHistoryAction.CREATED,
        ).update(created_at=created_at)
        ticket.refresh_from_db()
        return ticket


class AnalyticsAPITests(AnalyticsDataMixin, APITestCase):
    def setUp(self):
        cache.clear()
        self.client.force_authenticate(self.administrator)

    def authenticate(self, user):
        self.client.force_authenticate(user)

    def test_summary_uses_canonical_counts_and_role_scopes(self):
        today = timezone.localdate()
        available = self.make_ticket(
            due_date=today - timedelta(days=1),
        )
        self.make_ticket(
            status_value=TicketStatus.IN_PROGRESS,
            technician=self.technician,
        )
        self.make_ticket(
            status_value=TicketStatus.ON_HOLD,
            technician=self.technician,
        )
        self.make_ticket(
            status_value=TicketStatus.COMPLETED,
            technician=self.technician,
        )
        self.make_ticket(
            requester=self.other_employee,
            status_value=TicketStatus.DISMISSED,
            technician=self.other_technician,
        )
        self.make_ticket(
            requester=self.other_employee,
            status_value=TicketStatus.COMPLETED,
            technician=self.other_technician,
        )

        response = self.client.get(reverse("analytics:summary"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                "total_tickets": 6,
                "open_tickets": 1,
                "in_progress_tickets": 1,
                "on_hold_tickets": 1,
                "completed_tickets": 2,
                "dismissed_tickets": 1,
                "overdue_tickets": 1,
            },
        )

        self.authenticate(self.technician)
        response = self.client.get(reverse("analytics:summary"))
        self.assertEqual(response.data["total_tickets"], 4)
        self.assertEqual(response.data["dismissed_tickets"], 0)
        self.assertEqual(response.data["overdue_tickets"], 1)

        self.authenticate(self.employee)
        response = self.client.get(reverse("analytics:summary"))
        self.assertEqual(response.data["total_tickets"], 4)
        self.assertEqual(response.data["completed_tickets"], 1)
        self.assertEqual(
            available.requester_id,
            self.employee.pk,
        )

    def test_technician_ranking_includes_zero_and_average_minutes(self):
        origin = datetime(
            2025,
            1,
            10,
            8,
            tzinfo=datetime_timezone.utc,
        )
        self.make_ticket(
            status_value=TicketStatus.COMPLETED,
            technician=self.technician,
            created_at=origin,
            closed_at=origin + timedelta(minutes=60),
        )
        self.make_ticket(
            status_value=TicketStatus.COMPLETED,
            technician=self.technician,
            created_at=origin,
            closed_at=origin + timedelta(minutes=180),
        )
        self.make_ticket(
            requester=self.other_employee,
            status_value=TicketStatus.COMPLETED,
            technician=self.other_technician,
            created_at=origin,
            closed_at=origin + timedelta(minutes=30),
        )

        response = self.client.get(
            reverse("analytics:technician-ranking")
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rows = {
            row["technician_id"]: row for row in response.data
        }
        self.assertEqual(
            rows[self.technician.pk]["completed_tickets"],
            2,
        )
        self.assertEqual(
            rows[self.technician.pk]["average_resolution_time"],
            120,
        )
        self.assertEqual(
            rows[self.other_technician.pk][
                "average_resolution_time"
            ],
            30,
        )
        self.assertEqual(
            rows[self.zero_technician.pk]["completed_tickets"],
            0,
        )
        self.assertIsNone(
            rows[self.zero_technician.pk][
                "average_resolution_time"
            ]
        )

        self.authenticate(self.technician)
        response = self.client.get(
            reverse("analytics:technician-ranking")
        )
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["technician_id"],
            self.technician.pk,
        )

        self.authenticate(self.employee)
        response = self.client.get(
            reverse("analytics:technician-ranking")
        )
        self.assertEqual(
            [row["technician_id"] for row in response.data],
            [self.technician.pk],
        )

    def test_category_and_department_aggregations_exclude_dismissed(self):
        self.make_ticket(category=self.hardware)
        self.make_ticket(category=self.hardware)
        self.make_ticket(category=self.software)
        self.make_ticket(
            requester=self.other_employee,
            category=self.software,
        )
        self.make_ticket(
            requester=self.other_employee,
            category=self.hardware,
            status_value=TicketStatus.DISMISSED,
            technician=self.other_technician,
        )

        category_response = self.client.get(
            reverse("analytics:tickets-by-category")
        )
        self.assertEqual(category_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            {
                row["category_id"]: row["total"]
                for row in category_response.data
            },
            {
                self.hardware.pk: 2,
                self.software.pk: 2,
            },
        )

        department_response = self.client.get(
            reverse("analytics:demand-by-department")
        )
        self.assertEqual(
            {
                row["department_id"]: row["total"]
                for row in department_response.data
            },
            {
                self.operations.pk: 3,
                self.technology.pk: 1,
            },
        )

    def test_due_tickets_are_non_terminal_and_between_one_and_three_days(self):
        today = timezone.localdate()
        included_one = self.make_ticket(
            title="Due tomorrow",
            due_date=today + timedelta(days=1),
            priority=TicketPriority.CRITICAL,
        )
        included_three = self.make_ticket(
            title="Due in three days",
            due_date=today + timedelta(days=3),
        )
        self.make_ticket(
            title="Due today",
            due_date=today,
        )
        self.make_ticket(
            title="Due in four days",
            due_date=today + timedelta(days=4),
        )
        self.make_ticket(
            title="Terminal due soon",
            due_date=today + timedelta(days=2),
            status_value=TicketStatus.COMPLETED,
            technician=self.technician,
        )

        response = self.client.get(reverse("analytics:due-tickets"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [row["ticket_id"] for row in response.data],
            [included_one.pk, included_three.pk],
        )
        self.assertEqual(
            set(response.data[0]),
            {"ticket_id", "title", "due_date", "status", "priority"},
        )

    def test_historical_merges_creation_and_terminal_close_months(self):
        january = datetime(
            2025,
            1,
            5,
            10,
            tzinfo=datetime_timezone.utc,
        )
        february = datetime(
            2025,
            2,
            6,
            10,
            tzinfo=datetime_timezone.utc,
        )
        march = datetime(
            2025,
            3,
            7,
            10,
            tzinfo=datetime_timezone.utc,
        )
        self.make_ticket(
            created_at=january,
            status_value=TicketStatus.COMPLETED,
            technician=self.technician,
            closed_at=february,
        )
        self.make_ticket(created_at=january)
        self.make_ticket(
            created_at=february,
            status_value=TicketStatus.DISMISSED,
            technician=self.technician,
            closed_at=march,
        )

        response = self.client.get(reverse("analytics:historical"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            [
                {
                    "period": "2025-01",
                    "created": 2,
                    "completed": 0,
                    "dismissed": 0,
                },
                {
                    "period": "2025-02",
                    "created": 1,
                    "completed": 1,
                    "dismissed": 0,
                },
                {
                    "period": "2025-03",
                    "created": 0,
                    "completed": 0,
                    "dismissed": 1,
                },
            ],
        )

    def test_activity_history_is_paginated_scoped_and_has_changes(self):
        own_ticket = self.make_ticket(title="Own activity")
        other_ticket = self.make_ticket(
            requester=self.other_employee,
            title="Hidden activity",
        )
        history = TicketHistory.objects.create(
            ticket=own_ticket,
            actor=self.technician,
            action_code=TicketHistoryAction.STATUS_CHANGED,
        )
        TicketHistoryChange.objects.create(
            history=history,
            field_code="status",
            old_value=TicketStatus.OPEN,
            new_value=TicketStatus.IN_PROGRESS,
        )

        self.authenticate(self.employee)
        response = self.client.get(
            reverse("analytics:activity-history")
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)
        self.assertEqual(
            {
                row["ticket_id"] for row in response.data["results"]
            },
            {own_ticket.pk},
        )
        changed_row = next(
            row
            for row in response.data["results"]
            if row["id"] == history.pk
        )
        self.assertEqual(changed_row["event_type"], "STATUS")
        self.assertEqual(changed_row["changes"][0]["field_code"], "status")
        self.assertNotIn(
            other_ticket.pk,
            {
                row["ticket_id"]
                for row in response.data["results"]
            },
        )

    def test_annual_report_is_admin_only_and_filters_technician_year(self):
        start = datetime(
            2025,
            4,
            1,
            8,
            tzinfo=datetime_timezone.utc,
        )
        included = self.make_ticket(
            status_value=TicketStatus.COMPLETED,
            technician=self.technician,
            created_at=start,
            closed_at=start + timedelta(minutes=90),
        )
        self.make_ticket(
            status_value=TicketStatus.DISMISSED,
            technician=self.technician,
            created_at=start,
            closed_at=start + timedelta(minutes=30),
        )
        self.make_ticket(
            status_value=TicketStatus.COMPLETED,
            technician=self.other_technician,
            created_at=start,
            closed_at=start + timedelta(minutes=45),
        )
        next_year = datetime(
            2026,
            1,
            2,
            8,
            tzinfo=datetime_timezone.utc,
        )
        self.make_ticket(
            status_value=TicketStatus.COMPLETED,
            technician=self.technician,
            created_at=next_year,
            closed_at=next_year + timedelta(minutes=60),
        )

        response = self.client.get(
            reverse("analytics:annual-technician-report"),
            {"technician_id": self.technician.pk, "year": 2025},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_tickets"], 1)
        self.assertEqual(
            response.data["tickets"][0]["ticket_id"],
            included.pk,
        )
        self.assertEqual(
            response.data["tickets"][0]["resolution_time_minutes"],
            90,
        )

        self.authenticate(self.technician)
        forbidden = self.client.get(
            reverse("analytics:annual-technician-report"),
            {"technician_id": self.technician.pk, "year": 2025},
        )
        self.assertEqual(
            forbidden.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_authentication_and_password_change_gate_apply(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(reverse("analytics:summary"))
        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

        self.employee.must_change_password = True
        self.employee.save(update_fields=("must_change_password",))
        self.authenticate(self.employee)
        response = self.client.get(reverse("analytics:summary"))
        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )


class AnalyticsQueryEfficiencyTests(AnalyticsDataMixin, TestCase):
    def test_ranking_executes_one_aggregation_query(self):
        self.make_ticket(
            status_value=TicketStatus.COMPLETED,
            technician=self.technician,
        )
        _ = self.administrator.role
        with self.assertNumQueries(1):
            rows = get_technician_ranking(self.administrator)
        self.assertGreaterEqual(len(rows), 3)

    def test_activity_serializer_uses_select_and_prefetch(self):
        ticket = self.make_ticket()
        history = TicketHistory.objects.create(
            ticket=ticket,
            actor=self.technician,
            action_code=TicketHistoryAction.STATUS_CHANGED,
        )
        TicketHistoryChange.objects.create(
            history=history,
            field_code="status",
            old_value=TicketStatus.OPEN,
            new_value=TicketStatus.IN_PROGRESS,
        )
        _ = self.administrator.role
        queryset = get_activity_history(self.administrator)
        with self.assertNumQueries(2):
            data = ActivityHistorySerializer(
                queryset,
                many=True,
            ).data
        self.assertEqual(len(data), 2)

    def test_annual_report_serializer_has_no_n_plus_one(self):
        self.make_ticket(
            status_value=TicketStatus.COMPLETED,
            technician=self.technician,
        )
        queryset = get_annual_completed_tickets(
            technician=self.technician,
            year=timezone.localdate().year,
        )
        with self.assertNumQueries(1):
            data = AnnualReportTicketSerializer(
                queryset,
                many=True,
            ).data
        self.assertEqual(len(data), 1)
