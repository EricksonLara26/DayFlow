"""Versioned authentication endpoints for DayFlow."""

from datetime import datetime, timezone as datetime_timezone

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .authentication import DayFlowJWTAuthentication
from .cookies import (
    delete_refresh_cookie,
    get_refresh_cookie,
    set_refresh_cookie,
)
from .exceptions import InvalidSession
from .models import User
from .permissions import (
    CanDeactivateUser,
    CanManageUser,
    CanResetUserPassword,
    IsAdministrator,
    PasswordChangeCompleted,
)
from .role_mapping import to_canonical_role_code
from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    TemporaryPasswordSerializer,
    UserCreateSerializer,
    UserSerializer,
    UserUpdateSerializer,
)
from .services import revoke_outstanding_refresh_tokens
from catalogs.models import RoleCode


def _iso_utc(timestamp):
    value = datetime.fromtimestamp(
        int(timestamp),
        tz=datetime_timezone.utc,
    )
    return value.isoformat().replace("+00:00", "Z")


def _authentication_payload(user, refresh_token):
    access_token = refresh_token.access_token
    return {
        "token_type": "Bearer",
        "access": str(access_token),
        "access_expires_at": _iso_utc(access_token["exp"]),
        "user": UserSerializer(user).data,
    }


def _issue_authentication_response(user, *, message):
    refresh_token = RefreshToken.for_user(user)
    response = Response(
        {
            "message": message,
            **_authentication_payload(user, refresh_token),
        },
        status=status.HTTP_200_OK,
    )
    response["Cache-Control"] = "no-store"
    response["Pragma"] = "no-cache"
    set_refresh_cookie(response, refresh_token)
    return response


class LoginView(APIView):
    authentication_classes = ()
    permission_classes = (AllowAny,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "auth_login"

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return _issue_authentication_response(
            serializer.validated_data["user"],
            message="Sesión iniciada correctamente.",
        )


class RefreshView(APIView):
    authentication_classes = ()
    permission_classes = (AllowAny,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "auth_refresh"

    def post(self, request):
        encoded_token = get_refresh_cookie(request)
        if not encoded_token:
            raise InvalidSession()

        try:
            old_refresh = RefreshToken(encoded_token)
            user = DayFlowJWTAuthentication().get_user(old_refresh)
            old_refresh.blacklist()
        except (TokenError, AuthenticationFailed, User.DoesNotExist) as exc:
            raise InvalidSession() from exc

        return _issue_authentication_response(
            user,
            message="Sesión renovada correctamente.",
        )


class CurrentUserView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        user = User.objects.select_related("role", "department").get(
            pk=request.user.pk
        )
        return Response({"user": UserSerializer(user).data})


class LogoutView(APIView):
    authentication_classes = ()
    permission_classes = (AllowAny,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "auth_logout"

    def post(self, request):
        encoded_token = get_refresh_cookie(request)
        if encoded_token:
            try:
                RefreshToken(encoded_token).blacklist()
            except TokenError:
                pass

        response = Response(
            {"message": "Sesión cerrada correctamente."},
            status=status.HTTP_200_OK,
        )
        delete_refresh_cookie(response)
        return response


class ChangePasswordView(APIView):
    permission_classes = (IsAuthenticated,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "auth_password_change"

    @transaction.atomic
    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.must_change_password = False
        user.updated_at = timezone.now()
        user.save(
            update_fields=(
                "password",
                "must_change_password",
                "updated_at",
            )
        )

        revoke_outstanding_refresh_tokens(user)

        user = User.objects.select_related("role", "department").get(
            pk=user.pk
        )
        return _issue_authentication_response(
            user,
            message="Contraseña actualizada correctamente.",
        )


class UserViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """User administration without physical deletion."""

    queryset = User.objects.select_related("role", "department").all()

    def get_permissions(self):
        permission_classes = [
            IsAuthenticated,
            PasswordChangeCompleted,
        ]

        if self.action in ("list", "create"):
            permission_classes.append(IsAdministrator)
        elif self.action in ("retrieve", "update", "partial_update"):
            permission_classes.append(CanManageUser)
        elif self.action == "deactivate":
            permission_classes.append(CanDeactivateUser)
        elif self.action == "reset_password":
            permission_classes.append(CanResetUserPassword)

        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        if self.action in ("update", "partial_update"):
            return UserUpdateSerializer
        if self.action == "reset_password":
            return TemporaryPasswordSerializer
        return UserSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action != "list":
            return queryset

        search = self.request.query_params.get("search", "").strip()
        if search:
            for search_term in search.split():
                queryset = queryset.filter(
                    Q(first_name__icontains=search_term)
                    | Q(last_name__icontains=search_term)
                    | Q(username__icontains=search_term)
                    | Q(email__icontains=search_term)
                    | Q(position__icontains=search_term)
                )

        role = self.request.query_params.get("role", "").strip()
        if role and role.upper() != "ALL":
            canonical_role = to_canonical_role_code(role)
            if canonical_role not in RoleCode.values:
                raise ValidationError(
                    {"role": ["El código de rol no es válido."]}
                )
            queryset = queryset.filter(role__code=canonical_role)

        department = self.request.query_params.get("department", "").strip()
        if department and department.upper() != "ALL":
            if not department.isdigit():
                raise ValidationError(
                    {"department": ["Debe ser un ID válido."]}
                )
            queryset = queryset.filter(department_id=int(department))

        active = self.request.query_params.get("is_active", "").strip()
        if active and active.upper() != "ALL":
            normalized_active = active.lower()
            if normalized_active not in ("true", "false"):
                raise ValidationError(
                    {
                        "is_active": [
                            "Usa true, false o ALL para filtrar por estado."
                        ]
                    }
                )
            queryset = queryset.filter(active=normalized_active == "true")

        ordering = self.request.query_params.get(
            "ordering",
            "username",
        )
        allowed_ordering = {
            "username",
            "-username",
            "first_name",
            "-first_name",
            "last_name",
            "-last_name",
            "created_at",
            "-created_at",
        }
        if ordering not in allowed_ordering:
            raise ValidationError(
                {"ordering": ["El orden solicitado no está permitido."]}
            )

        return queryset.order_by(ordering, "id")

    @action(detail=True, methods=("post",), url_path="deactivate")
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.active = False
        user.updated_at = timezone.now()
        user.save(update_fields=("active", "updated_at"))
        revoke_outstanding_refresh_tokens(user)
        return Response(
            {
                "message": "Usuario desactivado correctamente.",
                "user": UserSerializer(user).data,
            }
        )

    @action(
        detail=True,
        methods=("post",),
        url_path="reset-password",
    )
    @transaction.atomic
    def reset_password(self, request, pk=None):
        user = self.get_object()
        serializer = self.get_serializer(
            data=request.data,
            context={"request": request, "user": user},
        )
        serializer.is_valid(raise_exception=True)

        user.set_password(serializer.validated_data["temporary_password"])
        user.must_change_password = True
        user.updated_at = timezone.now()
        user.save(
            update_fields=(
                "password",
                "must_change_password",
                "updated_at",
            )
        )
        revoke_outstanding_refresh_tokens(user)

        user = self.get_queryset().get(pk=user.pk)
        return Response(
            {
                "message": "Contraseña temporal asignada correctamente.",
                "user": UserSerializer(user).data,
            }
        )
