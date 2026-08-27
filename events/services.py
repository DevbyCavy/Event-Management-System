from datetime import timedelta

from django.utils import timezone

from .models import Order

ONGOING_WINDOW = timedelta(hours=24)


def autotransition_orders(orders):
    """Lazily transition each order's execution_status when its deadline/ongoing window has passed.

    Mirrors a client-side setTimeout doing the same transition live in the browser — this is the
    server-side fallback so the transition still happens even if nobody has a tab open when it's due.
    Call this on every order list fetch (not on every queryset access), matching where the transition
    actually needs to be authoritative.
    """
    now = timezone.now()
    to_ongoing = []
    to_completed = []

    for order in orders:
        if (
            order.execution_status in (Order.ExecutionStatus.NEW, Order.ExecutionStatus.ASSIGNED)
            and order.deadline_datetime
            and order.deadline_datetime <= now
            and not order.ongoing_since
        ):
            order.execution_status = Order.ExecutionStatus.ONGOING
            order.ongoing_since = now
            to_ongoing.append(order)
        elif (
            order.execution_status == Order.ExecutionStatus.ONGOING
            and order.ongoing_since
            and order.ongoing_since <= now - ONGOING_WINDOW
        ):
            order.execution_status = Order.ExecutionStatus.COMPLETED
            to_completed.append(order)

    if to_ongoing:
        Order.objects.bulk_update(to_ongoing, ['execution_status', 'ongoing_since'])
    if to_completed:
        Order.objects.bulk_update(to_completed, ['execution_status'])

    return orders
