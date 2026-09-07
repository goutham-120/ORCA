import { useCallback, useMemo, useState } from 'react'
import { authService } from '../services/authService'
import { AuthContext } from './authContext'
const STORAGE_KEY = 'orca-auth-user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) } catch { localStorage.removeItem(STORAGE_KEY); return null }
  })
  const loading = false

  const saveUser = useCallback((nextUser) => { setUser(nextUser); localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser)) }, [])
  const login = useCallback(async (credentials) => { const result = await authService.login(credentials); saveUser(result.user); return result }, [saveUser])
  const register = useCallback(async (details) => { const result = await authService.register(details); saveUser(result.user); return result }, [saveUser])
  const logout = useCallback(() => { setUser(null); localStorage.removeItem(STORAGE_KEY) }, [])

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
