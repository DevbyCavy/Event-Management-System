from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsAdmin

from .models import Policy, PolicyApproval
from .serializers import PolicyApprovalSerializer, PolicySerializer


class PolicyViewSet(viewsets.ModelViewSet):
    queryset = Policy.objects.all()
    serializer_class = PolicySerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdmin()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'])
    def suggest(self, request):
        event_type = request.query_params.get('event_type', '')
        classification = request.query_params.get('classification', '')
        client_type = request.query_params.get('client_type', '')

        matches = self.get_queryset()
        if event_type:
            matches = matches.filter(event_type__in=['', event_type])
        if classification:
            matches = matches.filter(classification__in=['', classification])
        if client_type:
            matches = matches.filter(client_type__in=['', client_type])

        serializer = self.get_serializer(matches, many=True)
        return Response(serializer.data)


class PolicyApprovalViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin,
                             viewsets.GenericViewSet):
    queryset = PolicyApproval.objects.all()
    serializer_class = PolicyApprovalSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [IsAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(approved_by=self.request.user)
