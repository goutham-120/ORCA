import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import orcaLogo from '../assets/orcalogo.png'

export default function AdminLogin({ navigate }) {
  const { adminLogin } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await adminLogin(form)
      if (navigate) {
        navigate('/admin/dashboard')
      } else {
        window.location.href = '/admin/dashboard'
      }
    } catch (err) {
      setError(err.message || 'Invalid administrator credentials or access denied.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="auth-page font-inter"
      style={{
        background: 'radial-gradient(circle at 10% 20%, rgba(245, 158, 11, 0.18) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(2, 132, 199, 0.15) 0%, transparent 40%), linear-gradient(135deg, #070e1c 0%, #0c182d 50%, #17243c 100%)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      />

      <form
        className="auth-card font-inter"
        onSubmit={submit}
        style={{
          background: 'rgba(15, 23, 42, 0.88)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(245, 158, 11, 0.1)',
          maxWidth: '440px',
          width: '100%',
          padding: '38px 34px',
          borderRadius: '20px',
          backdropFilter: 'blur(20px)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div className="auth-brand" style={{ borderBottom: '1px solid rgba(245, 158, 11, 0.2)' }}>
          <div
            style={{
              position: 'relative',
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
              border: '1px solid #fbbf24',
              display: 'grid',
              placeItems: 'center',
              padding: '3px',
              boxShadow: '0 4px 14px rgba(217, 119, 6, 0.35)',
            }}
          >
            <img src={orcaLogo} alt="ORCA Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '7px' }} />
          </div>
          <div className="auth-brand-info">
            <span className="auth-brand-title font-sora" style={{ color: '#fbbf24' }}>ORCA ADMIN</span>
            <span className="auth-brand-sub font-inter" style={{ color: '#fde68a' }}>Administrator Verification Portal</span>
          </div>
        </div>

        <h1 className="auth-heading font-sora">Administrator Sign In</h1>
        <p className="auth-subheading font-inter">Manage maritime role approvals, authority verification, and audit logs.</p>

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
            <span>Admin Email</span>
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
                placeholder="admin@orca.gov"
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
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
        </div>

        <button
          type="submit"
          className="auth-submit-btn font-inter"
          disabled={busy}
          style={{
            background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
            boxShadow: '0 4px 14px rgba(217, 119, 6, 0.35)',
          }}
        >
          {busy ? (
            <span className="auth-btn-loading">
              <svg className="auth-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" strokeDasharray="30" strokeLinecap="round" />
              </svg>
              Authenticating…
            </span>
          ) : (
            <span>Authenticate Admin Session &rarr;</span>
          )}
        </button>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => navigate && navigate('/')}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
          >
            &larr; Return to Public Portal
          </button>
        </div>
      </form>
    </div>
  )
}
