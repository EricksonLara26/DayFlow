"""Output contracts for derived DayFlow analytics."""

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from catalogs.models import RoleCode
from tickets.models import TicketHistory
from tickets.serializers import TicketHistoryChangeSerializer


User = get_user_model()


class SummarySerializer(serializers.Serializer):
    total_tickets = serializers.IntegerField()
    open_tickets = serializers.IntegerField()
    in_progress_tickets = serializers.IntegerField()
    on_hold_tickets = serializers.IntegerField()
    completed_tickets = serializers.IntegerField()
    dismissed_tickets = serializers.IntegerField()
    overdue_tickets = serializers.IntegerField()


class TechnicianRankingSerializer(serializers.Serializer):
    technician_id = serializers.IntegerField()
    technician_name = serializers.CharField()
    completed_tickets = serializers.IntegerField()
    average_resolution_time = serializers.IntegerField(
        allow_null=True
    )


class CategoryTotalSerializer(serializers.Serializer):
    category_id = serializers.IntegerField(allow_null=True)
    category_name = serializers.CharField()
    total = serializers.IntegerField()


class DepartmentTotalSerializer(serializers.Serializer):
    department_id = serializers.IntegerField(allow_null=True)
    department_name = serializers.CharField()
    total = serializers.IntegerField()


class DueTicketSerializer(serializers.Serializer):
    ticket_id = serializers.IntegerField()
    title = serializers.CharField()
    due_date = serializers.DateField()
    status = serializers.CharField()
    priority = serializers.CharField()


class HistoricalSerializer(serializers.Serializer):
    period = serializers.CharField()
    created = serializers.IntegerField()
    completed = serializers.IntegerField()
    dismissed = serializers.IntegerField()


class ActivityHistorySerializer(serializers.ModelSerializer):
    event_type = serializers.CharField(read_only=True)
    action = serializers.CharField(read_only=True)
    actor_id = serializers.IntegerField(read_only=True)
    actor_name = serializers.CharField(
        source="actor.full_name",
        read_only=True,
    )
    ticket_id = serializers.IntegerField(read_only=True)
    ticket_title = serializers.CharField(
        source="ticket.title",
        read_only=True,
    )
    changes = TicketHistoryChangeSerializer(many=True, read_only=True)

    class Meta:
        model = TicketHistory
        fields = (
            "id",
            "event_type",
            "action_code",
            "action",
            "actor_id",
            "actor_name",
            "created_at",
            "ticket_id",
            "ticket_title",
            "changes",
        )
        read_only_fields = fields


class AnnualReportQuerySerializer(serializers.Serializer):
    technician_id = serializers.PrimaryKeyRelatedField(
        source="technician",
        queryset=User.objects.select_related("role").filter(
            role__code=RoleCode.TECHNICIAN,
        ),
    )
    year = serializers.IntegerField(min_value=2000, max_value=2100)

    def validate_year(self, value):
        if value > timezone.localdate().year + 1:
            raise serializers.ValidationError(
                "El año no puede estar más de un año en el futuro."
            )
        return value


class AnnualReportTicketSerializer(serializers.Serializer):
    ticket_id = serializers.IntegerField(source="id")
    title = serializers.CharField()
    category_id = serializers.IntegerField()
    category_name = serializers.CharField(source="category.name")
    department_id = serializers.IntegerField(
        source="requester_department_id"
    )
    department_name = serializers.CharField(
        source="requester_department.name"
    )
    requester_id = serializers.IntegerField()
    requester_name = serializers.CharField(source="requester.full_name")
    technician_id = serializers.IntegerField(
        source="assigned_technician_id"
    )
    technician_name = serializers.CharField(
        source="assigned_technician.full_name"
    )
    created_at = serializers.DateTimeField()
    taken_at = serializers.DateTimeField(allow_null=True)
    closed_at = serializers.DateTimeField()
    status = serializers.CharField()
    resolution_time_minutes = serializers.SerializerMethodField()

    def get_resolution_time_minutes(self, ticket) -> int | None:
        if not ticket.closed_at:
            return None
        duration = ticket.closed_at - ticket.created_at
        return max(0, int(duration.total_seconds() / 60 + 0.5))


class AnnualTechnicianReportResponseSerializer(serializers.Serializer):
    technician_id = serializers.IntegerField()
    technician_name = serializers.CharField()
    year = serializers.IntegerField()
    total_tickets = serializers.IntegerField()
    tickets = AnnualReportTicketSerializer(many=True)
