import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta
import os


def _dividendos_5_anos_de_historico(historico, hoje=None):
    """
    Resume o histórico de dividendos (valor absoluto, R$ por unidade) do
    yfinance nos últimos 5 anos, substituindo o ano corrente (ainda em
    andamento) pela janela móvel dos últimos 12 meses.
    """
    if hoje is None:
        hoje = datetime.now()

    if historico is None or historico.empty:
        return {'media_anual': 0, 'desvio_anual': 0, 'anos': 0, 'doze_meses': 0}

    doze_meses_str = (hoje - timedelta(days=365)).date().__str__()
    historico_div = historico[historico['Dividends'] != 0]
    historico_doze_meses = historico[historico.index >= doze_meses_str]
    dividends_doze_meses = historico_doze_meses['Dividends'].sum()

    dividendos_por_ano = historico_div.groupby(historico_div.index.year)['Dividends'].sum()
    if len(dividendos_por_ano) > 0 and dividendos_por_ano.index[-1] == hoje.year:
        dividendos_por_ano.iloc[-1] = dividends_doze_meses
    dividendos_por_ano = dividendos_por_ano.tail(5)

    return {
        'media_anual': dividendos_por_ano.mean() if len(dividendos_por_ano) else 0,
        'desvio_anual': dividendos_por_ano.std() if len(dividendos_por_ano) > 1 else 0,
        'anos': len(dividendos_por_ano),
        'doze_meses': dividends_doze_meses,
    }


def obter_recomendacoes(stocks_file=None):
    """
    Algoritmo de recomendação de ações baseado em análise de dividendos e potencial de valorização.
    
    Args:
        stocks_file: Caminho do arquivo com lista de ações. Se None, usa arquivo padrão.
    
    Returns:
        DataFrame com recomendações de ações
    """
    
    # Determinar caminho do arquivo de stocks
    if stocks_file is None:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        stocks_file = os.path.join(base_dir, 'stocks.txt')
    
    # Ler lista de ações
    lista = []
    try:
        with open(stocks_file, 'r') as file:
            for line in file:
                stock = line.strip()
                if stock:  # Ignorar linhas vazias
                    lista.append(stock)
    except FileNotFoundError:
        # Se arquivo não existe, usar stocks padrão
        lista = ['VALE3', 'PETR3', 'BBAS3', 'BBDC4', 'ITUB4']
    
    # Configurar datas
    hoje = datetime.now()
    start_date = f'{hoje.year - 5}-01-01'

    # DataFrame para armazenar resultados
    resultado = pd.DataFrame(columns=['ticker', 'empresa', 'setor', 'preço', 'preço_alvo', 'yield', 'minus_dp', 'dp', 'potencial', 'recomendacao', 'score'])
    
    for stock in lista:
        try:
            print(f"Processando: {stock}")
            
            # Obter dados da ação
            acao = yf.Ticker(f'{stock}.SA')
            historico = acao.history(start=start_date)
            
            if historico.empty:
                continue

            preco_atual = historico.iloc[-1]['Close']

            stats = _dividendos_5_anos_de_historico(historico, hoje)
            dividends_doze_meses = stats['doze_meses']
            anos_historico = stats['anos']

            # Média dos últimos 5 anos (R$) / preço atual = quanto pago hoje pelo que o ativo costuma pagar
            dyield = stats['media_anual'] / preco_atual if preco_atual > 0 else 0

            # Desvio padrão do valor absoluto (R$) dos últimos 5 períodos, em relação ao preço atual
            desv = stats['desvio_anual'] / preco_atual if preco_atual > 0 else 0

            # Dados da ação
            ticker = stock
            preco = preco_atual
            target_price = dividends_doze_meses / 0.06 if dividends_doze_meses > 0 else 0
            media = dyield
            menos_dp = dyield - desv
            potential = (target_price / preco - 1) if preco > 0 else 0

            # Lógica de recomendação
            if potential > 0 and menos_dp >= 0.06 and dyield >= 0.06 and anos_historico >= 5:
                recomenda = 'COMPRA'
                score = 8.5 + (potential * 2)
            elif (menos_dp >= 0.06 and dyield >= 0.06 and potential < 0 and anos_historico >= 5) or (dyield >= 0.06 and anos_historico >= 5):
                recomenda = 'ESPERA'
                score = 6.5 + (dyield * 10)
            else:
                recomenda = 'VENDA'
                score = 3.0 + (dyield * 5)
            
            # Normalizar score entre 0 e 10
            score = min(10, max(0, score))
            
            # Obter informações da empresa (setor, nome)
            info = acao.info
            empresa = info.get('longName', stock)
            setor = info.get('sector', 'Diversos')
            
            # Adicionar ao resultado
            linha = [
                ticker,
                empresa,
                setor,
                round(preco, 2),
                round(target_price, 2),
                round(dyield * 100, 2),  # Converter para percentual
                round(menos_dp * 100, 2),
                round(desv * 100, 2),
                round(potential * 100, 2),
                recomenda,
                round(score, 1)
            ]
            
            resultado = pd.concat(
                [resultado, pd.DataFrame([linha], columns=resultado.columns)],
                ignore_index=True
            )
            
        except Exception as e:
            print(f"Erro ao processar {stock}: {e}")
            continue
    
    # Ordenar por score decrescente
    resultado = resultado.sort_values('score', ascending=False)
    
    return resultado

