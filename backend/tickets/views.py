"""Versioned ticket workflow endpoints."""

from datetime import timedelta

from django.db.models import Prefetch, Q
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    OpenApiParameter,
    extend_schema,
    extend_schema_view,
)

from accounts.permissions import (
    IsAdministrator,
    PasswordChangeCompleted,
    is_administrator,
    is_technician,
)
from catalogs.models import RoleCode
from config.openapi import error_responses

from .constants import (
    CLOSED_TICKET_STATUSES,
    TicketPriority,
    TicketStatus,
)
from .exceptions import TicketConflict
from .models import (
    Ticket,
    TicketAttachment,
    TicketComment,
    TicketHistory,
)
from .permissions import (
    CanInteractWithTicket,
    CanManageTicket,
    CanTakeTicket,
    CanViewTicket,
    IsEmployee,
    IsTechnician,
)
from .serializers import (
    TicketAssignmentSerializer,
    TicketAttachmentSerializer,
    TicketAttachmentUploadSerializer,
    TicketCommentCreateSerializer,
    TicketCommentSerializer,
    TicketCreateSerializer,
    TicketDetailSerializer,
    TicketHistorySerializer,
    TicketListSerializer,
    TicketStatusSerializer,
)
from .services import (
    TicketBusinessRuleError,
    add_ticket_attachment,
    add_ticket_comment,
    assign_ticket,
    change_ticket_status,
    create_ticket,
    take_ticket,
)


def _parse_date_query(query_params, field_name):
    raw_value = query_params.get(field_name, "").strip()
    if not raw_value:
        return None

    from rest_framework.fields import DateField

    try:
        return DateField().run_validation(raw_value)
    except ValidationError as exc:
        raise ValidationError(
            {field_name: ["Usa una fecha ISO 8601 válida: YYYY-MM-DD."]}
        ) from exc


