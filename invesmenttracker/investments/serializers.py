from rest_framework import serializers
from .models import Ativo, Indice, Posicao, Dividendo, recalcular_ativo

class AtivoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ativo
        fields = ['id', 'nome', 'classe_ativo', 'quantidade', 'preco_medio']

class IndiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Indice
        fields = ['id', 'data', 'nome', 'valor']

class PosicaoSerializer(serializers.ModelSerializer):
    classe_ativo = serializers.CharField(source='ativo.classe_ativo', read_only=True)
    ativo = serializers.CharField(source='ativo.nome', read_only=True)
    ativo_nome = serializers.CharField(write_only=True, required=False, help_text="Ticker a associar a esta movimentação; reatribui/renomeia para um Ativo existente ou cria um novo")

    class Meta:
        model = Posicao
        fields = ['id', 'data', 'classe_ativo', 'ativo', 'ativo_nome', 'valor', 'tipo', 'quantidade', 'preco_unitario', 'preco_medio']

    def update(self, instance, validated_data):
        ativo_nome = validated_data.pop('ativo_nome', None)
        ativo_antigo = None
        if ativo_nome:
            novo_nome = ativo_nome.strip().upper()
            if novo_nome != instance.ativo.nome:
                novo_ativo, _ = Ativo.objects.get_or_create(
                    nome=novo_nome, defaults={'classe_ativo': instance.ativo.classe_ativo}
                )
                if Posicao.objects.filter(data=instance.data, ativo=novo_ativo).exclude(pk=instance.pk).exists():
                    raise serializers.ValidationError({'ativo_nome': f'Já existe um registro de {novo_nome} nesta data.'})
                ativo_antigo = instance.ativo
                instance.ativo = novo_ativo

        instance = super().update(instance, validated_data)

        recalcular_ativo(instance.ativo)
        if ativo_antigo:
            recalcular_ativo(ativo_antigo)
        instance.refresh_from_db()
        return instance

class DividendoSerializer(serializers.ModelSerializer):
    ativo = serializers.SlugRelatedField(queryset=Ativo.objects.all(), slug_field='nome')

    class Meta:
        model = Dividendo
        fields = ['id', 'data', 'ativo', 'valor', 'tipo']

