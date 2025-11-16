import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function GET(request: NextRequest) {
  console.log('[CertRoute] Request received')

  // Check if user already has a session
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  if (token) {
    console.log('[CertRoute] User already has session')
    // Already authenticated
    return NextResponse.json({ authenticated: true })
  }

  // Check for certificate from NGINX
  const certVerify = request.headers.get('x-ssl-client-verify')
  const certDN = request.headers.get('x-ssl-client-s-dn')

  console.log('[CertRoute] Cert verify:', certVerify)
  console.log('[CertRoute] Cert DN:', certDN)

  if (certVerify !== 'SUCCESS') {
    console.log('[CertRoute] No valid certificate - returning 401')
    return NextResponse.json({ authenticated: false, reason: 'No certificate' }, { status: 401 })
  }

  // Call Django to get JWT tokens
  // Forward certificate headers from NGINX so Django middleware can authenticate
  try {
    const apiUrl = process.env.API_URL || 'http://turbo-backend-svc:8000'
    const cookie = request.headers.get('cookie') || ''

    console.log('[CertRoute] Calling Django at:', `${apiUrl}/api/token/certificate/`)
    console.log('[CertRoute] Forwarding headers:')
    console.log('[CertRoute]   Cookie:', cookie ? 'present' : 'none')
    console.log('[CertRoute]   X-SSL-Client-Verify:', certVerify)
    console.log('[CertRoute]   X-SSL-Client-S-DN:', certDN)

    const res = await fetch(`${apiUrl}/api/token/certificate/`, {
      method: 'POST',
      headers: {
        'Cookie': cookie,
        'X-SSL-Client-Verify': certVerify || '',
        'X-SSL-Client-S-DN': certDN || '',
      },
      credentials: 'include',
    })

    console.log('[CertRoute] Django response status:', res.status)

    if (!res.ok) {
      const errorText = await res.text()
      console.error('[CertRoute] Django auth failed:', errorText)
      return NextResponse.json(
        { authenticated: false, reason: 'Django auth failed', details: errorText },
        { status: res.status }
      )
    }

    const data = await res.json()
    console.log('[CertRoute] Successfully got tokens from Django')
    console.log('[CertRoute] Username:', data.username)

    // Return tokens and username for client-side session creation
    return NextResponse.json({
      authenticated: true,
      access: data.access,
      refresh: data.refresh,
      username: data.username,
    })
  } catch (error) {
    console.error('[CertRoute] Certificate auth error:', error)
    return NextResponse.json(
      { authenticated: false, reason: 'Server error', details: String(error) },
      { status: 500 }
    )
  }
}
