"""
Debug passo a passo do algoritmo de recomendação para um único ativo.
Uso: python debug_ativo.py BMGB4
"""
import sys
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta

TICKER = sys.argv[1] if len(sys.argv) > 1 else 'BMGB4'

SEP = '-' * 60

def header(titulo):
    print(f'\n{SEP}')
    print(f'  {titulo}')
    print(SEP)

hoje = datetime.now()
start_date = f'{hoje.year - 5}-01-01'
doze_meses = hoje - timedelta(days=365)
doze_meses_str = str(doze_meses.date())

header(f'ATIVO: {TICKER}')
print(f'  Hoje:              {hoje.strftime("%d/%m/%Y")}')
print(f'  Início histórico:  {start_date}')
print(f'  Últimos 12 meses:  a partir de {doze_meses_str}')

# ── 1. Baixar histórico ───────────────────────────────────────────────────────
header('1. HISTÓRICO DE PREÇOS E DIVIDENDOS')
acao = yf.Ticker(f'{TICKER}.SA')
historico = acao.history(start=start_date)

if historico.empty:
    print(f'  ERRO: Nenhum dado encontrado para {TICKER}.SA')
    sys.exit(1)

print(f'  Registros baixados: {len(historico)}')
print(f'  Período:            {historico.index[0].date()} → {historico.index[-1].date()}')
preco_atual = historico.iloc[-1]['Close']
print(f'  Preço atual:        R$ {preco_atual:.2f}')
print(f'  Total dividendos pagos no período: R$ {historico["Dividends"].sum():.4f}')

# ── 2. Calcular yield por evento ──────────────────────────────────────────────
header('2. YIELD POR EVENTO DE DIVIDENDO (Dividendo / Preço Atual)')
historico['yield'] = historico['Dividends'] / preco_atual
historico_div = historico[historico['yield'] != 0].copy()

if historico_div.empty:
    print('  AVISO: Nenhum dividendo encontrado no histórico.')
else:
    print(f'  Eventos de dividendo encontrados: {len(historico_div)}')
    print()
    for data, row in historico_div.iterrows():
        print(f'  {data.date()}  |  Dividendo: R$ {row["Dividends"]:.4f}  |  '
              f'Yield s/ preço atual (R${preco_atual:.2f}): {row["yield"]*100:.4f}%')

# ── 3. Últimos 12 meses ───────────────────────────────────────────────────────
header('3. ÚLTIMOS 12 MESES')
historico_12m = historico[historico.index >= doze_meses_str]
yield_12m = historico_12m['yield'].sum()
dividends_12m = historico_12m['Dividends'].sum()

print(f'  Registros nos últimos 12 meses: {len(historico_12m)}')
print(f'  Dividendos pagos (R$):          {dividends_12m:.4f}')
print(f'  Yield acumulado 12m:            {yield_12m*100:.4f}%')

# ── 4. Agrupamento anual ──────────────────────────────────────────────────────
header('4. YIELD AGRUPADO POR ANO')
agrupado = historico_div.groupby(historico_div.index.year).sum()

print('  (Ano atual substituído pelo yield dos últimos 12 meses)')
print()

try:
    if agrupado.index[-1] == hoje.year:
        valor_antes = agrupado.iloc[-1]['yield']
        agrupado.iloc[-1, agrupado.columns.get_loc('yield')] = yield_12m
        print(f'  ⚠ Ano {hoje.year}: yield original {valor_antes*100:.4f}% '
              f'→ substituído por {yield_12m*100:.4f}% (últimos 12 meses)')
        print()
except Exception:
    pass

for ano, row in agrupado.iterrows():
    print(f'  {ano}  |  Dividendos: R$ {row["Dividends"]:.4f}  |  Yield: {row["yield"]*100:.4f}%')

anos_historico = len(agrupado)
print(f'\n  Total de anos com dividendos: {anos_historico}  (mínimo exigido: 5)')

