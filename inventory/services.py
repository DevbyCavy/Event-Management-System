from django.db import transaction
from django.db.models import F

from .models import Product, StockIn


def record_stock_in(*, product, quantity, unit_cost, supplier, received_by, date):
    """Create a StockIn record and atomically grow the product's total stock to match."""
    with transaction.atomic():
        stock_in = StockIn.objects.create(
            product=product, quantity=quantity, unit_cost=unit_cost,
            supplier=supplier, received_by=received_by, date=date,
        )
        Product.objects.filter(pk=product.pk).update(quantity_total=F('quantity_total') + quantity)
    return stock_in
