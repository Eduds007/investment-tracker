from rest_framework import viewsets
from .models import Investment, Wallet
from .serializers import InvestmentSerializer, WalletSerializer
from rest_framework.response import Response

class InvestmentViewSet(viewsets.ModelViewSet):
    queryset = Investment.objects.all()
    serializer_class = InvestmentSerializer

class WalletViewSet(viewsets.ViewSet):
    def list(self, request):
        # Cria a carteira e processa os investimentos
        wallet = Wallet()
        assets = wallet.get_assets()
        print(assets)
        # Converte o dicionário em uma lista para serialização
        assets_list = [
            {
                "name": name,
                "total_quantity": data["total_quantity"],
                "average_price": data["average_price"],
                "broker": data["broker"],
                "category": data["category"],
                "latest_value": data["latest_value"],
                "latest_value_date": data["latest_value_date"],
                "percentage_gain": data["percentage_gain"],

            }
            for name, data in assets.items()
        ]
        
        # Serializa os dados
        serializer = WalletSerializer(assets_list, many=True)
        return Response(serializer.data)