from django.db.models import Sum
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsAccountsOrAdmin, IsPlannerOrAdmin, in_group
from core.roles import ACCOUNTS, ADMIN, EVENT_PLANNER
from events.models import Event

from .models import BudgetItem, Payment
from .serializers import BudgetItemSerializer, PaymentSerializer


class BudgetItemViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetItemSerializer

    def get_queryset(self):
        user = self.request.user
        if in_group(user, ADMIN) or in_group(user, EVENT_PLANNER):
            return BudgetItem.objects.all()
        return BudgetItem.objects.filter(event__client=user)

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsPlannerOrAdmin()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'])
    def totals(self, request):
        event_id = request.query_params.get('event')
        if not event_id:
            raise ValidationError({'event': 'This query parameter is required.'})

        try:
            event = Event.objects.get(pk=event_id)
        except Event.DoesNotExist:
            raise ValidationError({'event': 'No such event.'})

        user = request.user
        if not (in_group(user, ADMIN) or in_group(user, EVENT_PLANNER) or event.client_id == user.id):
            raise PermissionDenied('You do not have access to this event.')

        totals = BudgetItem.objects.filter(event=event).aggregate(
            planned_total=Sum('planned_amount'), actual_total=Sum('actual_amount')
        )
        planned_total = totals['planned_total'] or 0
        actual_total = totals['actual_total'] or 0
        return Response({
            'event': event.id,
            'planned_total': planned_total,
            'actual_total': actual_total,
            'variance': planned_total - actual_total,
        })


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer

    def get_queryset(self):
        user = self.request.user
        if in_group(user, ADMIN) or in_group(user, EVENT_PLANNER) or in_group(user, ACCOUNTS):
            return Payment.objects.all()
        return Payment.objects.filter(event__client=user)

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAccountsOrAdmin()]
        return [IsAuthenticated()]
