from django.contrib import admin

from .models import Policy, PolicyApproval

admin.site.register(Policy)
admin.site.register(PolicyApproval)
