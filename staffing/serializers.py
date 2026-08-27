from rest_framework import serializers

from .models import EventTeamAssignment, Staff, Team, TeamMember


class StaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = Staff
        fields = ('id', 'name', 'role', 'contact', 'active', 'user')


class TeamMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamMember
        fields = ('id', 'team', 'staff')


class TeamSerializer(serializers.ModelSerializer):
    members = TeamMemberSerializer(many=True, read_only=True)

    class Meta:
        model = Team
        fields = ('id', 'name', 'leader', 'members')


class EventTeamAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventTeamAssignment
        fields = ('id', 'event', 'team', 'call_time', 'role_on_site')
