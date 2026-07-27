"""Role and object permissions for ticket operations."""

from rest_framework.permissions import BasePermission

from accounts.permissions import (
    is_administrator,
    is_technician,
)
from catalogs.models import RoleCode

from .constants import CLOSED_TICKET_STATUSES, TicketStatus


def is_employee(user):
    if not user or not user.is_authenticated:
        return False
    return user.role.active and user.role.code == RoleCode.EMPLOYEE


class IsEmployee(BasePermission):
    message = "Solo un empleado puede crear tickets."

    def has_permission(self, request, view):
        return is_employee(request.user)


class IsTechnician(BasePermission):
    message = "Solo un técnico puede realizar esta operación."

    def has_permission(self, request, view):
        return is_technician(request.user)


class CanViewTicket(BasePermission):
    message = "No tienes permisos para consultar este ticket."

    def has_object_permission(self, request, view, ticket):
        if is_administrator(request.user) or is_technician(request.user):
            return True
        return (
            is_employee(request.user)
            and ticket.requester_id == request.user.pk
        )


class CanTakeTicket(BasePermission):
    """State conflicts are resolved under the service's row lock."""

    def has_object_permission(self, request, view, ticket):
        return is_technician(request.user)


class CanManageTicket(BasePermission):
    message = "No tienes permisos para cambiar el estado de este ticket."

    def has_object_permission(self, request, view, ticket):
        return (
            is_technician(request.user)
            and ticket.status not in CLOSED_TICKET_STATUSES
            and ticket.assigned_technician_id
            in (None, request.user.pk)
        )


class CanInteractWithTicket(CanViewTicket):
    """Comments and attachments follow the current visibility matrix."""
