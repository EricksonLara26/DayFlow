"""Load a stable academic data set without removing existing records."""

from datetime import date, datetime, timedelta, timezone as datetime_timezone

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from catalogs.models import Category, Department, Role, RoleCode
from tickets.constants import (
    TicketHistoryAction,
    TicketPriority,
    TicketStatus,
)
from tickets.models import (
    Ticket,
    TicketAttachment,
    TicketComment,
    TicketHistory,
    TicketHistoryChange,
)


DEMO_USERS = (
    (
        "demo_admin_academico",
        "Clara",
        "Jiménez",
        "ADMINISTRATOR",
        "Administración",
        "Coordinadora de servicios",
    ),
    (
        "demo_tecnico_ana",
        "Ana",
        "Rosario",
        "TECHNICIAN",
        "Tecnología",
        "Especialista de soporte",
    ),
    (
        "demo_tecnico_luis",
        "Luis",
        "Mejía",
        "TECHNICIAN",
        "Soporte Técnico",
        "Técnico de redes",
    ),
    (
        "demo_tecnico_marta",
        "Marta",
        "Valdez",
        "TECHNICIAN",
        "Tecnología",
        "Analista de aplicaciones",
    ),
    (
        "demo_tecnico_jose",
        "José",
        "Santana",
        "TECHNICIAN",
        "Soporte Técnico",
        "Técnico de hardware",
    ),
    (
        "demo_tecnico_carla",
        "Carla",
        "Núñez",
        "TECHNICIAN",
        "Tecnología",
        "Especialista de accesos",
    ),
    (
        "demo_empleado_elena",
        "Elena",
        "Cruz",
        "EMPLOYEE",
        "Administración",
        "Analista administrativa",
    ),
    (
        "demo_empleado_miguel",
        "Miguel",
        "Paredes",
        "EMPLOYEE",
        "Operaciones",
        "Supervisor de operaciones",
    ),
    (
        "demo_empleado_sofia",
        "Sofía",
        "Herrera",
        "EMPLOYEE",
        "Ventas",
        "Ejecutiva de ventas",
    ),
    (
        "demo_empleado_daniel",
        "Daniel",
        "Ruiz",
        "EMPLOYEE",
        "Tecnología",
        "Documentador de TI",
    ),
    (
        "demo_empleado_paola",
        "Paola",
        "Gómez",
        "EMPLOYEE",
        "Operaciones",
        "Coordinadora logística",
    ),
    (
        "demo_empleado_ricardo",
        "Ricardo",
        "Díaz",
        "EMPLOYEE",
        "Ventas",
        "Representante comercial",
    ),
    (
        "demo_empleado_lucia",
        "Lucía",
        "Fernández",
        "EMPLOYEE",
        "Administración",
        "Asistente de gerencia",
    ),
    (
        "demo_empleado_andres",
        "Andrés",
        "Castillo",
        "EMPLOYEE",
        "Soporte Técnico",
        "Coordinador de mesa",
    ),
    (
        "demo_empleado_valentina",
        "Valentina",
        "Reyes",
        "EMPLOYEE",
        "Ventas",
        "Analista comercial",
    ),
)


