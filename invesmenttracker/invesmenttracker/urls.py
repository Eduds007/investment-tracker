from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from investments import views

router = routers.DefaultRouter()
router.register(r'aportes', views.AporteViewSet, basename='aporte')
router.register(r'indices', views.IndiceViewSet, basename='indice')
router.register(r'posicoes', views.PosicaoViewSet, basename='posicao')
router.register(r'dividendos', views.DividendoViewSet, basename='dividendo')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/sugestao-aporte/', views.sugestao_aporte, name='sugestao-aporte'),
]
