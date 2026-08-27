from rest_framework.routers import DefaultRouter

from .views import BudgetItemViewSet, PaymentViewSet

router = DefaultRouter()
router.register('budget-items', BudgetItemViewSet, basename='budget-item')
router.register('payments', PaymentViewSet, basename='payment')

urlpatterns = router.urls
