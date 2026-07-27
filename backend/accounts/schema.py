"""drf-spectacular integration for DayFlow JWT authentication."""

from drf_spectacular.extensions import OpenApiAuthenticationExtension


class DayFlowJWTAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = "accounts.authentication.DayFlowJWTAuthentication"
    name = "bearerAuth"

    def get_security_definition(self, auto_schema):
        return {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": (
                "Access token obtenido en /api/v1/auth/login/. "
                "No usar aquí el refresh token HttpOnly."
            ),
        }
