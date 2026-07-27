"""Isolated settings for backend unit tests."""

import unicodedata

from django.db.backends.signals import connection_created

from .settings import *  # noqa: F403


DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]


def _compare_values(first, second, *, key):
    first_key = key(first)
    second_key = key(second)
    return (first_key > second_key) - (first_key < second_key)


def _accent_and_case_insensitive_key(value):
    decomposed_value = unicodedata.normalize("NFKD", value)
    return "".join(
        character
        for character in decomposed_value
        if not unicodedata.combining(character)
    ).casefold()


def _register_mysql_compatible_sqlite_collations(
    sender,
    connection,
    **kwargs,
):
    if connection.vendor != "sqlite":
        return

    connection.connection.create_collation(
        "utf8mb4_0900_ai_ci",
        lambda first, second: _compare_values(
            first,
            second,
            key=_accent_and_case_insensitive_key,
        ),
    )
    connection.connection.create_collation(
        "utf8mb4_bin",
        lambda first, second: _compare_values(
            first,
            second,
            key=lambda value: value,
        ),
    )


connection_created.connect(
    _register_mysql_compatible_sqlite_collations,
    dispatch_uid="dayflow_test_mysql_collations",
)
