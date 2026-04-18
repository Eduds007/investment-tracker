"""
Debug enxuto do recomendador para um unico ativo.
Mostra somente os indicadores essenciais para validar o resultado final.

Uso:
    python debug_ativo.py TAEE11
"""
import sys
from datetime import datetime, timedelta

import pandas as pd
import yfinance as yf


def _fmt_bool(value: bool) -> str:
    return 'SIM' if value else 'NAO'


def main() -> None:
    ticker = sys.argv[1].upper() if len(sys.argv) > 1 else 'BMGB4'

    hoje = datetime.now()
    start_date = f'{hoje.year - 5}-01-01'
    doze_meses_str = str((hoje - timedelta(days=365)).date())

    acao = yf.Ticker(f'{ticker}.SA')
    historico = acao.history(start=start_date)

    if historico.empty:
        print(f'ERRO: nenhum dado encontrado para {ticker}.SA')
        return

    preco_atual = historico.iloc[-1]['Close']

    historico_div = historico[historico['Dividends'] != 0]
    historico_12m = historico[historico.index >= doze_meses_str]
    dividends_12m = historico_12m['Dividends'].sum()

    agrupado_div = historico_div.groupby(historico_div.index.year)['Dividends'].sum()
    agrupado_fechado = agrupado_div[agrupado_div.index < hoje.year]
    serie_dividendos = pd.concat(
        [agrupado_fechado, pd.Series([dividends_12m])],
        ignore_index=True,
    )

    media_abs = serie_dividendos.mean()
    desv_abs = serie_dividendos.std()
    if pd.isna(desv_abs):
        desv_abs = 0.0

    dyield = (media_abs / preco_atual) if preco_atual > 0 else 0
    dp = (desv_abs / preco_atual) if preco_atual > 0 else 0
    minus_dp = dyield - dp

    target_price = dividends_12m / 0.06 if dividends_12m > 0 else 0
    potential = (target_price / preco_atual - 1) if preco_atual > 0 else 0
    periodos_validos = len(serie_dividendos)

    cond_compra = (
        potential > 0
        and minus_dp >= 0.06
        and dyield >= 0.06
        and periodos_validos >= 5
    )
    cond_espera = (
        (minus_dp >= 0.06 and dyield >= 0.06 and potential < 0 and periodos_validos >= 5)
        or (dyield >= 0.06 and periodos_validos >= 5)
    )

    if cond_compra:
        recomendacao = 'COMPRA'
        score = 8.5 + (potential * 2)
    elif cond_espera:
        recomendacao = 'ESPERA'
        score = 6.5 + (dyield * 10)
    else:
        recomendacao = 'VENDA'
        score = 3.0 + (dyield * 5)

    score = min(10, max(0, score))

    print(f'Ticker: {ticker}')
    print(f'Preco atual: R$ {preco_atual:.2f}')
    print(f'Dividendos 12m: R$ {dividends_12m:.4f}')
    print(f'Periodos validos (anos fechados + 12m): {periodos_validos}')
    print(f'Yield medio: {dyield * 100:.2f}%')
    print(f'DP: {dp * 100:.2f}%')
    print(f'-1DP: {minus_dp * 100:.2f}%')
    print(f'Preco-alvo: R$ {target_price:.2f}')
    print(f'Potencial: {potential * 100:.2f}%')
    print(f'Check dyield >= 6%: {_fmt_bool(dyield >= 0.06)}')
    print(f'Check -1dp >= 6%: {_fmt_bool(minus_dp >= 0.06)}')
    print(f'Check potencial > 0: {_fmt_bool(potential > 0)}')
    print(f'Check periodos >= 5: {_fmt_bool(periodos_validos >= 5)}')
    print(f'Recomendacao: {recomendacao}')
    print(f'Score: {score:.1f}')


if __name__ == '__main__':
    main()
