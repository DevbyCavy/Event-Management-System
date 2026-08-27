from rest_framework.routers import DefaultRouter

from .views import RequisitionViewSet

router = DefaultRouter()
router.register('requisitions', RequisitionViewSet, basename='requisition')

urlpatterns = router.urls
