from django.db import models
from decimal import Decimal


class Ativo(models.Model):
    CLASSE_CHOICES = [
        ('SALDO', 'Saldo'),
        ('RESERVA', 'Reserva de Emergência'),
        ('ETF', 'ETF\'s'),
        ('FII', 'FII'),
        ('CRIPTO', 'Criptos'),
        ('ACAO', 'Ações'),
    ]
    
    nome = models.CharField("Nome/Código", max_length=100, unique=True, help_text="Ex: BBAS3, BOVA11, BTC, CDB, TESOURO")
    classe_ativo = models.CharField("Classe de Ativo", max_length=20, choices=CLASSE_CHOICES, help_text="Categoria do ativo")
    quantidade = models.DecimalField("Quantidade", max_digits=18, decimal_places=8, default=Decimal('0'), help_text="Quantidade de cotas/ações atualmente em carteira")
    preco_medio = models.DecimalField("Preço Médio (R$)", max_digits=15, decimal_places=4, null=True, blank=True, help_text="Preço médio de compra por unidade, calculado automaticamente a partir das compras")

    class Meta:
        verbose_name = "Ativo"
        verbose_name_plural = "Ativos"
        ordering = ['classe_ativo', 'nome']
    
    def __str__(self):
        return f"{self.nome} ({self.get_classe_ativo_display()})"


class Indice(models.Model):
    data = models.DateField("Data", help_text="Data do índice")
    nome = models.CharField("Nome do Índice", max_length=100, help_text="Ex: BTC, IFIX, S&P500, Bovespa, Inflação")
    valor = models.DecimalField("Valor", max_digits=15, decimal_places=4, help_text="Valor do índice")
    
    class Meta:
        verbose_name = "Índice"
        verbose_name_plural = "Índices"
        ordering = ['-data', 'nome']
        unique_together = ('data', 'nome')  # Garante que não há duplicatas para a mesma data e nome
    
    def __str__(self):
        return f"{self.data.strftime('%d/%m/%Y')} - {self.nome}: {self.valor}"


class Posicao(models.Model):
    data = models.DateField("Data", help_text="Data da posição")
    ativo = models.ForeignKey(Ativo, on_delete=models.PROTECT, help_text="Ativo referenciado")
    valor = models.DecimalField("Valor (R$)", max_digits=15, decimal_places=2, help_text="Quanto você tem em reais neste ativo")
    
    class Meta:
        verbose_name = "Posição"
        verbose_name_plural = "Posições"
        ordering = ['-data', 'ativo']
        unique_together = ('data', 'ativo')  # Garante que não há duplicatas
    
    def __str__(self):
        return f"{self.data.strftime('%d/%m/%Y')} - {self.ativo.nome} ({self.ativo.get_classe_ativo_display()}): R$ {self.valor}"


class MetaPortfolio(models.Model):
    tipo = models.CharField("Tipo de Ativo", max_length=100, unique=True, help_text="Ex: Reserva, Cripto, S&P500, Ações, FII")
    meta = models.DecimalField("Meta (%)", max_digits=5, decimal_places=2, help_text="Percentual meta para este tipo de ativo")
    
    class Meta:
        verbose_name = "Meta de Portfólio"
        verbose_name_plural = "Metas de Portfólio"
        ordering = ['tipo']
    
    def __str__(self):
        return f"{self.tipo}: {self.meta}%"


class Dividendo(models.Model):
    data = models.DateField("Data", help_text="Data do dividendo recebido")
    ativo = models.ForeignKey(Ativo, on_delete=models.PROTECT, help_text="Ativo que gerou o dividendo")
    valor = models.DecimalField("Valor (R$)", max_digits=12, decimal_places=2, help_text="Valor do dividendo")
    tipo = models.CharField("Tipo", max_length=50, help_text="Ex: Dividendo, JCP, Aluguel", blank=True, null=True)
    
    class Meta:
        verbose_name = "Dividendo"
        verbose_name_plural = "Dividendos"
        ordering = ['-data']
    
    def __str__(self):
        return f"{self.data.strftime('%d/%m/%Y')} - {self.ativo.nome}: R$ {self.valor}"

