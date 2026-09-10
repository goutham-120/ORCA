import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import orcaLogo from '../assets/orcologo.jpeg'

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
      navigate('/personalization')
    } catch (err) {
      setError(err.message || 'Unable to sign in. Check that the API is available.')
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
          <small className="font-inter">MARINE INTELLIGENCE</small>
        </div>
        <h1 className="font-sora">Welcome back</h1>
        <p className="font-inter">Sign in to make better decisions at sea.</p>
        {error && <div className="form-error font-inter">{error}</div>}
        <label className="font-inter">
          Email
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
            className="font-inter"
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
          />
        </label>
        <button className="primary-button font-inter" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="auth-switch font-inter">
          New to ORCA?{' '}
          <button type="button" onClick={() => navigate('/register')} className="font-inter">
            Create an account
          </button>
        </p>
      </form>
    </div>
  )
}
