from rest_framework import serializers

from .models import LocationPing, Trip, Vehicle, VehicleAssignment


class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = ('id', 'plate_no', 'type', 'capacity', 'status')


class TripSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trip
        fields = ('id', 'vehicle_assignment', 'status', 'started_at', 'ended_at')
        read_only_fields = fields


class LocationPingSerializer(serializers.ModelSerializer):
    class Meta:
        model = LocationPing
        fields = ('id', 'trip', 'latitude', 'longitude', 'accuracy', 'recorded_at')
        read_only_fields = ('trip',)
        extra_kwargs = {'recorded_at': {'required': False}}


class VehicleAssignmentSerializer(serializers.ModelSerializer):
    trip = TripSerializer(read_only=True)

    class Meta:
        model = VehicleAssignment
        fields = ('id', 'event', 'vehicle', 'driver', 'dispatch_time', 'return_time', 'trip')
