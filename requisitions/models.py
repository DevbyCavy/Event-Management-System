from django.conf import settings
from django.db import models


class Requisition(models.Model):
    class Category(models.TextChoices):
        EQUIPMENT = 'equipment', 'Equipment'
        FOOD = 'food', 'Food'
        TRANSPORT = 'transport', 'Transport'
        SITE_PURCHASE = 'site_purchase', 'Site Purchase'
        OTHER = 'other', 'Other'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
        PROCESSED = 'processed', 'Processed'

    event = models.ForeignKey('events.Event', on_delete=models.CASCADE, related_name='requisitions')
    boq_item = models.ForeignKey(
        'boq.BOQItem', on_delete=models.SET_NULL, null=True, blank=True, related_name='requisitions'
    )
    category = models.CharField(max_length=20, choices=Category.choices)
    description = models.TextField()
    amount_estimate = models.DecimalField(max_digits=10, decimal_places=2)
    raised_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='requisitions_raised')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    processed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='requisitions_processed'
    )
    processed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f'{self.get_category_display()} requisition for {self.event}'
