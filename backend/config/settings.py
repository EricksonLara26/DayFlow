"""Django settings for the DayFlow backend."""

from datetime import timedelta
from pathlib import Path

import environ


BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent
ENV_FILE = PROJECT_ROOT / ".env"

env = environ.Env(
    DEBUG=(bool, False),
    DB_PORT=(int, 3306),
    JWT_ACCESS_TOKEN_MINUTES=(int, 30),
    JWT_REFRESH_TOKEN_DAYS=(int, 1),
    PASSWORD_MIN_LENGTH=(int, 12),
    TICKET_ATTACHMENT_MAX_MB=(int, 10),
    REQUEST_MAX_MB=(int, 12),
)

if ENV_FILE.exists():
    env.read_env(ENV_FILE)


# Core

SECRET_KEY = env("SECRET_KEY")
DEBUG = env.bool("DEBUG")
ALLOWED_HOSTS = env.list(
    "ALLOWED_HOSTS",
    default=["127.0.0.1", "localhost"] if DEBUG else [],
)
ENABLE_API_DOCS = env.bool("ENABLE_API_DOCS", default=DEBUG)


# Applications

INSTALLED_APPS = [
    "config.apps.ConfigAppConfig",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "drf_spectacular",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    # DayFlow
    "accounts.apps.AccountsConfig",
    "catalogs.apps.CatalogsConfig",
    "tickets.apps.TicketsConfig",
    "analytics.apps.AnalyticsConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "config.middleware.RequestSizeLimitMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


# Database

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": env("DB_NAME", default="dayflow_db"),
        "USER": env("DB_USER", default="dayflow_app"),
        "PASSWORD": env("DB_PASSWORD"),
        "HOST": env("DB_HOST", default="127.0.0.1"),
        "PORT": env.int("DB_PORT"),
        "TIME_ZONE": "UTC",
        "CONN_MAX_AGE": env.int(
            "DB_CONN_MAX_AGE",
            default=0 if DEBUG else 60,
        ),
        "OPTIONS": {
            "charset": "utf8mb4",
            "init_command": (
                "SET sql_mode='STRICT_TRANS_TABLES', "
                "time_zone='+00:00'"
            ),
        },
    }
}

DB_SSL_CA = env("DB_SSL_CA", default="").strip()
if DB_SSL_CA:
    DATABASES["default"]["OPTIONS"]["ssl"] = {"ca": DB_SSL_CA}


# Authentication and API

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "UserAttributeSimilarityValidator"
        ),
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {
            "min_length": env.int("PASSWORD_MIN_LENGTH"),
        },
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "accounts.authentication.DayFlowJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
        "accounts.permissions.PasswordChangeCompleted",
    ),
    "DEFAULT_PAGINATION_CLASS": (
        "config.pagination.DayFlowPageNumberPagination"
    ),
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "PAGE_SIZE": 20,
    "DEFAULT_THROTTLE_RATES": {
        "anon": env("API_ANON_THROTTLE_RATE", default="60/minute"),
        "user": env("API_USER_THROTTLE_RATE", default="600/minute"),
        "auth_login": env("AUTH_LOGIN_THROTTLE_RATE", default="5/minute"),
        "auth_refresh": env(
            "AUTH_REFRESH_THROTTLE_RATE",
            default="10/minute",
        ),
        "auth_logout": env(
            "AUTH_LOGOUT_THROTTLE_RATE",
            default="10/minute",
        ),
        "auth_password_change": env(
            "AUTH_PASSWORD_CHANGE_THROTTLE_RATE",
            default="5/hour",
        ),
    },
    "EXCEPTION_HANDLER": "config.api_exceptions.dayflow_exception_handler",
    "TEST_REQUEST_DEFAULT_FORMAT": "json",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "DayFlow API",
    "DESCRIPTION": (
        "API REST versionada para autenticación, usuarios, catálogos, "
        "tickets, auditoría y analítica de DayFlow."
    ),
    "VERSION": "1.0.0",
    "OAS_VERSION": "3.0.3",
    "SERVE_INCLUDE_SCHEMA": False,
    "SCHEMA_PATH_PREFIX": r"/api/v1",
    "COMPONENT_SPLIT_REQUEST": True,
    "SORT_OPERATIONS": True,
    "TAGS": [
        {"name": "Auth", "description": "Sesión JWT y contraseña."},
        {"name": "Users", "description": "Administración de usuarios."},
        {
            "name": "Catalogs",
            "description": "Departamentos y categorías.",
        },
        {"name": "Tickets", "description": "Flujo operativo de tickets."},
        {
            "name": "Analytics",
            "description": "Métricas derivadas sin tablas de totales.",
        },
    ],
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=env.int("JWT_ACCESS_TOKEN_MINUTES")
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=env.int("JWT_REFRESH_TOKEN_DAYS")
    ),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": False,
    "CHECK_REVOKE_TOKEN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": env("JWT_SIGNING_KEY"),
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

