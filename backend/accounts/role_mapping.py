"""Compatibility mapping between the current frontend and canonical roles."""

from catalogs.models import RoleCode


FRONTEND_TO_CANONICAL_ROLE = {
    "ADMINISTRADOR": RoleCode.ADMINISTRATOR,
    "TECNICO": RoleCode.TECHNICIAN,
    "EMPLEADO": RoleCode.EMPLOYEE,
}

CANONICAL_TO_FRONTEND_ROLE = {
    canonical: frontend
    for frontend, canonical in FRONTEND_TO_CANONICAL_ROLE.items()
}


def to_canonical_role_code(value):
    """Return the canonical code that may be persisted in roles.code."""
    normalized_value = str(value or "").strip().upper()
    return FRONTEND_TO_CANONICAL_ROLE.get(
        normalized_value,
        normalized_value,
    )


def to_frontend_role_code(value):
    """Return the legacy frontend value without changing persistence."""
    canonical_value = to_canonical_role_code(value)
    return CANONICAL_TO_FRONTEND_ROLE.get(
        canonical_value,
        canonical_value,
    )
