from rest_framework.routers import DefaultRouter

from .views import EventTeamAssignmentViewSet, StaffViewSet, TeamMemberViewSet, TeamViewSet

router = DefaultRouter()
router.register('staff', StaffViewSet, basename='staff')
router.register('teams', TeamViewSet, basename='team')
router.register('team-members', TeamMemberViewSet, basename='team-member')
router.register('event-team-assignments', EventTeamAssignmentViewSet, basename='event-team-assignment')

urlpatterns = router.urls
