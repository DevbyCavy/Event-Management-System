from rest_framework import serializers

from events.models import Event

from .models import Guest, Task


class GuestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guest
        fields = (
            'id', 'event', 'name', 'email', 'phone', 'rsvp_status',
            'dietary_notes', 'table_no', 'rsvp_token',
        )
        read_only_fields = ('rsvp_token',)


class GuestBulkImportSerializer(serializers.Serializer):
    event = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all())
    guests = serializers.ListField(child=serializers.DictField(), allow_empty=False)


class RsvpPublicSerializer(serializers.ModelSerializer):
    event_name = serializers.CharField(source='event.name', read_only=True)
    event_date_start = serializers.DateTimeField(source='event.date_start', read_only=True)
    event_venue = serializers.CharField(source='event.venue', read_only=True)

    class Meta:
        model = Guest
        fields = (
            'name', 'event_name', 'event_date_start', 'event_venue',
            'rsvp_status', 'dietary_notes',
        )
        read_only_fields = ('name', 'event_name', 'event_date_start', 'event_venue')


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ('id', 'event', 'title', 'due_date', 'owner', 'status')
