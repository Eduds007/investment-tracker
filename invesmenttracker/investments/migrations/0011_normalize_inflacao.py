from django.db import migrations


def normalize_inflacao(apps, schema_editor):
    Indice = apps.get_model('investments', 'Indice')

    ALIASES = {'INFLAÇÃO', 'INFAÇÃO', 'INFACAO', 'IPCA'}

    duplicatas = Indice.objects.filter(nome__in=list(ALIASES))
    for registro in duplicatas:
        conflito = Indice.objects.filter(data=registro.data, nome='INFLACAO').first()
        if conflito:
            registro.delete()
        else:
            registro.nome = 'INFLACAO'
            registro.save()


class Migration(migrations.Migration):
    dependencies = [
        ('investments', '0010_remove_aporte'),
    ]

    operations = [
        migrations.RunPython(normalize_inflacao, migrations.RunPython.noop),
    ]
