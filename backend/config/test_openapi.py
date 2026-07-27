"""OpenAPI contract and critical-flow tests using DRF APIClient."""

from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import User
from catalogs.models import Category, Department, Role, RoleCode
from tickets.constants import TicketPriority, TicketStatus


class OpenAPIContractTests(APITestCase):
    def setUp(self):
        self.client = APIClient()

    def test_schema_and_interactive_documentation_are_public(self):
        schema_response = self.client.get(
            reverse("openapi-schema"),
            HTTP_ACCEPT="application/vnd.oai.openapi+json",
        )
        swagger_response = self.client.get(reverse("openapi-swagger"))
        redoc_response = self.client.get(reverse("openapi-redoc"))

        self.assertEqual(schema_response.status_code, status.HTTP_200_OK)
        self.assertEqual(swagger_response.status_code, status.HTTP_200_OK)
        self.assertEqual(redoc_response.status_code, status.HTTP_200_OK)

        schema = schema_response.data
        self.assertEqual(schema["openapi"], "3.0.3")
        self.assertIn(
            "bearerAuth",
            schema["components"]["securitySchemes"],
        )
        expected_paths = {
            "/api/v1/auth/login/",
            "/api/v1/users/",
            "/api/v1/departments/",
            "/api/v1/categories/",
            "/api/v1/tickets/",
            "/api/v1/analytics/summary/",
            "/api/v1/analytics/annual-technician-report/",
        }
        self.assertTrue(expected_paths.issubset(schema["paths"]))

    def test_schema_documents_required_success_and_error_codes(self):
        response = self.client.get(
            reverse("openapi-schema"),
            HTTP_ACCEPT="application/vnd.oai.openapi+json",
        )
        paths = response.data["paths"]

        expectations = {
            ("/api/v1/auth/login/", "post"): {"200", "400", "401"},
            ("/api/v1/users/", "post"): {"201", "400", "401", "403"},
            ("/api/v1/users/{id}/", "get"): {
                "200",
                "401",
                "403",
                "404",
            },
            ("/api/v1/tickets/", "post"): {
                "201",
                "400",
                "401",
                "403",
            },
            ("/api/v1/tickets/{id}/take/", "post"): {
                "200",
                "401",
                "403",
                "404",
                "409",
            },
        }
        for (path, method), expected_codes in expectations.items():
            documented_codes = set(
                paths[path][method]["responses"]
            )
            self.assertTrue(
                expected_codes.issubset(documented_codes),
                msg=f"{method.upper()} {path}: {documented_codes}",
            )

    def test_exported_examples_contain_no_bearer_token(self):
        response = self.client.get(
            reverse("openapi-schema"),
            HTTP_ACCEPT="application/vnd.oai.openapi+json",
        )
        schema_text = str(response.data)
        self.assertNotIn("Bearer eyJ", schema_text)
        self.assertNotIn('"access": "eyJ', schema_text)


class CriticalAPIClientFlowTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        technician_role = Role.objects.get(code=RoleCode.TECHNICIAN)
        employee_role = Role.objects.get(code=RoleCode.EMPLOYEE)
        cls.department = Department.objects.create(
            name="OpenAPI Test Department"
        )
        cls.category = Category.objects.create(name="OpenAPI Test Category")
        cls.administrator = User.objects.create_superuser(
            username="openapi-admin",
            email="openapi-admin@example.test",
            password="OpenAPIAdmin!937",
            first_name="Admin",
            last_name="OpenAPI",
            department=cls.department,
        )
        cls.employee = User.objects.create_user(
            username="openapi-employee",
            email="openapi-employee@example.test",
            password="OpenAPIEmployee!937",
            first_name="Elena",
            last_name="OpenAPI",
            department=cls.department,
            role=employee_role,
            must_change_password=False,
        )
        cls.technician = User.objects.create_user(
            username="openapi-technician",
            email="openapi-technician@example.test",
            password="OpenAPITechnician!937",
            first_name="Tania",
            last_name="OpenAPI",
            department=cls.department,
            role=technician_role,
            must_change_password=False,
        )
        cls.other_technician = User.objects.create_user(
            username="openapi-technician-two",
            email="openapi-technician-two@example.test",
            password="OpenAPITechnicianTwo!937",
            first_name="Tomás",
            last_name="OpenAPI",
            department=cls.department,
            role=technician_role,
            must_change_password=False,
        )

    def setUp(self):
        self.client = APIClient()

    def test_login_returns_access_and_http_only_refresh_without_password(self):
        response = self.client.post(
            reverse("accounts:login"),
            {
                "identifier": self.employee.email,
                "password": "OpenAPIEmployee!937",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["token_type"], "Bearer")
        self.assertTrue(response.data["access"])
        self.assertNotIn("password", response.data["user"])
        refresh_cookie = response.cookies["dayflow_refresh"]
        self.assertTrue(refresh_cookie["httponly"])

    def test_error_envelope_covers_400_401_403_and_404(self):
        self.client.force_authenticate(self.employee)
        invalid = self.client.post(
            reverse("tickets_api:ticket-list"),
            {
                "title": "Fecha inválida",
                "description": "Debe devolver fields.",
                "category": self.category.pk,
                "priority": TicketPriority.HIGH,
                "due_date": (
                    timezone.localdate() - timedelta(days=1)
                ).isoformat(),
            },
            format="json",
        )
        self.assertEqual(
            invalid.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            set(invalid.data),
            {"message", "fields"},
        )
        self.assertIn("due_date", invalid.data["fields"])

        forbidden = self.client.get(reverse("accounts_api:user-list"))
        self.assertEqual(
            forbidden.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        missing = self.client.get(
            reverse("tickets_api:ticket-detail", args=(999999999,))
        )
        self.assertEqual(
            missing.status_code,
            status.HTTP_404_NOT_FOUND,
        )

        self.client.force_authenticate(user=None)
        unauthenticated = self.client.get(
            reverse("analytics:summary")
        )
        self.assertEqual(
            unauthenticated.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

        for response in (forbidden, missing, unauthenticated):
            self.assertEqual(
                set(response.data),
                {"message", "fields"},
            )

    def test_ticket_creation_claim_conflict_completion_and_history(self):
        self.client.force_authenticate(self.employee)
        created = self.client.post(
            reverse("tickets_api:ticket-list"),
            {
                "title": "Flujo documentado",
                "description": "Prueba crítica completa con APIClient.",
                "category": self.category.pk,
                "priority": TicketPriority.HIGH,
            },
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        ticket_id = created.data["id"]

        self.client.force_authenticate(self.technician)
        taken = self.client.post(
            reverse("tickets_api:ticket-take", args=(ticket_id,)),
            {},
            format="json",
        )
        self.assertEqual(taken.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(self.other_technician)
        conflict = self.client.post(
            reverse("tickets_api:ticket-take", args=(ticket_id,)),
            {},
            format="json",
        )
        self.assertEqual(
            conflict.status_code,
            status.HTTP_409_CONFLICT,
        )
        self.assertEqual(set(conflict.data), {"message", "fields"})

        self.client.force_authenticate(self.technician)
        completed = self.client.post(
            reverse("tickets_api:ticket-status", args=(ticket_id,)),
            {"status": TicketStatus.COMPLETED},
            format="json",
        )
        self.assertEqual(completed.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(completed.data["closed_at"])

        history = self.client.get(
            reverse("tickets_api:ticket-history", args=(ticket_id,))
        )
        self.assertEqual(history.status_code, status.HTTP_200_OK)
        action_codes = {
            row["action_code"] for row in history.data["results"]
        }
        self.assertTrue(
            {
                "CREATED",
                "TAKEN",
                "STATUS_CHANGED",
            }.issubset(action_codes)
        )
