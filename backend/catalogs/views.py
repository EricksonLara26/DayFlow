"""Versioned catalog endpoints with logical deactivation."""

from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import (
    IsAdministrator,
    PasswordChangeCompleted,
    is_administrator,
)

from .models import Category, Department
from .serializers import CategorySerializer, DepartmentSerializer


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


class DepartmentViewSet(NamedCatalogViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer


class CategoryViewSet(NamedCatalogViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
