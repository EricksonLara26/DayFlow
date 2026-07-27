"""Application services for DayFlow accounts."""

from django.utils import timezone
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)


def revoke_outstanding_refresh_tokens(user):
    """Blacklist every unexpired refresh token issued to ``user``."""
    outstanding_tokens = OutstandingToken.objects.filter(
        user=user,
        expires_at__gt=timezone.now(),
    )
    revoked_count = 0

    for outstanding_token in outstanding_tokens:
        _, created = BlacklistedToken.objects.get_or_create(
            token=outstanding_token
        )
        revoked_count += int(created)

    return revoked_count
