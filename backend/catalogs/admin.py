"""Django Admin configuration for DayFlow catalogs."""

from django.contrib import admin

from .models import Category, Department, Role


class LogicalDeletionAdmin(admin.ModelAdmin):
    actions = ("activate_selected", "deactivate_selected")
    list_filter = ("active",)
    readonly_fields = ("created_at", "updated_at")

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.action(description="Activar elementos seleccionados")
    def activate_selected(self, request, queryset):
        updated_count = queryset.activate()
        self.message_user(
            request,
            f"{updated_count} elemento(s) activado(s).",
        )

    @admin.action(description="Desactivar elementos seleccionados")
    def deactivate_selected(self, request, queryset):
        updated_count = queryset.deactivate()
        self.message_user(
            request,
            f"{updated_count} elemento(s) desactivado(s).",
        )


@admin.register(Role)
class RoleAdmin(LogicalDeletionAdmin):
    list_display = ("code", "active", "created_at", "updated_at")
    search_fields = ("code",)
    ordering = ("code", "id")


class NamedCatalogAdmin(LogicalDeletionAdmin):
    list_display = ("name", "active", "created_at", "updated_at")
    search_fields = ("name", "description")
    ordering = ("name", "id")


@admin.register(Department)
class DepartmentAdmin(NamedCatalogAdmin):
    pass


@admin.register(Category)
class CategoryAdmin(NamedCatalogAdmin):
    pass
