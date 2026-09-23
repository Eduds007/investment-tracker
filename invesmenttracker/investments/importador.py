"""
Lógica de importação dos relatórios mensais consolidados da B3 (PDF).

Usada tanto pela view de upload (importar-extrato/) quanto pelo management
command de importação em lote (importar_extratos). Extrai posições,
negociações (compra/venda) e dividendos via Claude Code CLI, e aplica tudo
no banco na ordem certa para que o preço médio de compra fique correto.
"""
import json
import re
import subprocess
import unicodedata
from calendar import monthrange
from collections import Counter
from datetime import date, datetime
from decimal import Decimal

from django.db import transaction

from .models import Ativo, Posicao, Dividendo


CANONICAL_LABELS = {
    'RESERVA': 'Reserva de Emergência',
    'CRIPTO': 'Criptos',
    'ETF': "ETF's",
    'ACAO': 'Ações',
    'FII': 'FII',
}


def _normalize_key(value):
    text = (str(value or '')).strip().upper()
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('ascii')
    return re.sub(r'[^A-Z0-9]+', '', text)


def _canonical_classe(value):
    key = _normalize_key(value)

    aliases = {
        'RESERVA': 'RESERVA',
        'RESERVADEEMERGENCIA': 'RESERVA',
        'EMERGENCIA': 'RESERVA',
        'SALDO': 'RESERVA',
        'CRIPTO': 'CRIPTO',
        'CRIPTOS': 'CRIPTO',
        'CRYPTO': 'CRIPTO',
        'CRYPTOS': 'CRIPTO',
        'ETF': 'ETF',
        'ETFS': 'ETF',
        'ACAO': 'ACAO',
        'ACOES': 'ACAO',
        'AES': 'ACAO',
        'FII': 'FII',
        'FIIS': 'FII',
    }

    if key in aliases:
        return aliases[key]

    if key.startswith('ACO'):
        return 'ACAO'
    if key.startswith('CRIP'):
        return 'CRIPTO'
    if key.startswith('RESERV'):
        return 'RESERVA'
    if key.startswith('ETF'):
        return 'ETF'
    if key.startswith('FII'):
        return 'FII'

    return key


def _aplicar_posicao(ativo_nome, ativo_classe, tipo, valor, quantidade, data):
    """
    Aplica uma Compra, Venda ou Atualização de posição e grava no banco.
    - ATUALIZACAO: salva o valor e a quantidade absolutos informados
    - COMPRA:      soma valor/quantidade aos últimos conhecidos; recalcula preço médio
    - VENDA:       subtrai valor/quantidade dos últimos conhecidos; preço médio não muda
    Retorna (posicao, criado).
    """
    ativo_nome = (ativo_nome or '').strip().upper()
    ativo_classe = _canonical_classe(ativo_classe)

    ativo, _ = Ativo.objects.get_or_create(
        nome=ativo_nome,
        defaults={'classe_ativo': ativo_classe}
    )

    ultima = Posicao.objects.filter(ativo=ativo).order_by('-data').first()
    base_valor = float(ultima.valor_atual) if ultima else 0.0
    base_qtd = float(ultima.quantidade) if ultima else 0.0
    base_preco_medio = float(ultima.preco_medio_compra) if ultima else 0.0

    if tipo == 'COMPRA':
        novo_valor = base_valor + valor
        nova_qtd = base_qtd + quantidade
        novo_preco_medio = (base_qtd * base_preco_medio + valor) / nova_qtd
    elif tipo == 'VENDA':
        novo_valor = max(base_valor - valor, 0)
        nova_qtd = max(base_qtd - quantidade, 0)
        novo_preco_medio = base_preco_medio if nova_qtd > 0 else 0.0
    else:
        novo_valor = valor
        nova_qtd = quantidade
        novo_preco_medio = base_preco_medio if ultima else (valor / quantidade if quantidade else 0.0)

    return Posicao.objects.update_or_create(
        data=data, ativo=ativo,
        defaults={
            'tipo_movimento': tipo,
            'valor_atual': round(novo_valor, 2),
            'quantidade': round(nova_qtd, 4),
            'preco_medio_compra': round(novo_preco_medio, 4),
        }
    )


