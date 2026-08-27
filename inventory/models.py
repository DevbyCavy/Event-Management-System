from django.conf import settings
from django.db import models


class Product(models.Model):
    name = models.CharField(max_length=255)
    brand = models.CharField(max_length=255, blank=True)
    sku = models.CharField(max_length=100, blank=True)
    color = models.CharField(max_length=50, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    equipment_type = models.CharField(max_length=100)
    category = models.CharField(max_length=100)
    returnable = models.BooleanField(default=True)
    quantity_total = models.PositiveIntegerField(default=0)
    reorder_threshold = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)

    @property
    def quantity_in_use(self):
        return self.stock_outs.filter(returned=False).aggregate(
            total=models.Sum('quantity')
        )['total'] or 0

    @property
    def availability(self):
        return self.quantity_total - self.quantity_in_use

    def __str__(self):
        return self.name


class StockIn(models.Model):
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='stock_ins')
    quantity = models.PositiveIntegerField()
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2)
    supplier = models.CharField(max_length=255)
    received_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='stock_ins_received')
    date = models.DateField()

    def __str__(self):
        return f'{self.quantity} x {self.product} in'


class StockOut(models.Model):
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='stock_outs')
    quantity = models.PositiveIntegerField()
    event = models.ForeignKey('events.Event', on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_outs')
    taken_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='stock_outs_taken')
    date = models.DateField()
    expected_return_date = models.DateField(null=True, blank=True)
    returned = models.BooleanField(default=False)
    returned_at = models.DateTimeField(null=True, blank=True)
    missing_reported_at = models.DateTimeField(null=True, blank=True)
    missing_notes = models.TextField(blank=True)

    def __str__(self):
        return f'{self.quantity} x {self.product} out'
