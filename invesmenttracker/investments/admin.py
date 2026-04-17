from django.contrib import admin
from .models import Ativo, Indice, Posicao, MetaPortfolio, Dividendo

@admin.register(Indice)
class IndiceAdmin(admin.ModelAdmin):
    list_display = ('data', 'nome', 'valor')
    list_filter = ('nome', 'data')
    search_fields = ('nome',)
    date_hierarchy = 'data'
    ordering = ('-data', 'nome')
    list_editable = ('valor',)
    
    fieldsets = (
        ('Informações do Índice', {
            'fields': ('data', 'nome', 'valor')
        }),
    )


@admin.register(Ativo)
class AtivoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'classe_ativo')
    list_filter = ('classe_ativo',)
    search_fields = ('nome',)
    ordering = ('classe_ativo', 'nome')
    
    fieldsets = (
        ('Informações do Ativo', {
            'fields': ('nome', 'classe_ativo')
        }),
    )


@admin.register(Posicao)
class PosicaoAdmin(admin.ModelAdmin):
    list_display = ('data', 'ativo', 'valor')
    list_filter = ('ativo__classe_ativo', 'data')
    search_fields = ('ativo__nome',)
    date_hierarchy = 'data'
    ordering = ('-data', 'ativo')
    list_editable = ('valor',)
    
    fieldsets = (
        ('Informações da Posição', {
            'fields': ('data', 'ativo', 'valor')
        }),
    )


@admin.register(MetaPortfolio)
class MetaPortfolioAdmin(admin.ModelAdmin):
    list_display = ('tipo', 'meta')
    list_editable = ('meta',)
    search_fields = ('tipo',)
    
    fieldsets = (
        ('Meta de Portfólio', {
            'fields': ('tipo', 'meta')
        }),
    )




@admin.register(Dividendo)
class DividendoAdmin(admin.ModelAdmin):
    list_display = ('data', 'ativo', 'valor', 'tipo')
    list_filter = ('ativo__classe_ativo', 'data', 'tipo')
    search_fields = ('ativo__nome',)
    date_hierarchy = 'data'
    ordering = ('-data',)
    list_editable = ('valor',)
    
    fieldsets = (
        ('Informações do Dividendo', {
            'fields': ('data', 'ativo', 'valor', 'tipo')
        }),
    )