EXTRATO_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "mes_referencia": {"type": "string"},
        "posicoes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "ticker": {"type": "string"},
                    "classe": {"type": "string", "enum": ["ACAO", "ETF", "FII", "RESERVA"]},
                    "quantidade": {"type": "number"},
                    "valor_atualizado": {"type": "number"},
                },
                "required": ["ticker", "classe", "quantidade", "valor_atualizado"],
            },
        },
        "negociacoes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "ticker": {"type": "string"},
                    "data": {"type": "string"},
                    "quantidade_compra": {"type": "number"},
                    "preco_medio_compra": {"type": "number"},
                    "quantidade_venda": {"type": "number"},
                    "preco_medio_venda": {"type": "number"},
                },
                "required": ["ticker", "data", "quantidade_compra", "preco_medio_compra", "quantidade_venda", "preco_medio_venda"],
            },
        },
        "dividendos": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "ticker": {"type": "string"},
                    "data_pagamento": {"type": "string"},
                    "tipo_evento": {"type": "string"},
                    "quantidade": {"type": "number"},
                    "valor_liquido": {"type": "number"},
                },
                "required": ["ticker", "data_pagamento", "tipo_evento", "quantidade", "valor_liquido"],
            },
        },
    },
    "required": ["mes_referencia", "posicoes", "negociacoes", "dividendos"],
}

EXTRATO_PROMPT_TEMPLATE = (
    'Leia o arquivo PDF em {caminho} (relatorio mensal consolidado da B3) e extraia: '
    'mes_referencia (formato MM/YYYY, do campo "Data" no topo do relatorio); '
    'posicoes: uma entrada para CADA LINHA nas secoes "Posicao - Acoes" (classe ACAO), '
    '"Posicao - ETF" (classe ETF), "Posicao - FII" (classe FII), e qualquer outra secao de '
    'Posicao de renda fixa (LCI, LCA, CDB, Tesouro Direto, Poupanca, etc. -- classe RESERVA '
    'para todas elas). ticker = codigo do produto antes do primeiro hifen para Acoes/ETF/FII. '
    'Para titulos de renda fixa que podem ter varias emissoes do mesmo banco com vencimentos '
    'diferentes (LCI, LCA, CDB), use ticker = "<TIPO> - <instituicao> - <vencimento '
    'DD/MM/YYYY>" (ex: "LCI - BANCO INTER S/A - 03/11/2026") para cada linha ser unica. Para '
    'Tesouro Direto use o nome completo do produto (ja inclui o ano, ja e unico). Cada LINHA '
    'da tabela vira uma entrada separada em posicoes, mesmo que o ticker resultante se repita '
    'textualmente com quantidade/valor diferentes -- NAO agrupe nem some linhas. quantidade e '
    'valor_atualizado vem do campo "Valor Atualizado" / "Valor atualizado". '
    'negociacoes: uma entrada para CADA LINHA da secao "Negociacao" / "Resumo dos negocios no '
    'periodo" (a secao pode estar vazia -- "Voce nao possui dados disponiveis", nesse caso '
    'retorne lista vazia). ticker = campo "Codigo"; SE terminar em "F" logo apos um digito '
    '(ex: ABCB4F, BMGB4F), REMOVA o F final -- e apenas o indicador de mercado fracionario, o '
    'ativo real e ABCB4/BMGB4. data (YYYY-MM-DD, do campo "Periodo"; se mostrar um intervalo '
    'de datas, use a data final). quantidade_compra e preco_medio_compra vem de "Quantidade '
    'de compra" e "Preco medio de compra". quantidade_venda e preco_medio_venda vem de '
    '"Quantidade de venda" e "Preco medio de venda". Use 0 nos campos que nao se aplicam '
    'aquela linha (ex: quantidade_venda=0 se so houve compra). '
    'dividendos: uma entrada para cada linha da secao "Proventos recebidos" com ticker, '
    'data_pagamento (YYYY-MM-DD, do campo "Pagamento"), tipo_evento (campo "Tipo de evento"), '
    'quantidade (campo "Quantidade" -- quantidade de cotas/acoes que geraram esse pagamento '
    'especifico, na epoca) e valor_liquido (campo "Valor liquido"). Ignore a secao '
    '"Reembolsos de emprestimos de '
    'ativos".'
)

