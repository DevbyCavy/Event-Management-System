from django.db.models import Q

from .models import Policy, PolicyApproval


def required_policies_for(event, gate):
    """Policies that gate the given workflow step for this event, matched by event_type/classification."""
    return Policy.objects.filter(requires_approval=True, approval_gate=gate).filter(
        Q(event_type='') | Q(event_type=event.type)
    ).filter(
        Q(classification='') | Q(classification=event.classification)
    )


def unmet_policy_gates(event, gate):
    """Required policies for this event/gate that don't yet have a recorded PolicyApproval."""
    policies = required_policies_for(event, gate)
    approved_ids = PolicyApproval.objects.filter(event=event, policy__in=policies).values_list('policy_id', flat=True)
    return policies.exclude(id__in=approved_ids)
