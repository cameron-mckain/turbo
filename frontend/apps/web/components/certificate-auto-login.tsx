'use client'

import { useSession, signIn } from 'next-auth/react'
import { useEffect, useState } from 'react'

// Decode JWT to extract username
function decodeToken(token: string): { user_id: number } {
  return JSON.parse(atob(token.split('.')[1]))
}

export function CertificateAutoLogin() {
  const { data: session, status } = useSession()
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    // Only check if not authenticated and not already checking
    if (status === 'unauthenticated' && !checking) {
      checkAndLoginWithCertificate()
    }
  }, [status, checking])

  async function checkAndLoginWithCertificate() {
    setChecking(true)

    try {
      // Call our certificate check endpoint
      const res = await fetch('/api/auth/certificate')

      if (res.ok) {
        const data = await res.json()

        if (data.authenticated && data.access && data.refresh) {
          // Sign in using the certificate provider with the tokens and username
          const result = await signIn('certificate', {
            access: data.access,
            refresh: data.refresh,
            username: data.username, // Username from Django response
            redirect: false,
          })

          if (result?.error) {
            console.error('Certificate sign-in failed:', result.error)
          }
        }
      }
    } catch (error) {
      console.error('Certificate auto-login failed:', error)
    } finally {
      setChecking(false)
    }
  }

  // This component is invisible - it just handles auto-login
  return null
}
