from rest_framework.routers import DefaultRouter

from .views import EventCommentViewSet, EventViewSet, InquiryViewSet, OrderViewSet, ReturnSheetViewSet

router = DefaultRouter()
router.register('inquiries', InquiryViewSet, basename='inquiry')
router.register('orders', OrderViewSet, basename='order')
router.register('events', EventViewSet, basename='event')
router.register('event-comments', EventCommentViewSet, basename='event-comment')
router.register('return-sheets', ReturnSheetViewSet, basename='return-sheet')

urlpatterns = router.urls
