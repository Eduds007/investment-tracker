from rest_framework import serializers
from .models import Ativo, Indice, Posicao, Dividendo

class AtivoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ativo
        fields = ['id', 'nome', 'classe_ativo']

class IndiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Indice
        fields = ['id', 'data', 'nome', 'valor']

class PosicaoSerializer(serializers.ModelSerializer):
    classe_ativo = serializers.CharField(source='ativo.classe_ativo', read_only=True)
    ativo = serializers.CharField(source='ativo.nome', read_only=True)
    valor = serializers.DecimalField(source='valor_atual', max_digits=15, decimal_places=2)

    class Meta:
        model = Posicao
        fields = ['id', 'data', 'classe_ativo', 'ativo', 'valor', 'quantidade', 'preco_medio_compra', 'resultado_total', 'tipo_movimento']
        read_only_fields = ['resultado_total']

class DividendoSerializer(serializers.ModelSerializer):
    ativo = serializers.SlugRelatedField(queryset=Ativo.objects.all(), slug_field='nome')

    class Meta:
        model = Dividendo
        fields = ['id', 'data', 'ativo', 'valor', 'tipo']

