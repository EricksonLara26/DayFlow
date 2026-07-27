"""Transactional business operations for DayFlow tickets."""

from pathlib import Path

from django.db import transaction
from django.utils import timezone

from catalogs.models import RoleCode

from .constants import (
    CLOSED_TICKET_STATUSES,
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


class TicketBusinessRuleError(ValueError):
    """Raised when a ticket operation violates a cross-model rule."""


def _require_active_user(user, *, field_name):
    if user is None:
        raise TicketBusinessRuleError(f"{field_name} is required")
    if not user.is_active:
        raise TicketBusinessRuleError(f"{field_name} must be active")
    return user


def validate_active_technician(technician):
    """Ensure assignments only target active users with an active tech role."""
    _require_active_user(
        technician,
        field_name="assigned_technician",
    )
    role = technician.role
    if not role.active or role.code != RoleCode.TECHNICIAN:
        raise TicketBusinessRuleError(
            "assigned_technician must have an active TECHNICIAN role"
        )
    return technician


def _stringify_change_value(value):
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _record_history(*, ticket, actor, action_code, changes=()):
    history = TicketHistory.objects.create(
        ticket=ticket,
        actor=actor,
        action_code=action_code,
    )
    TicketHistoryChange.objects.bulk_create(
        [
            TicketHistoryChange(
                history=history,
                field_code=field_code,
                old_value=_stringify_change_value(old_value),
                new_value=_stringify_change_value(new_value),
            )
            for field_code, old_value, new_value in changes
            if old_value != new_value
        ]
    )
    return history


@transaction.atomic
def create_ticket(
    *,
    requester,
    category,
    title,
    description,
    priority,
    due_date=None,
):
    """Create an OPEN ticket and snapshot the requester's department."""
    requester = _require_active_user(requester, field_name="requester")
    if not requester.department_id:
        raise TicketBusinessRuleError(
            "requester must have a department"
        )
    if category is None or not category.active:
        raise TicketBusinessRuleError("category must be active")

    clean_title = str(title or "").strip()
    clean_description = str(description or "").strip()
    if not clean_title:
        raise TicketBusinessRuleError("title is required")
    if not clean_description:
        raise TicketBusinessRuleError("description is required")
    if priority not in TicketPriority.values:
        raise TicketBusinessRuleError("priority is invalid")
    if due_date is not None and due_date < timezone.localdate():
        raise TicketBusinessRuleError("due_date cannot be in the past")

    ticket = Ticket.objects.create(
        title=clean_title,
        description=clean_description,
        category=category,
        status=TicketStatus.OPEN,
        priority=priority,
        requester=requester,
        requester_department=requester.department,
        due_date=due_date,
    )
    _record_history(
        ticket=ticket,
        actor=requester,
        action_code=TicketHistoryAction.CREATED,
    )
    return ticket


@transaction.atomic
def take_ticket(*, ticket, technician):
    """Atomically claim an OPEN and currently unassigned ticket."""
    validate_active_technician(technician)
    locked_ticket = Ticket.objects.select_for_update().get(pk=ticket.pk)

    if locked_ticket.assigned_technician_id is not None:
        raise TicketBusinessRuleError(
            "ticket is already assigned"
        )
    if locked_ticket.status != TicketStatus.OPEN:
        raise TicketBusinessRuleError(
            "only an OPEN ticket can be taken"
        )

    timestamp = timezone.now()
    old_assignee = locked_ticket.assigned_technician_id
    old_status = locked_ticket.status
    old_taken_at = locked_ticket.taken_at

    locked_ticket.assigned_technician = technician
    locked_ticket.status = TicketStatus.IN_PROGRESS
    locked_ticket.taken_at = locked_ticket.taken_at or timestamp
    locked_ticket.save(
        update_fields=(
            "assigned_technician",
            "status",
            "taken_at",
            "updated_at",
        )
    )
    _record_history(
        ticket=locked_ticket,
        actor=technician,
        action_code=TicketHistoryAction.TAKEN,
        changes=(
            (
                "assigned_technician_id",
                old_assignee,
                locked_ticket.assigned_technician_id,
            ),
            ("status", old_status, locked_ticket.status),
            ("taken_at", old_taken_at, locked_ticket.taken_at),
        ),
    )
    return locked_ticket


@transaction.atomic
def assign_ticket(*, ticket, technician, actor):
    """Assign or reassign a non-terminal ticket as an audited operation."""
    actor = _require_active_user(actor, field_name="actor")
    validate_active_technician(technician)
    locked_ticket = Ticket.objects.select_for_update().get(pk=ticket.pk)

    if locked_ticket.status in CLOSED_TICKET_STATUSES:
        raise TicketBusinessRuleError(
            "a closed ticket cannot be assigned"
        )

    timestamp = timezone.now()
    old_assignee = locked_ticket.assigned_technician_id
    old_status = locked_ticket.status
    old_taken_at = locked_ticket.taken_at

    locked_ticket.assigned_technician = technician
    locked_ticket.status = TicketStatus.IN_PROGRESS
    locked_ticket.taken_at = locked_ticket.taken_at or timestamp
    locked_ticket.save(
        update_fields=(
            "assigned_technician",
            "status",
            "taken_at",
            "updated_at",
        )
    )
    _record_history(
        ticket=locked_ticket,
        actor=actor,
        action_code=TicketHistoryAction.ASSIGNED,
        changes=(
            (
                "assigned_technician_id",
                old_assignee,
                locked_ticket.assigned_technician_id,
            ),
            ("status", old_status, locked_ticket.status),
            ("taken_at", old_taken_at, locked_ticket.taken_at),
        ),
    )
    return locked_ticket


@transaction.atomic
def change_ticket_status(*, ticket, status, actor):
    """Change status and record timestamp/state changes atomically."""
    actor = _require_active_user(actor, field_name="actor")
    if status not in TicketStatus.values:
        raise TicketBusinessRuleError("status is invalid")

    locked_ticket = Ticket.objects.select_for_update().get(pk=ticket.pk)
    if locked_ticket.status in CLOSED_TICKET_STATUSES:
        raise TicketBusinessRuleError(
            "a closed ticket status cannot be changed"
        )
    if (
        actor.role.code == RoleCode.TECHNICIAN
        and locked_ticket.assigned_technician_id not in (None, actor.pk)
    ):
        raise TicketBusinessRuleError(
            "ticket is assigned to another technician"
        )
    if locked_ticket.status == status:
        raise TicketBusinessRuleError("ticket already has this status")

    timestamp = timezone.now()
    old_status = locked_ticket.status
    old_taken_at = locked_ticket.taken_at
    old_closed_at = locked_ticket.closed_at

    locked_ticket.status = status
    if status == TicketStatus.IN_PROGRESS and locked_ticket.taken_at is None:
        locked_ticket.taken_at = timestamp
    if status in CLOSED_TICKET_STATUSES:
        locked_ticket.closed_at = timestamp
    else:
        locked_ticket.closed_at = None

    locked_ticket.save(
        update_fields=(
            "status",
            "taken_at",
            "closed_at",
            "updated_at",
        )
    )
    _record_history(
        ticket=locked_ticket,
        actor=actor,
        action_code=TicketHistoryAction.STATUS_CHANGED,
        changes=(
            ("status", old_status, locked_ticket.status),
            ("taken_at", old_taken_at, locked_ticket.taken_at),
            ("closed_at", old_closed_at, locked_ticket.closed_at),
        ),
    )
    return locked_ticket


@transaction.atomic
def change_ticket_priority(*, ticket, priority, actor):
    actor = _require_active_user(actor, field_name="actor")
    if priority not in TicketPriority.values:
        raise TicketBusinessRuleError("priority is invalid")

    locked_ticket = Ticket.objects.select_for_update().get(pk=ticket.pk)
    old_priority = locked_ticket.priority
    if old_priority == priority:
        return locked_ticket

    locked_ticket.priority = priority
    locked_ticket.save(update_fields=("priority", "updated_at"))
    _record_history(
        ticket=locked_ticket,
        actor=actor,
        action_code=TicketHistoryAction.PRIORITY_CHANGED,
        changes=(("priority", old_priority, priority),),
    )
    return locked_ticket


@transaction.atomic
def add_ticket_comment(*, ticket, author, message):
    """Create a comment with an immutable snapshot of the author's role."""
    author = _require_active_user(author, field_name="author")
    clean_message = str(message or "").strip()
    if not clean_message:
        raise TicketBusinessRuleError("message is required")

    comment = TicketComment.objects.create(
        ticket=ticket,
        author=author,
        author_role=author.role,
        message=clean_message,
    )
    _record_history(
        ticket=ticket,
        actor=author,
        action_code=TicketHistoryAction.COMMENT_ADDED,
    )
    return comment


@transaction.atomic
def add_ticket_attachment(
    *,
    ticket,
    uploaded_by,
    uploaded_file,
    description=None,
):
    """Store an attachment and its metadata without denormalized user names."""
    uploaded_by = _require_active_user(
        uploaded_by,
        field_name="uploaded_by",
    )
    if uploaded_file is None:
        raise TicketBusinessRuleError("uploaded_file is required")

    file_name = Path(uploaded_file.name).name
    mime_type = (
        getattr(uploaded_file, "content_type", None)
        or "application/octet-stream"
    )
    size_bytes = int(uploaded_file.size)
    attachment = TicketAttachment.objects.create(
        ticket=ticket,
        uploaded_by=uploaded_by,
        file_name=file_name,
        storage_path=uploaded_file,
        mime_type=mime_type,
        size_bytes=size_bytes,
        description=str(description or "").strip() or None,
    )
    _record_history(
        ticket=ticket,
        actor=uploaded_by,
        action_code=TicketHistoryAction.ATTACHMENT_ADDED,
    )
    return attachment
