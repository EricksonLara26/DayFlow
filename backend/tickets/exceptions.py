"""Stable HTTP errors for ticket business conflicts."""

from rest_framework.exceptions import APIException


class TicketConflict(APIException):
    status_code = 409
    default_detail = "El ticket cambió y la operación ya no es válida."
    default_code = "ticket_conflict"
