"""Versioned catalog endpoints with logical deactivation."""

from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import (
    OpenApiParameter,
    extend_schema,
    extend_schema_view,
)

from accounts.permissions import (
    IsAdministrator,
    PasswordChangeCompleted,
    is_administrator,
)
from config.openapi import error_responses

from .models import Category, Department
from .serializers import (
    CategoryActionResponseSerializer,
    CategorySerializer,
    DepartmentActionResponseSerializer,
    DepartmentSerializer,
)


class NamedCatalogViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Expose active values to forms and administration to administrators."""

    def get_permissions(self):
        permission_classes = [
            IsAuthenticated,
            PasswordChangeCompleted,
        ]
        if self.action in (
            "create",
            "update",
            "partial_update",
            "activate",
            "deactivate",
        ):
            permission_classes.append(IsAdministrator)
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = super().get_queryset()
        administrator = is_administrator(self.request.user)

        if self.action != "list":
            return queryset if administrator else queryset.active()

        active = self.request.query_params.get("active", "").strip().lower()
        if not administrator or not active:
            queryset = queryset.active()
        elif active == "true":
            queryset = queryset.active()
        elif active == "false":
            queryset = queryset.inactive()
        elif active != "all":
            raise ValidationError(
                {
                    "active": [
                        "Usa true, false o all para filtrar por estado."
                    ]
                }
            )

        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(name__icontains=search)

        return queryset.order_by("name", "id")

    @action(detail=True, methods=("post",), url_path="deactivate")
    def deactivate(self, request, pk=None):
        catalog = self.get_object()
        catalog.deactivate()
        return Response(
            {
                "message": "Elemento desactivado correctamente.",
                "data": self.get_serializer(catalog).data,
            }
        )

    @action(detail=True, methods=("post",), url_path="activate")
    def activate(self, request, pk=None):
        catalog = self.get_object()
        catalog.activate()
        return Response(
            {
                "message": "Elemento activado correctamente.",
                "data": self.get_serializer(catalog).data,
            }
        )


def catalog_openapi(*, serializer_class, action_serializer, label):
    """Apply the same explicit contract to both catalog resources."""
    return extend_schema_view(
        list=extend_schema(
            tags=("Catalogs",),
            summary=f"Listar {label}",
            parameters=[
                OpenApiParameter(
                    "active",
                    str,
                    enum=("true", "false", "all"),
                    description=(
                        "Solo administradores pueden consultar inactivos."
                    ),
                ),
                OpenApiParameter("search", str),
            ],
            responses={
                200: serializer_class(many=True),
                **error_responses(400, 401, 403),
            },
        ),
        create=extend_schema(
            tags=("Catalogs",),
            summary=f"Crear {label}",
            request=serializer_class,
            responses={
                201: serializer_class,
                **error_responses(400, 401, 403),
            },
        ),
        retrieve=extend_schema(
            tags=("Catalogs",),
            summary=f"Consultar {label}",
            responses={
                200: serializer_class,
                **error_responses(401, 403, 404),
            },
        ),
        update=extend_schema(
            tags=("Catalogs",),
            summary=f"Actualizar {label}",
            request=serializer_class,
            responses={
                200: serializer_class,
                **error_responses(400, 401, 403, 404),
            },
        ),
        partial_update=extend_schema(
            tags=("Catalogs",),
            summary=f"Actualizar parcialmente {label}",
            request=serializer_class,
            responses={
                200: serializer_class,
                **error_responses(400, 401, 403, 404),
            },
        ),
        activate=extend_schema(
            tags=("Catalogs",),
            summary=f"Activar {label}",
            request=None,
            responses={
                200: action_serializer,
                **error_responses(401, 403, 404),
            },
        ),
        deactivate=extend_schema(
            tags=("Catalogs",),
            summary=f"Desactivar {label}",
            request=None,
            responses={
                200: action_serializer,
                **error_responses(401, 403, 404),
            },
        ),
    )


@catalog_openapi(
    serializer_class=DepartmentSerializer,
    action_serializer=DepartmentActionResponseSerializer,
    label="departamentos",
)
class DepartmentViewSet(NamedCatalogViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer


@catalog_openapi(
    serializer_class=CategorySerializer,
    action_serializer=CategoryActionResponseSerializer,
    label="categorías",
)
class CategoryViewSet(NamedCatalogViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
