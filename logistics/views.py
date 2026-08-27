from django.db import transaction
from django.db.models import ProtectedError
from django.utils import timezone
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsPlannerOrAdmin, get_staff_profile, in_group
from core.roles import ADMIN, EVENT_PLANNER

from .models import LocationPing, Trip, Vehicle, VehicleAssignment
from .serializers import LocationPingSerializer, TripSerializer, VehicleAssignmentSerializer, VehicleSerializer


class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsPlannerOrAdmin()]
        return [IsAuthenticated()]

    def perform_destroy(self, instance):
        try:
            instance.delete()
        except ProtectedError:
            raise ValidationError('This vehicle has trip assignments and cannot be deleted.')


class VehicleAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleAssignmentSerializer

    def get_queryset(self):
        user = self.request.user
        if in_group(user, ADMIN) or in_group(user, EVENT_PLANNER):
            return VehicleAssignment.objects.all()
        staff = get_staff_profile(user)
        if not staff:
            return VehicleAssignment.objects.none()
        return VehicleAssignment.objects.filter(driver=staff)

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsPlannerOrAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        vehicle = serializer.validated_data['vehicle']
        with transaction.atomic():
            locked_vehicle = Vehicle.objects.select_for_update().get(pk=vehicle.pk)
            if locked_vehicle.status != Vehicle.Status.AVAILABLE:
                raise ValidationError('Selected vehicle is not available.')
            assignment = serializer.save()
            Trip.objects.create(vehicle_assignment=assignment)
            locked_vehicle.status = Vehicle.Status.IN_USE
            locked_vehicle.save(update_fields=['status'])


class TripViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = TripSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if in_group(user, ADMIN) or in_group(user, EVENT_PLANNER):
            return Trip.objects.all()
        staff = get_staff_profile(user)
        if not staff:
            return Trip.objects.none()
        return Trip.objects.filter(vehicle_assignment__driver=staff)

    def _require_assigned_driver(self, trip):
        staff = get_staff_profile(self.request.user)
        if not staff or trip.vehicle_assignment.driver_id != staff.id:
            raise PermissionDenied('Only this trip\'s assigned driver can do that.')

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        trip = self.get_object()
        self._require_assigned_driver(trip)

        if trip.status != Trip.Status.SCHEDULED:
            raise ValidationError('Only a scheduled trip can be started.')

        driver = trip.vehicle_assignment.driver
        already_active = Trip.objects.filter(
            vehicle_assignment__driver=driver, status=Trip.Status.EN_ROUTE
        ).exclude(pk=trip.pk)
        if already_active.exists():
            raise ValidationError('This driver already has another trip in progress.')

        trip.status = Trip.Status.EN_ROUTE
        trip.started_at = timezone.now()
        trip.save(update_fields=['status', 'started_at'])
        return Response(TripSerializer(trip).data)

    @action(detail=True, methods=['post'])
    def end(self, request, pk=None):
        trip = self.get_object()
        self._require_assigned_driver(trip)

        if trip.status != Trip.Status.EN_ROUTE:
            raise ValidationError('Only a trip that is en route can be ended.')

        with transaction.atomic():
            trip.status = Trip.Status.COMPLETED
            trip.ended_at = timezone.now()
            trip.save(update_fields=['status', 'ended_at'])

            vehicle = trip.vehicle_assignment.vehicle
            Vehicle.objects.filter(pk=vehicle.pk).update(status=Vehicle.Status.AVAILABLE)

        return Response(TripSerializer(trip).data)

    @action(detail=True, methods=['post'])
    def location(self, request, pk=None):
        trip = self.get_object()
        self._require_assigned_driver(trip)

        if trip.status != Trip.Status.EN_ROUTE:
            raise ValidationError('Location pings are only accepted while a trip is en route.')

        serializer = LocationPingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ping = serializer.save(trip=trip, recorded_at=serializer.validated_data.get('recorded_at') or timezone.now())
        return Response(LocationPingSerializer(ping).data)

    @action(detail=True, methods=['get'], url_path='location/latest')
    def location_latest(self, request, pk=None):
        trip = self.get_object()
        self._require_view_access(trip)

        latest = trip.pings.order_by('-recorded_at').first()
        if not latest:
            raise NotFound('No location pings recorded for this trip yet.')

        seconds_ago = (timezone.now() - latest.recorded_at).total_seconds()
        data = LocationPingSerializer(latest).data
        data['seconds_since_ping'] = int(seconds_ago)
        return Response(data)

    @action(detail=True, methods=['get'], url_path='location/history')
    def location_history(self, request, pk=None):
        trip = self.get_object()
        self._require_view_access(trip)

        pings = trip.pings.order_by('recorded_at')
        return Response(LocationPingSerializer(pings, many=True).data)

    def _require_view_access(self, trip):
        user = self.request.user
        staff = get_staff_profile(user)
        is_assigned_driver = bool(staff and trip.vehicle_assignment.driver_id == staff.id)
        if not (in_group(user, ADMIN) or in_group(user, EVENT_PLANNER) or is_assigned_driver):
            raise PermissionDenied('Not allowed to view this trip\'s location.')
