from rest_framework import viewsets
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
import os
import tempfile
from .models import Ativo, Indice, Posicao, Dividendo, MetaPortfolio
from .serializers import AtivoSerializer, IndiceSerializer, PosicaoSerializer, DividendoSerializer
from .recomendador import sugerir_alocacao
from .importador import (
    CANONICAL_LABELS,
    _canonical_classe,
    _aplicar_posicao,
    _executar_extracao_claude,
    aplicar_extrato,
)

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
    Payload: { data, ativo_nome, ativo_classe, tipo, valor, quantidade }
    """
    data         = request.data.get('data')
    ativo_nome   = (request.data.get('ativo_nome') or '').strip().upper()
    ativo_classe = request.data.get('ativo_classe', 'ACAO')
    tipo         = request.data.get('tipo', 'ATUALIZACAO')
    valor        = float(request.data.get('valor', 0))
    quantidade   = float(request.data.get('quantidade', 0))

    if not data or not ativo_nome or valor <= 0 or quantidade <= 0:
        return Response({'success': False, 'error': 'Campos obrigatórios: data, ativo_nome, valor > 0, quantidade > 0'}, status=400)

    posicao, criado = _aplicar_posicao(ativo_nome, ativo_classe, tipo, valor, quantidade, data)

    return Response({
        'success': True,
        'tipo': tipo,
        'ativo': ativo_nome,
        'data': str(posicao.data),
        'valor_novo': float(posicao.valor_atual),
        'quantidade_nova': float(posicao.quantidade),
        'preco_medio_novo': float(posicao.preco_medio_compra),
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

    ultima_data = Posicao.objects.order_by('-data').values_list('data', flat=True).first()
    if not ultima_data:
        return Response({'success': True, 'classes': [], 'total': 0})

    posicoes = Posicao.objects.filter(data=ultima_data).select_related('ativo')
    por_classe = {}
    total = 0.0
    for p in posicoes:
        classe = _canonical_classe(p.ativo.classe_ativo)
        por_classe[classe] = por_classe.get(classe, 0.0) + float(p.valor_atual)
        total += float(p.valor_atual)

    # MetaPortfolio do banco sobrescreve defaults
    metas = dict(DEFAULTS)
    for meta in MetaPortfolio.objects.all():
        metas[_canonical_classe(meta.tipo)] = float(meta.meta)

    classes = []
    for classe, meta_pct in metas.items():
        atual = por_classe.get(classe, 0.0)
        atual_pct = (atual / total * 100) if total > 0 else 0.0
        diff_pct = meta_pct - atual_pct
        diff_valor = (diff_pct / 100) * total
        acao = 'COMPRAR' if diff_valor > 50 else ('VENDER' if diff_valor < -50 else 'OK')
        classes.append({
            'classe': classe,
            'label': CANONICAL_LABELS.get(classe, classe),
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
def ultimos_registros(request):
    limit = int(request.query_params.get('limit', 100))

    posicoes = list(
        Posicao.objects.select_related('ativo').order_by('-data', '-id')[:limit]
        .values('id', 'data', 'valor_atual', 'quantidade', 'preco_medio_compra', 'tipo_movimento', 'ativo__nome', 'ativo__classe_ativo')
    )
    indices = list(
        Indice.objects.order_by('-data', '-id')[:limit]
        .values('id', 'data', 'nome', 'valor')
    )
    dividendos = list(
        Dividendo.objects.select_related('ativo').order_by('-data', '-id')[:limit]
        .values('id', 'data', 'valor', 'tipo', 'ativo__nome')
    )

    registros = []
    for p in posicoes:
        quantidade = float(p['quantidade'])
        registros.append({
            'tipo': 'posicao',
            'data': str(p['data']),
            'id': p['id'],
            'nome': p['ativo__nome'],
            'classe': p['ativo__classe_ativo'],
            'valor': float(p['valor_atual']),
            'quantidade': quantidade,
            'preco_medio': float(p['preco_medio_compra']),
            'preco_atual': round(float(p['valor_atual']) / quantidade, 4) if quantidade > 0 else 0,
            'acao': p['tipo_movimento'],
        })
    for i in indices:
        registros.append({
            'tipo': 'indice',
            'data': str(i['data']),
            'id': i['id'],
            'nome': i['nome'],
            'classe': 'INDICE',
            'valor': float(i['valor']),
        })
    for d in dividendos:
        registros.append({
            'tipo': 'dividendo',
            'data': str(d['data']),
            'id': d['id'],
            'nome': d['ativo__nome'],
            'classe': 'DIVIDENDO',
            'valor': float(d['valor']),
            'subtipo': d['tipo'] or '',
        })

    registros.sort(key=lambda x: x['data'], reverse=True)
    return Response({'success': True, 'registros': registros[:limit]})


@api_view(['GET'])
def sugestao_aporte(request):
    try:
        valor = float(request.query_params.get('valor', 100))
        resultado = sugerir_alocacao(valor)
        return Response({'success': True, **resultado})
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['POST'])
@parser_classes([MultiPartParser])
def importar_extrato(request):
    """
    Recebe o PDF do relatório mensal consolidado da B3, usa o Claude Code (CLI já
    autenticado no terminal desta máquina, sem precisar de ANTHROPIC_API_KEY) para
    extrair posições, negociações e dividendos, e grava tudo direto no banco.
    """
    arquivo = request.FILES.get('arquivo')
    if not arquivo:
        return Response({'success': False, 'error': 'Nenhum arquivo enviado (campo "arquivo").'}, status=400)
    if not arquivo.name.lower().endswith('.pdf'):
        return Response({'success': False, 'error': 'Envie um arquivo PDF.'}, status=400)

    tmp_dir = tempfile.mkdtemp(prefix='extrato_')
    tmp_path = os.path.join(tmp_dir, 'extrato.pdf')
    try:
        with open(tmp_path, 'wb') as f:
            for chunk in arquivo.chunks():
                f.write(chunk)

        try:
            dados = _executar_extracao_claude(tmp_path, tmp_dir)
        except RuntimeError as e:
            return Response({'success': False, 'error': str(e)}, status=502)

        try:
            resumo = aplicar_extrato(dados)
        except ValueError as e:
            return Response({'success': False, 'error': str(e)}, status=502)

        return Response({'success': True, **resumo})
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass
        try:
            os.rmdir(tmp_dir)
        except OSError:
            pass
