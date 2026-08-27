from rest_framework.routers import DefaultRouter

from .views import ProductViewSet, StockInViewSet, StockOutViewSet

router = DefaultRouter()
router.register('products', ProductViewSet, basename='product')
router.register('stock-in', StockInViewSet, basename='stock-in')
router.register('stock-out', StockOutViewSet, basename='stock-out')

urlpatterns = router.urls
