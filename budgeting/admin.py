from django.contrib import admin

from .models import BudgetItem, Payment

admin.site.register(BudgetItem)
admin.site.register(Payment)
