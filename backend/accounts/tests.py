"""Tests for the custom DayFlow user model and manager."""

from django.core.cache import cache
from django.core.exceptions import FieldDoesNotExist, ValidationError
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIRequestFactory
from rest_framework.test import APIClient, APITestCase
from rest_framework.test import force_authenticate
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken

from catalogs.models import Department, Role, RoleCode

from .models import User
from .permissions import PasswordChangeCompleted
from .role_mapping import (
    to_canonical_role_code,
    to_frontend_role_code,
)
from .serializers import UserCreateSerializer, UserSerializer


class UserManagerTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.administrator_role = Role.objects.get(
            code=RoleCode.ADMINISTRATOR
        )
        cls.technician_role = Role.objects.get(code=RoleCode.TECHNICIAN)
        cls.employee_role = Role.objects.get(code=RoleCode.EMPLOYEE)
        cls.department = Department.objects.create(
            name="Tecnología Cuenta QA"
        )

    def test_create_user_hashes_password_and_uses_dbml_fields(self):
        user = User.objects.create_user(
            username="employee",
            email="employee@example.com",
            password="safe-test-password",
            first_name="Erika",
            last_name="Pérez",
            position="Analista",
            department=self.department,
            role=self.employee_role,
        )

        self.assertNotEqual(user.password, "safe-test-password")
        self.assertTrue(user.check_password("safe-test-password"))
        self.assertTrue(user.active)
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.must_change_password)

    def test_create_superuser_uses_administrator_role(self):
        user = User.objects.create_superuser(
            username="administrator",
            email="administrator@example.com",
            password="safe-admin-password",
            first_name="Ada",
            last_name="Admin",
            department=self.department,
        )

        self.assertEqual(user.role.code, RoleCode.ADMINISTRATOR)
        self.assertTrue(user.check_password("safe-admin-password"))
        self.assertTrue(user.is_active)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertFalse(user.must_change_password)
        self.assertTrue(user.has_perm("accounts.change_user"))
        self.assertTrue(user.has_module_perms("accounts"))

    def test_create_superuser_rejects_non_administrator_role(self):
        with self.assertRaisesMessage(
            ValueError,
            "a superuser must use the ADMINISTRATOR role",
        ):
            User.objects.create_superuser(
                username="invalid-admin",
                email="invalid-admin@example.com",
                password="safe-admin-password",
                first_name="Invalid",
                last_name="Admin",
                department=self.department,
                role=self.technician_role,
            )

    def test_create_user_requires_username_email_role_and_department(self):
        required_arguments = {
            "username": "employee",
            "email": "employee@example.com",
            "password": "safe-test-password",
            "first_name": "Erika",
            "last_name": "Pérez",
            "department": self.department,
            "role": self.employee_role,
        }

        for field_name in ("username", "email", "department", "role"):
            arguments = required_arguments.copy()
            arguments[field_name] = None
            with self.subTest(field_name=field_name):
                with self.assertRaises(ValueError):
                    User.objects.create_user(**arguments)

    def test_username_and_email_are_unique(self):
        self.assertTrue(User._meta.get_field("username").unique)
        self.assertTrue(User._meta.get_field("email").unique)

    def test_physical_columns_match_the_approved_dbml(self):
        self.assertEqual(User._meta.db_table, "users")
        self.assertEqual(User._meta.get_field("position").column, "job_position")
        self.assertEqual(User._meta.get_field("active").column, "active")

        for excluded_field in (
            "is_active",
            "is_superuser",
            "groups",
            "user_permissions",
        ):
            with self.subTest(field=excluded_field):
                with self.assertRaises(FieldDoesNotExist):
                    User._meta.get_field(excluded_field)


