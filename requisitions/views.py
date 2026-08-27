from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from boq.models import BOQItem
from budgeting.models import BudgetItem, Payment
from core.permissions import IsAccountsOrAdmin, IsPlannerOrAdmin
from inventory.services import record_stock_in

from .models import Requisition
from .serializers import RequisitionSerializer


class RequisitionViewSet(viewsets.ModelViewSet):
    queryset = Requisition.objects.all()
    serializer_class = RequisitionSerializer

    def get_permissions(self):
        if self.action in ('approve', 'reject', 'process'):
            return [IsAccountsOrAdmin()]
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsPlannerOrAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(raised_by=self.request.user)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        requisition = self.get_object()
        if requisition.status != Requisition.Status.PENDING:
            raise ValidationError('Only a pending requisition can be approved.')
        requisition.status = Requisition.Status.APPROVED
        requisition.save(update_fields=['status'])
        return Response(RequisitionSerializer(requisition).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        requisition = self.get_object()
        if requisition.status != Requisition.Status.PENDING:
            raise ValidationError('Only a pending requisition can be rejected.')
        requisition.status = Requisition.Status.REJECTED
        requisition.processed_by = request.user
        requisition.processed_at = timezone.now()
        requisition.save(update_fields=['status', 'processed_by', 'processed_at'])
        return Response(RequisitionSerializer(requisition).data)

    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        requisition = self.get_object()
        if requisition.status != Requisition.Status.APPROVED:
            raise ValidationError('Only an approved requisition can be processed.')

        payment_method = request.data.get('payment_method')
        valid_methods = dict(Payment.Method.choices)
        if payment_method not in valid_methods:
            raise ValidationError({'payment_method': f'Required, one of {list(valid_methods)}.'})

        today = timezone.now().date()

        with transaction.atomic():
            if requisition.category == Requisition.Category.EQUIPMENT and requisition.boq_item_id:
                boq_item = requisition.boq_item
                quantity = boq_item.quantity_requested
                unit_cost = (requisition.amount_estimate / quantity) if quantity else 0
                record_stock_in(
                    product=boq_item.product, quantity=quantity, unit_cost=unit_cost,
                    supplier=f'Requisition #{requisition.id}', received_by=request.user, date=today,
                )
                boq_item.status = BOQItem.Status.FULFILLED
                boq_item.save(update_fields=['status'])

            budget_item, _ = BudgetItem.objects.get_or_create(
                event=requisition.event,
                category=requisition.get_category_display(),
                defaults={'planned_amount': 0},
            )
            BudgetItem.objects.filter(pk=budget_item.pk).update(
                actual_amount=F('actual_amount') + requisition.amount_estimate
            )

            Payment.objects.create(
                event=requisition.event, type=Payment.Type.EXPENSE, amount=requisition.amount_estimate,
                date=today, method=payment_method, reference=f'Requisition #{requisition.id}',
            )

            requisition.status = Requisition.Status.PROCESSED
            requisition.processed_by = request.user
            requisition.processed_at = timezone.now()
            requisition.save(update_fields=['status', 'processed_by', 'processed_at'])

        return Response(RequisitionSerializer(requisition).data)
