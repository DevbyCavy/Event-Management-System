from django.conf import settings
from django.db import models


class Staff(models.Model):
    name = models.CharField(max_length=255)
    role = models.CharField(max_length=100)
    contact = models.CharField(max_length=255, blank=True)
    active = models.BooleanField(default=True)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='staff_profile'
    )

    def __str__(self):
        return self.name


class Team(models.Model):
    name = models.CharField(max_length=255)
    leader = models.ForeignKey(Staff, on_delete=models.PROTECT, related_name='teams_led')

    def __str__(self):
        return self.name


class TeamMember(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='members')
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='team_memberships')

    class Meta:
        unique_together = ('team', 'staff')

    def __str__(self):
        return f'{self.staff} in {self.team}'


class EventTeamAssignment(models.Model):
    event = models.ForeignKey('events.Event', on_delete=models.CASCADE, related_name='team_assignments')
    team = models.ForeignKey(Team, on_delete=models.PROTECT, related_name='event_assignments')
    call_time = models.DateTimeField()
    role_on_site = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f'{self.team} on {self.event}'
