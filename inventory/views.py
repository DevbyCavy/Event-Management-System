from django.db.models import Sum
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
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'mark_returned'):
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
        stock_out.save(update_fields=['returned'])
        return Response(StockOutSerializer(stock_out).data)
