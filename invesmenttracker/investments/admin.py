from django.contrib import admin
from .models import Investment, Category, BasePortfolio, ValueUpdate, Asset

@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ('ticker', 'name')
    search_fields = ('ticker', 'name')

@admin.register(Investment)
class InvestmentAdmin(admin.ModelAdmin):
    list_display = ('asset', 'operation', 'amount', 'price', 'date', 'broker')
    list_filter = ('operation',)
    
    # Para manter a categoria visível (opcional)
    def category(self, obj):
        return obj.asset.category
    category.short_description = "Categoria"

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

@admin.register(BasePortfolio)
class BasePortfolioAdmin(admin.ModelAdmin):
    list_display = ('name', 'percentage')
    search_fields = ('name__name',)

@admin.register(ValueUpdate)
class ValueUpdateAdmin(admin.ModelAdmin):
    list_display = ('name', 'value', 'date')
    search_fields = ('name',)
    list_filter = ('date',)
    date_hierarchy = 'date' 

