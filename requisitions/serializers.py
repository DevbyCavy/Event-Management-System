from rest_framework import serializers

from .models import Requisition


class RequisitionSerializer(serializers.ModelSerializer):
    raised_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Requisition
        fields = '__all__'
        read_only_fields = ('boq_item', 'raised_by', 'status', 'processed_by', 'processed_at')
