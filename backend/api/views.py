from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken


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
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication required"},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # Generate JWT tokens for the authenticated user
    refresh = RefreshToken.for_user(request.user)

    return Response({
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    })
