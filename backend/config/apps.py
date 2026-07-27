"""Application configuration for cross-cutting DayFlow checks."""

from django.apps import AppConfig


class ConfigAppConfig(AppConfig):
    name = "config"
    verbose_name = "DayFlow configuration"

    def ready(self):
        from . import checks  # noqa: F401
