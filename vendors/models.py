from django.conf import settings
from django.db import models


class Vendor(models.Model):
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=32, blank=True)
    notes = models.TextField(blank=True)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='vendor_profile'
    )

    def __str__(self):
        return self.name


class EventVendor(models.Model):
    class ContractStatus(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        SENT = 'sent', 'Sent'
        SIGNED = 'signed', 'Signed'
        CANCELLED = 'cancelled', 'Cancelled'

    event = models.ForeignKey('events.Event', on_delete=models.CASCADE, related_name='event_vendors')
    vendor = models.ForeignKey(Vendor, on_delete=models.PROTECT, related_name='event_vendors')
    agreed_price = models.DecimalField(max_digits=10, decimal_places=2)
    deposit_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    contract_status = models.CharField(max_length=20, choices=ContractStatus.choices, default=ContractStatus.DRAFT)
    contract_doc = models.FileField(upload_to='vendor_contracts/', null=True, blank=True)

    def __str__(self):
        return f'{self.vendor} for {self.event}'
