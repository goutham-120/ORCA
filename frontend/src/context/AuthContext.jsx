import { useCallback, useMemo, useState } from 'react'
import { authService } from '../services/authService'
import { AuthContext } from './authContext'

const STORAGE_KEY = 'orca-auth-session'

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
