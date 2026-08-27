from rest_framework import serializers

from inventory.models import Product

from .models import BOQ, BOQItem


class BOQItemSerializer(serializers.ModelSerializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), required=False)
    product_name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = BOQItem
        fields = ('id', 'boq', 'product', 'product_name', 'quantity_requested', 'status')
        read_only_fields = ('status',)

    def validate(self, attrs):
        if not attrs.get('product') and not (attrs.get('product_name') or '').strip():
            raise serializers.ValidationError('Select an existing product or type a new product name.')
        return attrs


class BOQSerializer(serializers.ModelSerializer):
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)
    items = BOQItemSerializer(many=True, read_only=True)

    class Meta:
        model = BOQ
        fields = (
            'id', 'event', 'created_by', 'created_at', 'items',
            'status', 'approved_by', 'approved_at', 'rejection_reason',
        )
        read_only_fields = ('created_by', 'created_at', 'status', 'approved_by', 'approved_at', 'rejection_reason')
