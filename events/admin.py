from django.contrib import admin

from .models import Event, EventComment, Inquiry, Order, ReturnSheet

admin.site.register(Inquiry)
admin.site.register(Event)
admin.site.register(Order)
admin.site.register(EventComment)
admin.site.register(ReturnSheet)