# ── 5. Estatísticas ───────────────────────────────────────────────────────────
header('5. ESTATÍSTICAS DE YIELD')
media = agrupado['yield'].mean()
desv  = agrupado['yield'].std()
menos_dp = media - desv

print(f'  Yield médio (dyield):      {media*100:.4f}%')
print(f'  Desvio padrão (dp):        {desv*100:.4f}%')
print(f'  Yield - 1dp (minus_dp):    {menos_dp*100:.4f}%')
print(f'  Critério mínimo:           6.00%')
print(f'  dyield >= 6%?   {"✓ SIM" if media >= 0.06 else "✗ NÃO"}')
print(f'  minus_dp >= 6%? {"✓ SIM" if menos_dp >= 0.06 else "✗ NÃO"}')

# ── 6. Preço-alvo e potencial ─────────────────────────────────────────────────
header('6. PREÇO-ALVO E POTENCIAL DE VALORIZAÇÃO')
preco = preco_atual
target_price = dividends_12m / 0.06 if dividends_12m > 0 else 0
potential = (target_price / preco - 1) if preco > 0 else 0

print(f'  Preço atual:    R$ {preco:.2f}')
print(f'  Preço-alvo:     R$ {target_price:.2f}  (dividendos_12m / 6%)')
print(f'  Potencial:      {potential*100:.2f}%  (preço-alvo / preço - 1)')
print(f'  Potencial > 0?  {"✓ SIM" if potential > 0 else "✗ NÃO"}')

# ── 7. Lógica de recomendação ─────────────────────────────────────────────────
header('7. LÓGICA DE RECOMENDAÇÃO')

cond_compra = potential > 0 and menos_dp >= 0.06 and media >= 0.06 and anos_historico >= 5
cond_espera = (
    (menos_dp >= 0.06 and media >= 0.06 and potential < 0 and anos_historico >= 5)
    or (media >= 0.06 and anos_historico >= 5)
)

print(f'  Condições COMPRA:')
print(f'    potential > 0?              {"✓" if potential > 0 else "✗"}  ({potential*100:.2f}%)')
print(f'    minus_dp >= 6%?             {"✓" if menos_dp >= 0.06 else "✗"}  ({menos_dp*100:.4f}%)')
print(f'    dyield >= 6%?               {"✓" if media >= 0.06 else "✗"}  ({media*100:.4f}%)')
print(f'    anos histórico >= 5?        {"✓" if anos_historico >= 5 else "✗"}  ({anos_historico})')

if cond_compra:
    recomenda = 'COMPRA'
    score = 8.5 + (potential * 2)
    print(f'\n  → COMPRA  |  score = 8.5 + (potencial*2) = 8.5 + ({potential*2:.4f}) = {score:.4f}')
elif cond_espera:
    recomenda = 'ESPERA'
    score = 6.5 + (media * 10)
    print(f'\n  Condições ESPERA atendidas')
    print(f'  → ESPERA  |  score = 6.5 + (dyield*10) = 6.5 + ({media*10:.4f}) = {score:.4f}')
else:
    recomenda = 'VENDA'
    score = 3.0 + (media * 5)
    print(f'\n  Nenhuma condição COMPRA ou ESPERA atendida')
    print(f'  → VENDA   |  score = 3.0 + (dyield*5) = 3.0 + ({media*5:.4f}) = {score:.4f}')

score = min(10, max(0, score))

# ── 8. Resultado final ────────────────────────────────────────────────────────
header('8. RESULTADO FINAL')
print(f'  Ticker:        {TICKER}')
print(f'  Recomendação:  {recomenda}')
print(f'  Score:         {score:.1f}  (normalizado 0–10)')
print(f'  Preço:         R$ {preco:.2f}')
print(f'  Preço-alvo:    R$ {target_price:.2f}')
print(f'  Yield médio:   {media*100:.2f}%')
print(f'  -1dp:          {menos_dp*100:.2f}%')
print(f'  Potencial:     {potential*100:.2f}%')
print(SEP)
