"""Helpers for the HttpOnly refresh-token cookie."""

from django.conf import settings


def set_refresh_cookie(response, refresh_token):
    response.set_cookie(
        key=settings.JWT_REFRESH_COOKIE_NAME,
        value=str(refresh_token),
        max_age=int(refresh_token.lifetime.total_seconds()),
        httponly=True,
        secure=settings.JWT_REFRESH_COOKIE_SECURE,
        samesite=settings.JWT_REFRESH_COOKIE_SAMESITE,
        path=settings.JWT_REFRESH_COOKIE_PATH,
    )


def delete_refresh_cookie(response):
    response.delete_cookie(
        key=settings.JWT_REFRESH_COOKIE_NAME,
        path=settings.JWT_REFRESH_COOKIE_PATH,
        samesite=settings.JWT_REFRESH_COOKIE_SAMESITE,
    )
    expired_cookie = response.cookies[settings.JWT_REFRESH_COOKIE_NAME]
    expired_cookie["httponly"] = True
    if settings.JWT_REFRESH_COOKIE_SECURE:
        expired_cookie["secure"] = True


def get_refresh_cookie(request):
    return request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
