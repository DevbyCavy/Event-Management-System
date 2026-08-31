from rest_framework import serializers

from .models import User


class MeSerializer(serializers.ModelSerializer):
    groups = serializers.SlugRelatedField(many=True, read_only=True, slug_field='name')
    staff_id = serializers.IntegerField(source='staff_profile.id', read_only=True, default=None)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'is_superuser', 'groups', 'staff_id')
