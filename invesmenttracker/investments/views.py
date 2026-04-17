from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Indice, Posicao, Dividendo
from .serializers import IndiceSerializer, PosicaoSerializer, DividendoSerializer
from .recomendador import sugerir_alocacao

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


@api_view(['POST'])
def atualizar_indices(request):
    import yfinance as yf
    import requests as req
    from datetime import date

    hoje = date.today()
    resultados = []

    yf_map = {
        'BTC':     'BTC-BRL',
        'SP500':   '^GSPC',
        'BOVESPA': '^BVSP',
        'IFIX':    '^IFIX',
    }

    for nome, ticker in yf_map.items():
        try:
            dados = yf.Ticker(ticker).history(period='5d')
            if dados.empty:
                resultados.append({'nome': nome, 'status': 'erro', 'msg': 'Sem dados no yfinance'})
                continue
            valor = round(float(dados.iloc[-1]['Close']), 4)
            obj, criado = Indice.objects.update_or_create(
                data=hoje, nome=nome,
                defaults={'valor': valor}
            )
            resultados.append({'nome': nome, 'status': 'ok', 'valor': valor, 'criado': criado})
        except Exception as e:
            resultados.append({'nome': nome, 'status': 'erro', 'msg': str(e)})

    try:
        r = req.get(
            'https://api.bcb.gov.br/dados/serie/bcdata.sgs.11428/dados/ultimos/1?formato=json',
            timeout=10
        )
        bcb = r.json()
        valor_inflacao = round(float(bcb[0]['valor'].replace(',', '.')), 4)
        obj, criado = Indice.objects.update_or_create(
            data=hoje, nome='INFLACAO',
            defaults={'valor': valor_inflacao}
        )
        resultados.append({'nome': 'INFLACAO', 'status': 'ok', 'valor': valor_inflacao, 'criado': criado})
    except Exception as e:
        resultados.append({'nome': 'INFLACAO', 'status': 'erro', 'msg': str(e)})

    atualizados = sum(1 for r in resultados if r['status'] == 'ok')
    return Response({'success': True, 'resultados': resultados, 'atualizados': atualizados})


@api_view(['GET'])
def sugestao_aporte(request):
    try:
        valor = float(request.query_params.get('valor', 100))
        resultado = sugerir_alocacao(valor)
        return Response({'success': True, **resultado})
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)
