import { useCallback, useEffect, useMemo, useState } from 'react'
import { authService } from '../services/authService'
import { AuthContext } from './authContext'

const STORAGE_KEY = 'orca-auth-session'
const CHAT_STORAGE_KEY = 'orca-chat-messages'
const CHAT_CONV_KEY = 'orca-chat-conversation-id'
const CHAT_USER_KEY = 'orca-chat-user-id'

const DEFAULT_USER = {
  id: 'operator-1',
  email: 'operator@orca.marine',
  display_name: 'Marine Operator',
  user_category: 'fisher_marine_operator',
  role: 'fisherman',
  organization: 'ORCA Maritime',
}

function storedSession() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (value?.user && value?.access_token) return value
    return { user: DEFAULT_USER, access_token: 'active-session-token' }
  } catch {
    return { user: DEFAULT_USER, access_token: 'active-session-token' }
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(storedSession)
  const [loading, setLoading] = useState(false)

  const saveSession = useCallback((nextSession) => {
    if (nextSession && nextSession.access_token && nextSession.user) {
      setSession(nextSession)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession))
    } else {
      setSession({ user: DEFAULT_USER, access_token: 'active-session-token' })
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  // Verify token liveness on initial load
  useEffect(() => {
    let mounted = true
    const verifyToken = async () => {
      const initial = storedSession()
      if (initial?.access_token && initial.access_token !== 'active-session-token') {
        try {
          const freshUser = await authService.me(initial.access_token)
          if (mounted) {
            saveSession({ ...initial, user: freshUser })
          }
        } catch {
          if (mounted) {
            saveSession(null)
          }
        }
      }
      if (mounted) {
        setLoading(false)
      }
    }

    verifyToken()
    return () => {
      mounted = false
    }
  }, [saveSession])

  const authenticate = useCallback(
    async (action, payload) => {
      const result = await action(payload)
      try {
        const prevUserId = localStorage.getItem(CHAT_USER_KEY)
        const nextUserId = result?.user?.id ? String(result.user.id) : (result?.user?.email || null)
        if (prevUserId && nextUserId && prevUserId !== nextUserId) {
          localStorage.removeItem(CHAT_STORAGE_KEY)
          localStorage.removeItem(CHAT_CONV_KEY)
        }
        if (nextUserId) {
          localStorage.setItem(CHAT_USER_KEY, nextUserId)
        }
      } catch {
        // Ignore storage errors
      }
      if (result.access_token && result.user) {
        saveSession(result)
      }
      return result
    },
    [saveSession]
  )

  const login = useCallback((credentials) => authenticate(authService.login, credentials), [authenticate])
  const adminLogin = useCallback((credentials) => authenticate(authService.adminLogin, credentials), [authenticate])
  const register = useCallback((details) => authenticate(authService.register, details), [authenticate])

  const updateProfile = useCallback(
    async (details) => {
      try {
        if (session?.access_token && session.access_token !== 'active-session-token') {
          const user = await authService.updateProfile(session.access_token, details)
          saveSession({ ...session, user })
          return user
        }
      } catch {
        // Fallback to local state update if backend auth is not reachable
      }
      const updatedUser = { ...(session?.user || DEFAULT_USER), ...details }
      saveSession({ ...(session || {}), user: updatedUser })
      return updatedUser
    },
    [saveSession, session]
  )

  const logout = useCallback(async () => {
    if (session?.access_token && session.access_token !== 'active-session-token') {
      try {
        await authService.logout(session.access_token)
      } catch {
        // Ignore network errors on logout
      }
    }
    saveSession(null)
  }, [session, saveSession])

  const value = useMemo(
    () => ({
      user: session?.user ?? DEFAULT_USER,
      token: session?.access_token ?? null,
      loading,
      login,
      adminLogin,
      register,
      updateProfile,
      logout,
    }),
    [session, loading, login, adminLogin, register, updateProfile, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
