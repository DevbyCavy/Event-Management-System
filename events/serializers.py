from rest_framework import serializers

from .models import Event, EventComment, Inquiry, Order, ReturnSheet


class InquirySerializer(serializers.ModelSerializer):
    class Meta:
        model = Inquiry
        fields = '__all__'


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = '__all__'


class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = '__all__'
        read_only_fields = (
            'signed_by', 'signed_at', 'order_status', 'approved_by', 'approved_at',
            'execution_status', 'ongoing_since',
        )


class ConvertToOrderSerializer(serializers.Serializer):
    client_id = serializers.IntegerField()
    planner_id = serializers.IntegerField(required=False)
    name = serializers.CharField(max_length=255)
    type = serializers.CharField(max_length=100)
    date_start = serializers.DateTimeField()
    date_end = serializers.DateTimeField()
    venue = serializers.CharField(max_length=255)
    classification = serializers.ChoiceField(choices=Event.Classification.choices)


class EventCommentSerializer(serializers.ModelSerializer):
    author = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = EventComment
        fields = ('id', 'event', 'author', 'comment', 'created_at')
        read_only_fields = ('author', 'created_at')


class ReturnSheetSerializer(serializers.ModelSerializer):
    dismantled_by = serializers.PrimaryKeyRelatedField(read_only=True)
    signed_off_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = ReturnSheet
        fields = '__all__'
        read_only_fields = ('dismantled_by', 'signed_off_by')
