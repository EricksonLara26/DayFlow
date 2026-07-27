"""Permissions shared by the DayFlow API."""

from catalogs.models import RoleCode
from rest_framework.permissions import BasePermission


def has_role(user, role_code):
    if not user or not user.is_authenticated:
        return False

    cached_role = user._state.fields_cache.get("role")
    if cached_role is not None:
        return cached_role.active and cached_role.code == role_code

    return user.role.active and user.role.code == role_code


def is_administrator(user):
    return has_role(user, RoleCode.ADMINISTRATOR)


def is_technician(user):
    return has_role(user, RoleCode.TECHNICIAN)


class PasswordChangeCompleted(BasePermission):
    """Block normal API use until the required password change is complete."""

    message = "Debes cambiar tu contraseña antes de continuar."
    code = "password_change_required"

    def has_permission(self, request, view):
        user = request.user
        return not (
            user
            and user.is_authenticated
            and user.must_change_password
        )


class IsAdministrator(BasePermission):
    message = "Solo un administrador puede realizar esta operación."

    def has_permission(self, request, view):
        return is_administrator(request.user)


class CanManageUser(BasePermission):
    message = "No tienes permisos para consultar o editar este usuario."

    def has_object_permission(self, request, view, target_user):
        if is_administrator(request.user):
            return True

        return (
            is_technician(request.user)
            and target_user.role.active
            and target_user.role.code == RoleCode.EMPLOYEE
        )


class CanDeactivateUser(BasePermission):
    message = "No tienes permisos para desactivar este usuario."

    def has_object_permission(self, request, view, target_user):
        return (
            is_administrator(request.user)
            and request.user.pk != target_user.pk
            and target_user.active
        )


class CanResetUserPassword(BasePermission):
    message = "No tienes permisos para restablecer esta contraseña."

    def has_object_permission(self, request, view, target_user):
        if (
            request.user.pk == target_user.pk
            or not target_user.active
        ):
            return False

        if is_administrator(request.user):
            return True

        return (
            is_technician(request.user)
            and target_user.role.active
            and target_user.role.code == RoleCode.EMPLOYEE
        )
