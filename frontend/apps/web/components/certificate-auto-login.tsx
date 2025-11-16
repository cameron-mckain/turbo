'use client'

import { useSession, signIn } from 'next-auth/react'
import { useEffect, useState } from 'react'

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
          // We have JWT tokens from Django - sign in to next-auth
          await signIn('credentials', {
            username: 'certificate-user',
            password: data.access, // Pass access token as password
            redirect: false,
          })
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
