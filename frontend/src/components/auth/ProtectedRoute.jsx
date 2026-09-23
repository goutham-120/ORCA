import React from 'react'
import { useAuth } from '../../hooks/useAuth'

export default function ProtectedRoute({ children, navigate }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-200 font-inter">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-400">Verifying ORCA session…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    if (typeof navigate === 'function') {
      navigate('/login')
    } else {
      window.location.href = '/login'
    }
    return null
  }

  return children
}
