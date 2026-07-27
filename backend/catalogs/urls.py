"""Versioned department and category routes."""

from rest_framework.routers import DefaultRouter

from .views import CategoryViewSet, DepartmentViewSet


app_name = "catalogs_api"

router = DefaultRouter()
router.register("departments", DepartmentViewSet, basename="department")
router.register("categories", CategoryViewSet, basename="category")

urlpatterns = router.urls
