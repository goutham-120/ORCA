import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import orcaLogo from '../assets/orcalogo.png'

export default function AdminLogin({ navigate }) {
  const { adminLogin } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

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
    <div className="auth-page font-inter" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form
        className="auth-card font-inter"
        onSubmit={submit}
        style={{
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          maxWidth: '440px',
          width: '100%',
          padding: '2.5rem',
          borderRadius: '16px',
        }}
      >
        <div className="auth-brand font-sora" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
          <img src={orcaLogo} alt="ORCA Logo" className="auth-brand-logo" style={{ width: '48px', height: '48px', marginBottom: '0.5rem' }} />
          <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f59e0b', letterSpacing: '0.05em' }}>ORCA ADMIN</span>
          <small className="font-inter" style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            System Administrator Portal
          </small>
        </div>

        <h1 className="font-sora" style={{ color: '#f8fafc', fontSize: '1.4rem', textAlign: 'center', marginBottom: '0.25rem' }}>
          Administrator Sign In
        </h1>
        <p className="font-inter" style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', marginBottom: '1.5rem' }}>
          Access registration approvals and system management.
        </p>

        {error && (
          <div
            className="form-error font-inter"
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '0.875rem',
              marginBottom: '1.25rem',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        <label className="font-inter" style={{ display: 'block', color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Admin Email
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="admin@orca.gov"
            className="font-inter"
            disabled={busy}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#fff',
              marginTop: '6px',
              boxSizing: 'border-box',
            }}
          />
        </label>

        <label className="font-inter" style={{ display: 'block', color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Password
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
            className="font-inter"
            disabled={busy}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#fff',
              marginTop: '6px',
              boxSizing: 'border-box',
            }}
          />
        </label>

        <button
          type="submit"
          className="primary-button font-inter"
          disabled={busy}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
            color: '#fff',
            fontWeight: '600',
            border: 'none',
            cursor: busy ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.2s',
          }}
        >
          {busy ? 'Authenticating…' : 'Sign In as Administrator'}
        </button>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => navigate && navigate('/')}
            style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            ← Return to Public Portal
          </button>
        </div>
      </form>
    </div>
  )
}
