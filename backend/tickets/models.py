"""Ticket domain models matching the approved DayFlow DBML."""

from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from catalogs.models import Category, Department, Role

from .constants import (
    ACTION_EVENT_TYPES,
    ACTION_LABELS,
    CLOSED_TICKET_STATUSES,
    TicketEventType,
    TicketPriority,
    TicketStatus,
)


def ticket_attachment_upload_to(instance, filename):
    """Build a unique storage path without persisting display names."""
    safe_suffix = Path(filename).suffix.lower()
    return (
        f"tickets/{instance.ticket_id}/attachments/"
        f"{uuid4().hex}{safe_suffix}"
    )


class Ticket(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="tickets",
    )
    status = models.CharField(
        max_length=20,
        choices=TicketStatus.choices,
        default=TicketStatus.OPEN,
    )
    priority = models.CharField(
        max_length=8,
        choices=TicketPriority.choices,
    )
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="requested_tickets",
    )
    assigned_technician = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="assigned_tickets",
        blank=True,
        null=True,
    )
    requester_department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name="requested_ticket_snapshots",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    taken_at = models.DateTimeField(blank=True, null=True)
    closed_at = models.DateTimeField(blank=True, null=True)
    due_date = models.DateField(blank=True, null=True)

    class Meta:
        db_table = "tickets"
        ordering = ("-created_at", "-id")
        indexes = [
            models.Index(
                fields=("status", "created_at"),
                name="tickets_status_created_idx",
            ),
            models.Index(
                fields=("priority", "created_at"),
                name="tickets_priority_created_idx",
            ),
            models.Index(
                fields=("requester", "created_at"),
                name="tickets_requester_created_idx",
            ),
            models.Index(
                fields=("assigned_technician", "status"),
                name="tickets_assignee_status_idx",
            ),
            models.Index(
                fields=("category", "status"),
                name="tickets_category_status_idx",
            ),
            models.Index(
                fields=("requester_department", "created_at"),
                name="tickets_department_created_idx",
            ),
            models.Index(
                fields=("due_date", "status"),
                name="tickets_due_status_idx",
            ),
            models.Index(fields=("created_at",), name="tickets_created_idx"),
            models.Index(fields=("taken_at",), name="tickets_taken_idx"),
            models.Index(fields=("closed_at",), name="tickets_closed_idx"),
            models.Index(fields=("updated_at",), name="tickets_updated_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(title=""),
                name="tickets_title_not_empty",
            ),
            models.CheckConstraint(
                condition=~models.Q(description=""),
                name="tickets_description_not_empty",
            ),
            models.CheckConstraint(
                condition=models.Q(status__in=TicketStatus.values),
                name="tickets_status_valid",
            ),
            models.CheckConstraint(
                condition=models.Q(priority__in=TicketPriority.values),
                name="tickets_priority_valid",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(taken_at__isnull=True)
                    | models.Q(taken_at__gte=models.F("created_at"))
                ),
                name="tickets_taken_after_created",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(closed_at__isnull=True)
                    | models.Q(closed_at__gte=models.F("created_at"))
                ),
                name="tickets_closed_after_created",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(due_date__isnull=True)
                    | models.Q(
                        due_date__gte=models.functions.Cast(
                            models.F("created_at"),
                            output_field=models.DateField(),
                        )
                    )
                ),
                name="tickets_due_on_after_created",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(
                        status__in=CLOSED_TICKET_STATUSES,
                        closed_at__isnull=False,
                    )
                    | models.Q(
                        status__in=(
                            TicketStatus.OPEN,
                            TicketStatus.IN_PROGRESS,
                            TicketStatus.ON_HOLD,
                        ),
                        closed_at__isnull=True,
                    )
                ),
                name="tickets_closed_status_consistent",
            ),
        ]

    def clean(self):
        super().clean()
        created_date = (
            self.created_at.date()
            if self.created_at is not None
            else timezone.localdate()
        )
        if self.due_date is not None and self.due_date < created_date:
            raise ValidationError(
                {
                    "due_date": (
                        "La fecha límite no puede ser anterior "
                        "a la fecha de creación."
                    )
                }
            )

    def __str__(self):
        return f"#{self.pk or 'new'} - {self.title}"


