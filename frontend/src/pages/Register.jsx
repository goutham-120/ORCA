import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import orcaLogo from '../assets/orcalogo.png'

const USER_ROLES = [
  { id: 'fisherman', label: 'Fisherman', desc: 'Standard marine operation & safety access' },
  { id: 'researcher', label: 'Researcher', desc: 'Marine science & research data access' },
  { id: 'coastal_authority', label: 'Coastal Authority', desc: 'Regulatory oversight (Requires Admin Approval)' },
  { id: 'marine_disaster_ops', label: 'Marine & Disaster Operations', desc: 'Emergency response & disaster management (Requires Admin Approval)' },
]

export default function Register({ navigate }) {
  const { register } = useAuth()
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'fisherman',
    organization: '',
    designation: '',
    password: '',
    confirm_password: '',
  })
  const [error, setError] = useState('')
  const [pendingNotice, setPendingNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const handleRoleChange = (roleId) => {
    setForm((prev) => ({ ...prev, role: roleId }))
    setError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setPendingNotice('')

    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.')
      return
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (form.role === 'researcher' && !form.organization.strip?.() && !form.organization) {
      setError('Institution information is required for Researcher accounts.')
      return
    }

    if ((form.role === 'coastal_authority' || form.role === 'marine_disaster_ops') && !form.organization) {
      setError('Organization name is required for authority & disaster operations accounts.')
      return
    }

    if ((form.role === 'coastal_authority' || form.role === 'marine_disaster_ops') && !form.designation) {
      setError('Official designation is required for authority & disaster operations accounts.')
      return
    }

    setBusy(true)

    try {
      const payload = {
        name: form.name.trim(),
        display_name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        organization: form.organization.trim() || undefined,
        institution: form.organization.trim() || undefined,
        designation: form.designation.trim() || undefined,
      }

      const result = await register(payload)

      if (result?.user?.approval_status === 'pending' || result?.message?.includes('pending')) {
        setPendingNotice(result.message || 'Your registration request has been submitted for administrator approval.')
      } else if (result?.access_token) {
        if (navigate) {
          navigate('/dashboard')
        } else {
          window.location.href = '/dashboard'
        }
      }
    } catch (err) {
      setError(err.message || 'Unable to create your account.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page font-inter" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <form className="auth-card font-inter" onSubmit={submit} style={{ maxWidth: '520px', width: '100%' }}>
        <div className="auth-brand font-sora">
          <img src={orcaLogo} alt="ORCA Logo" className="auth-brand-logo" />
          <span>ORCA</span>
          <small className="font-inter">OCEAN RESOURCE & CONTEXTUAL ANALYSIS</small>
        </div>
        <h1 className="font-sora">Create an Account</h1>
        <p className="font-inter">Join ORCA to access ocean intelligence and safety models.</p>

        {error && (
          <div className="form-error font-inter" style={{ padding: '10px 14px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {pendingNotice ? (
          <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#93c5fd', marginTop: '1rem', textAlign: 'center' }}>
            <h3 className="font-sora" style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#60a5fa' }}>Registration Submitted</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{pendingNotice}</p>
            <button
              type="button"
              className="primary-button font-inter"
              style={{ marginTop: '1rem', width: 'auto', padding: '8px 20px' }}
              onClick={() => navigate && navigate('/login')}
            >
              Return to Login
            </button>
          </div>
        ) : (
          <>
            <label className="font-inter">
              User Type / Role
              <select
                value={form.role}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="font-inter"
                style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', marginTop: '4px' }}
              >
                {USER_ROLES.map((r) => (
                  <option key={r.id} value={r.id} style={{ background: '#0f172a', color: '#fff' }}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>

            {(form.role === 'coastal_authority' || form.role === 'marine_disaster_ops') && (
              <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fcd34d', fontSize: '0.8rem', marginTop: '4px', marginBottom: '8px' }}>
                ℹ️ Registration for {USER_ROLES.find(r => r.id === form.role)?.label} requires administrator approval before login is enabled.
              </div>
            )}

            <label className="font-inter">
              Full Name
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Captain Alex Mercer"
                className="font-inter"
                disabled={busy}
              />
            </label>

            <label className="font-inter">
              {form.role === 'coastal_authority' || form.role === 'marine_disaster_ops' ? 'Official Email' : 'Email'}
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder={form.role === 'coastal_authority' || form.role === 'marine_disaster_ops' ? 'officer@agency.gov' : 'you@example.com'}
                className="font-inter"
                disabled={busy}
              />
            </label>

            {form.role === 'researcher' && (
              <label className="font-inter">
                Institution Name
                <input
                  required
                  value={form.organization}
                  onChange={(e) => setForm({ ...form, organization: e.target.value })}
                  placeholder="e.g. National Institute of Oceanography"
                  className="font-inter"
                  disabled={busy}
                />
              </label>
            )}

            {(form.role === 'coastal_authority' || form.role === 'marine_disaster_ops') && (
              <>
                <label className="font-inter">
                  Organization / Agency
                  <input
                    required
                    value={form.organization}
                    onChange={(e) => setForm({ ...form, organization: e.target.value })}
                    placeholder="e.g. Indian Coast Guard / NDMA"
                    className="font-inter"
                    disabled={busy}
                  />
                </label>
                <label className="font-inter">
                  Designation / Role Title
                  <input
                    required
                    value={form.designation}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })}
                    placeholder="e.g. Regional Commander / Operations Officer"
                    className="font-inter"
                    disabled={busy}
                  />
                </label>
              </>
            )}

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
                disabled={busy}
              />
            </label>

            <label className="font-inter">
              Confirm Password
              <input
                type="password"
                minLength="8"
                required
                value={form.confirm_password}
                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                placeholder="Repeat password"
                className="font-inter"
                disabled={busy}
              />
            </label>

            <button className="primary-button font-inter" disabled={busy} style={{ marginTop: '1rem' }}>
              {busy ? 'Creating account…' : 'Create Account'}
            </button>
          </>
        )}

        <p className="auth-switch font-inter">
          Already have an account?{' '}
          <button type="button" onClick={() => navigate && navigate('/login')} className="font-inter">
            Sign In
          </button>
        </p>
      </form>
    </div>
  )
}
