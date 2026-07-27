"""Django Admin configuration for DayFlow users."""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .forms import UserAdminChangeForm, UserAdminCreationForm
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = UserAdminChangeForm
    add_form = UserAdminCreationForm
    model = User

    list_display = (
        "username",
        "email",
        "full_name",
        "role",
        "department",
        "is_active",
        "is_staff",
    )
    list_filter = ("active", "role", "department", "must_change_password")
    search_fields = ("username", "email", "first_name", "last_name")
    ordering = ("username",)
    filter_horizontal = ()
    readonly_fields = (
        "last_login",
        "created_at",
        "updated_at",
        "is_active",
        "is_staff",
        "is_superuser",
    )

    fieldsets = (
        (None, {"fields": ("username", "password")}),
        (
            "Información personal",
            {
                "fields": (
                    "first_name",
                    "last_name",
                    "email",
                    "position",
                    "department",
                    "role",
                )
            },
        ),
        (
            "Estado",
            {
                "fields": (
                    "active",
                    "is_active",
                    "must_change_password",
                    "is_staff",
                    "is_superuser",
                )
            },
        ),
        (
            "Fechas",
            {"fields": ("last_login", "created_at", "updated_at")},
        ),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "username",
                    "email",
                    "first_name",
                    "last_name",
                    "position",
                    "department",
                    "role",
                    "active",
                    "must_change_password",
                    "password1",
                    "password2",
                ),
            },
        ),
    )
