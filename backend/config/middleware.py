"""Small cross-cutting security middleware."""

from django.conf import settings
from django.http import JsonResponse


class RequestSizeLimitMiddleware:
    """Reject declared oversized requests before Django parses their body."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        raw_length = request.META.get("CONTENT_LENGTH")
        try:
            content_length = int(raw_length) if raw_length else 0
        except (TypeError, ValueError):
            content_length = 0

        if content_length > settings.REQUEST_MAX_BYTES:
            return JsonResponse(
                {
                    "message": "La solicitud excede el tamaño máximo permitido.",
                    "fields": {},
                },
                status=413,
            )

        response = self.get_response(request)
        if request.path.startswith("/api/"):
            response.setdefault("Cache-Control", "no-store")
            response.setdefault("Pragma", "no-cache")
        return response
