"""Optimized, table-free analytics selectors for DayFlow."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import (
    Avg,
    Count,
    DurationField,
    ExpressionWrapper,
    F,
    IntegerField,
    OuterRef,
    Q,
    Subquery,
    Value,
)
from django.db.models.functions import Coalesce, TruncMonth
from django.utils import timezone

from accounts.permissions import is_administrator, is_technician
from catalogs.models import RoleCode
from tickets.constants import CLOSED_TICKET_STATUSES, TicketStatus
from tickets.models import Ticket, TicketHistory


User = get_user_model()


def scoped_tickets_for(user):
    """Return the dashboard ticket scope enforced for ``user``."""
    queryset = Ticket.objects.all()
    if is_administrator(user):
        return queryset
    if is_technician(user):
        return queryset.filter(
            Q(
                status=TicketStatus.OPEN,
                assigned_technician__isnull=True,
            )
            | Q(assigned_technician=user)
        )
    if (
        user
        and user.is_authenticated
        and user.role.active
        and user.role.code == RoleCode.EMPLOYEE
    ):
        return queryset.filter(requester=user)
    return queryset.none()


def get_summary(user):
    today = timezone.localdate()
    queryset = scoped_tickets_for(user)
    return queryset.aggregate(
        total_tickets=Count("id"),
        open_tickets=Count(
            "id",
            filter=Q(status=TicketStatus.OPEN),
        ),
        in_progress_tickets=Count(
            "id",
            filter=Q(status=TicketStatus.IN_PROGRESS),
        ),
        on_hold_tickets=Count(
            "id",
            filter=Q(status=TicketStatus.ON_HOLD),
        ),
        completed_tickets=Count(
            "id",
            filter=Q(status=TicketStatus.COMPLETED),
        ),
        dismissed_tickets=Count(
            "id",
            filter=Q(status=TicketStatus.DISMISSED),
        ),
        overdue_tickets=Count(
            "id",
            filter=(
                Q(due_date__lt=today)
                & ~Q(status__in=CLOSED_TICKET_STATUSES)
            ),
        ),
    )


def _ranking_technicians(user, scoped_tickets):
    queryset = User.objects.select_related("role").filter(
        role__code=RoleCode.TECHNICIAN,
    )
    if is_administrator(user):
        return queryset.filter(active=True, role__active=True)
    if is_technician(user):
        return queryset.filter(pk=user.pk)
    return queryset.filter(
        pk__in=scoped_tickets.exclude(
            assigned_technician__isnull=True
        ).values("assigned_technician_id")
    )


def get_technician_ranking(user):
    scoped_tickets = scoped_tickets_for(user)
    resolution_expression = ExpressionWrapper(
        F("closed_at") - F("created_at"),
        output_field=DurationField(),
    )
    completed_by_technician = (
        scoped_tickets.filter(
            assigned_technician_id=OuterRef("pk"),
            status=TicketStatus.COMPLETED,
            closed_at__isnull=False,
        )
        .values("assigned_technician_id")
        .annotate(
            total=Count("id"),
            average_duration=Avg(resolution_expression),
        )
    )
    queryset = _ranking_technicians(
        user,
        scoped_tickets,
    ).annotate(
        completed_tickets=Coalesce(
            Subquery(
                completed_by_technician.values("total")[:1],
                output_field=IntegerField(),
            ),
            Value(0),
        ),
        average_resolution_duration=Subquery(
            completed_by_technician.values("average_duration")[:1],
            output_field=DurationField(),
        ),
    ).order_by(
        "-completed_tickets",
        "first_name",
        "last_name",
        "id",
    )

    ranking = []
    for technician in queryset:
        duration = technician.average_resolution_duration
        average_minutes = None
        if duration is not None:
            average_minutes = int(duration.total_seconds() / 60 + 0.5)
        ranking.append(
            {
                "technician_id": technician.pk,
                "technician_name": technician.full_name,
                "completed_tickets": technician.completed_tickets,
                "average_resolution_time": average_minutes,
            }
        )
    return ranking


def get_tickets_by_category(user):
    return list(
        scoped_tickets_for(user)
        .exclude(status=TicketStatus.DISMISSED)
        .values(
            "category_id",
            category_name=F("category__name"),
        )
        .annotate(total=Count("id"))
        .order_by("-total", "category_name", "category_id")
    )


def get_demand_by_department(user):
    return list(
        scoped_tickets_for(user)
        .exclude(status=TicketStatus.DISMISSED)
        .values(
            department_id=F("requester_department_id"),
            department_name=F("requester_department__name"),
        )
        .annotate(total=Count("id"))
        .order_by("-total", "department_name", "department_id")
    )


def get_due_tickets(user):
    today = timezone.localdate()
    rows = (
        scoped_tickets_for(user)
        .filter(
            due_date__gte=today + timedelta(days=1),
            due_date__lte=today + timedelta(days=3),
        )
        .exclude(status__in=CLOSED_TICKET_STATUSES)
        .values("id", "title", "due_date", "status", "priority")
        .order_by("due_date", "id")
    )
    return [
        {
            "ticket_id": row["id"],
            "title": row["title"],
            "due_date": row["due_date"],
            "status": row["status"],
            "priority": row["priority"],
        }
        for row in rows
    ]


def get_historical(user):
    scoped_tickets = scoped_tickets_for(user)
    created_rows = (
        scoped_tickets.annotate(period_date=TruncMonth("created_at"))
        .values("period_date")
        .annotate(created=Count("id"))
        .order_by("period_date")
    )
    closed_rows = (
        scoped_tickets.filter(
            status__in=CLOSED_TICKET_STATUSES,
            closed_at__isnull=False,
        )
        .annotate(period_date=TruncMonth("closed_at"))
        .values("period_date")
        .annotate(
            completed=Count(
                "id",
                filter=Q(status=TicketStatus.COMPLETED),
            ),
            dismissed=Count(
                "id",
                filter=Q(status=TicketStatus.DISMISSED),
            ),
        )
        .order_by("period_date")
    )

    periods = {}
    for row in created_rows:
        period = row["period_date"].strftime("%Y-%m")
        periods[period] = {
            "period": period,
            "created": row["created"],
            "completed": 0,
            "dismissed": 0,
        }
    for row in closed_rows:
        period = row["period_date"].strftime("%Y-%m")
        current = periods.setdefault(
            period,
            {
                "period": period,
                "created": 0,
                "completed": 0,
                "dismissed": 0,
            },
        )
        current["completed"] = row["completed"]
        current["dismissed"] = row["dismissed"]
    return [periods[key] for key in sorted(periods)]


def get_activity_history(user):
    return (
        TicketHistory.objects.filter(ticket__in=scoped_tickets_for(user))
        .select_related("ticket", "actor")
        .prefetch_related("changes")
        .order_by("-created_at", "-id")
    )


def get_annual_completed_tickets(*, technician, year):
    return (
        Ticket.objects.filter(
            assigned_technician=technician,
            status=TicketStatus.COMPLETED,
            closed_at__year=year,
        )
        .select_related(
            "category",
            "requester_department",
            "requester",
            "assigned_technician",
        )
        .order_by("closed_at", "id")
    )
