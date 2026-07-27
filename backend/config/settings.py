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
    JWT_REFRESH_COOKIE_SECURE=(bool, False),
    TICKET_ATTACHMENT_MAX_MB=(int, 10),
)

if ENV_FILE.exists():
    env.read_env(ENV_FILE)


# Core

SECRET_KEY = env("SECRET_KEY")
DEBUG = env.bool("DEBUG")
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["127.0.0.1", "localhost"])


# Applications

INSTALLED_APPS = [
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
        "CONN_MAX_AGE": 0,
        "OPTIONS": {
            "charset": "utf8mb4",
            "init_command": "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    }
}


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
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "PAGE_SIZE": 20,
    "DEFAULT_THROTTLE_RATES": {
        "auth_login": "5/minute",
        "auth_refresh": "10/minute",
        "auth_logout": "10/minute",
        "auth_password_change": "5/hour",
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


# CORS

CORS_ALLOWED_ORIGINS = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
]
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True
CORS_URLS_REGEX = r"^/api/.*$"


# Internationalization

LANGUAGE_CODE = "es"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


# Static files and uploaded attachments

STATIC_URL = "static/"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
TICKET_ATTACHMENT_MAX_BYTES = (
    env.int("TICKET_ATTACHMENT_MAX_MB") * 1024 * 1024
)

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
