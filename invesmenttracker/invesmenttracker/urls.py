from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from investments import views

router = routers.DefaultRouter()
router.register(r'ativos', views.AtivoViewSet, basename='ativo')
router.register(r'indices', views.IndiceViewSet, basename='indice')
router.register(r'posicoes', views.PosicaoViewSet, basename='posicao')
router.register(r'dividendos', views.DividendoViewSet, basename='dividendo')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/sugestao-aporte/', views.sugestao_aporte, name='sugestao-aporte'),
    path('api/rebalanceamento/', views.rebalanceamento, name='rebalanceamento'),
    path('api/registrar-posicao/', views.registrar_posicao, name='registrar-posicao'),
    path('api/atualizar-indices/', views.atualizar_indices, name='atualizar-indices'),
    path('api/ultimos-registros/', views.ultimos_registros, name='ultimos-registros'),
]
