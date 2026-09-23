import { useCallback, useEffect, useMemo, useState } from 'react'
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
  const [loading, setLoading] = useState(true)

  const saveSession = useCallback((nextSession) => {
    if (nextSession && nextSession.access_token && nextSession.user) {
      setSession(nextSession)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession))
    } else {
      setSession(null)
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  // Verify token liveness on initial load
  useEffect(() => {
    let mounted = true
    const verifyToken = async () => {
      const initial = storedSession()
      if (initial?.access_token) {
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
      } else {
        if (mounted) {
          saveSession(null)
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

  const login = useCallback(
    async (credentials) => {
      const result = await authService.login(credentials)
      if (result.access_token && result.user) {
        saveSession(result)
      }
      return result
    },
    [saveSession]
  )

  const adminLogin = useCallback(
    async (credentials) => {
      const result = await authService.adminLogin(credentials)
      if (result.access_token && result.user) {
        saveSession(result)
      }
      return result
    },
    [saveSession]
  )

  const register = useCallback(
    async (details) => {
      const result = await authService.register(details)
      if (result.access_token && result.user) {
        saveSession(result)
      }
      return result
    },
    [saveSession]
  )

  const logout = useCallback(async () => {
    if (session?.access_token) {
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
      user: session?.user ?? null,
      token: session?.access_token ?? null,
      loading,
      login,
      adminLogin,
      register,
      logout,
    }),
    [session, loading, login, adminLogin, register, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
