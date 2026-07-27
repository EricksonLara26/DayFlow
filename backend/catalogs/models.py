"""Catalog models for DayFlow."""

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


CATALOG_NAME_DB_COLLATION = "utf8mb4_0900_ai_ci"
ROLE_CODE_DB_COLLATION = "utf8mb4_bin"


class RoleCode(models.TextChoices):
    """Canonical values persisted in roles.code."""

    ADMINISTRATOR = "ADMINISTRATOR", "Administrador"
    TECHNICIAN = "TECHNICIAN", "Técnico"
    EMPLOYEE = "EMPLOYEE", "Empleado"


def normalize_catalog_name(value):
    """Trim outer whitespace and collapse repeated internal whitespace."""
    return " ".join(str(value or "").split())


class CatalogQuerySet(models.QuerySet):
    """Query helpers that preserve catalog rows through logical deletion."""

    def active(self):
        return self.filter(active=True)

    def inactive(self):
        return self.filter(active=False)

    def activate(self):
        return self.update(active=True, updated_at=timezone.now())

    def deactivate(self):
        return self.update(active=False, updated_at=timezone.now())

    def delete(self):
        updated_count = self.deactivate()
        return updated_count, {
            self.model._meta.label: updated_count,
        }

    def hard_delete(self):
        return super().delete()


class CatalogManager(models.Manager.from_queryset(CatalogQuerySet)):
    """Default manager exposing active/inactive catalog scopes."""


class CatalogRecord(models.Model):
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CatalogManager()

    class Meta:
        abstract = True

    def activate(self, *, using=None):
        if self.active:
            return False

        self.active = True
        self.save(
            using=using,
            update_fields=("active", "updated_at"),
        )
        return True

    def deactivate(self, *, using=None):
        if not self.active:
            return False

        self.active = False
        self.save(
            using=using,
            update_fields=("active", "updated_at"),
        )
        return True

    def delete(self, using=None, keep_parents=False):
        changed = self.deactivate(using=using)
        deleted_count = int(changed)
        return deleted_count, {
            self._meta.label: deleted_count,
        }


class NamedCatalog(CatalogRecord):
    name = models.CharField(
        max_length=150,
        unique=True,
        db_collation=CATALOG_NAME_DB_COLLATION,
    )
    description = models.TextField(blank=True, null=True)

    class Meta:
        abstract = True

    def clean(self):
        super().clean()
        self.name = normalize_catalog_name(self.name)
        if not self.name:
            raise ValidationError({"name": "name cannot be empty"})

        if self.description is not None:
            self.description = self.description.strip() or None

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Role(CatalogRecord):
    code = models.CharField(
        max_length=32,
        unique=True,
        choices=RoleCode.choices,
        db_collation=ROLE_CODE_DB_COLLATION,
    )

    class Meta:
        db_table = "roles"
        ordering = ("code", "id")
        indexes = [
            models.Index(
                fields=("active", "code"),
                name="roles_active_code_idx",
            )
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(code__in=RoleCode.values),
                name="roles_code_canonical_ck",
            )
        ]

    def clean(self):
        super().clean()
        if self.code not in RoleCode.values:
            raise ValidationError(
                {"code": "Use a canonical DayFlow role code."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.get_code_display()


class Department(NamedCatalog):
    class Meta:
        db_table = "departments"
        ordering = ("name", "id")
        indexes = [
            models.Index(
                fields=("active", "name"),
                name="departments_active_name_idx",
            )
        ]
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(name=""),
                name="departments_name_not_empty",
            )
        ]


class Category(NamedCatalog):
    class Meta:
        db_table = "categories"
        ordering = ("name", "id")
        indexes = [
            models.Index(
                fields=("active", "name"),
                name="categories_active_name_idx",
            )
        ]
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(name=""),
                name="categories_name_not_empty",
            )
        ]
