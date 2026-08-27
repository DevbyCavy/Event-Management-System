from rest_framework.routers import DefaultRouter

from .views import EventVendorViewSet, VendorViewSet

router = DefaultRouter()
router.register('vendors', VendorViewSet, basename='vendor')
router.register('event-vendors', EventVendorViewSet, basename='event-vendor')

urlpatterns = router.urls
