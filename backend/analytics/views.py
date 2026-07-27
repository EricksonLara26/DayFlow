"""Derived analytics endpoints backed only by operational tables."""

from rest_framework.generics import GenericAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import OpenApiParameter, extend_schema

from accounts.permissions import (
    IsAdministrator,
    PasswordChangeCompleted,
)
from config.openapi import error_responses

from .selectors import (
    get_activity_history,
    get_annual_completed_tickets,
    get_demand_by_department,
    get_due_tickets,
    get_historical,
    get_summary,
    get_technician_ranking,
    get_tickets_by_category,
)
from .serializers import (
    ActivityHistorySerializer,
    AnnualReportQuerySerializer,
    AnnualReportTicketSerializer,
    AnnualTechnicianReportResponseSerializer,
    CategoryTotalSerializer,
    DepartmentTotalSerializer,
    DueTicketSerializer,
    HistoricalSerializer,
    SummarySerializer,
    TechnicianRankingSerializer,
)


class AnalyticsAPIView(APIView):
    permission_classes = (
        IsAuthenticated,
        PasswordChangeCompleted,
    )


class SummaryView(AnalyticsAPIView):
    @extend_schema(
        tags=("Analytics",),
        summary="Resumen del dashboard",
        responses={
            200: SummarySerializer,
            **error_responses(401, 403),
        },
    )
    def get(self, request):
        return Response(SummarySerializer(get_summary(request.user)).data)


class TechnicianRankingView(AnalyticsAPIView):
    @extend_schema(
        tags=("Analytics",),
        summary="Ranking de técnicos",
        responses={
            200: TechnicianRankingSerializer(many=True),
            **error_responses(401, 403),
        },
    )
    def get(self, request):
        data = get_technician_ranking(request.user)
        return Response(TechnicianRankingSerializer(data, many=True).data)


class TicketsByCategoryView(AnalyticsAPIView):
    @extend_schema(
        tags=("Analytics",),
        summary="Tickets por categoría",
        description="Excluye tickets DISMISSED.",
        responses={
            200: CategoryTotalSerializer(many=True),
            **error_responses(401, 403),
        },
    )
    def get(self, request):
        data = get_tickets_by_category(request.user)
        return Response(CategoryTotalSerializer(data, many=True).data)


class DemandByDepartmentView(AnalyticsAPIView):
    @extend_schema(
        tags=("Analytics",),
        summary="Demanda por departamento",
        description="Excluye tickets DISMISSED.",
        responses={
            200: DepartmentTotalSerializer(many=True),
            **error_responses(401, 403),
        },
    )
    def get(self, request):
        data = get_demand_by_department(request.user)
        return Response(DepartmentTotalSerializer(data, many=True).data)


class DueTicketsView(AnalyticsAPIView):
    @extend_schema(
        tags=("Analytics",),
        summary="Tickets próximos a vencer",
        description=(
            "Tickets no terminales cuyo vencimiento está entre uno y tres "
            "días desde la fecha UTC actual."
        ),
        responses={
            200: DueTicketSerializer(many=True),
            **error_responses(401, 403),
        },
    )
    def get(self, request):
        data = get_due_tickets(request.user)
        return Response(DueTicketSerializer(data, many=True).data)


class HistoricalView(AnalyticsAPIView):
    @extend_schema(
        tags=("Analytics",),
        summary="Histórico mensual",
        responses={
            200: HistoricalSerializer(many=True),
            **error_responses(401, 403),
        },
    )
    def get(self, request):
        data = get_historical(request.user)
        return Response(HistoricalSerializer(data, many=True).data)


class ActivityHistoryView(GenericAPIView):
    permission_classes = (
        IsAuthenticated,
        PasswordChangeCompleted,
    )
    serializer_class = ActivityHistorySerializer

    @extend_schema(
        tags=("Analytics",),
        summary="Historial global de actividad",
        description=(
            "Respuesta paginada con cambios auditables de solo lectura."
        ),
        responses={
            200: ActivityHistorySerializer(many=True),
            **error_responses(401, 403),
        },
    )
    def get(self, request):
        queryset = get_activity_history(request.user)
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(
            page if page is not None else queryset,
            many=True,
        )
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)


class AnnualTechnicianReportView(AnalyticsAPIView):
    permission_classes = (
        IsAuthenticated,
        PasswordChangeCompleted,
        IsAdministrator,
    )

    @extend_schema(
        tags=("Analytics",),
        summary="Informe anual de tickets completados por técnico",
        parameters=[
            OpenApiParameter(
                "technician_id",
                int,
                required=True,
                description="ID canónico de un usuario TECHNICIAN.",
            ),
            OpenApiParameter(
                "year",
                int,
                required=True,
                description="Año de closed_at entre 2000 y 2100.",
            ),
        ],
        responses={
            200: AnnualTechnicianReportResponseSerializer,
            **error_responses(400, 401, 403),
        },
    )
    def get(self, request):
        query_serializer = AnnualReportQuerySerializer(
            data=request.query_params
        )
        query_serializer.is_valid(raise_exception=True)
        technician = query_serializer.validated_data["technician"]
        year = query_serializer.validated_data["year"]
        tickets = get_annual_completed_tickets(
            technician=technician,
            year=year,
        )
        ticket_data = AnnualReportTicketSerializer(
            tickets,
            many=True,
        ).data
        return Response(
            {
                "technician_id": technician.pk,
                "technician_name": technician.full_name,
                "year": year,
                "total_tickets": len(ticket_data),
                "tickets": ticket_data,
            }
        )
