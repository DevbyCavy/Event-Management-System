from rest_framework import serializers

from .models import Quotation, QuotationItem


class QuotationItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = QuotationItem
        fields = ('id', 'quotation', 'description', 'quantity', 'unit_price', 'subtotal')


class QuotationSerializer(serializers.ModelSerializer):
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)
    items = QuotationItemSerializer(many=True, read_only=True)
    total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Quotation
        fields = (
            'id', 'inquiry', 'created_by', 'status', 'client', 'planner', 'event_name', 'event_type',
            'venue', 'date_start', 'date_end', 'classification', 'valid_until', 'notes',
            'created_at', 'sent_at', 'responded_at', 'items', 'total',
        )
        read_only_fields = ('status', 'created_by', 'created_at', 'sent_at', 'responded_at')
