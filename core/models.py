from django.conf import settings
from django.db import models


class Document(models.Model):
    class Type(models.TextChoices):
        CONTRACT = 'contract', 'Contract'
        INVOICE = 'invoice', 'Invoice'
        RETURN_SHEET = 'return_sheet', 'Return Sheet'
        OTHER = 'other', 'Other'

    event = models.ForeignKey('events.Event', on_delete=models.CASCADE, related_name='documents')
    type = models.CharField(max_length=20, choices=Type.choices)
    file = models.FileField(upload_to='documents/')
    generated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.get_type_display()} for {self.event}'


class Notification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    message = models.TextField()
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Notification for {self.user}'
