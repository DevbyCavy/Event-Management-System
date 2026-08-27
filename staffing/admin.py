from django.contrib import admin

from .models import EventTeamAssignment, Staff, Team, TeamMember

admin.site.register(Staff)
admin.site.register(Team)
admin.site.register(TeamMember)
admin.site.register(EventTeamAssignment)
