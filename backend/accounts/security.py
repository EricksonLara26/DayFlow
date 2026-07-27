"""Browser-origin protections for endpoints that use refresh cookies."""

from django.conf import settings
from rest_framework.exceptions import PermissionDenied


def validate_browser_origin(request):
    """Reject cross-origin browser writes outside the explicit UI allowlist."""

    origin = request.headers.get("Origin")
    if not origin:
        # Non-browser clients do not send Origin. They still need valid
        # credentials, and browser form/fetch attacks do include it.
        return

    normalized_origin = origin.rstrip("/")
    trusted_origins = {
        trusted.rstrip("/") for trusted in settings.CORS_ALLOWED_ORIGINS
    }
    if normalized_origin not in trusted_origins:
        raise PermissionDenied("El origen de la solicitud no está permitido.")
