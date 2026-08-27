from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from core.permissions import in_group
from core.roles import ADMIN, EVENT_PLANNER

from .models import Guest, Task
from .serializers import (
    GuestBulkImportSerializer,
    GuestSerializer,
    RsvpPublicSerializer,
    TaskSerializer,
)


def _has_event_management_access(user, event):
    return in_group(user, ADMIN) or in_group(user, EVENT_PLANNER) or event.client_id == user.id


class GuestViewSet(viewsets.ModelViewSet):
    serializer_class = GuestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if in_group(user, ADMIN) or in_group(user, EVENT_PLANNER):
            return Guest.objects.all()
        return Guest.objects.filter(event__client=user)

    def _check_event_access(self, event):
        if not _has_event_management_access(self.request.user, event):
            raise PermissionDenied('You do not have access to this event.')

    def perform_create(self, serializer):
        event = serializer.validated_data['event']
        self._check_event_access(event)
        serializer.save()

    def perform_update(self, serializer):
        self._check_event_access(serializer.instance.event)
        serializer.save()

    def perform_destroy(self, instance):
        self._check_event_access(instance.event)
        instance.delete()

    @action(detail=False, methods=['post'], url_path='bulk-import')
    def bulk_import(self, request):
        serializer = GuestBulkImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        event = serializer.validated_data['event']
        self._check_event_access(event)

        created = []
        for row in serializer.validated_data['guests']:
            guest_serializer = GuestSerializer(data={**row, 'event': event.id})
            guest_serializer.is_valid(raise_exception=True)
            created.append(guest_serializer.save())

        return Response(GuestSerializer(created, many=True).data, status=status.HTTP_201_CREATED)


class RsvpDetailView(RetrieveUpdateAPIView):
    serializer_class = RsvpPublicSerializer
    permission_classes = [AllowAny]
    lookup_field = 'rsvp_token'
    lookup_url_kwarg = 'token'
    queryset = Guest.objects.all()

    def perform_update(self, serializer):
        valid_statuses = dict(Guest.RsvpStatus.choices)
        new_status = self.request.data.get('rsvp_status')
        if new_status is not None and new_status not in valid_statuses:
            raise ValidationError({'rsvp_status': f'Must be one of {list(valid_statuses)}.'})
        serializer.save()


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if in_group(user, ADMIN) or in_group(user, EVENT_PLANNER):
            return Task.objects.all()
        return Task.objects.filter(owner=user)

    def perform_create(self, serializer):
        event = serializer.validated_data['event']
        if not _has_event_management_access(self.request.user, event):
            raise PermissionDenied('You do not have access to this event.')
        serializer.save()
