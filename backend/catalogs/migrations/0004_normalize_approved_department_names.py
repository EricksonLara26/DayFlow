from django.db import migrations


APPROVED_DEPARTMENTS = (
    ("Tecnología", "Área de tecnología y soporte"),
    ("Soporte Técnico", "Mesa de ayuda y atención técnica"),
    ("Administración", "Gestión administrativa interna"),
    ("Operaciones", "Operaciones del negocio"),
    ("Ventas", "Equipo comercial"),
)


def normalize_approved_department_names(apps, schema_editor):
    Department = apps.get_model("catalogs", "Department")
    database_alias = schema_editor.connection.alias
    departments = Department.objects.using(database_alias)

    for exact_name, description in APPROVED_DEPARTMENTS:
        department = (
            departments.filter(name=exact_name)
            .order_by("id")
            .first()
        )
        if department is None:
            departments.create(
                name=exact_name,
                description=description,
                active=True,
            )
            continue

        updates = {}
        if department.name != exact_name:
            updates["name"] = exact_name
        if not department.active:
            updates["active"] = True
        if updates:
            departments.filter(pk=department.pk).update(**updates)


class Migration(migrations.Migration):
    dependencies = [
        ("catalogs", "0003_seed_approved_catalogs"),
    ]

    operations = [
        migrations.RunPython(
            normalize_approved_department_names,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
