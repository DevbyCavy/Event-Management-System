from rest_framework import serializers

from .models import Product, StockIn, StockOut


class ProductSerializer(serializers.ModelSerializer):
    quantity_in_use = serializers.IntegerField(read_only=True)
    availability = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = (
            'id', 'name', 'brand', 'equipment_type', 'category', 'returnable',
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

    class Meta:
        model = StockOut
        fields = (
            'id', 'product', 'quantity', 'event', 'taken_by', 'date',
            'expected_return_date', 'returned',
        )
        read_only_fields = ('taken_by', 'returned')

    def validate(self, attrs):
        product = attrs.get('product') or getattr(self.instance, 'product', None)
        quantity = attrs.get('quantity') or getattr(self.instance, 'quantity', None)
        if product and quantity and quantity > product.availability:
            raise serializers.ValidationError(
                f'Only {product.availability} of {product} available, requested {quantity}.'
            )
        return attrs
