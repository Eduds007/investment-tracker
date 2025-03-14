from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from investments import views

router = routers.DefaultRouter()
router.register(r'investments', views.InvestmentViewSet)
router.register(r'wallet', views.WalletViewSet, basename='wallet')
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
]