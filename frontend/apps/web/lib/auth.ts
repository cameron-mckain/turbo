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
        const res = await apiClient.token.tokenRefreshCreate({
          refresh: token.refresh
        } as any)

        token.access = res.access
      }

      return { ...token, ...user }
    }
  },
  providers: [
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
        console.log('[NextAuth] authorize called with credentials:', { username: credentials?.username })

        if (credentials === undefined) {
          console.log('[NextAuth] credentials undefined, returning null')
          return null
        }

        try {
          console.log('[NextAuth] Creating API client with BASE:', process.env.API_URL)
          const apiClient = await getApiClient()

          console.log('[NextAuth] Calling tokenCreate with username:', credentials.username)
          const res = await apiClient.token.tokenCreate({
            username: credentials.username,
            password: credentials.password
          } as any)

          console.log('[NextAuth] Token received successfully, user_id:', decodeToken(res.access).user_id)
          return {
            id: decodeToken(res.access).user_id,
            username: credentials.username,
            access: res.access,
            refresh: res.refresh
          }
        } catch (error) {
          console.error('[NextAuth] Error during authentication:', error)
          if (error instanceof ApiError) {
            console.error('[NextAuth] ApiError details:', {
              status: error.status,
              statusText: error.statusText,
              body: error.body
            })
            return null
          }
          throw error
        }

        return null
      }
    })
  ]
}

export { authOptions }