JWT_REFRESH_COOKIE_NAME = env(
    "JWT_REFRESH_COOKIE_NAME",
    default="dayflow_refresh",
)
JWT_REFRESH_COOKIE_SECURE = env.bool(
    "JWT_REFRESH_COOKIE_SECURE",
    default=not DEBUG,
)
JWT_REFRESH_COOKIE_SAMESITE = env(
    "JWT_REFRESH_COOKIE_SAMESITE",
    default="Lax",
)
JWT_REFRESH_COOKIE_PATH = "/api/v1/auth/"


# Cache and throttling

CACHE_URL = env("CACHE_URL", default="").strip()
if CACHE_URL:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": CACHE_URL,
            "KEY_PREFIX": env("CACHE_KEY_PREFIX", default="dayflow"),
            "TIMEOUT": 300,
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "dayflow-development",
        }
    }


# Browser origins

DEVELOPMENT_FRONTEND_ORIGINS = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
]

CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=DEVELOPMENT_FRONTEND_ORIGINS if DEBUG else [],
)
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True
CORS_URLS_REGEX = r"^/api/.*$"
CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS",
    default=CORS_ALLOWED_ORIGINS,
)


# HTTPS and browser security

SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=not DEBUG)
TRUST_X_FORWARDED_PROTO = env.bool(
    "TRUST_X_FORWARDED_PROTO",
    default=False,
)
if TRUST_X_FORWARDED_PROTO:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

SESSION_COOKIE_SECURE = env.bool("SESSION_COOKIE_SECURE", default=not DEBUG)
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SECURE = env.bool("CSRF_COOKIE_SECURE", default=not DEBUG)
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = "Lax"
SECURE_HSTS_SECONDS = env.int(
    "SECURE_HSTS_SECONDS",
    default=0 if DEBUG else 31536000,
)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool(
    "SECURE_HSTS_INCLUDE_SUBDOMAINS",
    default=False,
)
SECURE_HSTS_PRELOAD = env.bool("SECURE_HSTS_PRELOAD", default=False)
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"


# Internationalization

LANGUAGE_CODE = "es"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


# Static files and uploaded attachments

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
TICKET_ATTACHMENT_MAX_MB = env.int("TICKET_ATTACHMENT_MAX_MB")
REQUEST_MAX_MB = env.int("REQUEST_MAX_MB")
TICKET_ATTACHMENT_MAX_BYTES = TICKET_ATTACHMENT_MAX_MB * 1024 * 1024
REQUEST_MAX_BYTES = REQUEST_MAX_MB * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = min(
    TICKET_ATTACHMENT_MAX_BYTES,
    2_621_440,
)
DATA_UPLOAD_MAX_MEMORY_SIZE = REQUEST_MAX_BYTES
FILE_UPLOAD_PERMISSIONS = 0o640
FILE_UPLOAD_DIRECTORY_PERMISSIONS = 0o750


# Logging: never enable SQL/body logging in production.

LOG_LEVEL = env("LOG_LEVEL", default="INFO").upper()
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "redact_sensitive": {
            "()": "config.logging.RedactSensitiveDataFilter",
        },
    },
    "formatters": {
        "dayflow": {
            "format": (
                "{asctime} {levelname} {name} "
                "request_id={request_id} {message}"
            ),
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "filters": ["redact_sensitive"],
            "formatter": "dayflow",
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": LOG_LEVEL,
            "propagate": False,
        },
        "django.db.backends": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
        "dayflow": {
            "handlers": ["console"],
            "level": LOG_LEVEL,
            "propagate": False,
        },
    },
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
