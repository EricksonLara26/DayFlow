"""Serializers for DayFlow accounts."""

from django.contrib.auth import password_validation
from django.contrib.auth.base_user import BaseUserManager
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from rest_framework import serializers

from catalogs.models import Department, Role, RoleCode

from .exceptions import InvalidCredentials
from .models import User
from .role_mapping import to_canonical_role_code


class CanonicalRoleRelatedField(serializers.SlugRelatedField):
    """Accept legacy frontend role values but persist canonical codes."""

    def to_internal_value(self, data):
        return super().to_internal_value(to_canonical_role_code(data))


class UserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source="role.code", read_only=True)
    department = serializers.PrimaryKeyRelatedField(read_only=True)
    is_active = serializers.BooleanField(source="active", read_only=True)
    full_name = serializers.CharField(read_only=True)
    role_name = serializers.CharField(
        source="role.get_code_display",
        read_only=True,
    )
    department_name = serializers.CharField(
        source="department.name",
        read_only=True,
    )

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "position",
            "department",
            "department_name",
            "role",
            "role_name",
            "is_active",
            "must_change_password",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class UserCreateSerializer(UserSerializer):
    role = CanonicalRoleRelatedField(
        slug_field="code",
        queryset=Role.objects.filter(active=True),
    )
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.filter(active=True),
    )
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    class Meta(UserSerializer.Meta):
        fields = (*UserSerializer.Meta.fields, "password")
        read_only_fields = (
            "id",
            "is_active",
            "must_change_password",
            "created_at",
            "updated_at",
        )

    def validate_username(self, value):
        normalized = User.normalize_username(value.strip())
        if User.objects.filter(username__iexact=normalized).exists():
            raise serializers.ValidationError(
                "Ese nombre de usuario ya existe."
            )
        return normalized

    def validate_email(self, value):
        normalized = BaseUserManager.normalize_email(value.strip()).lower()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError(
                "Ese correo ya está en uso."
            )
        return normalized

    def validate_role(self, value):
        if value.code == RoleCode.ADMINISTRATOR:
            raise serializers.ValidationError(
                "Los administradores se crean mediante createsuperuser."
            )
        return value

    def validate(self, attrs):
        candidate_user = User(
            username=attrs.get("username", ""),
            email=attrs.get("email", ""),
            first_name=attrs.get("first_name", ""),
            last_name=attrs.get("last_name", ""),
        )
        try:
            password_validation.validate_password(
                attrs["password"],
                candidate_user,
            )
        except DjangoValidationError as exc:
            raise serializers.ValidationError(
                {"password": list(exc.messages)}
            ) from exc
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(
            password=password,
            **validated_data,
        )


class UserUpdateSerializer(UserSerializer):
    role = CanonicalRoleRelatedField(
        slug_field="code",
        queryset=Role.objects.filter(active=True),
    )
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.filter(active=True),
    )

    class Meta(UserSerializer.Meta):
        read_only_fields = (
            "id",
            "username",
            "is_active",
            "must_change_password",
            "created_at",
            "updated_at",
        )

    def validate_email(self, value):
        normalized = BaseUserManager.normalize_email(value.strip()).lower()
        queryset = User.objects.filter(email__iexact=normalized).exclude(
            pk=self.instance.pk
        )
        if queryset.exists():
            raise serializers.ValidationError(
                "Ese correo ya está en uso."
            )
        return normalized

    def validate(self, attrs):
        actor = self.context["request"].user
        requested_role = attrs.get("role")

        if requested_role and requested_role.pk != self.instance.role_id:
            actor_role = actor.role.code
            if actor_role != RoleCode.ADMINISTRATOR:
                raise serializers.ValidationError(
                    {"role": "Solo un administrador puede cambiar el rol."}
                )
            if actor.pk == self.instance.pk:
                raise serializers.ValidationError(
                    {"role": "No puedes cambiar tu propio rol."}
                )

        return attrs


class TemporaryPasswordSerializer(serializers.Serializer):
    temporary_password = serializers.CharField(
        trim_whitespace=False,
        write_only=True,
    )
    confirm_password = serializers.CharField(
        trim_whitespace=False,
        write_only=True,
    )

    def validate(self, attrs):
        temporary_password = attrs["temporary_password"]
        if temporary_password != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {
                    "confirm_password": (
                        "La confirmación de contraseña no coincide."
                    )
                }
            )

        try:
            password_validation.validate_password(
                temporary_password,
                self.context["user"],
            )
        except DjangoValidationError as exc:
            raise serializers.ValidationError(
                {"temporary_password": list(exc.messages)}
            ) from exc

        return attrs


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(
        max_length=254,
        trim_whitespace=True,
        write_only=True,
    )
    password = serializers.CharField(
        trim_whitespace=False,
        write_only=True,
    )

    def validate(self, attrs):
        identifier = attrs["identifier"].strip()
        password = attrs["password"]
        users = list(
            User.objects.select_related("role", "department")
            .filter(
                Q(username__iexact=identifier)
                | Q(email__iexact=identifier)
            )
            .order_by("id")[:2]
        )

        if len(users) == 1:
            user = users[0]
            password_matches = user.check_password(password)
        else:
            # Perform a hash even for an unknown or ambiguous identifier so
            # failures have a similar computational cost.
            dummy_user = User()
            dummy_user.set_password(password)
            user = None
            password_matches = False

        if not user or not password_matches or not user.is_active:
            raise InvalidCredentials()

        attrs["user"] = user
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(
        trim_whitespace=False,
        write_only=True,
    )
    new_password = serializers.CharField(
        trim_whitespace=False,
        write_only=True,
    )
    confirm_password = serializers.CharField(
        trim_whitespace=False,
        write_only=True,
    )

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError(
                "La contraseña actual no es correcta."
            )
        return value

    def validate(self, attrs):
        current_password = attrs["current_password"]
        new_password = attrs["new_password"]
        confirm_password = attrs["confirm_password"]

        if new_password != confirm_password:
            raise serializers.ValidationError(
                {
                    "confirm_password": (
                        "La confirmación de contraseña no coincide."
                    )
                }
            )

        if new_password == current_password:
            raise serializers.ValidationError(
                {
                    "new_password": (
                        "La nueva contraseña debe ser diferente a la actual."
                    )
                }
            )

        try:
            password_validation.validate_password(
                new_password,
                self.context["request"].user,
            )
        except DjangoValidationError as exc:
            raise serializers.ValidationError(
                {"new_password": list(exc.messages)}
            ) from exc

        return attrs


class AuthenticationResponseSerializer(serializers.Serializer):
    """Document the access-token response; refresh stays in HttpOnly cookie."""

    message = serializers.CharField()
    token_type = serializers.CharField()
    access = serializers.CharField()
    access_expires_at = serializers.DateTimeField()
    user = UserSerializer()


class CurrentUserResponseSerializer(serializers.Serializer):
    user = UserSerializer()


class UserActionResponseSerializer(serializers.Serializer):
    message = serializers.CharField()
    user = UserSerializer()
