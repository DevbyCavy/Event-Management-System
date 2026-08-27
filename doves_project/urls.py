from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from users.views import MeView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/me/', MeView.as_view(), name='me'),
    path('api/', include('events.urls')),
    path('api/', include('policies.urls')),
    path('api/', include('inventory.urls')),
    path('api/', include('boq.urls')),
    path('api/', include('requisitions.urls')),
    path('api/', include('staffing.urls')),
    path('api/', include('logistics.urls')),
    path('api/', include('vendors.urls')),
    path('api/', include('budgeting.urls')),
    path('api/', include('guests.urls')),
    path('api/', include('core.urls')),
    path('api/', include('users.urls')),
]
