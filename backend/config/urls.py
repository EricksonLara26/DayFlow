"""Root URL configuration for DayFlow."""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)


urlpatterns = [
    path("admin/", admin.site.urls),
    path(
        "api/v1/schema/",
        SpectacularAPIView.as_view(),
        name="openapi-schema",
    ),
    path(
        "api/v1/docs/",
        SpectacularSwaggerView.as_view(url_name="openapi-schema"),
        name="openapi-swagger",
    ),
    path(
        "api/v1/redoc/",
        SpectacularRedocView.as_view(url_name="openapi-schema"),
        name="openapi-redoc",
    ),
    path("api/v1/auth/", include("accounts.urls")),
    path("api/v1/", include("accounts.api_urls")),
    path("api/v1/", include("catalogs.urls")),
    path("api/v1/", include("tickets.urls")),
    path("api/v1/analytics/", include("analytics.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
