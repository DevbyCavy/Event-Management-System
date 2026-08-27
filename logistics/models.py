from django.core.exceptions import ValidationError
from django.db import models


class Vehicle(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = 'available', 'Available'
        IN_USE = 'in_use', 'In Use'
        MAINTENANCE = 'maintenance', 'Maintenance'

    plate_no = models.CharField(max_length=20, unique=True)
    type = models.CharField(max_length=100)
    capacity = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE)

    def __str__(self):
        return self.plate_no


class VehicleAssignment(models.Model):
    event = models.ForeignKey('events.Event', on_delete=models.CASCADE, related_name='vehicle_assignments')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.PROTECT, related_name='assignments')
    driver = models.ForeignKey('staffing.Staff', on_delete=models.PROTECT, related_name='vehicle_assignments')
    dispatch_time = models.DateTimeField()
    return_time = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f'{self.vehicle} for {self.event}'


class Trip(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = 'scheduled', 'Scheduled'
        EN_ROUTE = 'en_route', 'En Route'
        ARRIVED = 'arrived', 'Arrived'
        RETURNING = 'returning', 'Returning'
        COMPLETED = 'completed', 'Completed'

    vehicle_assignment = models.OneToOneField(VehicleAssignment, on_delete=models.CASCADE, related_name='trip')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    def clean(self):
        if self.status == self.Status.EN_ROUTE:
            driver = self.vehicle_assignment.driver
            active = Trip.objects.filter(
                vehicle_assignment__driver=driver, status=self.Status.EN_ROUTE
            ).exclude(pk=self.pk)
            if active.exists():
                raise ValidationError('This driver already has an active trip in progress.')

    def __str__(self):
        return f'Trip for {self.vehicle_assignment}'


class LocationPing(models.Model):
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='pings')
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    accuracy = models.FloatField(null=True, blank=True)
    recorded_at = models.DateTimeField()

    class Meta:
        ordering = ['recorded_at']

    def __str__(self):
        return f'Ping for {self.trip} at {self.recorded_at}'
