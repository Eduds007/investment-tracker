# Corrige a fórmula de resultado_total: valor_atual é o valor TOTAL da posição
# (não preço por unidade), então a fórmula correta é
# valor_atual - (quantidade * preco_medio_compra), não
# quantidade * (valor_atual - preco_medio_compra).
# SQLite não permite ALTER de GeneratedField in-place -- precisa remover e recriar.
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('investments', '0013_posicao_tipo_movimento'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='posicao',
            name='resultado_total',
        ),
        migrations.AddField(
            model_name='posicao',
            name='resultado_total',
            field=models.GeneratedField(
                expression=models.F('valor_atual') - (models.F('quantidade') * models.F('preco_medio_compra')),
                output_field=models.DecimalField(decimal_places=2, max_digits=18),
                db_persist=True,
                help_text='Ganho/perda de capital: valor atual - (quantidade × preço médio de compra)',
                verbose_name='Resultado (R$)',
            ),
        ),
    ]
