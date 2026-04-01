from django.db import models
from decimal import Decimal

class Aporte(models.Model):
    TIPO_CHOICES = [
        ('COMPRA', 'Compra'),
        ('SAQUE', 'Saque'),
    ]
    
    data = models.DateField("Data", help_text="Data da operação")
    tipo = models.CharField("Tipo", max_length=10, choices=TIPO_CHOICES, help_text="Compra ou Saque")
    valor = models.DecimalField("Valor (R$)", max_digits=12, decimal_places=2, help_text="Valor em reais")
    lugar = models.CharField("Local", max_length=50, help_text="Ex: CLEAR, INTER")
    descricao = models.TextField("Descrição", blank=True, null=True, help_text="Descrição ou observações sobre o aporte")
    
    class Meta:
        verbose_name = "Aporte"
        verbose_name_plural = "Aportes"
        ordering = ['-data']
    
    def __str__(self):
        return f"{self.data.strftime('%d/%m/%Y')} - {self.get_tipo_display()} - R$ {self.valor} ({self.lugar})"
    
    def total_value(self):
        return f"R$ {self.valor:,.2f}".replace(',', '.')



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
    CLASSE_CHOICES = [
        ('SALDO', 'Saldo'),
        ('RESERVA', 'Reserva de Emergência'),
        ('ETF', 'ETF\'s'),
        ('FII', 'FII'),
        ('CRIPTO', 'Criptos'),
        ('ACAO', 'Ações'),
    ]
    
    data = models.DateField("Data", help_text="Data da posição")
    classe_ativo = models.CharField("Classe de Ativo", max_length=20, choices=CLASSE_CHOICES, help_text="Categoria do ativo")
    ativo = models.CharField("Ativo", max_length=100, help_text="Ex: TESOURO, CDB, LCA, BOVA11, BTC, ETH, BBAS3")
    valor = models.DecimalField("Valor (R$)", max_digits=15, decimal_places=2, help_text="Quanto você tem em reais neste ativo")
    
    class Meta:
        verbose_name = "Posição"
        verbose_name_plural = "Posições"
        ordering = ['-data', 'classe_ativo', 'ativo']
        unique_together = ('data', 'classe_ativo', 'ativo')  # Garante que não há duplicatas
    
    def __str__(self):
        return f"{self.data.strftime('%d/%m/%Y')} - {self.ativo} ({self.get_classe_ativo_display()}): R$ {self.valor}"


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
    ativo = models.CharField("Ativo", max_length=100, help_text="Ex: BBAS3, BOVA11, ITUB4")
    valor = models.DecimalField("Valor (R$)", max_digits=12, decimal_places=2, help_text="Valor do dividendo")
    tipo = models.CharField("Tipo", max_length=50, help_text="Ex: Dividendo, JCP, Aluguel", blank=True, null=True)
    
    class Meta:
        verbose_name = "Dividendo"
        verbose_name_plural = "Dividendos"
        ordering = ['-data']
    
    def __str__(self):
        return f"{self.data.strftime('%d/%m/%Y')} - {self.ativo}: R$ {self.valor}"

