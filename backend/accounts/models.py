"""Custom user model for DayFlow."""

from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.auth.models import PermissionsMixin
from django.db import models

from catalogs.models import Department, Role, RoleCode

from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    """
    DayFlow user backed by the exact columns approved for the users table.

    PermissionsMixin is retained for Django compatibility, while its
    persistent permission fields are replaced by canonical role checks.
    """

    groups = None
    user_permissions = None

    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(max_length=254, unique=True)
    role = models.ForeignKey(
        Role,
        on_delete=models.PROTECT,
        related_name="users",
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name="users",
    )
    position = models.CharField(
        max_length=150,
        blank=True,
        null=True,
        db_column="job_position",
    )
    active = models.BooleanField(default=True)
    must_change_password = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = [
        "email",
        "first_name",
        "last_name",
        "role",
        "department",
    ]

    class Meta:
        db_table = "users"
        ordering = ("username",)

    def __str__(self):
        return self.username

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def is_active(self):
        """Django-compatible alias for the physical active column."""
        return self.active

    @is_active.setter
    def is_active(self, value):
        self.active = value

    def _has_administrator_role(self):
        if not self.role_id:
            return False

        cached_role = self._state.fields_cache.get("role")
        if cached_role is not None:
            return (
                cached_role.active
                and cached_role.code == RoleCode.ADMINISTRATOR
            )

        return Role.objects.filter(
            pk=self.role_id,
            code=RoleCode.ADMINISTRATOR,
            active=True,
        ).exists()

    @property
    def is_staff(self):
        """Allow active administrators to enter Django Admin."""
        return self.is_active and self._has_administrator_role()

    @property
    def is_superuser(self):
        """Grant superuser semantics from the canonical administrator role."""
        return self._has_administrator_role()

    def get_user_permissions(self, obj=None):
        return set()

    async def aget_user_permissions(self, obj=None):
        return set()

    def get_group_permissions(self, obj=None):
        return set()

    async def aget_group_permissions(self, obj=None):
        return set()

    def get_all_permissions(self, obj=None):
        return set()

    async def aget_all_permissions(self, obj=None):
        return set()

    def has_perm(self, perm, obj=None):
        return self.is_active and self.is_superuser

    async def ahas_perm(self, perm, obj=None):
        return self.has_perm(perm, obj)

    def has_module_perms(self, app_label):
        return self.is_active and self.is_superuser

    async def ahas_module_perms(self, app_label):
        return self.has_module_perms(app_label)
