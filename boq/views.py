from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsPlannerOrAdmin
from events.models import Order
from inventory.models import Product, StockOut
from policies.services import unmet_policy_gates
from requisitions.models import Requisition

from .models import BOQ, BOQItem
from .serializers import BOQItemSerializer, BOQSerializer


class BOQViewSet(viewsets.ModelViewSet):
    queryset = BOQ.objects.all()
    serializer_class = BOQSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
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


class BOQItemViewSet(viewsets.ModelViewSet):
    queryset = BOQItem.objects.all()
    serializer_class = BOQItemSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsPlannerOrAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        boq = serializer.validated_data['boq']
        product = serializer.validated_data['product']
        quantity = serializer.validated_data['quantity_requested']
        event = boq.event.event

        with transaction.atomic():
            locked_product = Product.objects.select_for_update().get(pk=product.pk)

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
