"""JWT authentication adapted to DayFlow's non-disclosing errors."""

from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication


class DayFlowJWTAuthentication(JWTAuthentication):
    """Avoid revealing account existence or state from a bearer token."""

    def get_user(self, validated_token):
        try:
            return super().get_user(validated_token)
        except AuthenticationFailed as exc:
            raise AuthenticationFailed(
                "No se pudo validar la sesión.",
                code="invalid_session",
            ) from exc
