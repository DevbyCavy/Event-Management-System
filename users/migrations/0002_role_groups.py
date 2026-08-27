from django.db import migrations

ROLE_GROUPS = [
    'Admin',
    'Event Planner',
    'Storekeeper',
    'Accounts',
    'Team Leader',
    'Vendor',
    'Client',
]


def create_role_groups(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    for name in ROLE_GROUPS:
        Group.objects.get_or_create(name=name)


def remove_role_groups(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    Group.objects.filter(name__in=ROLE_GROUPS).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
        ('auth', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_role_groups, remove_role_groups),
    ]