DEMO_TICKETS = (
    {
        "number": 1,
        "title": "Error al conciliar facturas de enero",
        "description": (
            "El módulo contable no permite conciliar tres facturas "
            "del cierre mensual."
        ),
        "category": "Software",
        "requester": "demo_empleado_elena",
        "technician": "demo_tecnico_marta",
        "status": TicketStatus.COMPLETED,
        "priority": TicketPriority.HIGH,
        "created": (1, 8),
        "due": date(2026, 1, 20),
        "closed_days": 8,
    },
    {
        "number": 2,
        "title": "Acceso temporal para auditoría interna",
        "description": (
            "Se solicitó acceso de solo lectura para una revisión que "
            "finalmente fue cancelada."
        ),
        "category": "Accesos",
        "requester": "demo_empleado_daniel",
        "technician": "demo_tecnico_carla",
        "status": TicketStatus.DISMISSED,
        "priority": TicketPriority.LOW,
        "created": (1, 18),
        "due": date(2026, 1, 25),
        "closed_days": 3,
    },
    {
        "number": 3,
        "title": "Estación de empaque no enciende",
        "description": (
            "El equipo del área de despacho no responde al botón de "
            "encendido después de una variación eléctrica."
        ),
        "category": "Hardware",
        "requester": "demo_empleado_miguel",
        "technician": "demo_tecnico_jose",
        "status": TicketStatus.COMPLETED,
        "priority": TicketPriority.CRITICAL,
        "created": (2, 4),
        "due": date(2026, 2, 12),
        "closed_days": 2,
    },
    {
        "number": 4,
        "title": "Intermitencia de VPN en almacén",
        "description": (
            "La conexión VPN se desconecta durante la actualización "
            "del inventario."
        ),
        "category": "Redes",
        "requester": "demo_empleado_paola",
        "technician": "demo_tecnico_luis",
        "status": TicketStatus.ON_HOLD,
        "priority": TicketPriority.HIGH,
        "created": (2, 16),
        "due": date(2026, 3, 1),
    },
    {
        "number": 5,
        "title": "Lentitud general en portal de soporte",
        "description": (
            "El portal tarda más de treinta segundos al consultar "
            "solicitudes recientes."
        ),
        "category": "Soporte Técnico",
        "requester": "demo_empleado_sofia",
        "technician": "demo_tecnico_ana",
        "status": TicketStatus.IN_PROGRESS,
        "priority": TicketPriority.MEDIUM,
        "created": (3, 6),
        "due": date(2026, 3, 20),
    },
    {
        "number": 6,
        "title": "Impresora de recepción deja franjas",
        "description": (
            "Las órdenes impresas muestran franjas verticales y texto "
            "poco legible."
        ),
        "category": "Impresoras",
        "requester": "demo_empleado_lucia",
        "technician": None,
        "status": TicketStatus.OPEN,
        "priority": TicketPriority.MEDIUM,
        "created": (3, 12),
        "due": date(2026, 3, 18),
    },
    {
        "number": 7,
        "title": "Firma corporativa desactualizada",
        "description": (
            "La firma del buzón de operaciones conserva el teléfono "
            "anterior."
        ),
        "category": "Correo",
        "requester": "demo_empleado_andres",
        "technician": "demo_tecnico_carla",
        "status": TicketStatus.COMPLETED,
        "priority": TicketPriority.LOW,
        "created": (4, 8),
        "due": date(2026, 4, 18),
        "closed_days": 4,
    },
    {
        "number": 8,
        "title": "Consulta sobre equipo personal en oficina",
        "description": (
            "Se consultó la posibilidad de usar un equipo personal; "
            "la solicitud quedó fuera del alcance del servicio."
        ),
        "category": "Otro",
        "requester": "demo_empleado_valentina",
        "technician": "demo_tecnico_ana",
        "status": TicketStatus.DISMISSED,
        "priority": TicketPriority.LOW,
        "created": (4, 21),
        "due": date(2026, 4, 30),
        "closed_days": 2,
    },
    {
        "number": 9,
        "title": "Licencia de hoja de cálculo pendiente",
        "description": (
            "La renovación fue aprobada y está en espera de la orden "
            "del proveedor."
        ),
        "category": "Software",
        "requester": "demo_empleado_ricardo",
        "technician": "demo_tecnico_marta",
        "status": TicketStatus.ON_HOLD,
        "priority": TicketPriority.MEDIUM,
        "created": (5, 5),
        "due": date(2026, 5, 25),
    },
    {
        "number": 10,
        "title": "Lector de códigos pierde conexión",
        "description": (
            "El lector USB se desconecta varias veces durante el turno "
            "de despacho."
        ),
        "category": "Hardware",
        "requester": "demo_empleado_miguel",
        "technician": "demo_tecnico_jose",
        "status": TicketStatus.IN_PROGRESS,
        "priority": TicketPriority.HIGH,
        "created": (5, 14),
        "due": date(2026, 5, 29),
    },
    {
        "number": 11,
        "title": "Punto de red habilitado para sala de ventas",
        "description": (
            "Se habilitó y certificó un punto adicional para las "
            "presentaciones comerciales."
        ),
        "category": "Redes",
        "requester": "demo_empleado_sofia",
        "technician": "demo_tecnico_luis",
        "status": TicketStatus.COMPLETED,
        "priority": TicketPriority.MEDIUM,
        "created": (6, 2),
        "due": date(2026, 6, 14),
        "closed_days": 5,
    },
    {
        "number": 12,
        "title": "Cuenta duplicada reportada por ventas",
        "description": (
            "La revisión confirmó que era un alias válido y no "
            "requería una cuenta adicional."
        ),
        "category": "Accesos",
        "requester": "demo_empleado_ricardo",
        "technician": "demo_tecnico_carla",
        "status": TicketStatus.DISMISSED,
        "priority": TicketPriority.LOW,
        "created": (6, 9),
        "due": date(2026, 6, 21),
        "closed_days": 3,
    },
    {
        "number": 13,
        "title": "Error de sincronización en tablero comercial",
        "description": (
            "Los indicadores diarios no reflejan las oportunidades "
            "registradas esta mañana."
        ),
        "category": "Soporte Técnico",
        "requester": "demo_empleado_valentina",
        "technician": None,
        "status": TicketStatus.OPEN,
        "priority": TicketPriority.CRITICAL,
        "created": (7, 20),
        "due": date(2026, 7, 30),
    },
    {
        "number": 14,
        "title": "Atasco recurrente en impresora de almacén",
        "description": (
            "La bandeja dos presenta atascos al imprimir lotes de más "
            "de veinte páginas."
        ),
        "category": "Impresoras",
        "requester": "demo_empleado_paola",
        "technician": "demo_tecnico_jose",
        "status": TicketStatus.IN_PROGRESS,
        "priority": TicketPriority.HIGH,
        "created": (7, 21),
        "due": date(2026, 7, 29),
    },
    {
        "number": 15,
        "title": "Buzón compartido alcanza límite de espacio",
        "description": (
            "El buzón de servicio al cliente no recibe mensajes y "
            "requiere depuración autorizada."
        ),
        "category": "Correo",
        "requester": "demo_empleado_elena",
        "technician": "demo_tecnico_ana",
        "status": TicketStatus.ON_HOLD,
        "priority": TicketPriority.HIGH,
        "created": (7, 22),
        "due": date(2026, 7, 31),
    },
    {
        "number": 16,
        "title": "Solicitud vencida de periférico adicional",
        "description": (
            "La solicitud de un segundo monitor sigue abierta desde "
            "junio y requiere decisión presupuestaria."
        ),
        "category": "Otro",
        "requester": "demo_empleado_daniel",
        "technician": None,
        "status": TicketStatus.OPEN,
        "priority": TicketPriority.LOW,
        "created": (6, 17),
        "due": date(2026, 6, 25),
    },
    {
        "number": 17,
        "title": "Actualización del agente de seguridad",
        "description": (
            "Se instaló la versión aprobada del agente en el equipo "
            "del área administrativa."
        ),
        "category": "Soporte Técnico",
        "requester": "demo_empleado_lucia",
        "technician": "demo_tecnico_marta",
        "status": TicketStatus.COMPLETED,
        "priority": TicketPriority.MEDIUM,
        "created": (5, 24),
        "due": date(2026, 6, 3),
        "closed_days": 6,
    },
    {
        "number": 18,
        "title": "Preparación de equipo para nueva contratación",
        "description": (
            "Se requiere configurar estación, periféricos y acceso "
            "básico antes del ingreso programado."
        ),
        "category": "Hardware",
        "requester": "demo_empleado_andres",
        "technician": None,
        "status": TicketStatus.OPEN,
        "priority": TicketPriority.MEDIUM,
        "created": (7, 24),
        "due": date(2026, 8, 10),
    },
)