class TicketComment(models.Model):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.PROTECT,
        related_name="comments",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="ticket_comments",
    )
    author_role = models.ForeignKey(
        Role,
        on_delete=models.PROTECT,
        related_name="ticket_comment_snapshots",
    )
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ticket_comments"
        ordering = ("created_at", "id")
        indexes = [
            models.Index(
                fields=("ticket", "created_at"),
                name="comments_ticket_created_idx",
            ),
            models.Index(
                fields=("author", "created_at"),
                name="comments_author_created_idx",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(message=""),
                name="ticket_comments_message_not_empty",
            )
        ]

    def __str__(self):
        return f"Comment #{self.pk or 'new'} on ticket #{self.ticket_id}"


class TicketHistory(models.Model):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.PROTECT,
        related_name="history_entries",
    )
    action_code = models.CharField(max_length=64)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="ticket_history_entries",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ticket_history"
        ordering = ("created_at", "id")
        indexes = [
            models.Index(
                fields=("ticket", "created_at"),
                name="history_ticket_created_idx",
            ),
            models.Index(
                fields=("actor", "created_at"),
                name="history_actor_created_idx",
            ),
            models.Index(
                fields=("action_code", "created_at"),
                name="history_action_created_idx",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(action_code=""),
                name="ticket_history_action_not_empty",
            )
        ]

    @property
    def event_type(self):
        return ACTION_EVENT_TYPES.get(
            self.action_code,
            TicketEventType.TICKET,
        )

    @property
    def action(self):
        return ACTION_LABELS.get(self.action_code, self.action_code)

    def __str__(self):
        return f"{self.action_code} on ticket #{self.ticket_id}"


class TicketHistoryChange(models.Model):
    history = models.ForeignKey(
        TicketHistory,
        on_delete=models.PROTECT,
        related_name="changes",
    )
    field_code = models.CharField(max_length=64)
    old_value = models.TextField(blank=True, null=True)
    new_value = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "ticket_history_changes"
        ordering = ("id",)
        constraints = [
            models.UniqueConstraint(
                fields=("history", "field_code"),
                name="history_changes_history_field_uniq",
            ),
            models.CheckConstraint(
                condition=~models.Q(field_code=""),
                name="history_changes_field_not_empty",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(old_value__isnull=False)
                    | models.Q(new_value__isnull=False)
                ),
                name="history_changes_has_value",
            ),
        ]

    def __str__(self):
        return f"{self.field_code} changed in history #{self.history_id}"


class TicketAttachment(models.Model):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.PROTECT,
        related_name="attachments",
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="ticket_attachments",
    )
    file_name = models.CharField(max_length=255)
    storage_path = models.FileField(
        upload_to=ticket_attachment_upload_to,
        max_length=500,
        unique=True,
    )
    mime_type = models.CharField(max_length=255)
    size_bytes = models.BigIntegerField()
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ticket_attachments"
        ordering = ("created_at", "id")
        indexes = [
            models.Index(
                fields=("ticket", "created_at"),
                name="attachments_ticket_created_idx",
            ),
            models.Index(
                fields=("uploaded_by", "created_at"),
                name="attach_uploader_created_idx",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(file_name=""),
                name="attachments_file_name_not_empty",
            ),
            models.CheckConstraint(
                condition=~models.Q(mime_type=""),
                name="attachments_mime_type_not_empty",
            ),
            models.CheckConstraint(
                condition=models.Q(size_bytes__gte=0),
                name="attachments_size_nonnegative",
            ),
        ]

    def __str__(self):
        return self.file_name
