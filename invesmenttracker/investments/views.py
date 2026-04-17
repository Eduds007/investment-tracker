from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Aporte, Indice, Posicao, Dividendo
from .serializers import AporteSerializer, IndiceSerializer, PosicaoSerializer, DividendoSerializer
from .recomendador import sugerir_alocacao

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
    filterset_fields = ['ativo__classe_ativo', 'ativo__nome', 'data']
    ordering_fields = ['data', 'ativo__classe_ativo', 'ativo__nome']
    ordering = ['-data', 'ativo__classe_ativo', 'ativo__nome']

class DividendoViewSet(viewsets.ModelViewSet):
    queryset = Dividendo.objects.all()
    serializer_class = DividendoSerializer
    filterset_fields = ['ativo', 'data']
    ordering_fields = ['data', 'ativo']
    ordering = ['-data']


@api_view(['GET'])
def sugestao_aporte(request):
    try:
        valor = float(request.query_params.get('valor', 100))
        resultado = sugerir_alocacao(valor)
        return Response({'success': True, **resultado})
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)
