from rest_framework import serializers

from .models import BOQ, BOQItem


class BOQItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = BOQItem
        fields = ('id', 'boq', 'product', 'quantity_requested', 'status')
        read_only_fields = ('status',)


class BOQSerializer(serializers.ModelSerializer):
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)
    items = BOQItemSerializer(many=True, read_only=True)

    class Meta:
        model = BOQ
        fields = ('id', 'event', 'created_by', 'created_at', 'items')
        read_only_fields = ('created_by', 'created_at')
