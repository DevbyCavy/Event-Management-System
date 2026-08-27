from rest_framework.permissions import BasePermission

from . import roles


def in_group(user, *group_names):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    return user.groups.filter(name__in=group_names).exists()


def group_permission(*group_names):
    """Build a DRF permission class that allows superusers or members of the given groups."""

    class _GroupPermission(BasePermission):
        def has_permission(self, request, view):
            return in_group(request.user, *group_names)

    return _GroupPermission


IsAdmin = group_permission(roles.ADMIN)
IsPlannerOrAdmin = group_permission(roles.ADMIN, roles.EVENT_PLANNER)
IsAccountsOrAdmin = group_permission(roles.ADMIN, roles.ACCOUNTS)
IsStorekeeperOrAdmin = group_permission(roles.ADMIN, roles.STOREKEEPER)


def get_staff_profile(user):
    """The Staff record linked to this logged-in user, or None (e.g. for admin/client/vendor accounts)."""
    if not user or not user.is_authenticated:
        return None
    return getattr(user, 'staff_profile', None)


def get_vendor_profile(user):
    """The Vendor record linked to this logged-in user, or None."""
    if not user or not user.is_authenticated:
        return None
    return getattr(user, 'vendor_profile', None)