DEMO_COMMENTS = (
    "Se adjuntó el detalle necesario para reproducir la incidencia.",
    "La solicitud fue revisada con la persona responsable del área.",
    "El equipo quedó disponible para diagnóstico durante la mañana.",
    "La falla se presenta únicamente al trabajar fuera de la oficina.",
    "Se confirmó la lentitud desde dos estaciones diferentes.",
    "Recepción autorizó una ventana de mantenimiento al mediodía.",
    "La nueva información corporativa fue validada por Operaciones.",
    "Se documentó la razón de cierre para futuras consultas.",
    "Compras confirmó que la licencia está incluida en la orden mensual.",
    "El lector de reemplazo también fue probado en el mismo puerto.",
    "Ventas validó la conectividad después de la instalación.",
    "Se verificó que el alias entrega mensajes correctamente.",
    "El reporte incluye ejemplos de oportunidades no sincronizadas.",
    "Se limpió la bandeja, pero el atasco volvió a presentarse.",
    "Administración aprobó conservar los mensajes del último trimestre.",
    "La solicitud permanece abierta hasta recibir disponibilidad.",
    "La versión instalada aparece correctamente en la consola.",
    "Recursos asignó la fecha de ingreso y confirmó los accesos básicos.",
)


def _demo_datetime(month, day, hour=9):
    return datetime(
        2026,
        month,
        day,
        hour,
        0,
        tzinfo=datetime_timezone.utc,
    )


