from django.urls import path

from .views import CalendarView, EventPnLView, StaffUtilizationView, VehicleUtilizationView

urlpatterns = [
    path('calendar/', CalendarView.as_view(), name='calendar'),
    path('reports/pnl/', EventPnLView.as_view(), name='report-pnl'),
    path('reports/staff-utilization/', StaffUtilizationView.as_view(), name='report-staff-utilization'),
    path('reports/vehicle-utilization/', VehicleUtilizationView.as_view(), name='report-vehicle-utilization'),
]
