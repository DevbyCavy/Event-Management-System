from django.contrib.auth import get_user_model
from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ReadOnlyModelViewSet

from core.permissions import IsPlannerOrAdmin

from .serializers import MeSerializer

User = get_user_model()


class MeView(RetrieveAPIView):
    serializer_class = MeSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserViewSet(ReadOnlyModelViewSet):
    """Read-only user directory, for planners/admins to pick a client/planner/etc. when building other records."""

    queryset = User.objects.all().order_by('username')
    serializer_class = MeSerializer
    permission_classes = [IsPlannerOrAdmin]
