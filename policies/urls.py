from rest_framework.routers import DefaultRouter

from .views import PolicyApprovalViewSet, PolicyViewSet

router = DefaultRouter()
router.register('policies', PolicyViewSet, basename='policy')
router.register('policy-approvals', PolicyApprovalViewSet, basename='policy-approval')

urlpatterns = router.urls
