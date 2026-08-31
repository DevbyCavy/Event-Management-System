from decimal import Decimal

from django.db import transaction
from django.http import FileResponse
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsPlannerOrAdmin
from events.models import Order
from inventory.models import Product, StockOut
from policies.services import unmet_policy_gates
from requisitions.models import Requisition

from .models import BOQ, BOQItem
from .pdf import build_boq_pdf
from .serializers import BOQItemSerializer, BOQSerializer

EDITABLE_STATUSES = (BOQ.Status.PENDING, BOQ.Status.REJECTED)


def reopen_if_rejected(boq):
    """Editing a rejected BOQ resubmits it for approval."""
    if boq.status == BOQ.Status.REJECTED:
        boq.status = BOQ.Status.PENDING
        boq.save(update_fields=['status'])


class BOQViewSet(viewsets.ModelViewSet):
    queryset = BOQ.objects.all()
    serializer_class = BOQSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'approve', 'reject'):
            return [IsPlannerOrAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        order = serializer.validated_data['event']
        if order.order_status != Order.Status.APPROVED:
            raise ValidationError('A BOQ can only be created for an approved order.')

        blocking = unmet_policy_gates(order.event, 'boq_creation')
        if blocking.exists():
            raise ValidationError({
                'blocked_by_policy': [
                    {'id': p.id, 'title': p.title, 'approver_role': p.approver_role} for p in blocking
                ]
            })

        serializer.save(created_by=self.request.user)

    def perform_destroy(self, instance):
        if instance.status not in EDITABLE_STATUSES:
            raise ValidationError('An approved BOQ cannot be deleted.')
        if instance.items.exists():
            raise ValidationError('A BOQ with items cannot be deleted.')
        instance.delete()

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        boq = self.get_object()
        if boq.status != BOQ.Status.PENDING:
            raise ValidationError('Only a pending BOQ can be approved.')
        boq.status = BOQ.Status.APPROVED
        boq.approved_by = request.user
        boq.approved_at = timezone.now()
        boq.save(update_fields=['status', 'approved_by', 'approved_at'])
        return Response(BOQSerializer(boq).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        boq = self.get_object()
        if boq.status != BOQ.Status.PENDING:
            raise ValidationError('Only a pending BOQ can be rejected.')
        reason = (request.data.get('reason') or '').strip()
        if not reason:
            raise ValidationError({'reason': 'A reason is required to reject a BOQ.'})
        boq.status = BOQ.Status.REJECTED
        boq.approved_by = request.user
        boq.approved_at = timezone.now()
        boq.rejection_reason = reason
        boq.save(update_fields=['status', 'approved_by', 'approved_at', 'rejection_reason'])
        return Response(BOQSerializer(boq).data)

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        boq = self.get_object()
        buffer = build_boq_pdf(boq)
        return FileResponse(buffer, as_attachment=True, filename=f'boq-{boq.id}.pdf', content_type='application/pdf')


class BOQItemViewSet(viewsets.ModelViewSet):
    queryset = BOQItem.objects.all()
    serializer_class = BOQItemSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsPlannerOrAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        boq = serializer.validated_data['boq']
        if boq.status not in EDITABLE_STATUSES:
            raise ValidationError('Items can only be added while the BOQ is pending or rejected.')

        product = serializer.validated_data.get('product')
        product_name = serializer.validated_data.pop('product_name', '').strip()
        quantity = serializer.validated_data['quantity_requested']
        event = boq.event.event

        with transaction.atomic():
            if product:
                locked_product = Product.objects.select_for_update().get(pk=product.pk)
            else:
                new_product, _ = Product.objects.get_or_create(
                    name__iexact=product_name,
                    defaults={'name': product_name, 'equipment_type': 'Uncategorized', 'category': 'Uncategorized'},
                )
                locked_product = Product.objects.select_for_update().get(pk=new_product.pk)
            serializer.validated_data['product'] = locked_product

            if quantity <= locked_product.availability:
                item = serializer.save(status=BOQItem.Status.STOCK_DEDUCTED)
                StockOut.objects.create(
                    product=locked_product, quantity=quantity, event=event,
                    taken_by=self.request.user, date=timezone.now().date(),
                )
            else:
                item = serializer.save(status=BOQItem.Status.REQUESTED)
                latest_stock_in = locked_product.stock_ins.order_by('-date').first()
                unit_cost = latest_stock_in.unit_cost if latest_stock_in else Decimal('0')
                Requisition.objects.create(
                    event=event,
                    boq_item=item,
                    category=Requisition.Category.EQUIPMENT,
                    description=f'Shortfall of {quantity} x {locked_product.name} for BOQ #{boq.id}',
                    amount_estimate=unit_cost * quantity,
                    raised_by=self.request.user,
                )

        reopen_if_rejected(boq)

    def perform_destroy(self, instance):
        boq = instance.boq
        if boq.status not in EDITABLE_STATUSES:
            raise ValidationError('Items can only be removed while the BOQ is pending or rejected.')
        instance.delete()
        reopen_if_rejected(boq)
