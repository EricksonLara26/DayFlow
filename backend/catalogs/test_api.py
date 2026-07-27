"""API tests for DayFlow departments and categories."""

from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from tickets.constants import TicketPriority
from tickets.models import Ticket

from .models import Category, Department, RoleCode


class CatalogAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.department = Department.objects.create(
            name="Catálogos API Departamento"
        )
        cls.inactive_department = Department.objects.create(
            name="Catálogos API Inactivo",
            active=False,
        )
        cls.category = Category.objects.create(
            name="Catálogos API Categoría"
        )
        cls.inactive_category = Category.objects.create(
            name="Catálogos API Categoría Inactiva",
            active=False,
        )
        cls.administrator = User.objects.create_superuser(
            username="catalog-api-admin",
            email="catalog-api-admin@example.com",
            password="CatalogAdministrator!937",
            first_name="Admin",
            last_name="Catálogos",
            department=cls.department,
        )
        cls.employee = User.objects.create_user(
            username="catalog-api-employee",
            email="catalog-api-employee@example.com",
            password="CatalogEmployee!937",
            first_name="Usuario",
            last_name="Catálogos",
            department=cls.department,
            role=RoleCode.EMPLOYEE,
            must_change_password=False,
        )

    def setUp(self):
        cache.clear()
        self.client.force_authenticate(self.employee)

    def test_authenticated_user_lists_only_active_catalogs_with_pagination(self):
        response = self.client.get(
            reverse("catalogs_api:department-list"),
            {"page_size": 1},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("count", response.data)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertTrue(
            all(item["active"] for item in response.data["results"])
        )

        all_active = self.client.get(
            reverse("catalogs_api:department-list"),
            {"page_size": 100},
        )
        returned_ids = {
            item["id"] for item in all_active.data["results"]
        }
        self.assertNotIn(self.inactive_department.pk, returned_ids)

    def test_catalog_list_requires_authentication_and_completed_password_change(self):
        self.client.force_authenticate(user=None)
        unauthenticated = self.client.get(
            reverse("catalogs_api:category-list")
        )
        self.assertEqual(
            unauthenticated.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

        self.employee.must_change_password = True
        self.employee.save(update_fields=("must_change_password",))
        self.client.force_authenticate(self.employee)
        required_change = self.client.get(
            reverse("catalogs_api:category-list")
        )
        self.assertEqual(
            required_change.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_only_administrator_manages_catalogs(self):
        forbidden_create = self.client.post(
            reverse("catalogs_api:category-list"),
            {
                "name": "Categoría no permitida",
                "description": "No debe crearse",
            },
            format="json",
        )
        self.assertEqual(
            forbidden_create.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        forbidden_update = self.client.patch(
            reverse(
                "catalogs_api:category-detail",
                args=(self.category.pk,),
            ),
            {"description": "No permitida"},
            format="json",
        )
        self.assertEqual(
            forbidden_update.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        forbidden_deactivate = self.client.post(
            reverse(
                "catalogs_api:category-deactivate",
                args=(self.category.pk,),
            ),
            {},
            format="json",
        )
        self.assertEqual(
            forbidden_deactivate.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_administrator_creates_updates_deactivates_and_activates(self):
        self.client.force_authenticate(self.administrator)
        created = self.client.post(
            reverse("catalogs_api:category-list"),
            {
                "name": "  Nueva   Categoría API  ",
                "description": "Descripción inicial",
            },
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(created.data["name"], "Nueva Categoría API")
        category_id = created.data["id"]

        updated = self.client.patch(
            reverse(
                "catalogs_api:category-detail",
                args=(category_id,),
            ),
            {"description": "Descripción actualizada"},
            format="json",
        )
        self.assertEqual(updated.status_code, status.HTTP_200_OK)

        deactivated = self.client.post(
            reverse(
                "catalogs_api:category-deactivate",
                args=(category_id,),
            ),
            {},
            format="json",
        )
        self.assertEqual(deactivated.status_code, status.HTTP_200_OK)
        self.assertFalse(deactivated.data["data"]["active"])

        inactive_list = self.client.get(
            reverse("catalogs_api:category-list"),
            {"active": "false", "search": "Nueva Categoría API"},
        )
        self.assertEqual(inactive_list.data["count"], 1)

        activated = self.client.post(
            reverse(
                "catalogs_api:category-activate",
                args=(category_id,),
            ),
            {},
            format="json",
        )
        self.assertEqual(activated.status_code, status.HTTP_200_OK)
        self.assertTrue(activated.data["data"]["active"])

    def test_regular_user_cannot_retrieve_inactive_catalog(self):
        response = self.client.get(
            reverse(
                "catalogs_api:department-detail",
                args=(self.inactive_department.pk,),
            )
        )
        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_deactivation_preserves_referenced_department_and_category(self):
        ticket = Ticket.objects.create(
            title="Conservar referencias",
            description="Verifica desactivación lógica.",
            category=self.category,
            priority=TicketPriority.MEDIUM,
            requester=self.employee,
            requester_department=self.department,
        )
        self.client.force_authenticate(self.administrator)

        department_response = self.client.post(
            reverse(
                "catalogs_api:department-deactivate",
                args=(self.department.pk,),
            ),
            {},
            format="json",
        )
        category_response = self.client.post(
            reverse(
                "catalogs_api:category-deactivate",
                args=(self.category.pk,),
            ),
            {},
            format="json",
        )

        self.assertEqual(department_response.status_code, status.HTTP_200_OK)
        self.assertEqual(category_response.status_code, status.HTTP_200_OK)
        ticket.refresh_from_db()
        self.employee.refresh_from_db()
        self.assertEqual(ticket.category_id, self.category.pk)
        self.assertEqual(
            ticket.requester_department_id,
            self.department.pk,
        )
        self.assertEqual(self.employee.department_id, self.department.pk)
        self.assertTrue(Department.objects.filter(pk=self.department.pk).exists())
        self.assertTrue(Category.objects.filter(pk=self.category.pk).exists())

    def test_catalog_delete_route_is_not_available(self):
        self.client.force_authenticate(self.administrator)
        response = self.client.delete(
            reverse(
                "catalogs_api:category-detail",
                args=(self.category.pk,),
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )
        self.assertTrue(Category.objects.filter(pk=self.category.pk).exists())
