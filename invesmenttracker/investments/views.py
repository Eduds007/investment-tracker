from rest_framework import viewsets
from .models import Aporte, Indice, Posicao, Dividendo
from .serializers import AporteSerializer, IndiceSerializer, PosicaoSerializer, DividendoSerializer
from rest_framework.response import Response

class AporteViewSet(viewsets.ModelViewSet):
    queryset = Aporte.objects.all()
    serializer_class = AporteSerializer
    filterset_fields = ['tipo', 'lugar']
    ordering_fields = ['data']
    ordering = ['-data']

class IndiceViewSet(viewsets.ModelViewSet):
    queryset = Indice.objects.all()
    serializer_class = IndiceSerializer
    filterset_fields = ['nome', 'data']
    ordering_fields = ['data', 'nome']
    ordering = ['-data', 'nome']

class PosicaoViewSet(viewsets.ModelViewSet):
    queryset = Posicao.objects.all()
    serializer_class = PosicaoSerializer
    filterset_fields = ['classe_ativo', 'ativo', 'data']
    ordering_fields = ['data', 'classe_ativo', 'ativo']
    ordering = ['-data', 'classe_ativo', 'ativo']

class DividendoViewSet(viewsets.ModelViewSet):
    queryset = Dividendo.objects.all()
    serializer_class = DividendoSerializer
    filterset_fields = ['ativo', 'data']
    ordering_fields = ['data', 'ativo']
    ordering = ['-data']
