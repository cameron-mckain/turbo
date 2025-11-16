import logging
from django.contrib.auth import authenticate, login

logger = logging.getLogger(__name__)


class AutoCertificateLoginMiddleware:
    """
    Automatically authenticate and login users with valid client certificates.

    This middleware:
    1. Checks if user is already authenticated (skip if logged in)
    2. Checks if client certificate was verified by NGINX
    3. Calls authentication backends to verify user
    4. Logs in user if certificate authentication succeeds

    Place this AFTER SessionMiddleware and AuthenticationMiddleware in MIDDLEWARE.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Only attempt cert login if:
        # 1. User is not already authenticated
        # 2. Certificate was verified successfully
        # 3. This is not a username/password login endpoint (avoid issues)

        cert_verify = request.META.get('HTTP_X_SSL_CLIENT_VERIFY', 'NONE')
        cert_dn = request.META.get('HTTP_X_SSL_CLIENT_S_DN', '')

        logger.info(f"[CertMiddleware] Path: {request.path}")
        logger.info(f"[CertMiddleware] Already authenticated: {request.user.is_authenticated}")
        logger.info(f"[CertMiddleware] Cert verify: {cert_verify}")
        logger.info(f"[CertMiddleware] Cert DN: {cert_dn}")

        if not request.user.is_authenticated:
            if cert_verify == 'SUCCESS':
                # Skip only the username/password token endpoints
                # Allow /api/token/certificate/ to use cert auth
                excluded_paths = ['/api/token/', '/api/token/refresh/']

                logger.info(f"[CertMiddleware] Checking if path {request.path} in excluded: {excluded_paths}")

                if request.path not in excluded_paths:
                    logger.info(f"[CertMiddleware] Attempting certificate authentication...")
                    # Authenticate via certificate
                    user = authenticate(request=request)

                    if user:
                        logger.info(f"[CertMiddleware] Successfully authenticated user: {user.username}")
                        # Log in the user
                        login(request, user)
                    else:
                        logger.warning(f"[CertMiddleware] Certificate authentication failed - no user found")
                else:
                    logger.info(f"[CertMiddleware] Path excluded from cert auth")

        response = self.get_response(request)
        return response
