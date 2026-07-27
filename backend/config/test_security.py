"""Focused tests for production security controls."""

import json
import logging

from django.core.checks import run_checks
from django.http import JsonResponse
from django.test import RequestFactory, SimpleTestCase, override_settings

from .logging import RedactSensitiveDataFilter, redact_sensitive_text
from .middleware import RequestSizeLimitMiddleware


class RequestSizeLimitMiddlewareTests(SimpleTestCase):
    @override_settings(REQUEST_MAX_BYTES=100)
    def test_rejects_declared_oversized_request(self):
        request = RequestFactory().post(
            "/api/v1/tickets/",
            data=b"x",
            content_type="application/octet-stream",
            CONTENT_LENGTH="101",
        )
        middleware = RequestSizeLimitMiddleware(lambda current: None)

        response = middleware(request)
        payload = json.loads(response.content)

        self.assertEqual(response.status_code, 413)
        self.assertIn("message", payload)
        self.assertEqual(payload["fields"], {})

    def test_authenticated_api_responses_are_not_cacheable(self):
        request = RequestFactory().get("/api/v1/users/")
        middleware = RequestSizeLimitMiddleware(
            lambda current: JsonResponse({"results": []})
        )

        response = middleware(request)

        self.assertEqual(response["Cache-Control"], "no-store")
        self.assertEqual(response["Pragma"], "no-cache")


class LoggingRedactionTests(SimpleTestCase):
    def test_redacts_bearer_and_named_secrets(self):
        text = redact_sensitive_text(
            "Authorization=Bearer abc.def password=visible "
            "DB_PASSWORD=database-secret "
            "/api/v1/users/?search=person@example.test"
        )

        self.assertNotIn("abc.def", text)
        self.assertNotIn("visible", text)
        self.assertNotIn("database-secret", text)
        self.assertNotIn("person@example.test", text)
        self.assertGreaterEqual(text.count("[REDACTED]"), 3)
        self.assertIn("[REDACTED_QUERY]", text)

    def test_filter_supplies_request_id_without_exposing_token(self):
        record = logging.LogRecord(
            "dayflow",
            logging.INFO,
            __file__,
            1,
            "token=%s",
            ("sensitive-value",),
            None,
        )

        self.assertTrue(RedactSensitiveDataFilter().filter(record))
        self.assertEqual(record.request_id, "-")
        self.assertNotIn("sensitive-value", record.getMessage())


class DeploymentChecksTests(SimpleTestCase):
    @override_settings(
        DEBUG=False,
        SECRET_KEY="s" * 60,
        ALLOWED_HOSTS=["api.dayflow.example"],
        CORS_ALLOWED_ORIGINS=["https://dayflow.example"],
        CORS_ALLOW_ALL_ORIGINS=False,
        SECURE_SSL_REDIRECT=True,
        SESSION_COOKIE_SECURE=True,
        CSRF_COOKIE_SECURE=True,
        JWT_REFRESH_COOKIE_SECURE=True,
        JWT_REFRESH_COOKIE_SAMESITE="Lax",
        ENABLE_API_DOCS=False,
        CACHES={
            "default": {
                "BACKEND": "django.core.cache.backends.redis.RedisCache",
                "LOCATION": "redis://127.0.0.1:6379/1",
            }
        },
        SIMPLE_JWT={"SIGNING_KEY": "j" * 60},
        DATABASES={
            "default": {
                "ENGINE": "django.db.backends.mysql",
                "HOST": "127.0.0.1",
                "OPTIONS": {},
            }
        },
        TICKET_ATTACHMENT_MAX_MB=10,
        REQUEST_MAX_MB=12,
    )
    def test_secure_production_baseline_has_no_dayflow_errors(self):
        errors = run_checks(tags=["security"], include_deployment_checks=True)

        self.assertFalse(
            [error for error in errors if error.id.startswith("dayflow_security")]
        )

    @override_settings(
        DEBUG=False,
        SECRET_KEY="short",
        ALLOWED_HOSTS=["*"],
        CORS_ALLOWED_ORIGINS=["http://frontend.example"],
        CORS_ALLOW_ALL_ORIGINS=True,
        SECURE_SSL_REDIRECT=False,
        SESSION_COOKIE_SECURE=False,
        CSRF_COOKIE_SECURE=False,
        JWT_REFRESH_COOKIE_SECURE=False,
        JWT_REFRESH_COOKIE_SAMESITE="invalid",
        ENABLE_API_DOCS=True,
        CACHES={
            "default": {
                "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
                "LOCATION": "unsafe",
            }
        },
        SIMPLE_JWT={"SIGNING_KEY": "short"},
        DATABASES={
            "default": {
                "ENGINE": "django.db.backends.mysql",
                "HOST": "db.example",
                "OPTIONS": {},
            }
        },
        TICKET_ATTACHMENT_MAX_MB=50,
        REQUEST_MAX_MB=10,
    )
    def test_insecure_production_settings_are_rejected(self):
        errors = run_checks(tags=["security"], include_deployment_checks=True)
        identifiers = {
            error.id for error in errors if error.id.startswith("dayflow_security")
        }

        self.assertTrue(
            {
                "dayflow_security.E001",
                "dayflow_security.E002",
                "dayflow_security.E003",
                "dayflow_security.E004",
                "dayflow_security.E005",
                "dayflow_security.E006",
                "dayflow_security.E007",
                "dayflow_security.E008",
                "dayflow_security.E009",
                "dayflow_security.E010",
                "dayflow_security.E011",
            }.issubset(identifiers)
        )
