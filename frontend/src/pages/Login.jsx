import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import orcaLogo from '../assets/orcalogo.png'

export default function Login({ navigate }) {
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(form)
      if (navigate) {
        navigate('/dashboard')
      } else {
        window.location.href = '/dashboard'
      }
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please verify your credentials or network connection.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page font-inter">
      <form className="auth-card font-inter" onSubmit={submit}>
        <div className="auth-brand font-sora">
          <img src={orcaLogo} alt="ORCA Logo" className="auth-brand-logo" />
          <span>ORCA</span>
          <small className="font-inter">OCEAN RESOURCE & CONTEXTUAL ANALYSIS</small>
        </div>
        <h1 className="font-sora">Welcome Back</h1>
        <p className="font-inter">Sign in to access marine intelligence.</p>
        
        {error && (
          <div className="form-error font-inter" style={{ padding: '10px 14px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <label className="font-inter">
          Email
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
            className="font-inter"
            disabled={busy}
          />
        </label>
        <label className="font-inter">
          Password
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
            className="font-inter"
            disabled={busy}
          />
        </label>
        <button className="primary-button font-inter" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign In'}
        </button>
        <p className="auth-switch font-inter">
          New to ORCA?{' '}
          <button type="button" onClick={() => navigate && navigate('/register')} className="font-inter">
            Create an account
          </button>
        </p>
      </form>
    </div>
  )
}
