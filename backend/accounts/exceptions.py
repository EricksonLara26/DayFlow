"""Authentication errors with stable, non-disclosing API messages."""

from rest_framework.exceptions import APIException


class InvalidCredentials(APIException):
    status_code = 401
    default_detail = (
        "No fue posible iniciar sesión con las credenciales proporcionadas."
    )
    default_code = "invalid_credentials"


class InvalidSession(APIException):
    status_code = 401
    default_detail = "La sesión no es válida o ha expirado."
    default_code = "invalid_session"
