from django.conf import settings
from django.db import models


class Policy(models.Model):
    class ApprovalGate(models.TextChoices):
        ORDER_APPROVAL = 'order_approval', 'Order Approval'
        BOQ_CREATION = 'boq_creation', 'BOQ Creation'
        REQUISITION_PROCESSING = 'requisition_processing', 'Requisition Processing'

    title = models.CharField(max_length=255)
    client_type = models.CharField(max_length=100, blank=True)
    event_type = models.CharField(max_length=100, blank=True)
    classification = models.CharField(max_length=10, blank=True)
    content = models.TextField()
    requires_approval = models.BooleanField(default=False)
    approval_gate = models.CharField(max_length=30, choices=ApprovalGate.choices, blank=True)
    approver_role = models.CharField(max_length=100, blank=True)

    class Meta:
        verbose_name_plural = 'policies'

    def __str__(self):
        return self.title


class PolicyApproval(models.Model):
    policy = models.ForeignKey(Policy, on_delete=models.PROTECT, related_name='approvals')
    event = models.ForeignKey('events.Event', on_delete=models.CASCADE, related_name='policy_approvals')
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='policy_approvals')
    approved_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.policy} approved for {self.event}'
