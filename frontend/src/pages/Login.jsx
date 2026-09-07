import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Login({ navigate }) {
  const { login } = useAuth(); const [form, setForm] = useState({ email: '', password: '' }); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const submit = async (event) => { event.preventDefault(); setBusy(true); setError(''); try { await login(form); navigate('/dashboard') } catch (err) { setError(err.message || 'Unable to sign in. Check that the API is available.') } finally { setBusy(false) } }
  return <div className="auth-page"><form className="auth-card" onSubmit={submit}><div className="auth-brand"><span>◒</span> ORCA<small>MARINE INTELLIGENCE</small></div><h1>Welcome back</h1><p>Sign in to make better decisions at sea.</p>{error && <div className="form-error">{error}</div>}<label>Email<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label><label>Password<input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" /></label><button className="primary-button" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button><p className="auth-switch">New to ORCA? <button type="button" onClick={() => navigate('/register')}>Create an account</button></p></form></div>
}
