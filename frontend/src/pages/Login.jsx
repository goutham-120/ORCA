import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import orcaLogo from '../assets/orcalogo.png'

export default function Login({ navigate }) {
  const { login, guestLogin } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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

  const handleGuestQuickStart = (role = 'fisherman') => {
    if (guestLogin) {
      guestLogin(role)
    }
    if (navigate) {
      navigate('/dashboard')
    } else {
      window.location.href = '/dashboard'
    }
  }

  return (
    <div className="auth-page font-inter">
      <div className="auth-ambient-glow" aria-hidden="true" />
      <form className="auth-card font-inter" onSubmit={submit}>
        <div className="auth-brand">
          <div className="auth-brand-logo-wrap">
            <img src={orcaLogo} alt="ORCA Logo" className="auth-brand-logo" />
            <span className="auth-brand-pulse" />
          </div>
          <div className="auth-brand-info">
            <span className="auth-brand-title font-sora">ORCA</span>
            <span className="auth-brand-sub font-inter">Ocean Resource &amp; Contextual Analysis</span>
          </div>
        </div>

        <h1 className="auth-heading font-sora">Welcome Back</h1>
        <p className="auth-subheading font-inter">Sign in to access real-time satellite oceanography &amp; maritime intelligence.</p>

        {error && (
          <div className="auth-error-banner font-inter">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="auth-field-group">
          <label className="auth-label font-inter">
            <span>Email Address</span>
            <div className="auth-input-wrapper">
              <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="mariner@orca.marine"
                className="auth-input font-inter"
                disabled={busy}
              />
            </div>
          </label>

          <label className="auth-label font-inter">
            <span>Password</span>
            <div className="auth-input-wrapper">
              <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="auth-input font-inter"
                disabled={busy}
              />
              <button
                type="button"
                className="auth-show-pass-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
        </div>

        <button type="submit" className="auth-submit-btn font-inter" disabled={busy}>
          {busy ? (
            <span className="auth-btn-loading">
              <svg className="auth-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" strokeDasharray="30" strokeLinecap="round" />
              </svg>
              Signing in…
            </span>
          ) : (
            <span>Sign In to Dashboard &rarr;</span>
          )}
        </button>

        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        <button
          type="button"
          className="auth-guest-btn font-inter"
          onClick={() => handleGuestQuickStart('fisherman')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="3" />
            <line x1="12" y1="22" x2="12" y2="8" />
            <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
          </svg>
          <span>Instant Demo / Guest Access</span>
        </button>

        <p className="auth-switch font-inter">
          New to ORCA?{' '}
          <button type="button" onClick={() => navigate && navigate('/register')} className="auth-switch-link font-inter">
            Create an account
          </button>
        </p>

        <div className="auth-admin-shortcut">
          <button type="button" onClick={() => navigate && navigate('/admin/login')} className="auth-admin-link font-inter">
            Administrator Portal &rarr;
          </button>
        </div>
      </form>
    </div>
  )
}