def _stringify(value):
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


class Command(BaseCommand):
    help = (
        "Añade un conjunto académico idempotente sin borrar los datos "
        "existentes."
    )

    def handle(self, *args, **options):
        with transaction.atomic():
            roles = self._canonical_roles()
            departments = self._departments()
            categories = self._categories()
            users = self._ensure_users(roles, departments)
            tickets = self._ensure_tickets(users, categories)
            self._ensure_comments(tickets, users)
            self._ensure_attachments(tickets, users)

        self.stdout.write(
            self.style.SUCCESS(
                "Datos académicos listos: "
                f"{get_user_model().objects.count()} usuarios, "
                f"{Ticket.objects.count()} tickets, "
                f"{TicketComment.objects.count()} comentarios, "
                f"{TicketHistory.objects.count()} eventos, "
                f"{TicketHistoryChange.objects.count()} cambios y "
                f"{TicketAttachment.objects.count()} adjuntos."
            )
        )

    @staticmethod
    def _canonical_roles():
        expected_codes = set(RoleCode.values)
        roles = {
            role.code: role
            for role in Role.objects.filter(code__in=expected_codes)
        }
        stored_codes = set(Role.objects.values_list("code", flat=True))
        if stored_codes != expected_codes or set(roles) != expected_codes:
            raise CommandError(
                "La base debe contener únicamente los tres roles canónicos."
            )
        return roles

    @staticmethod
    def _departments():
        exact_names = {item[4] for item in DEMO_USERS}
        departments = {
            department.name: department
            for department in Department.objects.filter(name__in=exact_names)
        }
        if set(departments) != exact_names:
            raise CommandError(
                "Ejecute las migraciones para normalizar los departamentos."
            )
        return departments

    @staticmethod
    def _categories():
        exact_names = {item["category"] for item in DEMO_TICKETS}
        categories = {
            category.name: category
            for category in Category.objects.filter(name__in=exact_names)
        }
        if set(categories) != exact_names:
            raise CommandError(
                "No están disponibles todas las categorías aprobadas."
            )
        return categories

    @staticmethod
    def _ensure_users(roles, departments):
        User = get_user_model()
        users = {}
        for (
            username,
            first_name,
            last_name,
            role_code,
            department_name,
            position,
        ) in DEMO_USERS:
            user = User.objects.filter(username=username).first()
            created = user is None
            if created:
                user = User(username=username)

            desired_values = {
                "email": f"{username}@demo.dayflow.local",
                "first_name": first_name,
                "last_name": last_name,
                "role": roles[role_code],
                "department": departments[department_name],
                "position": position,
                "active": True,
                "must_change_password": False,
            }
            changed_fields = []
            for field_name, value in desired_values.items():
                current_value = getattr(user, field_name, None)
                if current_value != value:
                    setattr(user, field_name, value)
                    changed_fields.append(field_name)

            if created or user.has_usable_password():
                user.set_unusable_password()
                changed_fields.append("password")

            if created:
                user.save()
            elif changed_fields:
                user.save(
                    update_fields=tuple(
                        dict.fromkeys((*changed_fields, "updated_at"))
                    )
                )
            users[username] = user
        return users

    def _ensure_tickets(self, users, categories):
        tickets = {}
        for spec in DEMO_TICKETS:
            title = (
                f"[Demo académico {spec['number']:02d}] {spec['title']}"
            )
            requester = users[spec["requester"]]
            technician = (
                users[spec["technician"]]
                if spec["technician"] is not None
                else None
            )
            ticket = (
                Ticket.objects.filter(title=title)
                .order_by("id")
                .first()
            )
            if ticket is None:
                ticket = Ticket.objects.create(
                    title=title,
                    description=spec["description"],
                    category=categories[spec["category"]],
                    status=TicketStatus.OPEN,
                    priority=spec["priority"],
                    requester=requester,
                    requester_department=requester.department,
                    due_date=None,
                )

            created_at = _demo_datetime(*spec["created"])
            taken_at = (
                created_at + timedelta(days=1)
                if technician is not None
                else None
            )
            closed_at = (
                created_at + timedelta(days=spec["closed_days"])
                if "closed_days" in spec
                else None
            )
            updated_at = (
                closed_at
                or taken_at
                or created_at
            ) + timedelta(hours=2)
            Ticket.objects.filter(pk=ticket.pk).update(
                title=title,
                description=spec["description"],
                category=categories[spec["category"]],
                status=spec["status"],
                priority=spec["priority"],
                requester=requester,
                assigned_technician=technician,
                requester_department=requester.department,
                created_at=created_at,
                updated_at=updated_at,
                taken_at=taken_at,
                closed_at=closed_at,
                due_date=spec["due"],
            )
            ticket.refresh_from_db()
            tickets[spec["number"]] = ticket

            self._ensure_ticket_history(
                ticket=ticket,
                requester=requester,
                technician=technician,
                spec=spec,
                created_at=created_at,
                taken_at=taken_at,
                closed_at=closed_at,
            )
        return tickets

    def _ensure_ticket_history(
        self,
        *,
        ticket,
        requester,
        technician,
        spec,
        created_at,
        taken_at,
        closed_at,
    ):
        self._ensure_history(
            ticket=ticket,
            actor=requester,
            action_code=TicketHistoryAction.CREATED,
            created_at=created_at,
        )
        if technician is not None:
            self._ensure_history(
                ticket=ticket,
                actor=technician,
                action_code=TicketHistoryAction.ASSIGNED,
                created_at=taken_at,
                changes=(
                    (
                        "assigned_technician_id",
                        None,
                        technician.pk,
                    ),
                    ("status", TicketStatus.OPEN, TicketStatus.IN_PROGRESS),
                    ("taken_at", None, taken_at),
                ),
            )
        if spec["status"] not in (
            TicketStatus.OPEN,
            TicketStatus.IN_PROGRESS,
        ):
            prior_status = (
                TicketStatus.IN_PROGRESS
                if technician is not None
                else TicketStatus.OPEN
            )
            status_changed_at = (
                closed_at
                or (taken_at + timedelta(days=1))
                or (created_at + timedelta(days=1))
            )
            changes = [
                ("status", prior_status, spec["status"]),
            ]
            if closed_at is not None:
                changes.append(("closed_at", None, closed_at))
            self._ensure_history(
                ticket=ticket,
                actor=technician or requester,
                action_code=TicketHistoryAction.STATUS_CHANGED,
                created_at=status_changed_at,
                changes=tuple(changes),
            )
        if spec["number"] % 3 == 0:
            old_priority = (
                TicketPriority.LOW
                if spec["priority"] != TicketPriority.LOW
                else TicketPriority.MEDIUM
            )
            self._ensure_history(
                ticket=ticket,
                actor=technician or requester,
                action_code=TicketHistoryAction.PRIORITY_CHANGED,
                created_at=created_at + timedelta(hours=4),
                changes=(
                    ("priority", old_priority, spec["priority"]),
                ),
            )

    @staticmethod
    def _ensure_history(
        *,
        ticket,
        actor,
        action_code,
        created_at,
        changes=(),
    ):
        history = (
            TicketHistory.objects.filter(
                ticket=ticket,
                action_code=action_code,
            )
            .order_by("id")
            .first()
        )
        if history is None:
            history = TicketHistory.objects.create(
                ticket=ticket,
                actor=actor,
                action_code=action_code,
            )
        TicketHistory.objects.filter(pk=history.pk).update(
            actor=actor,
            created_at=created_at,
        )
        for field_code, old_value, new_value in changes:
            TicketHistoryChange.objects.update_or_create(
                history=history,
                field_code=field_code,
                defaults={
                    "old_value": _stringify(old_value),
                    "new_value": _stringify(new_value),
                },
            )
        return history

    def _ensure_comments(self, tickets, users):
        for spec, message in zip(
            DEMO_TICKETS,
            DEMO_COMMENTS,
            strict=True,
        ):
            ticket = tickets[spec["number"]]
            author = (
                users[spec["technician"]]
                if spec["technician"] is not None
                else users[spec["requester"]]
            )
            comment = (
                TicketComment.objects.filter(
                    ticket=ticket,
                    message=message,
                )
                .order_by("id")
                .first()
            )
            if comment is None:
                comment = TicketComment.objects.create(
                    ticket=ticket,
                    author=author,
                    author_role=author.role,
                    message=message,
                )
            comment_at = ticket.created_at + timedelta(days=1, hours=3)
            TicketComment.objects.filter(pk=comment.pk).update(
                author=author,
                author_role=author.role,
                message=message,
                created_at=comment_at,
            )
            self._ensure_history(
                ticket=ticket,
                actor=author,
                action_code=TicketHistoryAction.COMMENT_ADDED,
                created_at=comment_at,
            )

    def _ensure_attachments(self, tickets, users):
        for spec in DEMO_TICKETS[:15]:
            ticket = tickets[spec["number"]]
            uploader = (
                users[spec["technician"]]
                if spec["technician"] is not None
                else users[spec["requester"]]
            )
            file_name = (
                f"evidencia-demo-{spec['number']:02d}.txt"
            )
            storage_path = (
                f"tickets/{ticket.pk}/attachments/{file_name}"
            )
            content = (
                "DayFlow - evidencia académica de demostración\n"
                f"Ticket: {ticket.title}\n"
                f"Referencia: DEMO-ATT-{spec['number']:02d}\n"
            ).encode("utf-8")
            if not default_storage.exists(storage_path):
                stored_path = default_storage.save(
                    storage_path,
                    ContentFile(content),
                )
                if stored_path != storage_path:
                    raise CommandError(
                        "No se pudo conservar la ruta estable del adjunto."
                    )
            elif default_storage.size(storage_path) != len(content):
                raise CommandError(
                    f"El archivo de demostración {storage_path} "
                    "no coincide con su contenido esperado."
                )

            attachment = (
                TicketAttachment.objects.filter(
                    storage_path=storage_path
                )
                .order_by("id")
                .first()
            )
            if attachment is None:
                attachment = TicketAttachment.objects.create(
                    ticket=ticket,
                    uploaded_by=uploader,
                    file_name=file_name,
                    storage_path=storage_path,
                    mime_type="text/plain",
                    size_bytes=len(content),
                    description=(
                        "Evidencia académica pequeña y sin datos sensibles."
                    ),
                )
            attachment_at = ticket.created_at + timedelta(days=2, hours=1)
            TicketAttachment.objects.filter(pk=attachment.pk).update(
                ticket=ticket,
                uploaded_by=uploader,
                file_name=file_name,
                storage_path=storage_path,
                mime_type="text/plain",
                size_bytes=len(content),
                description=(
                    "Evidencia académica pequeña y sin datos sensibles."
                ),
                created_at=attachment_at,
            )
            self._ensure_history(
                ticket=ticket,
                actor=uploader,
                action_code=TicketHistoryAction.ATTACHMENT_ADDED,
                created_at=attachment_at,
            )
