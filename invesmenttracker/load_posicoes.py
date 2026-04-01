from investments.models import Posicao
from datetime import datetime

import os
import glob
os.chdir('..')
# Find the CSV file
csv_files = glob.glob('*.csv')
csv_file = None
for f in csv_files:
    if 'posic' in f.lower():
        csv_file = f
        break

if not csv_file and csv_files:
    csv_file = csv_files[0]

if not csv_file:
    raise FileNotFoundError("Could not find positions CSV file")

csv_content = open(csv_file, 'r', encoding='utf-8').read()

lines = csv_content.strip().split('\n')

# Extract categories from first line
categoria_line = lines[0]
categorias = [c.strip() for c in categoria_line.split(';')[1:]]  # Skip first empty column

# Extract header (tickers) from second line
header_line = lines[1]
ativos = [a.strip() for a in header_line.split(';')[1:]]  # Skip DATA

# Map each ativo to its category based on position in the CSV
CLASSE_MAPPING = {}
for i, ativo in enumerate(ativos):
    if i < len(categorias):
        classe = categorias[i]
        # Map category names to model choices
        if 'RESERVA' in classe.upper():
            CLASSE_MAPPING[ativo] = 'RESERVA'
        elif 'ETF' in classe.upper():
            CLASSE_MAPPING[ativo] = 'ETF'
        elif 'FII' in classe.upper():
            CLASSE_MAPPING[ativo] = 'FII'
        elif 'CRIPTO' in classe.upper():
            CLASSE_MAPPING[ativo] = 'CRIPTO'
        elif 'AÇÃO' in classe.upper():
            CLASSE_MAPPING[ativo] = 'ACAO'
        elif 'SALDO' in classe.upper():
            CLASSE_MAPPING[ativo] = 'SALDO'
        else:
            CLASSE_MAPPING[ativo] = 'ACAO'

created = 0
skipped = 0
errors = 0

for i, line in enumerate(lines[2:], 1):  # Start from line 3 (after header)
    try:
        parts = [p.strip() for p in line.split(';')]
        data_str = parts[0]
        
        if not data_str or data_str == 'DATA':
            continue
        
        # Parse date from DD/MM/YYYY
        data = datetime.strptime(data_str, '%d/%m/%Y').date()
        
        # Process each ativo
        for j, valor_str in enumerate(parts[1:]):
            if j >= len(ativos):
                break
                
            ativo = ativos[j]
            if not ativo or valor_str == '' or valor_str == 'R$ -':
                continue
            
            # Clean the value string
            valor_str = valor_str.replace('R$ ', '').replace('.', '').replace(',', '.')
            
            try:
                valor = float(valor_str)
            except ValueError:
                continue
            
            if valor == 0:
                continue
            
            classe_ativo = CLASSE_MAPPING.get(ativo, 'ACAO')
            
            # Create or get the posicao
            posicao, created_flag = Posicao.objects.get_or_create(
                data=data,
                ativo=ativo,
                defaults={'classe_ativo': classe_ativo, 'valor': valor}
            )
            
            if created_flag:
                created += 1
            else:
                skipped += 1
                
    except Exception as e:
        errors += 1
        print(f"Erro em linha {i}: {line[:80]}... - {str(e)}")

print(f"\n✓ {created} registros criados")
print(f"~ {skipped} registros já existentes")
print(f"✗ {errors} erros")
print(f"\nTotal: {created + skipped} registros no banco")
