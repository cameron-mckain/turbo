import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function GET(request: NextRequest) {
  // Check if user already has a session
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  if (token) {
    // Already authenticated
    return NextResponse.json({ authenticated: true })
  }

  // Check for certificate from NGINX
  const certVerify = request.headers.get('x-ssl-client-verify')

  if (certVerify !== 'SUCCESS') {
    return NextResponse.json({ authenticated: false, reason: 'No certificate' }, { status: 401 })
  }

  // Call Django to get JWT tokens
  // Forward certificate headers from NGINX so Django middleware can authenticate
  try {
    const apiUrl = process.env.API_URL || 'http://turbo-backend-svc:8000'
    const res = await fetch(`${apiUrl}/api/token/certificate/`, {
      method: 'POST',
      headers: {
        'Cookie': request.headers.get('cookie') || '',
        'X-SSL-Client-Verify': request.headers.get('x-ssl-client-verify') || '',
        'X-SSL-Client-S-DN': request.headers.get('x-ssl-client-s-dn') || '',
      },
      credentials: 'include',
    })

    if (!res.ok) {
      return NextResponse.json(
        { authenticated: false, reason: 'Django auth failed' },
        { status: res.status }
      )
    }

    const data = await res.json()

    // Return tokens for client-side session creation
    return NextResponse.json({
      authenticated: true,
      access: data.access,
      refresh: data.refresh,
    })
  } catch (error) {
    console.error('Certificate auth error:', error)
    return NextResponse.json(
      { authenticated: false, reason: 'Server error' },
      { status: 500 }
    )
  }
}
