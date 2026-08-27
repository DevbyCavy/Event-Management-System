from django.contrib import admin

from .models import Product, StockIn, StockOut

admin.site.register(Product)
admin.site.register(StockIn)
admin.site.register(StockOut)
