"""API tests for versioned DayFlow user management."""

from django.urls import reverse
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken

from catalogs.models import Department, Role, RoleCode

from .models import User


class UserAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.administrator_role = Role.objects.get(
            code=RoleCode.ADMINISTRATOR
        )
        cls.technician_role = Role.objects.get(code=RoleCode.TECHNICIAN)
        cls.employee_role = Role.objects.get(code=RoleCode.EMPLOYEE)
        cls.technology = Department.objects.create(
            name="Usuarios API Tecnología"
        )
        cls.operations = Department.objects.create(
            name="Usuarios API Operaciones"
        )
        cls.administrator = User.objects.create_superuser(
            username="api-administrator",
            email="api-administrator@example.com",
            password="AdministratorPassword!937",
            first_name="Admin",
            last_name="API",
            department=cls.technology,
        )
        cls.technician = User.objects.create_user(
            username="api-technician",
            email="api-technician@example.com",
            password="TechnicianPassword!937",
            first_name="Técnico",
            last_name="API",
            department=cls.technology,
            role=cls.technician_role,
            must_change_password=False,
        )
        cls.other_technician = User.objects.create_user(
            username="other-api-technician",
            email="other-api-technician@example.com",
            password="OtherTechnicianPassword!937",
            first_name="Otro",
            last_name="Técnico",
            department=cls.operations,
            role=cls.technician_role,
            must_change_password=False,
        )
        cls.employee = User.objects.create_user(
            username="ana-employee",
            email="ana-employee@example.com",
            password="EmployeePassword!937",
            first_name="Ana",
            last_name="Empleada",
            department=cls.operations,
            role=cls.employee_role,
            must_change_password=False,
        )
        cls.inactive_employee = User.objects.create_user(
            username="inactive-api-employee",
            email="inactive-api-employee@example.com",
            password="InactivePassword!937",
            first_name="Ana",
            last_name="Inactiva",
            department=cls.operations,
            role=cls.employee_role,
            active=False,
            must_change_password=False,
        )

    def setUp(self):
        cache.clear()
        self.client.force_authenticate(self.administrator)

    def authenticate(self, user):
        self.client.force_authenticate(user)

    def test_administrator_lists_searches_and_filters_paginated_users(self):
        response = self.client.get(
            reverse("accounts_api:user-list"),
            {
                "search": "ana empleada",
                "role": RoleCode.EMPLOYEE,
                "department": self.operations.pk,
                "is_active": "true",
                "page_size": 1,
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(
            response.data["results"][0]["id"],
            self.employee.pk,
        )
        self.assertEqual(
            response.data["results"][0]["role"],
            RoleCode.EMPLOYEE,
        )
        self.assertNotIn("password", response.data["results"][0])

    def test_user_list_is_restricted_to_administrators(self):
        for user in (self.technician, self.employee):
            with self.subTest(role=user.role.code):
                self.authenticate(user)
                response = self.client.get(
                    reverse("accounts_api:user-list")
                )
                self.assertEqual(
                    response.status_code,
                    status.HTTP_403_FORBIDDEN,
                )

    def test_create_user_hashes_password_and_does_not_return_it(self):
        response = self.client.post(
            reverse("accounts_api:user-list"),
            {
                "username": "created-api-user",
                "email": "created-api-user@example.com",
                "password": "CreatedPassword!937",
                "first_name": "Creada",
                "last_name": "API",
                "position": "Analista",
                "department": self.operations.pk,
                "role": RoleCode.EMPLOYEE,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotIn("password", response.data)
        created = User.objects.get(username="created-api-user")
        self.assertTrue(created.check_password("CreatedPassword!937"))
        self.assertTrue(created.must_change_password)

    def test_api_does_not_create_administrators(self):
        response = self.client.post(
            reverse("accounts_api:user-list"),
            {
                "username": "forbidden-api-admin",
                "email": "forbidden-api-admin@example.com",
                "password": "ForbiddenAdministrator!937",
                "first_name": "Admin",
                "last_name": "No permitido",
                "department": self.operations.pk,
                "role": RoleCode.ADMINISTRATOR,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("role", response.data["fields"])

    def test_administrator_updates_user_but_cannot_change_own_role(self):
        response = self.client.patch(
            reverse(
                "accounts_api:user-detail",
                args=(self.employee.pk,),
            ),
            {
                "first_name": "Ana María",
                "role": RoleCode.TECHNICIAN,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.employee.refresh_from_db()
        self.assertEqual(self.employee.first_name, "Ana María")
        self.assertEqual(
            self.employee.role.code,
            RoleCode.TECHNICIAN,
        )

        self_response = self.client.patch(
            reverse(
                "accounts_api:user-detail",
                args=(self.administrator.pk,),
            ),
            {"role": RoleCode.EMPLOYEE},
            format="json",
        )
        self.assertEqual(
            self_response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("role", self_response.data["fields"])

    def test_technician_updates_only_employees_and_cannot_change_role(self):
        self.authenticate(self.technician)
        allowed = self.client.patch(
            reverse(
                "accounts_api:user-detail",
                args=(self.employee.pk,),
            ),
            {"position": "Especialista"},
            format="json",
        )
        self.assertEqual(allowed.status_code, status.HTTP_200_OK)

        role_change = self.client.patch(
            reverse(
                "accounts_api:user-detail",
                args=(self.employee.pk,),
            ),
            {"role": RoleCode.TECHNICIAN},
            format="json",
        )
        self.assertEqual(
            role_change.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        forbidden = self.client.patch(
            reverse(
                "accounts_api:user-detail",
                args=(self.other_technician.pk,),
            ),
            {"position": "No permitido"},
            format="json",
        )
        self.assertEqual(
            forbidden.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_administrator_deactivates_other_user_but_not_self(self):
        response = self.client.post(
            reverse(
                "accounts_api:user-deactivate",
                args=(self.technician.pk,),
            ),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.technician.refresh_from_db()
        self.assertFalse(self.technician.active)

        self_response = self.client.post(
            reverse(
                "accounts_api:user-deactivate",
                args=(self.administrator.pk,),
            ),
            {},
            format="json",
        )
        self.assertEqual(
            self_response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_user_delete_route_is_not_available(self):
        response = self.client.delete(
            reverse(
                "accounts_api:user-detail",
                args=(self.employee.pk,),
            )
        )
        self.assertEqual(
            response.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )
        self.assertTrue(User.objects.filter(pk=self.employee.pk).exists())

    def test_reset_password_is_write_only_mandatory_and_revokes_tokens(self):
        RefreshToken.for_user(self.employee)

        response = self.client.post(
            reverse(
                "accounts_api:user-reset-password",
                args=(self.employee.pk,),
            ),
            {
                "temporary_password": "TemporaryPassword!482",
                "confirm_password": "TemporaryPassword!482",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("temporary_password", response.data)
        self.assertNotIn("password", response.data["user"])
        self.employee.refresh_from_db()
        self.assertTrue(
            self.employee.check_password("TemporaryPassword!482")
        )
        self.assertTrue(self.employee.must_change_password)
        self.assertEqual(BlacklistedToken.objects.count(), 1)

    def test_technician_resets_only_active_employee_passwords(self):
        self.authenticate(self.technician)
        payload = {
            "temporary_password": "TemporaryPassword!482",
            "confirm_password": "TemporaryPassword!482",
        }

        allowed = self.client.post(
            reverse(
                "accounts_api:user-reset-password",
                args=(self.employee.pk,),
            ),
            payload,
            format="json",
        )
        self.assertEqual(allowed.status_code, status.HTTP_200_OK)

        for target in (self.other_technician, self.inactive_employee):
            with self.subTest(target=target.username):
                forbidden = self.client.post(
                    reverse(
                        "accounts_api:user-reset-password",
                        args=(target.pk,),
                    ),
                    payload,
                    format="json",
                )
                self.assertEqual(
                    forbidden.status_code,
                    status.HTTP_403_FORBIDDEN,
                )

    def test_required_password_change_blocks_user_administration(self):
        self.administrator.must_change_password = True
        self.administrator.save(update_fields=("must_change_password",))

        response = self.client.get(reverse("accounts_api:user-list"))

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )
