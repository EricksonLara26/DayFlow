"""Deployment checks that make insecure production settings fail closed."""

from urllib.parse import urlsplit

from django.conf import settings
from django.core.checks import Error, Tags, register


def _error(message, hint, identifier):
    return Error(message, hint=hint, id=f"dayflow_security.{identifier}")


@register(Tags.security, deploy=True)
def production_security_checks(app_configs, **kwargs):
    if settings.DEBUG:
        return []

    errors = []
    secret_key = settings.SECRET_KEY
    jwt_key = settings.SIMPLE_JWT["SIGNING_KEY"]

    if len(secret_key) < 50 or "CHANGE" in secret_key.upper():
        errors.append(
            _error(
                "SECRET_KEY no cumple la longitud mínima de producción.",
                "Genera una clave aleatoria de al menos 50 caracteres.",
                "E001",
            )
        )
    if (
        len(jwt_key) < 50
        or "CHANGE" in jwt_key.upper()
        or jwt_key == secret_key
    ):
        errors.append(
            _error(
                "JWT_SIGNING_KEY debe ser robusta y distinta de SECRET_KEY.",
                "Usa otra clave aleatoria de al menos 50 caracteres.",
                "E002",
            )
        )
    if not settings.ALLOWED_HOSTS or "*" in settings.ALLOWED_HOSTS:
        errors.append(
            _error(
                "ALLOWED_HOSTS no puede estar vacío ni aceptar '*'.",
                "Declara únicamente los hosts reales del backend.",
                "E003",
            )
        )

    insecure_origins = [
        origin
        for origin in settings.CORS_ALLOWED_ORIGINS
        if urlsplit(origin).scheme != "https"
    ]
    if insecure_origins or settings.CORS_ALLOW_ALL_ORIGINS:
        errors.append(
            _error(
                "CORS permite un origen inseguro o todos los orígenes.",
                "Usa una lista explícita de orígenes HTTPS.",
                "E004",
            )
        )

    required_true = {
        "SECURE_SSL_REDIRECT": settings.SECURE_SSL_REDIRECT,
        "SESSION_COOKIE_SECURE": settings.SESSION_COOKIE_SECURE,
        "CSRF_COOKIE_SECURE": settings.CSRF_COOKIE_SECURE,
        "JWT_REFRESH_COOKIE_SECURE": settings.JWT_REFRESH_COOKIE_SECURE,
    }
    disabled = [name for name, enabled in required_true.items() if not enabled]
    if disabled:
        errors.append(
            _error(
                "Hay controles HTTPS/cookie desactivados: "
                + ", ".join(disabled),
                "Activa todos los controles en el entorno de producción.",
                "E005",
            )
        )

    cache_backend = settings.CACHES["default"]["BACKEND"]
    if cache_backend.endswith(("LocMemCache", "DummyCache")):
        errors.append(
            _error(
                "El throttling usa una caché local no compartida.",
                "Configura CACHE_URL con Redis para todos los workers.",
                "E006",
            )
        )

    if settings.ENABLE_API_DOCS:
        errors.append(
            _error(
                "La documentación interactiva está habilitada en producción.",
                "Define ENABLE_API_DOCS=False.",
                "E007",
            )
        )

    valid_same_site = {"Lax", "Strict", "None"}
    if settings.JWT_REFRESH_COOKIE_SAMESITE not in valid_same_site:
        errors.append(
            _error(
                "JWT_REFRESH_COOKIE_SAMESITE tiene un valor inválido.",
                "Usa Lax, Strict o None.",
                "E011",
            )
        )

    db_host = settings.DATABASES["default"]["HOST"].lower()
    local_database = db_host in {"127.0.0.1", "localhost", "::1"}
    db_ssl = settings.DATABASES["default"]["OPTIONS"].get("ssl")
    if not local_database and not db_ssl:
        errors.append(
            _error(
                "La conexión MySQL remota no tiene TLS configurado.",
                "Define DB_SSL_CA con la CA del servidor MySQL.",
                "E008",
            )
        )

    if not 1 <= settings.TICKET_ATTACHMENT_MAX_MB <= 25:
        errors.append(
            _error(
                "TICKET_ATTACHMENT_MAX_MB está fuera del rango seguro.",
                "Usa un límite entre 1 y 25 MB.",
                "E009",
            )
        )
    if settings.REQUEST_MAX_MB <= settings.TICKET_ATTACHMENT_MAX_MB:
        errors.append(
            _error(
                "REQUEST_MAX_MB no deja margen para multipart/form-data.",
                "Usa un valor mayor que TICKET_ATTACHMENT_MAX_MB.",
                "E010",
            )
        )

    return errors
