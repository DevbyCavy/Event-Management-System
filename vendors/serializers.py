from rest_framework import serializers

from .models import EventVendor, Vendor


class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ('id', 'name', 'category', 'contact_email', 'contact_phone', 'notes', 'user')


class EventVendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventVendor
        fields = ('id', 'event', 'vendor', 'agreed_price', 'deposit_paid', 'contract_status', 'contract_doc')
