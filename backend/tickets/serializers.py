"""Read and action serializers for the DayFlow ticket API."""

from pathlib import Path
from zipfile import BadZipFile, ZipFile

from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers
from rest_framework.reverse import reverse

from catalogs.models import Category, RoleCode

from .constants import (
    TICKET_ATTACHMENT_ALLOWED_TYPES,
    TicketPriority,
    TicketStatus,
)
from .models import (
    Ticket,
    TicketAttachment,
    TicketComment,
    TicketHistory,
    TicketHistoryChange,
)


User = get_user_model()


def _file_signature_is_valid(uploaded_file, suffix):
    uploaded_file.seek(0)
    header = uploaded_file.read(4096)
    uploaded_file.seek(0)

    if suffix == ".pdf":
        return header.startswith(b"%PDF-")
    if suffix == ".png":
        return header.startswith(b"\x89PNG\r\n\x1a\n")
    if suffix in (".jpg", ".jpeg"):
        return header.startswith(b"\xff\xd8\xff")
    if suffix == ".webp":
        return (
            header.startswith(b"RIFF")
            and len(header) >= 12
            and header[8:12] == b"WEBP"
        )
    if suffix in (".txt", ".csv"):
        try:
            header.decode("utf-8-sig")
        except UnicodeDecodeError:
            return False
        return True
    if suffix in (".docx", ".xlsx"):
        expected_directory = "word/" if suffix == ".docx" else "xl/"
        try:
            with ZipFile(uploaded_file) as archive:
                names = archive.namelist()
                return (
                    "[Content_Types].xml" in names
                    and any(name.startswith(expected_directory) for name in names)
                )
        except (BadZipFile, OSError):
            return False
        finally:
            uploaded_file.seek(0)
    return False


class TicketCommentSerializer(serializers.ModelSerializer):
    author = serializers.PrimaryKeyRelatedField(read_only=True)
    author_name = serializers.CharField(
        source="author.full_name",
        read_only=True,
    )
    author_role = serializers.CharField(
        source="author_role.code",
        read_only=True,
    )
    author_role_name = serializers.CharField(
        source="author_role.get_code_display",
        read_only=True,
    )

    class Meta:
        model = TicketComment
        fields = (
            "id",
            "author",
            "author_name",
            "author_role",
            "author_role_name",
            "message",
            "created_at",
        )
        read_only_fields = fields


class TicketAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by = serializers.PrimaryKeyRelatedField(read_only=True)
    uploaded_by_name = serializers.CharField(
        source="uploaded_by.full_name",
        read_only=True,
    )
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = TicketAttachment
        fields = (
            "id",
            "uploaded_by",
            "uploaded_by_name",
            "file_name",
            "mime_type",
            "size_bytes",
            "description",
            "created_at",
            "download_url",
        )
        read_only_fields = fields

    def get_download_url(self, attachment) -> str:
        return reverse(
            "tickets_api:ticket-attachment-download",
            kwargs={
                "pk": attachment.ticket_id,
                "attachment_pk": attachment.pk,
            },
            request=self.context.get("request"),
        )


class TicketHistoryChangeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketHistoryChange
        fields = (
            "id",
            "field_code",
            "old_value",
            "new_value",
        )
        read_only_fields = fields


class TicketHistorySerializer(serializers.ModelSerializer):
    event_type = serializers.CharField(read_only=True)
    action = serializers.CharField(read_only=True)
    actor = serializers.PrimaryKeyRelatedField(read_only=True)
    actor_name = serializers.CharField(
        source="actor.full_name",
        read_only=True,
    )
    changes = TicketHistoryChangeSerializer(many=True, read_only=True)

    class Meta:
        model = TicketHistory
        fields = (
            "id",
            "event_type",
            "action_code",
            "action",
            "actor",
            "actor_name",
            "created_at",
            "changes",
        )
        read_only_fields = fields


class TicketListSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(read_only=True)
    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
    )
    requester = serializers.PrimaryKeyRelatedField(read_only=True)
    requester_name = serializers.CharField(
        source="requester.full_name",
        read_only=True,
    )
    assigned_technician = serializers.PrimaryKeyRelatedField(read_only=True)
    assigned_technician_name = serializers.CharField(
        source="assigned_technician.full_name",
        read_only=True,
    )
    requester_department = serializers.PrimaryKeyRelatedField(read_only=True)
    requester_department_name = serializers.CharField(
        source="requester_department.name",
        read_only=True,
    )
    status_label = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )
    priority_label = serializers.CharField(
        source="get_priority_display",
        read_only=True,
    )

    class Meta:
        model = Ticket
        fields = (
            "id",
            "title",
            "description",
            "category",
            "category_name",
            "status",
            "status_label",
            "priority",
            "priority_label",
            "requester",
            "requester_name",
            "assigned_technician",
            "assigned_technician_name",
            "requester_department",
            "requester_department_name",
            "due_date",
            "taken_at",
            "closed_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class TicketDetailSerializer(TicketListSerializer):
    comments = TicketCommentSerializer(many=True, read_only=True)
    attachments = TicketAttachmentSerializer(many=True, read_only=True)

    class Meta(TicketListSerializer.Meta):
        fields = (
            *TicketListSerializer.Meta.fields,
            "comments",
            "attachments",
        )


class TicketCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200, trim_whitespace=True)
    description = serializers.CharField(trim_whitespace=True)
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.filter(active=True),
    )
    priority = serializers.ChoiceField(choices=TicketPriority.choices)
    due_date = serializers.DateField(
        allow_null=True,
        required=False,
    )

    def validate_due_date(self, value):
        if value is not None and value < timezone.localdate():
            raise serializers.ValidationError(
                "La fecha límite no puede ser anterior a la creación."
            )
        return value


class TicketAssignmentSerializer(serializers.Serializer):
    assigned_technician = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.select_related("role").filter(
            active=True,
            role__active=True,
            role__code=RoleCode.TECHNICIAN,
        )
    )


class TicketStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=TicketStatus.choices)


class TicketCommentCreateSerializer(serializers.Serializer):
    message = serializers.CharField(trim_whitespace=True)


class TicketAttachmentUploadSerializer(serializers.Serializer):
    file = serializers.FileField(write_only=True)
    description = serializers.CharField(
        allow_blank=True,
        allow_null=True,
        required=False,
        trim_whitespace=True,
        write_only=True,
    )

    def validate_file(self, uploaded_file):
        if uploaded_file.size <= 0:
            raise serializers.ValidationError(
                "El archivo no puede estar vacío."
            )
        if uploaded_file.size > settings.TICKET_ATTACHMENT_MAX_BYTES:
            raise serializers.ValidationError(
                "El archivo excede el tamaño máximo permitido."
            )

        suffix = Path(uploaded_file.name).suffix.lower()
        allowed_mime_types = TICKET_ATTACHMENT_ALLOWED_TYPES.get(suffix)
        mime_type = (
            getattr(uploaded_file, "content_type", "")
            .split(";", 1)[0]
            .strip()
            .lower()
        )
        if not allowed_mime_types or mime_type not in allowed_mime_types:
            raise serializers.ValidationError(
                "El tipo de archivo no está permitido."
            )
        if not _file_signature_is_valid(uploaded_file, suffix):
            raise serializers.ValidationError(
                "El contenido no coincide con el tipo de archivo."
            )
        return uploaded_file
