from rest_framework import serializers
from .models import Investment

class InvestmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Investment
        fields = '__all__'

class WalletSerializer(serializers.Serializer):
    name = serializers.CharField()
    total_quantity = serializers.DecimalField(max_digits=12, decimal_places=2)
    average_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    broker = serializers.CharField()
    category = serializers.CharField()
    latest_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    latest_value_date = serializers.DateField()
    percentage_gain = serializers.DecimalField(max_digits=12, decimal_places=2)