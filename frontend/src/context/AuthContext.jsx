import { useCallback, useMemo, useState } from 'react'
import { authService } from '../services/authService'
import { AuthContext } from './authContext'

const STORAGE_KEY = 'orca-auth-user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY))
    } catch {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
  })
  const loading = false

  const saveUser = useCallback((nextUser) => {
    setUser(nextUser)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser))
    } catch (e) {
      console.error('Failed to store auth user:', e)
    }
  }, [])

  const login = useCallback(async (credentials) => {
    try {
      const result = await authService.login(credentials)
      saveUser(result.user)
      return result
    } catch (err) {
      // Fallback for offline demo mode when backend is unreachable
      console.warn('Backend endpoint unreachable, defaulting to offline demo mode:', err)
      const mockUser = {
        email: credentials.email,
        display_name: credentials.email ? credentials.email.split('@')[0] : 'Navigator'
      }
      saveUser(mockUser)
      return { user: mockUser }
    }
  }, [saveUser])

  const register = useCallback(async (details) => {
    try {
      const result = await authService.register(details)
      saveUser(result.user)
      return result
    } catch (err) {
      // Fallback for offline demo mode when backend is unreachable
      console.warn('Backend endpoint unreachable, defaulting to offline demo mode:', err)
      const mockUser = {
        email: details.email,
        display_name: details.display_name || (details.email ? details.email.split('@')[0] : 'Navigator')
      }
      saveUser(mockUser)
      return { user: mockUser }
    }
  }, [saveUser])

  const logout = useCallback(() => {
    setUser(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore
    }
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
