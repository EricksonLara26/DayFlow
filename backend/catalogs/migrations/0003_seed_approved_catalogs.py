from django.db import migrations


CANONICAL_ROLE_CODES = (
    "ADMINISTRATOR",
    "TECHNICIAN",
    "EMPLOYEE",
)

APPROVED_CATEGORIES = (
    (
        "Soporte Técnico",
        "Atención general de soporte técnico",
    ),
    (
        "Redes",
        "Conectividad, VPN y servicios de red",
    ),
    (
        "Hardware",
        "Equipos físicos y periféricos",
    ),
    (
        "Software",
        "Aplicaciones, licencias e instalaciones",
    ),
    (
        "Accesos",
        "Permisos, usuarios y carpetas compartidas",
    ),
    (
        "Impresoras",
        "Impresión y escaneo",
    ),
    (
        "Correo",
        "Cuentas, buzones y firmas de correo",
    ),
    (
        "Otro",
        "Solicitudes fuera de las categorías principales",
    ),
)

APPROVED_DEPARTMENTS = (
    (
        "Tecnologia",
        "Area de tecnologia y soporte",
    ),
    (
        "Soporte Tecnico",
        "Mesa de ayuda y atencion tecnica",
    ),
    (
        "Administracion",
        "Gestion administrativa interna",
    ),
    (
        "Operaciones",
        "Operaciones del negocio",
    ),
    (
        "Ventas",
        "Equipo comercial",
    ),
)


def seed_approved_catalogs(apps, schema_editor):
    Role = apps.get_model("catalogs", "Role")
    Category = apps.get_model("catalogs", "Category")
    Department = apps.get_model("catalogs", "Department")

    for role_code in CANONICAL_ROLE_CODES:
        Role.objects.update_or_create(
            code=role_code,
            defaults={"active": True},
        )

    for name, description in APPROVED_CATEGORIES:
        Category.objects.update_or_create(
            name=name,
            defaults={
                "description": description,
                "active": True,
            },
        )

    for name, description in APPROVED_DEPARTMENTS:
        Department.objects.update_or_create(
            name=name,
            defaults={
                "description": description,
                "active": True,
            },
        )


class Migration(migrations.Migration):
    dependencies = [
        ("catalogs", "0002_seed_canonical_roles"),
    ]

    operations = [
        migrations.RunPython(
            seed_approved_catalogs,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
