import { useCallback, useMemo, useState } from 'react'
import { authService } from '../services/authService'
import { AuthContext } from './authContext'

const STORAGE_KEY = 'orca-auth-session'
const CHAT_STORAGE_KEY = 'orca-chat-messages'
const CHAT_CONV_KEY = 'orca-chat-conversation-id'
const CHAT_USER_KEY = 'orca-chat-user-id'

function storedSession() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return value?.user && value?.access_token ? value : null
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(storedSession)
  const saveSession = useCallback((nextSession) => {
    setSession(nextSession)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession))
  }, [])

  const authenticate = useCallback(async (action, payload) => {
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
    saveSession(result)
    return result
  }, [saveSession])

  const login = useCallback((credentials) => authenticate(authService.login, credentials), [authenticate])
  const register = useCallback((details) => authenticate(authService.register, details), [authenticate])
  const updateProfile = useCallback(async (details) => {
    if (!session?.access_token) throw new Error('Authentication is required.')
    const user = await authService.updateProfile(session.access_token, details)
    saveSession({ ...session, user })
    return user
  }, [saveSession, session])
  const logout = useCallback(() => {
    setSession(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const value = useMemo(() => ({ user: session?.user ?? null, loading: false, login, register, updateProfile, logout }), [session, login, register, updateProfile, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
