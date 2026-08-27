from django.conf import settings
from django.db import models


class Inquiry(models.Model):
    class Status(models.TextChoices):
        NEW = 'new', 'New'
        CONVERTED = 'converted', 'Converted'
        CLOSED = 'closed', 'Closed'

    client_name = models.CharField(max_length=255)
    contact = models.CharField(max_length=255)
    event_type = models.CharField(max_length=100)
    date_requested = models.DateField()
    budget_range = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = 'inquiries'

    def __str__(self):
        return f'{self.client_name} - {self.event_type}'


class Event(models.Model):
    class Classification(models.TextChoices):
        HIGH = 'high', 'High Profile'
        MIDDLE = 'middle', 'Middle Profile'
        LOW = 'low', 'Low Profile'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PROCESSED = 'processed', 'Processed'
        DONE = 'done', 'Done'

    name = models.CharField(max_length=255)
    type = models.CharField(max_length=100)
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='events_as_client')
    planner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='events_as_planner')
    date_start = models.DateTimeField()
    date_end = models.DateTimeField()
    venue = models.CharField(max_length=255)
    classification = models.CharField(max_length=10, choices=Classification.choices)
    event_status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    def __str__(self):
        return self.name


class Order(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        SIGNED = 'signed', 'Signed'
        APPROVED = 'approved', 'Approved'
        CANCELLED = 'cancelled', 'Cancelled'

    class ExecutionStatus(models.TextChoices):
        """Operational fulfillment status, tracked separately from order_status (the approval workflow)."""
        NEW = 'new', 'New'
        ASSIGNED = 'assigned', 'Assigned'  # in the enum for parity; nothing currently sets this
        ONGOING = 'ongoing', 'Ongoing'
        COMPLETED = 'completed', 'Completed'

    inquiry = models.ForeignKey(Inquiry, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    event = models.OneToOneField(Event, on_delete=models.CASCADE, related_name='order')
    signed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name='orders_signed'
    )
    signed_at = models.DateTimeField(null=True, blank=True)
    order_status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders_approved'
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    execution_status = models.CharField(
        max_length=20, choices=ExecutionStatus.choices, default=ExecutionStatus.NEW
    )
    deadline_datetime = models.DateTimeField(null=True, blank=True)
    ongoing_since = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f'Order for {self.event.name}'


class EventComment(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='event_comments')
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Comment by {self.author} on {self.event}'


class ReturnSheet(models.Model):
    event = models.OneToOneField(Event, on_delete=models.CASCADE, related_name='return_sheet')
    items_returned = models.JSONField(default=list, blank=True)
    damages_notes = models.TextField(blank=True)
    dismantled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='return_sheets_dismantled'
    )
    dismantle_date = models.DateField()
    signed_off_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='return_sheets_signed_off',
    )
    doc_file = models.FileField(upload_to='return_sheets/', null=True, blank=True)

    def __str__(self):
        return f'Return sheet for {self.event}'
