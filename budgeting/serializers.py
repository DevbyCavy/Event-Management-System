from rest_framework import serializers

from .models import BudgetItem, Payment


class BudgetItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetItem
        fields = ('id', 'event', 'category', 'planned_amount', 'actual_amount')


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ('id', 'event', 'type', 'amount', 'date', 'method', 'reference')
