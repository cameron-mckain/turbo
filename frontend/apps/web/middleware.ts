import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  // Check if user already has a session
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  if (token) {
    // User already authenticated
    return NextResponse.next()
  }

  // Check for client certificate from NGINX
  const certVerify = request.headers.get('x-ssl-client-verify')

  if (certVerify === 'SUCCESS') {
    // Certificate is valid - trigger certificate authentication
    // Redirect to a special endpoint that will create the session
    const url = request.nextUrl.clone()
    url.pathname = '/api/auth/signin/certificate'
    url.searchParams.set('callbackUrl', request.url)

    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /api/auth/* (next-auth endpoints)
     * - /_next/* (Next.js internals)
     * - /favicon.ico, /robots.txt (static files)
     */
    '/((?!api/auth|_next|favicon.ico|robots.txt).*)',
  ],
}
