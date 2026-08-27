from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import GuestViewSet, RsvpDetailView, TaskViewSet

router = DefaultRouter()
router.register('guests', GuestViewSet, basename='guest')
router.register('tasks', TaskViewSet, basename='task')

urlpatterns = router.urls + [
    path('rsvp/<uuid:token>/', RsvpDetailView.as_view(), name='rsvp-detail'),
]
