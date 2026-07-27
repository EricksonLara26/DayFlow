"""Managers for the custom DayFlow user model."""

from django.contrib.auth.base_user import BaseUserManager

from catalogs.models import Department, Role, RoleCode

from .role_mapping import to_canonical_role_code


class UserManager(BaseUserManager):
    """Create users while preserving DayFlow's role and department rules."""

    use_in_migrations = True

    def _resolve_role(self, role):
        if isinstance(role, Role):
            resolved_role = role
        elif isinstance(role, int) or (isinstance(role, str) and role.isdigit()):
            resolved_role = Role.objects.get(pk=role)
        else:
            role_code = to_canonical_role_code(role)
            resolved_role = Role.objects.get(code=role_code)

        if resolved_role.code not in RoleCode.values:
            raise ValueError("role must use a canonical DayFlow role code")

        return resolved_role

    @staticmethod
    def _resolve_department(department):
        if isinstance(department, Department):
            return department

        return Department.objects.get(pk=department)

    def create_user(
        self,
        username,
        email,
        password=None,
        *,
        role=None,
        department=None,
        **extra_fields,
    ):
        """Create and save a regular DayFlow user."""
        if not username or not username.strip():
            raise ValueError("username is required")
        if not email or not email.strip():
            raise ValueError("email is required")
        if role is None:
            raise ValueError("role is required")
        if department is None:
            raise ValueError("department is required")

        first_name = extra_fields.get("first_name")
        last_name = extra_fields.get("last_name")
        if not first_name or not first_name.strip():
            raise ValueError("first_name is required")
        if not last_name or not last_name.strip():
            raise ValueError("last_name is required")

        extra_fields["first_name"] = first_name.strip()
        extra_fields["last_name"] = last_name.strip()
        extra_fields.setdefault("active", True)
        extra_fields.setdefault("must_change_password", True)

        position = extra_fields.get("position")
        if isinstance(position, str):
            extra_fields["position"] = position.strip() or None

        user = self.model(
            username=self.model.normalize_username(username.strip()),
            email=self.normalize_email(email.strip()),
            role=self._resolve_role(role),
            department=self._resolve_department(department),
            **extra_fields,
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(
        self,
        username,
        email,
        password=None,
        *,
        role=None,
        department=None,
        **extra_fields,
    ):
        """Create an active administrator without extra permission columns."""
        if password is None:
            raise ValueError("a superuser password is required")

        requested_is_staff = extra_fields.pop("is_staff", True)
        requested_is_superuser = extra_fields.pop("is_superuser", True)
        if requested_is_staff is not True:
            raise ValueError("a superuser must have is_staff=True")
        if requested_is_superuser is not True:
            raise ValueError("a superuser must have is_superuser=True")

        extra_fields.setdefault("active", True)
        extra_fields.setdefault("must_change_password", False)
        if extra_fields["active"] is not True:
            raise ValueError("a superuser must be active")

        administrator_role = self._resolve_role(
            role or RoleCode.ADMINISTRATOR
        )
        if administrator_role.code != RoleCode.ADMINISTRATOR:
            raise ValueError(
                "a superuser must use the ADMINISTRATOR role"
            )

        return self.create_user(
            username=username,
            email=email,
            password=password,
            role=administrator_role,
            department=department,
            **extra_fields,
        )
