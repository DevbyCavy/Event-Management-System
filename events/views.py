from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsPlannerOrAdmin, get_staff_profile, get_vendor_profile, in_group
from core.roles import ACCOUNTS, ADMIN, EVENT_PLANNER, STOREKEEPER
from policies.services import unmet_policy_gates
from staffing.services import is_team_leader_for_event, is_team_member_for_event

from .models import Event, EventComment, Inquiry, Order, ReturnSheet
from .services import autotransition_orders
from .serializers import (
    EventCommentSerializer,
    EventSerializer,
    InquirySerializer,
    OrderSerializer,
    ReturnSheetSerializer,
)

User = get_user_model()


class InquiryViewSet(viewsets.ModelViewSet):
    queryset = Inquiry.objects.all()
    serializer_class = InquirySerializer
    permission_classes = [IsPlannerOrAdmin]


class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if in_group(user, ADMIN, EVENT_PLANNER, STOREKEEPER, ACCOUNTS):
            return Event.objects.all()

        staff = get_staff_profile(user)
        vendor = get_vendor_profile(user)
        q = Q(client=user)
        if staff:
            q |= Q(team_assignments__team__leader=staff) | Q(team_assignments__team__members__staff=staff)
        if vendor:
            q |= Q(event_vendors__vendor=vendor)
        return Event.objects.filter(q).distinct()

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'mark_processed', 'mark_done'):
            return [IsPlannerOrAdmin()]
        return [IsAuthenticated()]

    def perform_update(self, serializer):
        instance = self.get_object()
        new_classification = serializer.validated_data.get('classification')
        if (
            new_classification is not None
            and new_classification != instance.classification
            and not in_group(self.request.user, ADMIN)
        ):
            raise PermissionDenied('Only admin can change event classification.')
        serializer.save()

    @action(detail=True, methods=['post'], url_path='mark-processed')
    def mark_processed(self, request, pk=None):
        event = self.get_object()
        if event.event_status != Event.Status.PENDING:
            raise ValidationError('Only a pending event can move to processed.')

        return_sheet = getattr(event, 'return_sheet', None)
        if not return_sheet or not return_sheet.signed_off_by_id:
            raise ValidationError('The return sheet must be signed off before this event can be processed.')

        event.event_status = Event.Status.PROCESSED
        event.save(update_fields=['event_status'])
        return Response(EventSerializer(event).data)

    @action(detail=True, methods=['post'], url_path='mark-done')
    def mark_done(self, request, pk=None):
        event = self.get_object()
        if event.event_status != Event.Status.PROCESSED:
            raise ValidationError('Only a processed event can move to done.')

        event.event_status = Event.Status.DONE
        event.save(update_fields=['event_status'])
        return Response(EventSerializer(event).data)


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer

    def get_queryset(self):
        user = self.request.user
        if in_group(user, ADMIN) or in_group(user, EVENT_PLANNER):
            return Order.objects.all()
        return Order.objects.filter(event__client=user)

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'approve', 'complete'):
            return [IsPlannerOrAdmin()]
        return [IsAuthenticated()]

    def list(self, request, *args, **kwargs):
        autotransition_orders(self.get_queryset())
        return super().list(request, *args, **kwargs)

    def perform_destroy(self, instance):
        if instance.order_status == Order.Status.APPROVED:
            raise ValidationError('An approved order cannot be deleted.')
        instance.delete()

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        order = self.get_object()
        if order.execution_status != Order.ExecutionStatus.ONGOING:
            raise ValidationError('Only an ongoing order can be marked complete.')
        order.execution_status = Order.ExecutionStatus.COMPLETED
        order.save(update_fields=['execution_status'])
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['post'])
    def sign(self, request, pk=None):
        order = self.get_object()
        user = request.user
        if order.event.client_id != user.id and not in_group(user, ADMIN) and not in_group(user, EVENT_PLANNER):
            raise PermissionDenied('Only the client or a planner/admin can sign this order.')
        if order.order_status != Order.Status.DRAFT:
            raise ValidationError('Only a draft order can be signed.')

        order.signed_by = user
        order.signed_at = timezone.now()
        order.order_status = Order.Status.SIGNED
        order.save(update_fields=['signed_by', 'signed_at', 'order_status'])
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        order = self.get_object()
        if order.order_status != Order.Status.SIGNED:
            raise ValidationError('Only a signed order can be approved.')

        blocking = unmet_policy_gates(order.event, 'order_approval')
        if blocking.exists():
            raise ValidationError({
                'blocked_by_policy': [
                    {'id': p.id, 'title': p.title, 'approver_role': p.approver_role} for p in blocking
                ]
            })

        order.approved_by = request.user
        order.approved_at = timezone.now()
        order.order_status = Order.Status.APPROVED
        order.save(update_fields=['approved_by', 'approved_at', 'order_status'])
        return Response(OrderSerializer(order).data)


def _has_event_access(user, event):
    if in_group(user, ADMIN) or in_group(user, EVENT_PLANNER):
        return True
    if event.client_id == user.id:
        return True
    staff = get_staff_profile(user)
    return is_team_leader_for_event(staff, event) or is_team_member_for_event(staff, event)


class EventCommentViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin,
                           viewsets.GenericViewSet):
    serializer_class = EventCommentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if in_group(user, ADMIN) or in_group(user, EVENT_PLANNER):
            return EventComment.objects.all()
        staff = get_staff_profile(user)
        q = Q(event__client=user)
        if staff:
            q |= Q(event__team_assignments__team__leader=staff) | Q(event__team_assignments__team__members__staff=staff)
        return EventComment.objects.filter(q).distinct()

    def perform_create(self, serializer):
        event = serializer.validated_data['event']
        if not _has_event_access(self.request.user, event):
            raise PermissionDenied('You do not have access to this event.')
        serializer.save(author=self.request.user)


class ReturnSheetViewSet(viewsets.ModelViewSet):
    serializer_class = ReturnSheetSerializer

    def get_queryset(self):
        user = self.request.user
        if in_group(user, ADMIN) or in_group(user, EVENT_PLANNER):
            return ReturnSheet.objects.all()
        staff = get_staff_profile(user)
        q = Q(event__client=user)
        if staff:
            q |= Q(event__team_assignments__team__leader=staff) | Q(event__team_assignments__team__members__staff=staff)
        return ReturnSheet.objects.filter(q).distinct()

    def _require_team_leader(self, event):
        user = self.request.user
        if in_group(user, ADMIN):
            return
        staff = get_staff_profile(user)
        if not is_team_leader_for_event(staff, event):
            raise PermissionDenied("Only this event's team leader can do that.")

    def perform_create(self, serializer):
        event = serializer.validated_data['event']
        self._require_team_leader(event)
        serializer.save(dismantled_by=self.request.user)

    def perform_update(self, serializer):
        self._require_team_leader(serializer.instance.event)
        serializer.save()

    @action(detail=True, methods=['post'], url_path='sign-off')
    def sign_off(self, request, pk=None):
        return_sheet = self.get_object()
        self._require_team_leader(return_sheet.event)
        if return_sheet.signed_off_by_id:
            raise ValidationError('This return sheet is already signed off.')

        return_sheet.signed_off_by = request.user
        return_sheet.save(update_fields=['signed_off_by'])
        return Response(ReturnSheetSerializer(return_sheet).data)
