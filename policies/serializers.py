from rest_framework import serializers

from .models import Policy, PolicyApproval


class PolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = Policy
        fields = '__all__'


class PolicyApprovalSerializer(serializers.ModelSerializer):
    approved_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = PolicyApproval
        fields = ('id', 'policy', 'event', 'approved_by', 'approved_at')
        read_only_fields = ('approved_by', 'approved_at')
