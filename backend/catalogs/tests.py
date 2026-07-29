"""Tests for DayFlow catalogs."""

from importlib import import_module
from types import SimpleNamespace

from django.apps import apps
from django.contrib import admin
from django.core.exceptions import ValidationError
from django.db import IntegrityError, connection, transaction
from django.test import TestCase

from .models import (
    Category,
    Department,
    Role,
    RoleCode,
)


class CanonicalRoleTests(TestCase):
    def test_data_migration_loads_exact_canonical_role_codes(self):
        self.assertQuerySetEqual(
            Role.objects.order_by("code").values_list("code", flat=True),
            sorted(RoleCode.values),
        )

    def test_spanish_and_lowercase_codes_cannot_be_persisted(self):
        for invalid_code in ("ADMINISTRADOR", "administrator"):
            with self.subTest(code=invalid_code):
                with self.assertRaises(ValidationError):
                    Role.objects.create(code=invalid_code)

    def test_role_string_is_a_visual_label(self):
        role = Role.objects.get(code=RoleCode.TECHNICIAN)
        self.assertEqual(str(role), "Técnico")
        self.assertEqual(role.code, "TECHNICIAN")


class ApprovedDepartmentMigrationTests(TestCase):
    exact_names = {
        "Tecnología",
        "Soporte Técnico",
        "Administración",
        "Operaciones",
        "Ventas",
    }

    def test_migration_preserves_ids_and_is_idempotent(self):
        technology = Department.objects.get(name="Tecnología")
        original_id = technology.id
        Department.objects.filter(pk=original_id).update(name="Tecnologia")

        migration_module = import_module(
            "catalogs.migrations."
            "0004_normalize_approved_department_names"
        )
        schema_editor = SimpleNamespace(connection=connection)
        migration_module.normalize_approved_department_names(
            apps,
            schema_editor,
        )
        migration_module.normalize_approved_department_names(
            apps,
            schema_editor,
        )

        technology.refresh_from_db()
        self.assertEqual(technology.id, original_id)
        self.assertEqual(technology.name, "Tecnología")
        self.assertSetEqual(
            set(
                Department.objects.filter(
                    name__in=self.exact_names
                ).values_list("name", flat=True)
            ),
            self.exact_names,
        )
        self.assertEqual(
            Department.objects.filter(name__in=self.exact_names).count(),
            len(self.exact_names),
        )


class NamedCatalogTests(TestCase):
    model = Department

    def test_name_is_normalized_and_description_is_optional(self):
        item = self.model.objects.create(
            name="  Recursos   Humanos   QA  ",
            description="   ",
        )

        self.assertEqual(item.name, "Recursos Humanos QA")
        self.assertIsNone(item.description)
        self.assertEqual(str(item), "Recursos Humanos QA")

    def test_name_is_unique_with_mysql_comparison_strategy(self):
        self.model.objects.create(name="Área de Pruebas")

        with self.assertRaises(ValidationError):
            self.model.objects.create(name=" area de pruebas ")

    def test_unique_name_is_backed_by_a_database_constraint(self):
        self.model.objects.create(name="Finanzas QA")

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                self.model.objects.bulk_create(
                    [
                        self.model(name="Finanzas QA"),
                    ]
                )

    def test_default_ordering_is_predictable(self):
        self.model.objects.create(name="Ventas QA")
        self.model.objects.create(name="Administración QA")

        names = list(
            self.model.objects.filter(name__endswith=" QA").values_list(
                "name",
                flat=True,
            )
        )

        self.assertEqual(names, ["Administración QA", "Ventas QA"])

    def test_delete_performs_logical_deactivation(self):
        item = self.model.objects.create(name="Operaciones QA")

        deleted_count, _ = item.delete()
        item.refresh_from_db()

        self.assertEqual(deleted_count, 1)
        self.assertFalse(item.active)
        self.assertFalse(self.model.objects.active().filter(pk=item.pk).exists())
        self.assertTrue(
            self.model.objects.inactive().filter(pk=item.pk).exists()
        )

    def test_queryset_delete_performs_logical_deactivation(self):
        first = self.model.objects.create(name="Servicio al cliente QA")
        second = self.model.objects.create(name="Compras QA")

        deleted_count, _ = self.model.objects.filter(
            pk__in=(first.pk, second.pk)
        ).delete()

        self.assertEqual(deleted_count, 2)
        self.assertEqual(
            self.model.objects.filter(active=False).count(),
            2,
        )

    def test_activate_restores_an_inactive_record(self):
        item = self.model.objects.create(name="Calidad QA", active=False)

        changed = item.activate()
        item.refresh_from_db()

        self.assertTrue(changed)
        self.assertTrue(item.active)

    def test_active_name_index_and_non_empty_constraint_exist(self):
        index_fields = {
            tuple(index.fields)
            for index in self.model._meta.indexes
        }
        constraint_names = {
            constraint.name
            for constraint in self.model._meta.constraints
        }

        self.assertIn(("active", "name"), index_fields)
        self.assertTrue(
            any(name.endswith("_name_not_empty") for name in constraint_names)
        )


class CategoryTests(NamedCatalogTests):
    model = Category


class CatalogAdminTests(TestCase):
    def test_all_catalog_models_are_registered(self):
        for model in (Role, Department, Category):
            with self.subTest(model=model.__name__):
                self.assertIn(model, admin.site._registry)

    def test_admin_disables_physical_delete(self):
        for model in (Role, Department, Category):
            model_admin = admin.site._registry[model]
            with self.subTest(model=model.__name__):
                self.assertFalse(
                    model_admin.has_delete_permission(request=None)
                )
