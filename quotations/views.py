from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsPlannerOrAdmin, in_group
from core.roles import ADMIN, EVENT_PLANNER
from events.models import Event, Inquiry, Order
from events.serializers import OrderSerializer

from .models import Quotation, QuotationItem
from .serializers import QuotationItemSerializer, QuotationSerializer


class QuotationViewSet(viewsets.ModelViewSet):
    serializer_class = QuotationSerializer

    def get_queryset(self):
        user = self.request.user
        if in_group(user, ADMIN, EVENT_PLANNER):
            return Quotation.objects.all()
        return Quotation.objects.filter(client=user)

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'send'):
            return [IsPlannerOrAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.status not in (Quotation.Status.DRAFT, Quotation.Status.REJECTED):
            raise ValidationError('Only a pending or rejected quotation can be edited.')
        serializer.save()

    def perform_destroy(self, instance):
        if instance.status not in (Quotation.Status.DRAFT, Quotation.Status.REJECTED):
            raise ValidationError('Only a pending or rejected quotation can be deleted.')
        instance.delete()

    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        quotation = self.get_object()
        if quotation.status != Quotation.Status.DRAFT:
            raise ValidationError('Only a draft quotation can be sent.')
        if not quotation.items.exists():
            raise ValidationError('Add at least one line item before sending.')
        quotation.status = Quotation.Status.SENT
        quotation.sent_at = timezone.now()
        quotation.save(update_fields=['status', 'sent_at'])
        return Response(QuotationSerializer(quotation).data)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        quotation = self.get_object()
        user = request.user
        if quotation.client_id != user.id and not in_group(user, ADMIN, EVENT_PLANNER):
            raise PermissionDenied('Only the client or a planner/admin can accept this quotation.')
        if quotation.status != Quotation.Status.SENT:
            raise ValidationError('Only a sent quotation can be accepted.')

        event = Event.objects.create(
            name=quotation.event_name,
            type=quotation.event_type,
            client=quotation.client,
            planner=quotation.planner,
            date_start=quotation.date_start,
            date_end=quotation.date_end,
            venue=quotation.venue,
            classification=quotation.classification,
        )
        order = Order.objects.create(inquiry=quotation.inquiry, event=event)

        quotation.status = Quotation.Status.ACCEPTED
        quotation.responded_at = timezone.now()
        quotation.save(update_fields=['status', 'responded_at'])

        quotation.inquiry.status = Inquiry.Status.CONVERTED
        quotation.inquiry.save(update_fields=['status'])

        return Response(OrderSerializer(order).data, status=201)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        quotation = self.get_object()
        user = request.user
        if quotation.client_id != user.id and not in_group(user, ADMIN, EVENT_PLANNER):
            raise PermissionDenied('Only the client or a planner/admin can reject this quotation.')
        if quotation.status != Quotation.Status.SENT:
            raise ValidationError('Only a sent quotation can be rejected.')
        quotation.status = Quotation.Status.REJECTED
        quotation.responded_at = timezone.now()
        quotation.save(update_fields=['status', 'responded_at'])
        return Response(QuotationSerializer(quotation).data)


class QuotationItemViewSet(viewsets.ModelViewSet):
    serializer_class = QuotationItemSerializer

    def get_queryset(self):
        user = self.request.user
        if in_group(user, ADMIN, EVENT_PLANNER):
            return QuotationItem.objects.all()
        return QuotationItem.objects.filter(quotation__client=user)

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsPlannerOrAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        quotation = serializer.validated_data['quotation']
        if quotation.status != Quotation.Status.DRAFT:
            raise ValidationError('Items can only be added while the quotation is a draft.')
        serializer.save()

    def perform_update(self, serializer):
        if serializer.instance.quotation.status != Quotation.Status.DRAFT:
            raise ValidationError('Items can only be edited while the quotation is a draft.')
        serializer.save()

    def perform_destroy(self, instance):
        if instance.quotation.status != Quotation.Status.DRAFT:
            raise ValidationError('Items can only be removed while the quotation is a draft.')
        instance.delete()
