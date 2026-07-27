"""Consistent error responses for the DayFlow API."""

from rest_framework.exceptions import Throttled
from rest_framework.views import exception_handler


def _normalize_error_value(value):
    if isinstance(value, dict):
        return {
            key: _normalize_error_value(item)
            for key, item in value.items()
        }
    if isinstance(value, (list, tuple)):
        return [_normalize_error_value(item) for item in value]
    return str(value)


def dayflow_exception_handler(exc, context):
    """Return every handled DRF error as ``message`` plus ``fields``."""
    response = exception_handler(exc, context)
    if response is None:
        return None

    data = response.data
    fields = {}

    if isinstance(exc, Throttled):
        message = "Demasiadas solicitudes. Inténtalo de nuevo más tarde."
    elif isinstance(data, dict) and "detail" in data:
        message = str(data["detail"])
    elif isinstance(data, dict):
        fields = {
            key: _normalize_error_value(value)
            for key, value in data.items()
        }
        non_field_errors = fields.pop("non_field_errors", None)
        if non_field_errors:
            message = (
                non_field_errors[0]
                if isinstance(non_field_errors, list)
                else str(non_field_errors)
            )
        else:
            message = "No se pudo procesar la solicitud."
    elif isinstance(data, (list, tuple)):
        normalized = _normalize_error_value(data)
        message = normalized[0] if normalized else "Solicitud inválida."
    else:
        message = str(data)

    response.data = {
        "message": message,
        "fields": fields,
    }
    return response
