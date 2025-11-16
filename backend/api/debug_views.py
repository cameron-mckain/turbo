from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings


@csrf_exempt
def ssl_headers_debug(request):
    """
    Debug endpoint to view SSL client certificate headers from NGINX Ingress Controller.

    Shows:
    - Certificate verification status
    - Subject Distinguished Name
    - Issuer Distinguished Name
    - Serial number
    - Full certificate (if available)

    Usage: GET /debug/ssl-headers
    """

    # Only enable in DEBUG mode or for superusers
    if not settings.DEBUG and not (request.user.is_authenticated and request.user.is_superuser):
        return JsonResponse({"error": "Forbidden - debug endpoint"}, status=403)

    # Extract all SSL-related headers
    ssl_headers = {}
    for header, value in request.META.items():
        if header.startswith('HTTP_X_SSL_'):
            # Convert HTTP_X_SSL_CLIENT_VERIFY to X-SSL-Client-Verify
            display_name = header.replace('HTTP_', '').replace('_', '-')
            ssl_headers[display_name] = value

    # Additional useful info
    response_data = {
        "ssl_headers": ssl_headers,
        "authentication": {
            "is_authenticated": request.user.is_authenticated,
            "username": request.user.username if request.user.is_authenticated else None,
            "email": request.user.email if request.user.is_authenticated else None,
        },
        "client_info": {
            "remote_addr": request.META.get('REMOTE_ADDR'),
            "http_x_forwarded_for": request.META.get('HTTP_X_FORWARDED_FOR'),
            "user_agent": request.META.get('HTTP_USER_AGENT'),
        },
        "certificate_status": {
            "verify_status": ssl_headers.get('X-SSL-CLIENT-VERIFY', 'NONE'),
            "has_certificate": ssl_headers.get('X-SSL-CLIENT-VERIFY') == 'SUCCESS',
        }
    }

    return JsonResponse(response_data, json_dumps_params={'indent': 2})
