from django.db.models import Q, Sum
from django.utils.dateparse import parse_date
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from budgeting.models import Payment
from events.models import Event
from guests.models import Task
from logistics.models import Vehicle, VehicleAssignment
from staffing.models import EventTeamAssignment, Staff

from .permissions import IsPlannerOrAdmin


class CalendarView(APIView):
    permission_classes = [IsPlannerOrAdmin]

    def get(self, request):
        staff_id = request.query_params.get('staff')
        team_id = request.query_params.get('team')
        event_id = request.query_params.get('event')
        start = parse_date(request.query_params.get('start', '') or '')
        end = parse_date(request.query_params.get('end', '') or '')

        staff = Staff.objects.filter(pk=staff_id).first() if staff_id else None
        entries = []

        entries += self._task_entries(event_id, staff, team_id)
        entries += self._team_assignment_entries(event_id, staff, team_id)
        entries += self._vehicle_assignment_entries(event_id, staff, team_id)

        if start:
            entries = [e for e in entries if e['date'] >= start]
        if end:
            entries = [e for e in entries if e['date'] <= end]

        entries.sort(key=lambda e: e['date'])
        for e in entries:
            e['date'] = e['date'].isoformat()

        return Response(entries)

    def _task_entries(self, event_id, staff, team_id):
        if team_id:
            return []
        tasks = Task.objects.select_related('event', 'owner')
        if event_id:
            tasks = tasks.filter(event_id=event_id)
        if staff:
            if not staff.user_id:
                return []
            tasks = tasks.filter(owner_id=staff.user_id)
        return [
            {
                'type': 'task',
                'date': t.due_date,
                'event': t.event_id,
                'title': t.title,
                'status': t.status,
                'owner': t.owner_id,
            }
            for t in tasks
        ]

    def _team_assignment_entries(self, event_id, staff, team_id):
        assignments = EventTeamAssignment.objects.select_related('event', 'team')
        if event_id:
            assignments = assignments.filter(event_id=event_id)
        if team_id:
            assignments = assignments.filter(team_id=team_id)
        if staff:
            assignments = assignments.filter(
                Q(team__leader=staff) | Q(team__members__staff=staff)
            ).distinct()
        return [
            {
                'type': 'team_assignment',
                'date': a.call_time.date(),
                'event': a.event_id,
                'title': f'{a.team.name} call time',
                'team': a.team_id,
                'role_on_site': a.role_on_site,
            }
            for a in assignments
        ]

    def _vehicle_assignment_entries(self, event_id, staff, team_id):
        assignments = VehicleAssignment.objects.select_related('event', 'vehicle', 'driver')
        if event_id:
            assignments = assignments.filter(event_id=event_id)
        if staff:
            assignments = assignments.filter(driver=staff)
        if team_id:
            assignments = assignments.filter(
                Q(driver__teams_led__id=team_id) | Q(driver__team_memberships__team_id=team_id)
            ).distinct()

        entries = []
        for va in assignments:
            entries.append({
                'type': 'vehicle_dispatch',
                'date': va.dispatch_time.date(),
                'event': va.event_id,
                'title': f'{va.vehicle.plate_no} dispatch',
                'vehicle': va.vehicle_id,
                'driver': va.driver_id,
            })
            if va.return_time:
                entries.append({
                    'type': 'vehicle_return',
                    'date': va.return_time.date(),
                    'event': va.event_id,
                    'title': f'{va.vehicle.plate_no} return',
                    'vehicle': va.vehicle_id,
                    'driver': va.driver_id,
                })
        return entries


class EventPnLView(APIView):
    """Per-event profit/loss, derived from recorded Payments (deposit/balance income vs. expense outflow)."""

    permission_classes = [IsPlannerOrAdmin]

    def get(self, request):
        event_id = request.query_params.get('event')
        if not event_id:
            raise ValidationError({'event': 'This query parameter is required.'})
        try:
            event = Event.objects.get(pk=event_id)
        except Event.DoesNotExist:
            raise ValidationError({'event': 'No such event.'})

        payments = Payment.objects.filter(event=event)
        income = payments.filter(
            type__in=[Payment.Type.DEPOSIT, Payment.Type.BALANCE]
        ).aggregate(total=Sum('amount'))['total'] or 0
        refunds = payments.filter(type=Payment.Type.REFUND).aggregate(total=Sum('amount'))['total'] or 0
        costs = payments.filter(type=Payment.Type.EXPENSE).aggregate(total=Sum('amount'))['total'] or 0
        revenue = income - refunds

        return Response({
            'event': event.id,
            'revenue': revenue,
            'costs': costs,
            'profit': revenue - costs,
        })


class StaffUtilizationView(APIView):
    """Event/trip assignment counts per staff member over an optional date range."""

    permission_classes = [IsPlannerOrAdmin]

    def get(self, request):
        start = parse_date(request.query_params.get('start', '') or '')
        end = parse_date(request.query_params.get('end', '') or '')
        staff_id = request.query_params.get('staff')

        staff_qs = Staff.objects.all()
        if staff_id:
            staff_qs = staff_qs.filter(pk=staff_id)

        results = []
        for staff in staff_qs:
            assignments = EventTeamAssignment.objects.filter(
                Q(team__leader=staff) | Q(team__members__staff=staff)
            ).distinct()
            if start:
                assignments = assignments.filter(call_time__date__gte=start)
            if end:
                assignments = assignments.filter(call_time__date__lte=end)

            trips = VehicleAssignment.objects.filter(driver=staff)
            if start:
                trips = trips.filter(dispatch_time__date__gte=start)
            if end:
                trips = trips.filter(dispatch_time__date__lte=end)

            results.append({
                'staff': staff.id,
                'name': staff.name,
                'event_assignments': assignments.count(),
                'vehicle_trips': trips.count(),
            })

        return Response(results)


class VehicleUtilizationView(APIView):
    """Assignment counts and total dispatched hours per vehicle over an optional date range."""

    permission_classes = [IsPlannerOrAdmin]

    def get(self, request):
        start = parse_date(request.query_params.get('start', '') or '')
        end = parse_date(request.query_params.get('end', '') or '')
        vehicle_id = request.query_params.get('vehicle')

        vehicle_qs = Vehicle.objects.all()
        if vehicle_id:
            vehicle_qs = vehicle_qs.filter(pk=vehicle_id)

        results = []
        for vehicle in vehicle_qs:
            assignments = VehicleAssignment.objects.filter(vehicle=vehicle)
            if start:
                assignments = assignments.filter(dispatch_time__date__gte=start)
            if end:
                assignments = assignments.filter(dispatch_time__date__lte=end)

            total_hours = sum(
                (a.return_time - a.dispatch_time).total_seconds() / 3600
                for a in assignments if a.return_time
            )

            results.append({
                'vehicle': vehicle.id,
                'plate_no': vehicle.plate_no,
                'assignments_count': assignments.count(),
                'total_hours': round(total_hours, 2),
            })

        return Response(results)
