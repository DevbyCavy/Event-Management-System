from django.db.models import Q
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsPlannerOrAdmin, get_staff_profile, in_group
from core.roles import ADMIN, EVENT_PLANNER

from .models import EventTeamAssignment, Staff, Team, TeamMember
from .serializers import (
    EventTeamAssignmentSerializer,
    StaffSerializer,
    TeamMemberSerializer,
    TeamSerializer,
)


class StaffViewSet(viewsets.ModelViewSet):
    queryset = Staff.objects.all()
    serializer_class = StaffSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsPlannerOrAdmin()]
        return [IsAuthenticated()]


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsPlannerOrAdmin()]
        return [IsAuthenticated()]


class TeamMemberViewSet(viewsets.ModelViewSet):
    queryset = TeamMember.objects.all()
    serializer_class = TeamMemberSerializer
    permission_classes = [IsPlannerOrAdmin]


class EventTeamAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = EventTeamAssignmentSerializer

    def get_queryset(self):
        user = self.request.user
        if in_group(user, ADMIN) or in_group(user, EVENT_PLANNER):
            return EventTeamAssignment.objects.all()
        staff = get_staff_profile(user)
        if not staff:
            return EventTeamAssignment.objects.none()
        return EventTeamAssignment.objects.filter(
            Q(team__leader=staff) | Q(team__members__staff=staff)
        ).distinct()

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsPlannerOrAdmin()]
        return [IsAuthenticated()]
