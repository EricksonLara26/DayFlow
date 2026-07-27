"""Versioned analytics routes."""

from django.urls import path

from .views import (
    ActivityHistoryView,
    AnnualTechnicianReportView,
    DemandByDepartmentView,
    DueTicketsView,
    HistoricalView,
    SummaryView,
    TechnicianRankingView,
    TicketsByCategoryView,
)


app_name = "analytics"

urlpatterns = [
    path("summary/", SummaryView.as_view(), name="summary"),
    path(
        "technician-ranking/",
        TechnicianRankingView.as_view(),
        name="technician-ranking",
    ),
    path(
        "tickets-by-category/",
        TicketsByCategoryView.as_view(),
        name="tickets-by-category",
    ),
    path(
        "demand-by-department/",
        DemandByDepartmentView.as_view(),
        name="demand-by-department",
    ),
    path("due-tickets/", DueTicketsView.as_view(), name="due-tickets"),
    path("historical/", HistoricalView.as_view(), name="historical"),
    path(
        "activity-history/",
        ActivityHistoryView.as_view(),
        name="activity-history",
    ),
    path(
        "annual-technician-report/",
        AnnualTechnicianReportView.as_view(),
        name="annual-technician-report",
    ),
]