CLASSE_INFERIDA_DIVIDENDO = 'ACAO'  # fallback quando o ativo do dividendo/negociação não veio nas posições


def _executar_extracao_claude(caminho_pdf, diretorio_permitido):
    prompt = EXTRATO_PROMPT_TEMPLATE.format(caminho=caminho_pdf)
    comando = [
        'claude', '-p', prompt,
        '--output-format', 'json',
        '--json-schema', json.dumps(EXTRATO_JSON_SCHEMA),
        '--add-dir', diretorio_permitido,
        '--tools', 'Read',
        '--model', 'sonnet',
    ]
    try:
        resultado = subprocess.run(comando, capture_output=True, text=True, timeout=180)
    except subprocess.TimeoutExpired:
        raise RuntimeError('Tempo esgotado ao processar o documento com o Claude Code.')
    except FileNotFoundError:
        raise RuntimeError('CLI do Claude Code ("claude") não encontrada no servidor.')

    if resultado.returncode != 0:
        raise RuntimeError(f'Claude Code retornou erro: {resultado.stderr.strip()[:500]}')

    try:
        payload = json.loads(resultado.stdout)
    except json.JSONDecodeError:
        raise RuntimeError('Resposta do Claude Code não é um JSON válido.')

    if payload.get('is_error'):
        raise RuntimeError(f"Claude Code reportou erro: {str(payload.get('result', ''))[:500]}")

    dados = payload.get('structured_output')
    if not dados:
        raise RuntimeError('Claude Code não retornou saída estruturada (structured_output ausente).')

    return dados


def _ultimo_dia_do_mes(mes_referencia):
    mes_str, ano_str = mes_referencia.split('/')
    mes, ano = int(mes_str), int(ano_str)
    return date(ano, mes, monthrange(ano, mes)[1])


def _normalizar_ticker_fracionario(ticker):
    """Remove o sufixo 'F' de mercado fracionário (ex: ABCB4F -> ABCB4)."""
    ticker = (ticker or '').strip().upper()
    if re.match(r'^[A-Z]{4}\d{1,2}F$', ticker):
        return ticker[:-1]
    return ticker