def sugerir_alocacao(valor: float, stocks_file=None) -> dict:
    from .models import Posicao

    # Get tickers in the latest portfolio snapshot
    ultima_data = Posicao.objects.order_by('-data').values_list('data', flat=True).first()
    tickers_carteira = set()
    if ultima_data:
        tickers_carteira = set(
            Posicao.objects.filter(data=ultima_data)
            .select_related('ativo')
            .values_list('ativo__nome', flat=True)
        )

    recomendacoes = gerar_json_recomendacoes(stocks_file)

    compras = [r for r in recomendacoes if r['recomendacao'] == 'COMPRA']
    if not compras:
        compras = [r for r in recomendacoes if r['recomendacao'] == 'ESPERA']

    compras.sort(key=lambda r: r['minus_dp'], reverse=True)
    total_minus_dp = sum(r['minus_dp'] for r in compras) or 1
    for r in compras:
        r['valor_sugerido'] = round((r['minus_dp'] / total_minus_dp) * valor, 2)
        r['percentual'] = round((r['minus_dp'] / total_minus_dp) * 100, 1)
        r['na_carteira'] = r['ticker'] in tickers_carteira

    vendas = [
        r for r in recomendacoes
        if r['recomendacao'] == 'VENDA' and r['ticker'] in tickers_carteira
    ]

    return {
        'comprar': compras,
        'vender': vendas,
        'valor_total': valor,
        'total_compras': len(compras),
    }


def avaliar_carteira_preco_medio():
    """
    Para cada ativo em carteira com preço médio conhecido, calcula o
    'yield garantido' = dividendo médio anual (últimos 5 anos) / preço médio pago:

        yield_garantido = media_dividendos_5_anos / preco_medio

    Acima de 6% o preço pago ainda se paga em dividendos -> MANTER.
    Abaixo disso -> VENDA (o preço pago já não compensa mais o que o ativo paga hoje).

    Returns:
        Lista de dicionários, um por ativo em carteira com preço médio definido.
    """
    from .models import Ativo

    hoje = datetime.now()
    start_date = f'{hoje.year - 5}-01-01'

    ativos = Ativo.objects.filter(
        quantidade__gt=0,
        preco_medio__isnull=False,
        classe_ativo__in=['ACAO', 'FII', 'ETF'],
    )

    resultados = []
    for ativo in ativos:
        try:
            preco_medio = float(ativo.preco_medio)
            if preco_medio <= 0:
                continue

            acao = yf.Ticker(f'{ativo.nome}.SA')
            historico = acao.history(start=start_date)
            stats = _dividendos_5_anos_de_historico(historico, hoje)

            if stats['anos'] == 0:
                resultados.append({
                    'ticker': ativo.nome,
                    'quantidade': float(ativo.quantidade),
                    'preco_medio': round(preco_medio, 2),
                    'dividendo_medio_anual': 0,
                    'anos_historico': 0,
                    'yield_garantido': 0,
                    'recomendacao': 'SEM_HISTORICO',
                })
                continue

            yield_garantido = stats['media_anual'] / preco_medio

            resultados.append({
                'ticker': ativo.nome,
                'quantidade': float(ativo.quantidade),
                'preco_medio': round(preco_medio, 2),
                'dividendo_medio_anual': round(stats['media_anual'], 2),
                'anos_historico': stats['anos'],
                'yield_garantido': round(yield_garantido * 100, 2),
                'recomendacao': 'MANTER' if yield_garantido > 0.06 else 'VENDA',
            })
        except Exception as e:
            print(f"Erro ao avaliar preço médio de {ativo.nome}: {e}")
            continue

    resultados.sort(key=lambda r: r['yield_garantido'])
    return resultados


def gerar_json_recomendacoes(stocks_file=None):
    """
    Gera JSON com recomendações de ações.
    
    Returns:
        Lista de dicionários com recomendações
    """
    df = obter_recomendacoes(stocks_file)
    
    recomendacoes = []
    for _, row in df.iterrows():
        recomendacoes.append({
            'ticker': row['ticker'],
            'empresa': row['empresa'],
            'setor': row['setor'],
            'preco': float(row['preço']),
            'preco_alvo': float(row['preço_alvo']),
            'yield': float(row['yield']),
            'minus_dp': float(row['minus_dp']),
            'dp': float(row['dp']),
            'potencial': float(row['potencial']),
            'recomendacao': row['recomendacao'],
            'score': float(row['score'])
        })
    
    return recomendacoes
