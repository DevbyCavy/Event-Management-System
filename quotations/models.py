from decimal import Decimal

from django.conf import settings
from django.db import models

from events.models import Event, Inquiry


class Quotation(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        SENT = 'sent', 'Sent'
        ACCEPTED = 'accepted', 'Accepted'
        REJECTED = 'rejected', 'Rejected'

    inquiry = models.ForeignKey(Inquiry, on_delete=models.CASCADE, related_name='quotations')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='quotations_created'
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)

    # Event details captured up front so an accepted quotation can create the Event/Order directly.
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='quotations_as_client'
    )
    planner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='quotations_as_planner'
    )
    event_name = models.CharField(max_length=255)
    event_type = models.CharField(max_length=100)
    venue = models.CharField(max_length=255)
    date_start = models.DateTimeField()
    date_end = models.DateTimeField()
    classification = models.CharField(
        max_length=20, choices=Event.Classification.choices, default=Event.Classification.MIDDLE
    )

    valid_until = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    @property
    def total(self):
        return sum((item.subtotal for item in self.items.all()), Decimal('0'))

    def __str__(self):
        return f'Quotation #{self.id} for {self.inquiry.client_name}'


class QuotationItem(models.Model):
    quotation = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name='items')
    description = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    @property
    def subtotal(self):
        return self.quantity * self.unit_price

    def __str__(self):
        return f'{self.quantity} x {self.description}'
