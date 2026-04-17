import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta
import os

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
    doze_meses = hoje - timedelta(days=365)
    doze_meses_str = doze_meses.date().__str__()
    
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
                
            # Calcular yield
            historico['yield'] = historico['Dividends'] / historico['Close']
            historico_div = historico[historico['yield'] != 0]
            
            # Dados dos últimos 12 meses
            historico_doze_meses = historico[historico.index >= doze_meses_str]
            yield_doze_meses = historico_doze_meses['yield'].sum()
            dividends_doze_meses = historico_doze_meses['Dividends'].sum()
            
            # Agrupar por ano
            agrupado = historico_div.groupby(historico_div.index.year).sum()
            
            # Se estamos no mesmo ano que o último registro, usar yield de 12 meses
            try:
                if agrupado.index[-1] == hoje.year:
                    agrupado.iloc[-1, 1] = yield_doze_meses
            except:
                pass
            
            # Calcular média e desvio padrão de yield
            media = agrupado['yield'].mean()
            desv = agrupado['yield'].std()
            
            # Dados da ação
            ticker = stock
            preco = historico.iloc[-1]['Close']
            target_price = dividends_doze_meses / 0.06 if dividends_doze_meses > 0 else 0
            dyield = media
            menos_dp = media - desv
            potential = (target_price / preco - 1) if preco > 0 else 0
            
            # Lógica de recomendação
            if potential > 0 and menos_dp >= 0.06 and dyield >= 0.06 and len(agrupado) >= 5:
                recomenda = 'COMPRA'
                score = 8.5 + (potential * 2)
            elif (menos_dp >= 0.06 and dyield >= 0.06 and potential < 0 and len(agrupado) >= 5) or (dyield >= 0.06 and len(agrupado) >= 5):
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
