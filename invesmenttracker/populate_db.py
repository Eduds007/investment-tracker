import os
import django
from decimal import Decimal
from datetime import datetime, timedelta
import random

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'invesmenttracker.settings')
django.setup()

from investments.models import Aporte, Ativo, Indice, Posicao, Dividendo, MetaPortfolio

def limpar_banco():
    """Limpa dados anteriores"""
    print("Limpando dados existentes...")
    Dividendo.objects.all().delete()
    Posicao.objects.all().delete()
    Indice.objects.all().delete()
    Aporte.objects.all().delete()
    Ativo.objects.all().delete()
    MetaPortfolio.objects.all().delete()
    print("✓ Banco de dados limpo")

def criar_ativos():
    """Cria os ativos dummy"""
    print("\nCriando ativos...")
    ativos_data = [
        # Saldo e Reservas
        ('SALDO', 'Saldo'),
        ('RESERVA', 'Reserva de Emergência'),
        
        # ETFs
        ('BOVA11', 'ETF'),
        ('IVVB11', 'ETF'),
        ('VFIAX', 'ETF'),
        
        # Ações
        ('BBAS3', 'ACAO'),
        ('PETR4', 'ACAO'),
        ('WEGE3', 'ACAO'),
        ('MGLU3', 'ACAO'),
        
        # FII
        ('KNRI11', 'FII'),
        ('MXRF11', 'FII'),
        ('HGLG11', 'FII'),
        
        # Criptos
        ('BTC', 'CRIPTO'),
        ('ETH', 'CRIPTO'),
        ('BNB', 'CRIPTO'),
    ]
    
    ativos = {}
    classe_map = {
        'Saldo': 'SALDO',
        'Reserva de Emergência': 'RESERVA',
        'ETF': 'ETF',
        'ACAO': 'ACAO',
        'FII': 'FII',
        'CRIPTO': 'CRIPTO',
    }
    
    for nome, classe_display in ativos_data:
        if classe_display in classe_map:
            classe = classe_map[classe_display]
        else:
            classe = classe_display
            
        ativo, created = Ativo.objects.get_or_create(
            nome=nome,
            defaults={'classe_ativo': classe}
        )
        ativos[nome] = ativo
        status = "✓ Criado" if created else "✓ Já existe"
        print(f"  {status}: {nome} ({classe})")
    
    return ativos

def criar_aportes():
    """Cria aportes dummy"""
    print("\nCriando aportes...")
    hoje = datetime.now().date()
    
    aportes_data = [
        {'data': hoje - timedelta(days=90), 'tipo': 'COMPRA', 'valor': 1000, 'lugar': 'CLEAR', 'descricao': 'Aporte inicial'},
        {'data': hoje - timedelta(days=60), 'tipo': 'COMPRA', 'valor': 500, 'lugar': 'INTER', 'descricao': 'Aporte mensal'},
        {'data': hoje - timedelta(days=30), 'tipo': 'COMPRA', 'valor': 750, 'lugar': 'CLEAR', 'descricao': 'Bônus recebido'},
        {'data': hoje - timedelta(days=15), 'tipo': 'COMPRA', 'valor': 200, 'lugar': 'INTER', 'descricao': 'Aporte extra'},
        {'data': hoje - timedelta(days=7), 'tipo': 'SAQUE', 'valor': 100, 'lugar': 'CLEAR', 'descricao': 'Saque para emergência'},
        {'data': hoje - timedelta(days=1), 'tipo': 'COMPRA', 'valor': 300, 'lugar': 'INTER', 'descricao': 'Aporte mensal'},
    ]
    
    for data_aporte in aportes_data:
        aporte, created = Aporte.objects.get_or_create(
            data=data_aporte['data'],
            tipo=data_aporte['tipo'],
            valor=Decimal(str(data_aporte['valor'])),
            defaults={
                'lugar': data_aporte['lugar'],
                'descricao': data_aporte['descricao']
            }
        )
        if created:
            print(f"  ✓ {aporte}")
    
    print(f"  Total de aportes: {Aporte.objects.count()}")

def criar_indices():
    """Cria índices dummy"""
    print("\nCriando índices...")
    hoje = datetime.now().date()
    
    indices_data = [
        ('BTC', 165000, 158000),
        ('IFIX', 12500, 12200),
        ('Bovespa', 135000, 131000),
        ('S&P500', 5800, 5650),
        ('Inflação', 4.5, 4.2),
    ]
    
    for nome, valor_inicial, _ in indices_data:
        for dias_atras in range(0, 31, 5):
            data = hoje - timedelta(days=dias_atras)
            variacao = Decimal(str(random.uniform(-2, 2)))
            valor = Decimal(str(valor_inicial)) + variacao * Decimal(str(valor_inicial / 100))
            
            indice, created = Indice.objects.get_or_create(
                data=data,
                nome=nome,
                defaults={'valor': valor}
            )
            if created:
                print(f"  ✓ {indice}")

