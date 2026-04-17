from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Ativo, Indice, Posicao, Dividendo, MetaPortfolio
from .serializers import AtivoSerializer, IndiceSerializer, PosicaoSerializer, DividendoSerializer
from .recomendador import sugerir_alocacao

class AtivoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Ativo.objects.all().order_by('classe_ativo', 'nome')
    serializer_class = AtivoSerializer

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
def registrar_posicao(request):
    """
    Registra uma Compra, Venda ou Atualização de posição.
    Payload: { data, ativo_nome, ativo_classe, tipo, valor }
    - ATUALIZACAO: salva o valor absoluto informado
    - COMPRA:      último valor conhecido + valor informado
    - VENDA:       último valor conhecido - valor informado
    """
    data       = request.data.get('data')
    ativo_nome = (request.data.get('ativo_nome') or '').strip().upper()
    ativo_classe = request.data.get('ativo_classe', 'ACAO')
    tipo       = request.data.get('tipo', 'ATUALIZACAO')
    valor      = float(request.data.get('valor', 0))

    if not data or not ativo_nome or valor <= 0:
        return Response({'success': False, 'error': 'Campos obrigatórios: data, ativo_nome, valor > 0'}, status=400)

    ativo, _ = Ativo.objects.get_or_create(
        nome=ativo_nome,
        defaults={'classe_ativo': ativo_classe}
    )

    if tipo in ('COMPRA', 'VENDA'):
        ultima = Posicao.objects.filter(ativo=ativo).order_by('-data').first()
        base = float(ultima.valor) if ultima else 0.0
        novo_valor = base + valor if tipo == 'COMPRA' else max(base - valor, 0)
    else:
        novo_valor = valor

    posicao, criado = Posicao.objects.update_or_create(
        data=data, ativo=ativo,
        defaults={'valor': round(novo_valor, 2)}
    )

    return Response({
        'success': True,
        'tipo': tipo,
        'ativo': ativo_nome,
        'data': str(posicao.data),
        'valor_novo': float(posicao.valor),
        'criado': criado,
    })


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
def rebalanceamento(request):
    # Defaults alinhados com DEFAULT_WEIGHTS do IndicesPage
    DEFAULTS = {'RESERVA': 30.0, 'CRIPTO': 5.0, 'ETF': 20.0, 'ACAO': 20.0, 'FII': 25.0}
    LABELS = {'RESERVA': 'Reserva de Emergência', 'CRIPTO': 'Criptos', 'ETF': "ETF's", 'ACAO': 'Ações', 'FII': 'FII'}

    ultima_data = Posicao.objects.order_by('-data').values_list('data', flat=True).first()
    if not ultima_data:
        return Response({'success': True, 'classes': [], 'total': 0})

    posicoes = Posicao.objects.filter(data=ultima_data).select_related('ativo')
    por_classe = {}
    total = 0.0
    for p in posicoes:
        classe = p.ativo.classe_ativo
        por_classe[classe] = por_classe.get(classe, 0.0) + float(p.valor)
        total += float(p.valor)

    # MetaPortfolio do banco sobrescreve defaults
    metas = {**DEFAULTS, **{m.tipo: float(m.meta) for m in MetaPortfolio.objects.all()}}

    classes = []
    for classe, meta_pct in metas.items():
        atual = por_classe.get(classe, 0.0)
        atual_pct = (atual / total * 100) if total > 0 else 0.0
        diff_pct = meta_pct - atual_pct
        diff_valor = (diff_pct / 100) * total
        acao = 'COMPRAR' if diff_valor > 50 else ('VENDER' if diff_valor < -50 else 'OK')
        classes.append({
            'classe': classe,
            'label': LABELS.get(classe, classe),
            'meta_pct': round(meta_pct, 1),
            'atual_pct': round(atual_pct, 1),
            'atual_valor': round(atual, 2),
            'diff_pct': round(diff_pct, 1),
            'diff_valor': round(diff_valor, 2),
            'acao': acao,
        })

    classes.sort(key=lambda x: -abs(x['diff_valor']))
    return Response({'success': True, 'classes': classes, 'total': round(total, 2), 'data_referencia': str(ultima_data)})


@api_view(['GET'])
def sugestao_aporte(request):
    try:
        valor = float(request.query_params.get('valor', 100))
        resultado = sugerir_alocacao(valor)
        return Response({'success': True, **resultado})
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)
