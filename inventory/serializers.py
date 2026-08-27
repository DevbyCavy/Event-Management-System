from rest_framework import serializers

from .models import Product, StockIn, StockOut


class ProductSerializer(serializers.ModelSerializer):
    quantity_in_use = serializers.IntegerField(read_only=True)
    availability = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = (
            'id', 'name', 'brand', 'sku', 'color', 'price', 'equipment_type', 'category', 'returnable',
            'quantity_total', 'reorder_threshold', 'notes', 'quantity_in_use', 'availability',
        )


class StockInSerializer(serializers.ModelSerializer):
    received_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = StockIn
        fields = ('id', 'product', 'quantity', 'unit_cost', 'supplier', 'received_by', 'date')
        read_only_fields = ('received_by',)


class StockOutSerializer(serializers.ModelSerializer):
    taken_by = serializers.PrimaryKeyRelatedField(read_only=True)
    taken_by_username = serializers.CharField(source='taken_by.username', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_returnable = serializers.BooleanField(source='product.returnable', read_only=True)
    event_name = serializers.CharField(source='event.name', read_only=True, default=None)

    class Meta:
        model = StockOut
        fields = (
            'id', 'product', 'product_name', 'product_returnable', 'quantity', 'event', 'event_name',
            'taken_by', 'taken_by_username', 'date', 'expected_return_date', 'returned', 'returned_at',
            'missing_reported_at', 'missing_notes',
        )
        read_only_fields = (
            'taken_by', 'returned', 'returned_at', 'missing_reported_at', 'missing_notes',
        )

    def validate(self, attrs):
        product = attrs.get('product') or getattr(self.instance, 'product', None)
        quantity = attrs.get('quantity') or getattr(self.instance, 'quantity', None)
        if product and quantity and quantity > product.availability:
            raise serializers.ValidationError(
                f'Only {product.availability} of {product} available, requested {quantity}.'
            )
        return attrs
