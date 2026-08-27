from django.conf import settings
from django.db import models


class BOQ(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'

    event = models.OneToOneField('events.Order', on_delete=models.CASCADE, related_name='boq')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='boqs_created')
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='boqs_approved'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)

    def __str__(self):
        return f'BOQ for {self.event}'


class BOQItem(models.Model):
    class Status(models.TextChoices):
        STOCK_DEDUCTED = 'stock_deducted', 'Stock Deducted'
        REQUESTED = 'requested', 'Requested'
        FULFILLED = 'fulfilled', 'Fulfilled'

    boq = models.ForeignKey(BOQ, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('inventory.Product', on_delete=models.PROTECT, related_name='boq_items')
    quantity_requested = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.REQUESTED)

    def __str__(self):
        return f'{self.quantity_requested} x {self.product} for {self.boq}'
