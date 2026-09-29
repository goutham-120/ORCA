import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import orcaLogo from '../assets/orcalogo.png'

const USER_ROLES = [
  {
    id: 'fisherman',
    label: 'Fisherman / Mariner',
    desc: 'PFZ corridors, wave & wind telemetry, navigation hazards, voice advisories',
    requiresApproval: false,
  },
  {
    id: 'researcher',
    label: 'Marine Researcher',
    desc: 'Satellite SST & Chlorophyll telemetry, thermal cloud IR, marine anomalies',
    requiresApproval: false,
  },
  {
    id: 'coastal_authority',
    label: 'Coastal Authority',
    desc: 'Port oversight, mariner safety broadcasts, regulatory management',
    requiresApproval: true,
  },
  {
    id: 'marine_disaster_ops',
    label: 'Disaster Operations',
    desc: 'Emergency coordination, search & rescue, storm surge & cyclone response',
    requiresApproval: true,
  },
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
  const [showPassword, setShowPassword] = useState(false)

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

    if (form.role === 'researcher' && !form.organization?.trim()) {
      setError('Institution name is required for Researcher accounts.')
      return
    }

    if ((form.role === 'coastal_authority' || form.role === 'marine_disaster_ops') && !form.organization?.trim()) {
      setError('Organization / Agency name is required for authority accounts.')
      return
    }

    if ((form.role === 'coastal_authority' || form.role === 'marine_disaster_ops') && !form.designation?.trim()) {
      setError('Official designation is required for authority accounts.')
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
        setPendingNotice(result.message || 'Your registration request has been submitted for administrator review.')
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

  const selectedRoleObj = USER_ROLES.find((r) => r.id === form.role) || USER_ROLES[0]

  return (
    <div className="auth-page font-inter" style={{ paddingTop: '2.5rem', paddingBottom: '2.5rem' }}>
      <div className="auth-ambient-glow" aria-hidden="true" />
      <form className="auth-card font-inter" onSubmit={submit} style={{ maxWidth: '560px', width: '100%' }}>
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

        <h1 className="auth-heading font-sora">Create an Account</h1>
        <p className="auth-subheading font-inter">Join ORCA to access role-tailored satellite models and ocean intelligence.</p>

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

        {pendingNotice ? (
          <div className="auth-success-box font-inter">
            <div className="auth-success-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="font-sora">Application Submitted</h3>
            <p>{pendingNotice}</p>
            <button
              type="button"
              className="auth-submit-btn font-inter"
              style={{ marginTop: '1rem', width: 'auto', padding: '10px 24px' }}
              onClick={() => navigate && navigate('/login')}
            >
              Return to Sign In &rarr;
            </button>
          </div>
        ) : (
          <>
            {/* ROLE SELECTOR TILES */}
            <div className="auth-role-selection-wrap">
              <label className="auth-label-title font-inter">Select Your Maritime Persona</label>
              <div className="auth-role-grid">
                {USER_ROLES.map((r) => {
                  const isSelected = form.role === r.id
                  return (
                    <div
                      key={r.id}
                      className={`auth-role-card ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => handleRoleChange(r.id)}
                    >
                      <div className="auth-role-header">
                        <span className="auth-role-name font-sora">{r.label}</span>
                        {r.requiresApproval && (
                          <span className="auth-approval-badge">Requires Approval</span>
                        )}
                      </div>
                      <p className="auth-role-desc font-inter">{r.desc}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {selectedRoleObj.requiresApproval && (
              <div className="auth-approval-notice font-inter">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>
                  <strong>{selectedRoleObj.label}</strong> accounts require administrator verification prior to dashboard activation.
                </span>
              </div>
            )}

            <div className="auth-field-group">
              <label className="auth-label font-inter">
                <span>Full Name</span>
                <div className="auth-input-wrapper">
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Captain Alex Mercer"
                    className="auth-input font-inter"
                    disabled={busy}
                  />
                </div>
              </label>

              <label className="auth-label font-inter">
                <span>{selectedRoleObj.requiresApproval ? 'Official Email Address' : 'Email Address'}</span>
                <div className="auth-input-wrapper">
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder={selectedRoleObj.requiresApproval ? 'officer@coastal.gov' : 'mariner@orca.marine'}
                    className="auth-input font-inter"
                    disabled={busy}
                  />
                </div>
              </label>

              {form.role === 'researcher' && (
                <label className="auth-label font-inter">
                  <span>Research Institution / University</span>
                  <div className="auth-input-wrapper">
                    <input
                      required
                      value={form.organization}
                      onChange={(e) => setForm({ ...form, organization: e.target.value })}
                      placeholder="e.g. National Institute of Oceanography (NIO)"
                      className="auth-input font-inter"
                      disabled={busy}
                    />
                  </div>
                </label>
              )}

              {(form.role === 'coastal_authority' || form.role === 'marine_disaster_ops') && (
                <>
                  <label className="auth-label font-inter">
                    <span>Organization / Maritime Agency</span>
                    <div className="auth-input-wrapper">
                      <input
                        required
                        value={form.organization}
                        onChange={(e) => setForm({ ...form, organization: e.target.value })}
                        placeholder="e.g. Indian Coast Guard / State Disaster Management"
                        className="auth-input font-inter"
                        disabled={busy}
                      />
                    </div>
                  </label>

                  <label className="auth-label font-inter">
                    <span>Official Designation / Rank</span>
                    <div className="auth-input-wrapper">
                      <input
                        required
                        value={form.designation}
                        onChange={(e) => setForm({ ...form, designation: e.target.value })}
                        placeholder="e.g. Deputy Director / Operations Commander"
                        className="auth-input font-inter"
                        disabled={busy}
                      />
                    </div>
                  </label>
                </>
              )}

              <div className="auth-grid-two">
                <label className="auth-label font-inter">
                  <span>Password</span>
                  <div className="auth-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      minLength="8"
                      required
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Min 8 chars"
                      className="auth-input font-inter"
                      disabled={busy}
                    />
                  </div>
                </label>

                <label className="auth-label font-inter">
                  <span>Confirm Password</span>
                  <div className="auth-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      minLength="8"
                      required
                      value={form.confirm_password}
                      onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                      placeholder="Repeat password"
                      className="auth-input font-inter"
                      disabled={busy}
                    />
                  </div>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="auth-show-pass-link font-inter"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? 'Hide Passwords' : 'Show Passwords'}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-submit-btn font-inter" disabled={busy} style={{ marginTop: '0.5rem' }}>
              {busy ? (
                <span className="auth-btn-loading">
                  <svg className="auth-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" strokeDasharray="30" strokeLinecap="round" />
                  </svg>
                  Creating account…
                </span>
              ) : (
                <span>Complete Registration &rarr;</span>
              )}
            </button>
          </>
        )}

        <p className="auth-switch font-inter">
          Already have an account?{' '}
          <button type="button" onClick={() => navigate && navigate('/login')} className="auth-switch-link font-inter">
            Sign In
          </button>
        </p>
      </form>
    </div>
  )
}
