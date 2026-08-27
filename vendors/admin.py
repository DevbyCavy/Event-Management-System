from django.contrib import admin

from .models import EventVendor, Vendor

admin.site.register(Vendor)
admin.site.register(EventVendor)
