import React from 'react'
import { useAuth } from '../../hooks/useAuth'

export default function AdminProtectedRoute({ children, navigate }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-200 font-inter">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-400">Verifying Administrator privileges…</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    if (typeof navigate === 'function') {
      navigate('/admin/login')
    } else {
      window.location.href = '/admin/login'
    }
    return null
  }

  return children
}
