from django.contrib.auth import authenticate, login


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
        # 3. This is not a login/logout endpoint (avoid redirect loops)

        if not request.user.is_authenticated:
            cert_verify = request.META.get('HTTP_X_SSL_CLIENT_VERIFY', 'NONE')

            if cert_verify == 'SUCCESS':
                # Don't interfere with explicit login/logout pages
                if not request.path.startswith('/api/token/'):
                    # Authenticate via certificate
                    user = authenticate(request=request)

                    if user:
                        # Log in the user
                        login(request, user)

        response = self.get_response(request)
        return response
