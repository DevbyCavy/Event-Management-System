from django.db.models import ProtectedError, Sum
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsStorekeeperOrAdmin

from .models import Product, StockIn, StockOut
from .serializers import ProductSerializer, StockInSerializer, StockOutSerializer
from .services import record_stock_in


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsStorekeeperOrAdmin()]
        return [IsAuthenticated()]

    def perform_destroy(self, instance):
        try:
            instance.delete()
        except ProtectedError:
            raise ValidationError('This product has stock movements or BOQ items and cannot be deleted.')

    @action(detail=False, methods=['get'], url_path='low-stock')
    def low_stock(self, request):
        low = [p for p in self.get_queryset() if p.availability < p.reorder_threshold]
        return Response(self.get_serializer(low, many=True).data)

    @action(detail=False, methods=['get'])
    def usage(self, request):
        stock_outs = StockOut.objects.all()
        start = parse_date(request.query_params.get('start', '') or '')
        end = parse_date(request.query_params.get('end', '') or '')
        if start:
            stock_outs = stock_outs.filter(date__gte=start)
        if end:
            stock_outs = stock_outs.filter(date__lte=end)

        usage = (
            stock_outs.values('product').annotate(total_quantity=Sum('quantity'))
            .order_by('-total_quantity')
        )
        product_map = {p.id: p.name for p in Product.objects.filter(id__in=[u['product'] for u in usage])}
        data = [
            {'product': u['product'], 'product_name': product_map.get(u['product']), 'total_quantity': u['total_quantity']}
            for u in usage
        ]
        return Response(data)


class StockInViewSet(viewsets.ModelViewSet):
    queryset = StockIn.objects.all()
    serializer_class = StockInSerializer
    permission_classes = [IsStorekeeperOrAdmin]

    def perform_create(self, serializer):
        data = serializer.validated_data
        stock_in = record_stock_in(
            product=data['product'], quantity=data['quantity'], unit_cost=data['unit_cost'],
            supplier=data['supplier'], received_by=self.request.user, date=data['date'],
        )
        serializer.instance = stock_in


class StockOutViewSet(viewsets.ModelViewSet):
    queryset = StockOut.objects.all()
    serializer_class = StockOutSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'mark_returned', 'report_missing'):
            return [IsStorekeeperOrAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(taken_by=self.request.user)

    @action(detail=True, methods=['post'], url_path='mark-returned')
    def mark_returned(self, request, pk=None):
        stock_out = self.get_object()
        if not stock_out.product.returnable:
            raise ValidationError('This product is non-returnable.')
        if stock_out.returned:
            raise ValidationError('This stock-out is already marked returned.')
        stock_out.returned = True
        stock_out.returned_at = timezone.now()
        stock_out.missing_reported_at = None
        stock_out.missing_notes = ''
        stock_out.save(update_fields=['returned', 'returned_at', 'missing_reported_at', 'missing_notes'])
        return Response(StockOutSerializer(stock_out).data)

    @action(detail=True, methods=['post'], url_path='report-missing')
    def report_missing(self, request, pk=None):
        """Flags a stock-out as missing (from the BOQ checklist, no notes needed yet),
        and/or records the written report notes (from the Returns Report page). Either
        half can be called independently, so the checklist tick and the write-up can
        happen as two separate steps."""
        stock_out = self.get_object()
        if not stock_out.product.returnable:
            raise ValidationError('This product is non-returnable.')
        if stock_out.returned:
            raise ValidationError('This stock-out is already marked returned.')

        notes = (request.data.get('notes') or '').strip()
        update_fields = []
        if not stock_out.missing_reported_at:
            stock_out.missing_reported_at = timezone.now()
            update_fields.append('missing_reported_at')
        if notes:
            stock_out.missing_notes = notes
            update_fields.append('missing_notes')

        if update_fields:
            stock_out.save(update_fields=update_fields)
        return Response(StockOutSerializer(stock_out).data)