@extend_schema_view(
    list=extend_schema(
        tags=("Tickets",),
        summary="Listar tickets",
        description="Aplica automáticamente el scope del rol autenticado.",
        parameters=[
            OpenApiParameter("query", str),
            OpenApiParameter(
                "status",
                str,
                enum=(*TicketStatus.values, "ALL"),
            ),
            OpenApiParameter(
                "priority",
                str,
                enum=(*TicketPriority.values, "ALL"),
            ),
            OpenApiParameter(
                "created_from",
                OpenApiTypes.DATE,
                description="Fecha inclusiva YYYY-MM-DD.",
            ),
            OpenApiParameter(
                "created_to",
                OpenApiTypes.DATE,
                description="Fecha inclusiva YYYY-MM-DD.",
            ),
            OpenApiParameter("due_soon", bool),
            OpenApiParameter(
                "scope",
                str,
                enum=("all", "available", "mine", "history"),
                description="Disponible únicamente para técnicos.",
            ),
        ],
        responses={
            200: TicketListSerializer(many=True),
            **error_responses(400, 401, 403),
        },
    ),
    create=extend_schema(
        tags=("Tickets",),
        summary="Crear ticket",
        request=TicketCreateSerializer,
        responses={
            201: TicketDetailSerializer,
            **error_responses(400, 401, 403),
        },
    ),
    retrieve=extend_schema(
        tags=("Tickets",),
        summary="Consultar detalle del ticket",
        responses={
            200: TicketDetailSerializer,
            **error_responses(401, 403, 404),
        },
    ),
    take=extend_schema(
        tags=("Tickets",),
        summary="Tomar ticket disponible",
        description=(
            "Operación atómica para técnicos. Devuelve 409 si el ticket "
            "dejó de estar OPEN o ya fue asignado."
        ),
        request=None,
        responses={
            200: TicketListSerializer,
            **error_responses(401, 403, 404, 409),
        },
    ),
    assign=extend_schema(
        tags=("Tickets",),
        summary="Asignar técnico",
        request=TicketAssignmentSerializer,
        responses={
            200: TicketListSerializer,
            **error_responses(400, 401, 403, 404, 409),
        },
    ),
    status=extend_schema(
        tags=("Tickets",),
        summary="Cambiar estado",
        request=TicketStatusSerializer,
        responses={
            200: TicketListSerializer,
            **error_responses(400, 401, 403, 404, 409),
        },
    ),
    comments=extend_schema(
        tags=("Tickets",),
        summary="Agregar comentario",
        request=TicketCommentCreateSerializer,
        responses={
            201: TicketCommentSerializer,
            **error_responses(400, 401, 403, 404),
        },
    ),
    attachments=extend_schema(
        tags=("Tickets",),
        summary="Cargar adjunto",
        request={
            "multipart/form-data": TicketAttachmentUploadSerializer,
        },
        responses={
            201: TicketAttachmentSerializer,
            **error_responses(400, 401, 403, 404),
        },
    ),
    history=extend_schema(
        tags=("Tickets",),
        summary="Consultar historial auditable",
        responses={
            200: TicketHistorySerializer(many=True),
            **error_responses(401, 403, 404),
        },
    ),
    attachment_download=extend_schema(
        tags=("Tickets",),
        summary="Descargar adjunto",
        parameters=[
            OpenApiParameter(
                "attachment_pk",
                int,
                location=OpenApiParameter.PATH,
            ),
        ],
        responses={
            (200, "application/octet-stream"): OpenApiTypes.BINARY,
            **error_responses(401, 403, 404),
        },
    ),
)
class TicketViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Ticket visibility and audited workflow actions."""

    queryset = Ticket.objects.all()

    def get_permissions(self):
        permission_classes = [
            IsAuthenticated,
            PasswordChangeCompleted,
        ]
        if self.action == "create":
            permission_classes.append(IsEmployee)
        elif self.action == "take":
            permission_classes.extend((IsTechnician, CanTakeTicket))
        elif self.action == "assign":
            permission_classes.append(IsAdministrator)
        elif self.action == "status":
            permission_classes.extend((IsTechnician, CanManageTicket))
        elif self.action in ("comments", "attachments"):
            permission_classes.append(CanInteractWithTicket)
        else:
            permission_classes.append(CanViewTicket)
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        serializer_classes = {
            "create": TicketCreateSerializer,
            "assign": TicketAssignmentSerializer,
            "status": TicketStatusSerializer,
            "comments": TicketCommentCreateSerializer,
            "attachments": TicketAttachmentUploadSerializer,
            "history": TicketHistorySerializer,
        }
        if self.action == "retrieve":
            return TicketDetailSerializer
        return serializer_classes.get(self.action, TicketListSerializer)

    def _base_queryset(self):
        queryset = Ticket.objects.select_related(
            "category",
            "requester",
            "requester__role",
            "requester__department",
            "assigned_technician",
            "assigned_technician__role",
            "requester_department",
        )
        if self.action == "retrieve":
            queryset = queryset.prefetch_related(
                Prefetch(
                    "comments",
                    queryset=TicketComment.objects.select_related(
                        "author",
                        "author_role",
                    ),
                ),
                Prefetch(
                    "attachments",
                    queryset=TicketAttachment.objects.select_related(
                        "uploaded_by"
                    ),
                ),
            )
        return queryset

    def get_queryset(self):
        queryset = self._base_queryset()
        user = self.request.user

        if user.role.code == RoleCode.EMPLOYEE:
            queryset = queryset.filter(requester=user)
        elif is_technician(user):
            scope = self.request.query_params.get(
                "scope",
                "all",
            ).strip().lower()
            if scope == "available":
                queryset = queryset.filter(
                    status=TicketStatus.OPEN,
                    assigned_technician__isnull=True,
                )
            elif scope == "mine":
                queryset = queryset.filter(
                    assigned_technician=user,
                ).exclude(status__in=CLOSED_TICKET_STATUSES)
            elif scope == "history":
                queryset = queryset.filter(
                    assigned_technician=user,
                    status__in=CLOSED_TICKET_STATUSES,
                )
            elif scope != "all":
                raise ValidationError(
                    {
                        "scope": [
                            "Usa all, available, mine o history."
                        ]
                    }
                )
        elif not is_administrator(user):
            return queryset.none()

        if self.action != "list":
            return queryset

        query = self.request.query_params.get("query", "").strip()
        for search_term in query.split():
            queryset = queryset.filter(
                Q(title__icontains=search_term)
                | Q(description__icontains=search_term)
                | Q(category__name__icontains=search_term)
                | Q(requester__first_name__icontains=search_term)
                | Q(requester__last_name__icontains=search_term)
                | Q(requester__username__icontains=search_term)
                | Q(
                    assigned_technician__first_name__icontains=search_term
                )
                | Q(
                    assigned_technician__last_name__icontains=search_term
                )
            )

        requested_status = self.request.query_params.get(
            "status",
            "",
        ).strip().upper()
        if requested_status and requested_status != "ALL":
            if requested_status not in TicketStatus.values:
                raise ValidationError(
                    {"status": ["El estado no es válido."]}
                )
            queryset = queryset.filter(status=requested_status)

        requested_priority = self.request.query_params.get(
            "priority",
            "",
        ).strip().upper()
        if requested_priority and requested_priority != "ALL":
            if requested_priority not in TicketPriority.values:
                raise ValidationError(
                    {"priority": ["La prioridad no es válida."]}
                )
            queryset = queryset.filter(priority=requested_priority)

        created_from = _parse_date_query(
            self.request.query_params,
            "created_from",
        )
        created_to = _parse_date_query(
            self.request.query_params,
            "created_to",
        )
        if created_from and created_to and created_from > created_to:
            raise ValidationError(
                {
                    "created_to": [
                        "Debe ser igual o posterior a created_from."
                    ]
                }
            )
        if created_from:
            queryset = queryset.filter(created_at__date__gte=created_from)
        if created_to:
            queryset = queryset.filter(created_at__date__lte=created_to)

        due_soon = self.request.query_params.get(
            "due_soon",
            "",
        ).strip().lower()
        if due_soon:
            if due_soon not in ("true", "false", "1", "0"):
                raise ValidationError(
                    {"due_soon": ["Usa true o false."]}
                )
            if due_soon in ("true", "1"):
                today = timezone.localdate()
                queryset = queryset.filter(
                    due_date__gte=today + timedelta(days=1),
                    due_date__lte=today + timedelta(days=3),
                ).exclude(status__in=CLOSED_TICKET_STATUSES)

        return queryset.order_by("-created_at", "-id")

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            ticket = create_ticket(
                requester=request.user,
                **serializer.validated_data,
            )
        except TicketBusinessRuleError as exc:
            raise ValidationError(
                {"non_field_errors": [str(exc)]}
            ) from exc

        ticket = self._base_queryset().get(pk=ticket.pk)
        return Response(
            TicketDetailSerializer(
                ticket,
                context={"request": request},
            ).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=("post",), url_path="take")
    def take(self, request, pk=None):
        ticket = self.get_object()
        try:
            ticket = take_ticket(
                ticket=ticket,
                technician=request.user,
            )
        except TicketBusinessRuleError as exc:
            raise TicketConflict(str(exc)) from exc
        return Response(
            TicketListSerializer(ticket).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=("post",), url_path="assign")
    def assign(self, request, pk=None):
        ticket = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            ticket = assign_ticket(
                ticket=ticket,
                technician=serializer.validated_data[
                    "assigned_technician"
                ],
                actor=request.user,
            )
        except TicketBusinessRuleError as exc:
            raise TicketConflict(str(exc)) from exc
        return Response(TicketListSerializer(ticket).data)

    @action(detail=True, methods=("post",), url_path="status")
    def status(self, request, pk=None):
        ticket = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            ticket = change_ticket_status(
                ticket=ticket,
                status=serializer.validated_data["status"],
                actor=request.user,
            )
        except TicketBusinessRuleError as exc:
            raise TicketConflict(str(exc)) from exc
        return Response(TicketListSerializer(ticket).data)

    @action(detail=True, methods=("post",), url_path="comments")
    def comments(self, request, pk=None):
        ticket = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            comment = add_ticket_comment(
                ticket=ticket,
                author=request.user,
                message=serializer.validated_data["message"],
            )
        except TicketBusinessRuleError as exc:
            raise ValidationError(
                {"non_field_errors": [str(exc)]}
            ) from exc
        comment = TicketComment.objects.select_related(
            "author",
            "author_role",
        ).get(pk=comment.pk)
        return Response(
            TicketCommentSerializer(comment).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=("post",), url_path="attachments")
    def attachments(self, request, pk=None):
        ticket = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            attachment = add_ticket_attachment(
                ticket=ticket,
                uploaded_by=request.user,
                uploaded_file=serializer.validated_data["file"],
                description=serializer.validated_data.get("description"),
            )
        except TicketBusinessRuleError as exc:
            raise ValidationError(
                {"non_field_errors": [str(exc)]}
            ) from exc
        attachment = TicketAttachment.objects.select_related(
            "uploaded_by"
        ).get(pk=attachment.pk)
        return Response(
            TicketAttachmentSerializer(
                attachment,
                context={"request": request},
            ).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=("get",), url_path="history")
    def history(self, request, pk=None):
        ticket = self.get_object()
        queryset = TicketHistory.objects.filter(ticket=ticket).select_related(
            "actor"
        ).prefetch_related("changes")
        page = self.paginate_queryset(queryset)
        serializer = TicketHistorySerializer(
            page if page is not None else queryset,
            many=True,
        )
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(
        detail=True,
        methods=("get",),
        url_path=(
            r"attachments/(?P<attachment_pk>[^/.]+)/download"
        ),
        url_name="attachment-download",
    )
    def attachment_download(self, request, pk=None, attachment_pk=None):
        ticket = self.get_object()
        attachment = get_object_or_404(
            TicketAttachment,
            pk=attachment_pk,
            ticket=ticket,
        )
        try:
            file_handle = attachment.storage_path.open("rb")
        except (FileNotFoundError, OSError) as exc:
            raise Http404("El archivo adjunto no está disponible.") from exc

        return FileResponse(
            file_handle,
            as_attachment=True,
            filename=attachment.file_name,
            content_type=attachment.mime_type,
        )
