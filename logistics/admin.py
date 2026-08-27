from django.contrib import admin

from .models import LocationPing, Trip, Vehicle, VehicleAssignment

admin.site.register(Vehicle)
admin.site.register(VehicleAssignment)
admin.site.register(Trip)
admin.site.register(LocationPing)
