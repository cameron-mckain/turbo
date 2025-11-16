import re
from django.contrib.auth.backends import BaseBackend
from django.contrib.auth import get_user_model

User = get_user_model()


class ClientCertificateBackend(BaseBackend):
    """
    Authenticate users based on client certificate from NGINX Ingress Controller.

    NGINX IC passes certificate information via HTTP headers:
    - X-SSL-Client-Verify: SUCCESS, FAILED:reason, or NONE
    - X-SSL-Client-S-DN: Subject Distinguished Name (e.g., CN=user@example.com,O=Company)

    This backend:
    1. Checks if certificate was verified successfully
    2. Extracts email from Subject DN
    3. Looks up existing Django user by email
    4. Returns user if found, None otherwise (falls back to next auth backend)
    """

    def authenticate(self, request, **kwargs):
        if not request:
            return None

        # Check if certificate was verified by NGINX
        cert_verify = request.META.get('HTTP_X_SSL_CLIENT_VERIFY', 'NONE')
        if cert_verify != 'SUCCESS':
            return None

        # Extract Subject DN from certificate
        subject_dn = request.META.get('HTTP_X_SSL_CLIENT_S_DN', '')
        if not subject_dn:
            return None

        # Extract email from Subject DN
        email = self._extract_email_from_dn(subject_dn)
        if not email:
            return None

        # Look up existing user by email
        try:
            user = User.objects.get(email__iexact=email)
            return user
        except User.DoesNotExist:
            # Don't auto-create users - only authenticate existing ones
            return None
        except User.MultipleObjectsReturned:
            # Multiple users with same email - skip cert auth for safety
            return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None

    def _extract_email_from_dn(self, dn):
        """
        Extract email address from Subject Distinguished Name.

        Examples:
        - "CN=cameron@mckain.dev,O=Mckain,C=US" → "cameron@mckain.dev"
        - "CN=Cameron McKain,emailAddress=cameron@mckain.dev,O=Mckain" → "cameron@mckain.dev"
        """
        # Try to find CN with email format first
        cn_match = re.search(r'CN=([^,]+@[^,]+)', dn, re.IGNORECASE)
        if cn_match:
            return cn_match.group(1).strip()

        # Try to find explicit emailAddress field
        email_match = re.search(r'emailAddress=([^,]+@[^,]+)', dn, re.IGNORECASE)
        if email_match:
            return email_match.group(1).strip()

        return None
