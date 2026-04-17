from rest_framework import serializers
from .models import Ativo, Indice, Posicao, Dividendo

class IndiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Indice
        fields = ['id', 'data', 'nome', 'valor']

class PosicaoSerializer(serializers.ModelSerializer):
    classe_ativo = serializers.CharField(source='ativo.classe_ativo', read_only=True)
    ativo = serializers.CharField(source='ativo.nome', read_only=True)

    class Meta:
        model = Posicao
        fields = ['id', 'data', 'classe_ativo', 'ativo', 'valor']

class DividendoSerializer(serializers.ModelSerializer):
    ativo = serializers.SlugRelatedField(queryset=Ativo.objects.all(), slug_field='nome')

    class Meta:
        model = Dividendo
        fields = ['id', 'data', 'ativo', 'valor', 'tipo']

