from django.db import models
from decimal import Decimal
from django.db.models import Max

class Category(models.Model):
    name = models.CharField(max_length=10, unique=True)  # Ex: 'STOCK', 'FIXED', etc.

    def __str__(self):
        return self.name

class Asset(models.Model):
    name = models.CharField("Nome do Ativo", max_length=100)
    ticker = models.CharField("Código (Ticker)", max_length=10, unique=True)  # Novo campo
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        verbose_name="Categoria"
    )

    def __str__(self):
        return f"{self.ticker} - {self.name}"

class Investment(models.Model):
    asset = models.ForeignKey(  # Substitui 'name' e 'category'
        Asset,
        on_delete=models.CASCADE,
        verbose_name="Ativo"
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    broker = models.CharField(max_length=100)
    operation = models.CharField(max_length=50, choices=[
        ('BUY', 'Compra'),
        ('SELL', 'Venda')
    ])

    def __str__(self):
        return self.name
    
class ValueUpdate(models.Model):
    name = models.CharField(max_length=100)
    value = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()

    def __str__(self):
        return self.name

class Wallet:
    def __init__(self):
        self.assets = {}
        investments = Investment.objects.all().order_by('date')
        value_updates = self._get_latest_value_updates()  # Últimos valores
        
        for investment in investments:
            self.process_investment(investment)
        
        # Adiciona os últimos valores aos ativos
        self._update_latest_values(value_updates)
        self._calculate_percentage_gain()
    
    def process_investment(self, investment):
        name = investment.name
        if name not in self.assets:
            self.assets[name] = {
                'total_quantity': Decimal('0'),
                'total_cost': Decimal('0'),
                'average_price': Decimal('0'),
                'broker': investment.broker,
                'category': investment.category,
                'latest_value': Decimal('0'),
                'latest_value_date': None,
                'percentage_gain': Decimal('0'),
            }
        
        asset = self.assets[name]
        operation = investment.operation
        amount = investment.amount
        price = investment.price
        
        if operation == 'BUY':
            asset['total_quantity'] += amount
            asset['total_cost'] += amount * price
            if asset['total_quantity'] != 0:
                asset['average_price'] = asset['total_cost'] / asset['total_quantity']
            else:
                asset['average_price'] = Decimal('0')
        elif operation == 'SELL':
            if asset['total_quantity'] == 0:
                return  # Ignora venda sem estoque
            sell_amount = min(amount, asset['total_quantity'])  # Não vende mais do que tem
            avg_price = asset['average_price']
            asset['total_cost'] -= avg_price * sell_amount
            asset['total_quantity'] -= sell_amount
            if asset['total_quantity'] != 0:
                asset['average_price'] = asset['total_cost'] / asset['total_quantity']
            else:
                asset['average_price'] = Decimal('0')
    
    def get_assets(self):
        return self.assets
    
    def _get_latest_value_updates(self):
        # Obtém a última atualização de valor para cada ativo
        latest_dates = ValueUpdate.objects.values('name').annotate(latest_date=Max('date'))
        latest_values = {}
        for entry in latest_dates:
            value = ValueUpdate.objects.filter(
                name=entry['name'],
                date=entry['latest_date']
            ).first()
            if value:
                latest_values[entry['name']] = {
                    'current_value': value.value,
                    'date': value.date
                }
        return latest_values
    
    def _update_latest_values(self, value_updates):
        # Atualiza os ativos com os últimos valores
        for name, data in self.assets.items():
            if name in value_updates:
                data['latest_value'] = value_updates[name]['current_value']
                data['latest_value_date'] = value_updates[name]['date']
            else:
                data['latest_value'] = Decimal('0')
                data['latest_value_date'] = None

    def _calculate_percentage_gain(self):
        for name, data in self.assets.items():
            avg_price = data['average_price']
            latest_value = data.get('latest_value', Decimal('0'))
            
            # Evita divisão por zero se o preço médio for zero
            if avg_price == Decimal('0'):
                data['percentage_gain'] = Decimal('0')
            else:
                gain = ((latest_value - avg_price) / avg_price) * 100
                data['percentage_gain'] = gain.quantize(Decimal('0.01'))  # Formata para 2 casas decimais


    
class BasePortfolio(models.Model):
    name = models.ForeignKey(Category, on_delete=models.CASCADE)
    percentage = models.DecimalField(max_digits=5, decimal_places=2)