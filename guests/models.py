import uuid

from django.conf import settings
from django.db import models


class Guest(models.Model):
    class RsvpStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACCEPTED = 'accepted', 'Accepted'
        DECLINED = 'declined', 'Declined'
        MAYBE = 'maybe', 'Maybe'

    event = models.ForeignKey('events.Event', on_delete=models.CASCADE, related_name='guests')
    name = models.CharField(max_length=255)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=32, blank=True)
    rsvp_status = models.CharField(max_length=20, choices=RsvpStatus.choices, default=RsvpStatus.PENDING)
    dietary_notes = models.TextField(blank=True)
    table_no = models.CharField(max_length=20, blank=True)
    rsvp_token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)

    def __str__(self):
        return self.name


class Task(models.Model):
    class Status(models.TextChoices):
        TODO = 'todo', 'To Do'
        IN_PROGRESS = 'in_progress', 'In Progress'
        DONE = 'done', 'Done'

    event = models.ForeignKey('events.Event', on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=255)
    due_date = models.DateField()
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='tasks_owned')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TODO)

    def __str__(self):
        return self.title
