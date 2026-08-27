from rest_framework.routers import DefaultRouter

from .views import TripViewSet, VehicleAssignmentViewSet, VehicleViewSet

router = DefaultRouter()
router.register('vehicles', VehicleViewSet, basename='vehicle')
router.register('vehicle-assignments', VehicleAssignmentViewSet, basename='vehicle-assignment')
router.register('trips', TripViewSet, basename='trip')

urlpatterns = router.urls
