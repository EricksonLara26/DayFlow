"""Canonical ticket values and history event mapping."""

from django.db import models


class TicketStatus(models.TextChoices):
    OPEN = "OPEN", "Abierto"
    IN_PROGRESS = "IN_PROGRESS", "En proceso"
    ON_HOLD = "ON_HOLD", "En espera"
    COMPLETED = "COMPLETED", "Completado"
    DISMISSED = "DISMISSED", "Desestimado"


class TicketPriority(models.TextChoices):
    LOW = "LOW", "Baja"
    MEDIUM = "MEDIUM", "Media"
    HIGH = "HIGH", "Alta"
    CRITICAL = "CRITICAL", "Crítica"


class TicketEventType(models.TextChoices):
    TICKET = "TICKET", "Ticket"
    ASSIGNMENT = "ASSIGNMENT", "Asignación"
    STATUS = "STATUS", "Estado"
    PRIORITY = "PRIORITY", "Prioridad"
    COMMENT = "COMMENT", "Comentario"
    ATTACHMENT = "ATTACHMENT", "Adjunto"


class TicketHistoryAction(models.TextChoices):
    CREATED = "CREATED", "Ticket creado"
    TAKEN = "TAKEN", "Ticket tomado"
    STATUS_CHANGED = "STATUS_CHANGED", "Estado cambiado"
    PRIORITY_CHANGED = "PRIORITY_CHANGED", "Prioridad cambiada"
    COMMENT_ADDED = "COMMENT_ADDED", "Comentario agregado"
    ATTACHMENT_ADDED = "ATTACHMENT_ADDED", "Adjunto agregado"


ACTION_EVENT_TYPES = {
    TicketHistoryAction.CREATED: TicketEventType.TICKET,
    TicketHistoryAction.TAKEN: TicketEventType.ASSIGNMENT,
    TicketHistoryAction.STATUS_CHANGED: TicketEventType.STATUS,
    TicketHistoryAction.PRIORITY_CHANGED: TicketEventType.PRIORITY,
    TicketHistoryAction.COMMENT_ADDED: TicketEventType.COMMENT,
    TicketHistoryAction.ATTACHMENT_ADDED: TicketEventType.ATTACHMENT,
}

ACTION_LABELS = dict(TicketHistoryAction.choices)

CLOSED_TICKET_STATUSES = (
    TicketStatus.COMPLETED,
    TicketStatus.DISMISSED,
)
