"""Django Admin configuration for the ticket domain."""

from django.contrib import admin

from .models import (
    Ticket,
    TicketAttachment,
    TicketComment,
    TicketHistory,
    TicketHistoryChange,
)


class PreserveHistoryAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Ticket)
class TicketAdmin(PreserveHistoryAdmin):
    list_display = (
        "id",
        "title",
        "status",
        "priority",
        "requester",
        "assigned_technician",
        "category",
        "due_date",
        "created_at",
    )
    list_filter = (
        "status",
        "priority",
        "category",
        "requester_department",
        "created_at",
        "due_date",
    )
    search_fields = (
        "title",
        "description",
        "requester__username",
        "requester__email",
        "assigned_technician__username",
    )
    autocomplete_fields = (
        "requester",
        "assigned_technician",
        "category",
        "requester_department",
    )
    ordering = ("-created_at", "-id")
    readonly_fields = ("created_at", "updated_at", "taken_at", "closed_at")

@admin.register(TicketComment)
class TicketCommentAdmin(PreserveHistoryAdmin):
    list_display = ("id", "ticket", "author", "author_role", "created_at")
    list_filter = ("author_role", "created_at")
    search_fields = ("message", "author__username", "ticket__title")
    autocomplete_fields = ("ticket", "author", "author_role")
    readonly_fields = ("created_at",)
    ordering = ("-created_at", "-id")


@admin.register(TicketHistory)
class TicketHistoryAdmin(PreserveHistoryAdmin):
    list_display = (
        "id",
        "ticket",
        "event_type",
        "action_code",
        "actor",
        "created_at",
    )
    list_filter = ("action_code", "created_at")
    search_fields = ("action_code", "ticket__title", "actor__username")
    autocomplete_fields = ("ticket", "actor")
    readonly_fields = ("ticket", "action_code", "actor", "created_at")
    ordering = ("-created_at", "-id")

@admin.register(TicketHistoryChange)
class TicketHistoryChangeAdmin(PreserveHistoryAdmin):
    list_display = (
        "id",
        "history",
        "field_code",
        "old_value",
        "new_value",
    )
    list_filter = ("field_code",)
    search_fields = ("field_code", "history__ticket__title")
    readonly_fields = (
        "history",
        "field_code",
        "old_value",
        "new_value",
    )
    ordering = ("-id",)

@admin.register(TicketAttachment)
class TicketAttachmentAdmin(PreserveHistoryAdmin):
    list_display = (
        "id",
        "ticket",
        "file_name",
        "mime_type",
        "size_bytes",
        "uploaded_by",
        "created_at",
    )
    list_filter = ("mime_type", "created_at")
    search_fields = (
        "file_name",
        "description",
        "ticket__title",
        "uploaded_by__username",
    )
    autocomplete_fields = ("ticket", "uploaded_by")
    readonly_fields = ("created_at",)
    ordering = ("-created_at", "-id")