def aplicar_extrato(dados):
    """
    Aplica os dados extraídos de um relatório mensal no banco, nesta ordem:
    1) negociações (COMPRA/VENDA) -- para calcular o preço médio de compra corretamente
    2) posições (ATUALIZACAO) -- snapshot de quantidade/valor no fim do mês
    3) dividendos
    Levanta ValueError em caso de dados inconsistentes. Retorna um resumo com as contagens.
    """
    mes_referencia = dados.get('mes_referencia')
    posicoes = dados.get('posicoes') or []
    negociacoes = dados.get('negociacoes') or []
    dividendos = dados.get('dividendos') or []

    if not mes_referencia or not re.match(r'^\d{2}/\d{4}$', mes_referencia):
        raise ValueError(f'Mês de referência inválido: {mes_referencia!r}')

    try:
        data_posicao = _ultimo_dia_do_mes(mes_referencia)
    except (ValueError, IndexError):
        raise ValueError(f'Não foi possível interpretar o mês de referência: {mes_referencia!r}')

    classe_por_ticker = {}
    for p in posicoes:
        ticker = (p.get('ticker') or '').strip().upper()
        if ticker:
            classe_por_ticker[ticker] = p.get('classe')

    compras_aplicadas = 0
    vendas_aplicadas = 0
    posicoes_criadas = 0
    posicoes_atualizadas = 0
    dividendos_criados = 0

    with transaction.atomic():
        # 1) Negociações primeiro, na ordem em que aparecem, para computar o preço médio
        for n in negociacoes:
            ticker = _normalizar_ticker_fracionario(n.get('ticker'))
            data_neg = n.get('data')
            if not ticker or not data_neg:
                continue
            classe = classe_por_ticker.get(ticker, CLASSE_INFERIDA_DIVIDENDO)
            qtd_compra = float(n.get('quantidade_compra') or 0)
            preco_compra = float(n.get('preco_medio_compra') or 0)
            qtd_venda = float(n.get('quantidade_venda') or 0)
            preco_venda = float(n.get('preco_medio_venda') or 0)

            if qtd_compra > 0 and preco_compra > 0:
                _aplicar_posicao(ticker, classe, 'COMPRA', qtd_compra * preco_compra, qtd_compra, data_neg)
                compras_aplicadas += 1
            if qtd_venda > 0 and preco_venda > 0:
                _aplicar_posicao(ticker, classe, 'VENDA', qtd_venda * preco_venda, qtd_venda, data_neg)
                vendas_aplicadas += 1

        # 2) Snapshot de posições do fim do mês. Linhas com o mesmo ticker (ex.: duas
        # LCIs com termos idênticos) são somadas, nunca descartadas.
        posicoes_agrupadas = {}
        for p in posicoes:
            ticker = (p.get('ticker') or '').strip().upper()
            classe = p.get('classe')
            quantidade = float(p.get('quantidade') or 0)
            valor = float(p.get('valor_atualizado') or 0)
            if not ticker or quantidade <= 0 or valor <= 0:
                continue
            chave = (ticker, classe)
            if chave in posicoes_agrupadas:
                posicoes_agrupadas[chave]['quantidade'] += quantidade
                posicoes_agrupadas[chave]['valor'] += valor
            else:
                posicoes_agrupadas[chave] = {'quantidade': quantidade, 'valor': valor}

        for (ticker, classe), vals in posicoes_agrupadas.items():
            _, criado = _aplicar_posicao(ticker, classe, 'ATUALIZACAO', vals['valor'], vals['quantidade'], data_posicao)
            if criado:
                posicoes_criadas += 1
            else:
                posicoes_atualizadas += 1

        # 3) Dividendos
        # Pagamentos legítimos podem se repetir com a mesma (data, ativo, valor, tipo) --
        # ex.: lotes de custódia distintos pagos no mesmo dia pelo mesmo valor (ISAE4, VIVT3).
        # Para reimportar o mesmo relatório sem duplicar, sem também descartar essas repetições
        # legítimas, contamos quantas vezes cada assinatura já existe no banco e só pulamos até
        # esgotar essa contagem -- o que sobrar da extração vira registro novo.
        assinaturas_existentes = Counter(
            Dividendo.objects.values_list('data', 'ativo__nome', 'valor', 'tipo')
        )

        for d in dividendos:
            ticker = (d.get('ticker') or '').strip().upper()
            data_pagamento = d.get('data_pagamento')
            valor_liquido = d.get('valor_liquido')
            if not ticker or not data_pagamento or valor_liquido in (None, ''):
                continue
            try:
                valor_liquido = round(float(valor_liquido), 2)
                data_pagamento_dt = datetime.strptime(data_pagamento, '%Y-%m-%d').date()
            except (TypeError, ValueError):
                continue
            if valor_liquido <= 0:
                continue

            quantidade = d.get('quantidade')
            try:
                quantidade = round(float(quantidade), 4) if quantidade not in (None, '') else None
            except (TypeError, ValueError):
                quantidade = None

            tipo_evento = d.get('tipo_evento') or ''
            assinatura = (data_pagamento_dt, ticker, Decimal(str(valor_liquido)), tipo_evento)
            if assinaturas_existentes[assinatura] > 0:
                assinaturas_existentes[assinatura] -= 1
                continue

            classe_ativo = _canonical_classe(classe_por_ticker.get(ticker, CLASSE_INFERIDA_DIVIDENDO))
            ativo, _ = Ativo.objects.get_or_create(
                nome=ticker,
                defaults={'classe_ativo': classe_ativo},
            )
            Dividendo.objects.create(
                data=data_pagamento_dt,
                ativo=ativo,
                valor=valor_liquido,
                tipo=tipo_evento,
                quantidade=quantidade,
            )
            dividendos_criados += 1

    return {
        'mes_referencia': mes_referencia,
        'posicoes_criadas': posicoes_criadas,
        'posicoes_atualizadas': posicoes_atualizadas,
        'dividendos_criados': dividendos_criados,
        'compras_aplicadas': compras_aplicadas,
        'vendas_aplicadas': vendas_aplicadas,
    }
