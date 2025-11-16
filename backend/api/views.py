import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def certificate_token(request):
    """
    Generate JWT tokens for users authenticated via client certificate.

    This endpoint is called by Next.js after Django middleware auto-authenticates
    the user via mTLS certificate. Returns JWT access and refresh tokens.

    Requirements:
    - User must already be authenticated (via AutoCertificateLoginMiddleware)
    - Session must exist (Django session-based auth)

    Returns:
        200: {access: str, refresh: str}
        401: User not authenticated
    """
    cert_verify = request.META.get('HTTP_X_SSL_CLIENT_VERIFY', 'NONE')
    cert_dn = request.META.get('HTTP_X_SSL_CLIENT_S_DN', '')

    logger.info(f"[CertTokenView] Request received")
    logger.info(f"[CertTokenView] User authenticated: {request.user.is_authenticated}")
    logger.info(f"[CertTokenView] User: {request.user}")
    logger.info(f"[CertTokenView] Cert verify header: {cert_verify}")
    logger.info(f"[CertTokenView] Cert DN header: {cert_dn}")
    logger.info(f"[CertTokenView] Session key: {request.session.session_key}")

    if not request.user.is_authenticated:
        logger.error(f"[CertTokenView] User not authenticated - returning 401")
        return Response(
            {"detail": "Authentication required"},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # Generate JWT tokens for the authenticated user
    logger.info(f"[CertTokenView] Generating tokens for user: {request.user.username}")
    refresh = RefreshToken.for_user(request.user)

    logger.info(f"[CertTokenView] Successfully generated tokens")
    return Response({
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    })
