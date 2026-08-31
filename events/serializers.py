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


class EventCommentSerializer(serializers.ModelSerializer):
    author = serializers.PrimaryKeyRelatedField(read_only=True)
    author_username = serializers.CharField(source='author.username', read_only=True)

    class Meta:
        model = EventComment
        fields = ('id', 'event', 'author', 'author_username', 'comment', 'created_at')
        read_only_fields = ('author', 'created_at')


class ReturnSheetSerializer(serializers.ModelSerializer):
    dismantled_by = serializers.PrimaryKeyRelatedField(read_only=True)
    dismantled_by_username = serializers.CharField(source='dismantled_by.username', read_only=True)
    signed_off_by = serializers.PrimaryKeyRelatedField(read_only=True)
    signed_off_by_username = serializers.CharField(source='signed_off_by.username', read_only=True, default=None)

    class Meta:
        model = ReturnSheet
        fields = '__all__'
        read_only_fields = ('dismantled_by', 'signed_off_by')
