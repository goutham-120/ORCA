import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import orcaLogo from '../assets/orcologo.jpeg'

export default function Register({ navigate }) {
  const { register } = useAuth()
  const [form, setForm] = useState({ display_name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await register(form)
      navigate('/personalization')
    } catch (err) {
      setError(err.message || 'Unable to create your account.')
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
        <h1 className="font-sora">Set sail with ORCA</h1>
        <p className="font-inter">Create your marine intelligence workspace.</p>
        {error && <div className="form-error font-inter">{error}</div>}
        <label className="font-inter">
          Display name
          <input
            required
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            placeholder="Your name"
            className="font-inter"
          />
        </label>
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
            minLength="8"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="At least 8 characters"
            className="font-inter"
          />
        </label>
        <button className="primary-button font-inter" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
        <p className="auth-switch font-inter">
          Already have an account?{' '}
          <button type="button" onClick={() => navigate('/login')} className="font-inter">
            Sign in
          </button>
        </p>
      </form>
    </div>
  )
}
