"""Reusable OpenAPI response contracts and examples for DayFlow."""

from rest_framework import serializers

from drf_spectacular.utils import OpenApiExample, OpenApiResponse


class DayFlowErrorSerializer(serializers.Serializer):
    """Stable error envelope returned by the global DRF handler."""

    message = serializers.CharField()
    fields = serializers.DictField(
        child=serializers.ListField(
            child=serializers.CharField(),
        ),
    )


class MessageSerializer(serializers.Serializer):
    message = serializers.CharField()


ERROR_EXAMPLES = {
    400: OpenApiExample(
        "Validación",
        value={
            "message": "No se pudo procesar la solicitud.",
            "fields": {
                "due_date": [
                    "La fecha límite no puede ser anterior a la creación."
                ]
            },
        },
        response_only=True,
        status_codes=("400",),
    ),
    401: OpenApiExample(
        "No autenticado",
        value={
            "message": "Las credenciales de autenticación no se proveyeron.",
            "fields": {},
        },
        response_only=True,
        status_codes=("401",),
    ),
    403: OpenApiExample(
        "Sin permiso",
        value={
            "message": "No tienes permisos para realizar esta operación.",
            "fields": {},
        },
        response_only=True,
        status_codes=("403",),
    ),
    404: OpenApiExample(
        "No encontrado",
        value={
            "message": "No encontrado.",
            "fields": {},
        },
        response_only=True,
        status_codes=("404",),
    ),
    409: OpenApiExample(
        "Conflicto",
        value={
            "message": "El ticket ya fue tomado por otro técnico.",
            "fields": {},
        },
        response_only=True,
        status_codes=("409",),
    ),
}

ERROR_DESCRIPTIONS = {
    400: "Solicitud o campos inválidos.",
    401: "JWT ausente, inválido o expirado.",
    403: "El rol o el estado de la cuenta no permite la operación.",
    404: "El recurso no existe o queda fuera del scope del usuario.",
    409: "Conflicto con el estado actual del ticket.",
}


def error_responses(*status_codes):
    """Build documented DayFlow error envelopes for selected status codes."""
    return {
        code: OpenApiResponse(
            response=DayFlowErrorSerializer,
            description=ERROR_DESCRIPTIONS[code],
            examples=[ERROR_EXAMPLES[code]],
        )
        for code in status_codes
    }