def criar_posicoes(ativos):
    """Cria posições dummy"""
    print("\nCriando posições...")
    hoje = datetime.now().date()
    
    posicoes_base = {
        'SALDO': 5000,
        'RESERVA': 10000,
        'BOVA11': 15000,
        'IVVB11': 8000,
        'VFIAX': 12000,
        'BBAS3': 3000,
        'PETR4': 2500,
        'WEGE3': 4000,
        'MGLU3': 1500,
        'KNRI11': 6000,
        'MXRF11': 5500,
        'HGLG11': 3500,
        'BTC': 25000,
        'ETH': 8000,
        'BNB': 2000,
    }
    
    # Criar posições para os últimos 30 dias
    for dias_atras in range(0, 31, 5):
        data = hoje - timedelta(days=dias_atras)
        for nome_ativo, valor_base in posicoes_base.items():
            if nome_ativo in ativos:
                variacao = Decimal(str(random.uniform(0.95, 1.05)))
                valor = Decimal(str(valor_base)) * variacao
                
                posicao, created = Posicao.objects.get_or_create(
                    data=data,
                    ativo=ativos[nome_ativo],
                    defaults={'valor': valor}
                )
                if created:
                    print(f"  ✓ {posicao}")

def criar_dividendos(ativos):
    """Cria dividendos dummy"""
    print("\nCriando dividendos...")
    hoje = datetime.now().date()
    
    dividendos_data = [
        ('BBAS3', hoje - timedelta(days=45), 15.50, 'Dividendo'),
        ('BBAS3', hoje - timedelta(days=10), 12.30, 'Dividendo'),
        ('PETR4', hoje - timedelta(days=40), 25.00, 'Dividendo'),
        ('WEGE3', hoje - timedelta(days=35), 8.75, 'Dividendo'),
        ('KNRI11', hoje - timedelta(days=30), 45.00, 'Aluguel'),
        ('MXRF11', hoje - timedelta(days=25), 38.50, 'Aluguel'),
        ('HGLG11', hoje - timedelta(days=20), 52.00, 'Aluguel'),
    ]
    
    for nome_ativo, data, valor, tipo in dividendos_data:
        if nome_ativo in ativos:
            dividendo, created = Dividendo.objects.get_or_create(
                data=data,
                ativo=ativos[nome_ativo],
                valor=Decimal(str(valor)),
                defaults={'tipo': tipo}
            )
            if created:
                print(f"  ✓ {dividendo}")

def criar_metas():
    """Cria metas de portfólio"""
    print("\nCriando metas de portfólio...")
    
    metas_data = [
        ('Reserva', 15),
        ('Ações Brasileiras', 25),
        ('ETF Brasil', 20),
        ('ETF Exterior', 20),
        ('FII', 12),
        ('Criptos', 8),
    ]
    
    for tipo, meta in metas_data:
        meta_obj, created = MetaPortfolio.objects.get_or_create(
            tipo=tipo,
            defaults={'meta': Decimal(str(meta))}
        )
        if created:
            print(f"  ✓ {meta_obj}")

def main():
    print("=" * 50)
    print("POPULANDO BANCO DE DADOS COM DADOS DUMMY")
    print("=" * 50)
    
    try:
        limpar_banco()
        ativos = criar_ativos()
        criar_aportes()
        criar_indices()
        criar_posicoes(ativos)
        criar_dividendos(ativos)
        criar_metas()
        
        print("\n" + "=" * 50)
        print("✓ BANCO DE DADOS PREENCHIDO COM SUCESSO!")
        print("=" * 50)
        print(f"\nResumo:")
        print(f"  - Ativos: {Ativo.objects.count()}")
        print(f"  - Aportes: {Aporte.objects.count()}")
        print(f"  - Índices: {Indice.objects.count()}")
        print(f"  - Posições: {Posicao.objects.count()}")
        print(f"  - Dividendos: {Dividendo.objects.count()}")
        print(f"  - Metas: {MetaPortfolio.objects.count()}")
        
    except Exception as e:
        print(f"\n✗ Erro ao popular banco de dados: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