class RoleMappingTests(TestCase):
    def test_legacy_frontend_roles_map_to_canonical_codes(self):
        self.assertEqual(
            to_canonical_role_code("ADMINISTRADOR"),
            RoleCode.ADMINISTRATOR,
        )
        self.assertEqual(
            to_canonical_role_code("TECNICO"),
            RoleCode.TECHNICIAN,
        )
        self.assertEqual(
            to_canonical_role_code("EMPLEADO"),
            RoleCode.EMPLOYEE,
        )

    def test_canonical_codes_map_to_current_frontend_values(self):
        self.assertEqual(
            to_frontend_role_code(RoleCode.ADMINISTRATOR),
            "ADMINISTRADOR",
        )
        self.assertEqual(
            to_frontend_role_code(RoleCode.TECHNICIAN),
            "TECNICO",
        )
        self.assertEqual(
            to_frontend_role_code(RoleCode.EMPLOYEE),
            "EMPLEADO",
        )

    def test_spanish_role_code_cannot_be_persisted(self):
        with self.assertRaisesMessage(
            ValidationError,
            "Use a canonical DayFlow role code.",
        ):
            Role.objects.create(code="ADMINISTRADOR")


class UserSerializerTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.role = Role.objects.get(code=RoleCode.EMPLOYEE)
        cls.department = Department.objects.create(
            name="Operaciones Cuenta QA"
        )

    def test_create_serializer_hashes_and_never_outputs_password(self):
        serializer = UserCreateSerializer(
            data={
                "username": "serialized-user",
                "email": "serialized@example.com",
                "password": "UnrelatedStrongPassword!937",
                "first_name": "Sonia",
                "last_name": "López",
                "position": "Analista",
                "department": self.department.pk,
                "role": "EMPLEADO",
                "is_active": True,
                "must_change_password": True,
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()

        self.assertTrue(
            user.check_password("UnrelatedStrongPassword!937")
        )
        self.assertEqual(user.role.code, RoleCode.EMPLOYEE)
        self.assertNotIn("password", serializer.data)
        self.assertNotIn("password", UserSerializer(user).data)


class AuthenticationAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.role = Role.objects.get(code=RoleCode.EMPLOYEE)
        cls.department = Department.objects.create(
            name="Autenticación API QA"
        )
        cls.password = "InitialPassword!937"
        cls.user = User.objects.create_user(
            username="auth-user",
            email="auth-user@example.com",
            password=cls.password,
            first_name="Usuario",
            last_name="Autenticado",
            department=cls.department,
            role=cls.role,
            must_change_password=False,
        )
        cls.required_change_user = User.objects.create_user(
            username="password-change-required",
            email="change-required@example.com",
            password=cls.password,
            first_name="Cambio",
            last_name="Obligatorio",
            department=cls.department,
            role=cls.role,
            must_change_password=True,
        )
        cls.inactive_user = User.objects.create_user(
            username="inactive-auth-user",
            email="inactive-auth@example.com",
            password=cls.password,
            first_name="Usuario",
            last_name="Inactivo",
            department=cls.department,
            role=cls.role,
            active=False,
            must_change_password=False,
        )

    def setUp(self):
        cache.clear()

    def login(self, identifier=None, password=None, *, client=None):
        api_client = client or self.client
        return api_client.post(
            reverse("accounts:login"),
            {
                "identifier": identifier or self.user.username,
                "password": password or self.password,
            },
            format="json",
        )

    @staticmethod
    def authorize(client, access_token):
        client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {access_token}"
        )

    def test_login_with_username_returns_safe_user_and_httponly_refresh(self):
        response = self.login()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertEqual(response.data["token_type"], "Bearer")
        self.assertTrue(response.data["access_expires_at"].endswith("Z"))
        self.assertEqual(response.data["user"]["id"], self.user.id)
        self.assertNotIn("password", response.data)
        self.assertNotIn("refresh", response.data)
        self.assertNotIn("password", response.data["user"])
        self.assertEqual(response["Cache-Control"], "no-store")
        self.assertEqual(response["Pragma"], "no-cache")

        refresh_cookie = response.cookies["dayflow_refresh"]
        self.assertTrue(refresh_cookie["httponly"])
        self.assertEqual(refresh_cookie["samesite"], "Lax")
        self.assertEqual(refresh_cookie["path"], "/api/v1/auth/")

    def test_login_accepts_email_case_insensitively(self):
        response = self.login(identifier="AUTH-USER@EXAMPLE.COM")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["username"], "auth-user")

    def test_invalid_unknown_and_inactive_credentials_are_indistinguishable(self):
        attempts = (
            ("unknown@example.com", self.password),
            (self.user.username, "IncorrectPassword!937"),
            (self.inactive_user.username, self.password),
        )
        responses = [
            self.login(identifier=identifier, password=password)
            for identifier, password in attempts
        ]

        for response in responses:
            self.assertEqual(
                response.status_code,
                status.HTTP_401_UNAUTHORIZED,
            )
            self.assertEqual(response.data["fields"], {})

        self.assertEqual(responses[0].data, responses[1].data)
        self.assertEqual(responses[1].data, responses[2].data)

    def test_login_is_throttled_after_repeated_failures(self):
        responses = [
            self.login(
                identifier="unknown@example.com",
                password="IncorrectPassword!937",
            )
            for _ in range(6)
        ]

        self.assertTrue(
            all(
                response.status_code == status.HTTP_401_UNAUTHORIZED
                for response in responses[:5]
            )
        )
        self.assertEqual(
            responses[5].status_code,
            status.HTTP_429_TOO_MANY_REQUESTS,
        )
        self.assertEqual(responses[5].data["fields"], {})

    def test_refresh_rotates_cookie_and_blacklists_previous_token(self):
        login_response = self.login()
        old_refresh = login_response.cookies["dayflow_refresh"].value

        response = self.client.post(
            reverse("accounts:refresh"),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotEqual(
            response.cookies["dayflow_refresh"].value,
            old_refresh,
        )
        self.assertEqual(BlacklistedToken.objects.count(), 1)

        old_client = APIClient()
        old_client.cookies["dayflow_refresh"] = old_refresh
        rejected = old_client.post(
            reverse("accounts:refresh"),
            {},
            format="json",
        )
        self.assertEqual(
            rejected.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_current_user_requires_access_and_never_returns_password(self):
        unauthorized = self.client.get(reverse("accounts:me"))
        self.assertEqual(
            unauthorized.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

        login_response = self.login()
        self.authorize(self.client, login_response.data["access"])
        response = self.client.get(reverse("accounts:me"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["id"], self.user.id)
        self.assertNotIn("password", response.data["user"])

    def test_logout_blacklists_refresh_and_deletes_cookie(self):
        login_response = self.login()
        refresh = login_response.cookies["dayflow_refresh"].value

        response = self.client.post(
            reverse("accounts:logout"),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.cookies["dayflow_refresh"].value, "")
        self.assertEqual(BlacklistedToken.objects.count(), 1)

        rejected_client = APIClient()
        rejected_client.cookies["dayflow_refresh"] = refresh
        rejected = rejected_client.post(
            reverse("accounts:refresh"),
            {},
            format="json",
        )
        self.assertEqual(
            rejected.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_required_password_change_can_be_completed_and_revokes_old_access(self):
        login_response = self.login(
            identifier=self.required_change_user.username
        )
        old_access = login_response.data["access"]
        self.assertTrue(
            login_response.data["user"]["must_change_password"]
        )
        self.authorize(self.client, old_access)

        response = self.client.post(
            reverse("accounts:change-password"),
            {
                "current_password": self.password,
                "new_password": "ChangedPassword!482",
                "confirm_password": "ChangedPassword!482",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["user"]["must_change_password"])
        self.required_change_user.refresh_from_db()
        self.assertTrue(
            self.required_change_user.check_password(
                "ChangedPassword!482"
            )
        )

        stale_client = APIClient()
        self.authorize(stale_client, old_access)
        stale_response = stale_client.get(reverse("accounts:me"))
        self.assertEqual(
            stale_response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_default_permission_blocks_normal_api_until_password_changes(self):
        request = APIRequestFactory().get("/api/v1/example/")
        force_authenticate(request, user=self.required_change_user)
        request.user = self.required_change_user
        permission = PasswordChangeCompleted()

        self.assertFalse(permission.has_permission(request, object()))

        self.required_change_user.must_change_password = False
        self.assertTrue(permission.has_permission(request, object()))

    def test_change_password_rejects_incorrect_current_password(self):
        login_response = self.login(
            identifier=self.required_change_user.username
        )
        self.authorize(self.client, login_response.data["access"])

        response = self.client.post(
            reverse("accounts:change-password"),
            {
                "current_password": "IncorrectPassword!937",
                "new_password": "ChangedPassword!482",
                "confirm_password": "ChangedPassword!482",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("current_password", response.data["fields"])
        self.required_change_user.refresh_from_db()
        self.assertTrue(self.required_change_user.must_change_password)
