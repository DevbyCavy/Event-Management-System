from .models import EventTeamAssignment


def is_team_leader_for_event(staff, event):
    if not staff:
        return False
    return EventTeamAssignment.objects.filter(event=event, team__leader=staff).exists()


def is_team_member_for_event(staff, event):
    if not staff:
        return False
    return EventTeamAssignment.objects.filter(event=event, team__members__staff=staff).exists()
