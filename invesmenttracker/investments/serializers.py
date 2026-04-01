from rest_framework import serializers
from .models import Aporte, Indice, Posicao, Dividendo

class AporteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Aporte
        fields = ['id', 'data', 'tipo', 'valor', 'lugar', 'descricao']

class IndiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Indice
        fields = ['id', 'data', 'nome', 'valor']

class PosicaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Posicao
        fields = ['id', 'data', 'classe_ativo', 'ativo', 'valor']

class DividendoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dividendo
        fields = ['id', 'data', 'ativo', 'valor', 'tipo']

