"""Serializers for DayFlow's administrable catalogs."""

from rest_framework import serializers

from .models import Category, Department, normalize_catalog_name


class NamedCatalogSerializer(serializers.ModelSerializer):
    class Meta:
        fields = (
            "id",
            "name",
            "description",
            "active",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "active",
            "created_at",
            "updated_at",
        )

    def validate_name(self, value):
        normalized = normalize_catalog_name(value)
        if not normalized:
            raise serializers.ValidationError(
                "El nombre no puede estar vacío."
            )

        queryset = self.Meta.model.objects.filter(name=normalized)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError(
                "Ya existe un elemento con este nombre."
            )
        return normalized

    def validate_description(self, value):
        if value is None:
            return None
        return value.strip() or None


class DepartmentSerializer(NamedCatalogSerializer):
    class Meta(NamedCatalogSerializer.Meta):
        model = Department


class CategorySerializer(NamedCatalogSerializer):
    class Meta(NamedCatalogSerializer.Meta):
        model = Category


class DepartmentActionResponseSerializer(serializers.Serializer):
    message = serializers.CharField()
    data = DepartmentSerializer()


class CategoryActionResponseSerializer(serializers.Serializer):
    message = serializers.CharField()
    data = CategorySerializer()
