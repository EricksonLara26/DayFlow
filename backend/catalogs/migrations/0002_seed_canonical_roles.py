from django.db import migrations


CANONICAL_ROLE_CODES = (
    "ADMINISTRATOR",
    "TECHNICIAN",
    "EMPLOYEE",
)


def seed_canonical_roles(apps, schema_editor):
    Role = apps.get_model("catalogs", "Role")

    for role_code in CANONICAL_ROLE_CODES:
        Role.objects.update_or_create(
            code=role_code,
            defaults={"active": True},
        )


class Migration(migrations.Migration):
    dependencies = [
        ("catalogs", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(
            seed_canonical_roles,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
