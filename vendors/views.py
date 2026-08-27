from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsPlannerOrAdmin, get_vendor_profile, in_group
from core.roles import ADMIN, EVENT_PLANNER

from .models import EventVendor, Vendor
from .serializers import EventVendorSerializer, VendorSerializer


class VendorViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.all()
    serializer_class = VendorSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsPlannerOrAdmin()]
        return [IsAuthenticated()]


class EventVendorViewSet(viewsets.ModelViewSet):
    serializer_class = EventVendorSerializer

    def get_queryset(self):
        user = self.request.user
        if in_group(user, ADMIN) or in_group(user, EVENT_PLANNER):
            return EventVendor.objects.all()
        vendor = get_vendor_profile(user)
        if vendor:
            return EventVendor.objects.filter(vendor=vendor)
        return EventVendor.objects.filter(event__client=user)

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsPlannerOrAdmin()]
        return [IsAuthenticated()]
