import { ApiError } from '@frontend/types/api'
import type { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { getApiClient } from './api'

function decodeToken(token: string): {
  token_type: string
  exp: number
  iat: number
  jti: string
  user_id: number
} {
  return JSON.parse(atob(token.split('.')[1]))
}

const authOptions: AuthOptions = {
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/login'
  },
  callbacks: {
    async signIn({ user, account }) {
      // Allow certificate-based sign in
      if (account?.provider === 'certificate') {
        return true
      }
      // Allow credentials sign in
      if (account?.provider === 'credentials') {
        return true
      }
      return false
    },
    session: async ({ session, token }) => {
      const access = decodeToken(token.access)
      const refresh = decodeToken(token.refresh)

      if (Date.now() / 1000 > access.exp && Date.now() / 1000 > refresh.exp) {
        return Promise.reject({
          error: new Error('Refresh token expired')
        })
      }

      session.user = {
        id: access.user_id,
        username: token.username
      }

      session.refreshToken = token.refresh
      session.accessToken = token.access

      return session
    },
    jwt: async ({ token, user }) => {
      if (user?.username) {
        return { ...token, ...user }
      }

      // Refresh token
      if (Date.now() / 1000 > decodeToken(token.access).exp) {
        const apiClient = await getApiClient()
        // @ts-expect-error - API type includes readonly response fields
        const res = await apiClient.token.tokenRefreshCreate({
          refresh: token.refresh
        })

        token.access = res.access
      }

      return { ...token, ...user }
    }
  },
  providers: [
    // Certificate-based authentication (mTLS)
    CredentialsProvider({
      id: 'certificate',
      name: 'Client Certificate',
      credentials: {},
      async authorize(credentials, req) {
        // Check if certificate was verified by NGINX
        const certVerify = req.headers?.['x-ssl-client-verify']
        const certDN = req.headers?.['x-ssl-client-s-dn']

        if (certVerify !== 'SUCCESS' || !certDN) {
          return null
        }

        try {
          // Call Django endpoint to get JWT tokens for cert-authenticated user
          const apiClient = await getApiClient()
          const res = await fetch(`${process.env.API_URL}/api/token/certificate/`, {
            method: 'POST',
            headers: {
              'Cookie': req.headers?.cookie || '',
            },
            credentials: 'include',
          })

          if (!res.ok) {
            return null
          }

          const data = await res.json()

          return {
            id: decodeToken(data.access).user_id,
            username: 'cert-user', // Will be replaced by actual username from token
            access: data.access,
            refresh: data.refresh,
          }
        } catch (error) {
          console.error('Certificate auth error:', error)
          return null
        }
      }
    }),
    // Username/password authentication
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: {
          label: 'Email',
          type: 'text'
        },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (credentials === undefined) {
          return null
        }

        try {
          const apiClient = await getApiClient()
          // @ts-expect-error - API type includes readonly response fields
          const res = await apiClient.token.tokenCreate({
            username: credentials.username,
            password: credentials.password
          })

          return {
            id: decodeToken(res.access).user_id,
            username: credentials.username,
            access: res.access,
            refresh: res.refresh
          }
        } catch (error) {
          if (error instanceof ApiError) {
            return null
          }
        }

        return null
      }
    })
  ]
}

export { authOptions }
