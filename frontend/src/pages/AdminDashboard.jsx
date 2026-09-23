import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { authService } from '../services/authService'
import orcaLogo from '../assets/orcalogo.png'

export default function AdminDashboard({ navigate }) {
  const { token, user, logout } = useAuth()
  const [pendingUsers, setPendingUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [actionBusyId, setActionBusyId] = useState(null)

  // Login Activity State
  const [loginActivities, setLoginActivities] = useState([])
  const [loadingActivities, setLoadingActivities] = useState(true)
  const [activityError, setActivityError] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')

  const fetchPendingUsers = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const list = await authService.getPendingUsers(token)
      setPendingUsers(list || [])
    } catch (err) {
      setError(err.message || 'Failed to fetch pending registration requests.')
    } finally {
      setLoading(false)
    }
  }, [token])

  const fetchLoginActivity = useCallback(async () => {
    if (!token) return
    setLoadingActivities(true)
    setActivityError('')
    try {
      const res = await authService.getLoginActivity(token, {
        role: roleFilter,
        status: statusFilter,
        date: dateFilter,
      })
      const list = Array.isArray(res) ? res : (res?.activities || [])
      setLoginActivities(list)
    } catch (err) {
      setActivityError(err.message || 'Failed to fetch login activity logs.')
    } finally {
      setLoadingActivities(false)
    }
  }, [token, roleFilter, statusFilter, dateFilter])

  useEffect(() => {
    fetchPendingUsers()
  }, [fetchPendingUsers])

  useEffect(() => {
    fetchLoginActivity()
  }, [fetchLoginActivity])

  const handleApprove = async (userId, userEmail) => {
    setActionBusyId(userId)
    setActionMessage('')
    setError('')
    try {
      await authService.approveUser(token, userId)
      setActionMessage(`Account for ${userEmail} approved successfully.`)
      await fetchPendingUsers()
    } catch (err) {
      setError(err.message || `Failed to approve ${userEmail}.`)
    } finally {
      setActionBusyId(null)
    }
  }

  const handleReject = async (userId, userEmail) => {
    setActionBusyId(userId)
    setActionMessage('')
    setError('')
    try {
      await authService.rejectUser(token, userId)
      setActionMessage(`Account for ${userEmail} rejected.`)
      await fetchPendingUsers()
    } catch (err) {
      setError(err.message || `Failed to reject ${userEmail}.`)
    } finally {
      setActionBusyId(null)
    }
  }

  const handleLogout = () => {
    logout()
    if (navigate) {
      navigate('/admin/login')
    } else {
      window.location.href = '/admin/login'
    }
  }

  const roleLabels = {
    coastal_authority: 'Coastal Authority',
    marine_disaster_ops: 'Marine & Disaster Operations',
    researcher: 'Researcher',
    fisherman: 'Fisherman',
    admin: 'Administrator',
  }

  const formatTimestamp = (ts) => {
    if (!ts) return '—'
    try {
      const d = new Date(ts)
      return isNaN(d.getTime()) ? ts : d.toLocaleString()
    } catch {
      return ts
    }
  }

  return (
    <div style={{ background: '#0b1329', minHeight: '100vh', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      {/* HEADER */}
      <header style={{ background: '#0f172a', borderBottom: '1px solid rgba(245, 158, 11, 0.25)', padding: '1rem 2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <img src={orcaLogo} alt="ORCA" style={{ height: '36px', width: '36px', borderRadius: '6px' }} />
            <div>
              <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#f59e0b', fontFamily: 'Sora, sans-serif', fontWeight: 700 }}>
                ORCA Admin Portal
              </h1>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Administrator Approval & Oversight</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
              Signed in as: <strong style={{ color: '#f59e0b' }}>{user?.email || 'admin'}</strong>
            </span>
            <button
              onClick={handleLogout}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem' }}>
        {/* TOP STATS ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '1.5rem', borderRadius: '12px' }}>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
              Total Pending Requests
            </span>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b', marginTop: '0.25rem' }}>
              {pendingUsers.length}
            </div>
          </div>

          <div style={{ background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '1.5rem', borderRadius: '12px' }}>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
              Coastal Authority Pending
            </span>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#60a5fa', marginTop: '0.25rem' }}>
              {pendingUsers.filter((u) => u.role === 'coastal_authority').length}
            </div>
          </div>

          <div style={{ background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '1.5rem', borderRadius: '12px' }}>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
              Marine & Disaster Ops Pending
            </span>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f43f5e', marginTop: '0.25rem' }}>
              {pendingUsers.filter((u) => u.role === 'marine_disaster_ops').length}
            </div>
          </div>
        </div>

        {/* FEEDBACK BANNERS */}
        {actionMessage && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#86efac', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            ✓ {actionMessage}
          </div>
        )}

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* PENDING USERS TABLE SECTION */}
        <div style={{ background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', overflow: 'hidden', marginBottom: '2.5rem' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'Sora, sans-serif', color: '#f8fafc' }}>
              Pending Registration Requests
            </h2>
            <button
              onClick={fetchPendingUsers}
              style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              ↻ Refresh
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              Loading pending registration requests…
            </div>
          ) : pendingUsers.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✓</div>
              No pending registration requests requiring approval.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(15, 23, 42, 0.6)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                    <th style={{ padding: '12px 16px' }}>Applicant Name</th>
                    <th style={{ padding: '12px 16px' }}>Email</th>
                    <th style={{ padding: '12px 16px' }}>Requested Role</th>
                    <th style={{ padding: '12px 16px' }}>Organization</th>
                    <th style={{ padding: '12px 16px' }}>Designation</th>
                    <th style={{ padding: '12px 16px' }}>Registered On</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#f8fafc' }}>
                        {item.name || item.display_name}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#cbd5e1' }}>{item.email}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: item.role === 'coastal_authority' ? 'rgba(96, 165, 250, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                            color: item.role === 'coastal_authority' ? '#93c5fd' : '#fda4af',
                            border: item.role === 'coastal_authority' ? '1px solid rgba(96, 165, 250, 0.3)' : '1px solid rgba(244, 63, 94, 0.3)',
                          }}
                        >
                          {roleLabels[item.role] || item.role}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#cbd5e1' }}>{item.organization || '—'}</td>
                      <td style={{ padding: '14px 16px', color: '#cbd5e1' }}>{item.designation || '—'}</td>
                      <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '0.8rem' }}>
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#fcd34d',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                          }}
                        >
                          Pending
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                          <button
                            disabled={actionBusyId === item.id}
                            onClick={() => handleApprove(item.id, item.email)}
                            style={{
                              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                              border: 'none',
                              color: '#fff',
                              padding: '6px 14px',
                              borderRadius: '6px',
                              fontWeight: 600,
                              fontSize: '0.8rem',
                              cursor: actionBusyId === item.id ? 'not-allowed' : 'pointer',
                              opacity: actionBusyId === item.id ? 0.6 : 1,
                            }}
                          >
                            {actionBusyId === item.id ? 'Updating…' : 'Approve'}
                          </button>
                          <button
                            disabled={actionBusyId === item.id}
                            onClick={() => handleReject(item.id, item.email)}
                            style={{
                              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                              border: 'none',
                              color: '#fff',
                              padding: '6px 14px',
                              borderRadius: '6px',
                              fontWeight: 600,
                              fontSize: '0.8rem',
                              cursor: actionBusyId === item.id ? 'not-allowed' : 'pointer',
                              opacity: actionBusyId === item.id ? 0.6 : 1,
                            }}
                          >
                            {actionBusyId === item.id ? 'Updating…' : 'Reject'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* LOGIN ACTIVITY SECTION */}
        <div style={{ background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'Sora, sans-serif', color: '#f8fafc' }}>
                📋 Login Activity
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Real-time audit log of system login attempts</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
              {/* Role Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Role:</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  style={{
                    background: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#f8fafc',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    outline: 'none',
                  }}
                >
                  <option value="all">All Roles</option>
                  <option value="fisherman">Fisherman</option>
                  <option value="researcher">Researcher</option>
                  <option value="coastal_authority">Coastal Authority</option>
                  <option value="marine_disaster_ops">Marine & Disaster Ops</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    background: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#f8fafc',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    outline: 'none',
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {/* Date Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Date:</label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  style={{
                    background: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#f8fafc',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Clear Filters & Refresh */}
              {(roleFilter !== 'all' || statusFilter !== 'all' || dateFilter) && (
                <button
                  onClick={() => {
                    setRoleFilter('all')
                    setStatusFilter('all')
                    setDateFilter('')
                  }}
                  style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '5px 10px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  Clear Filters
                </button>
              )}

              <button
                onClick={fetchLoginActivity}
                style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#cbd5e1', padding: '5px 10px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                ↻ Refresh
              </button>
            </div>
          </div>

          {activityError && (
            <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', borderBottom: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.85rem' }}>
              ⚠️ {activityError}
            </div>
          )}

          {loadingActivities ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              Loading login activity logs…
            </div>
          ) : loginActivities.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔍</div>
              No login activity recorded matching the selected filters.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(15, 23, 42, 0.6)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                    <th style={{ padding: '12px 16px' }}>User</th>
                    <th style={{ padding: '12px 16px' }}>Email</th>
                    <th style={{ padding: '12px 16px' }}>Role</th>
                    <th style={{ padding: '12px 16px' }}>Login Time</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loginActivities.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#f8fafc' }}>
                        {item.user || item.name || item.email || 'Unknown User'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#cbd5e1' }}>{item.email || '—'}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background:
                              item.role === 'coastal_authority'
                                ? 'rgba(96, 165, 250, 0.15)'
                                : item.role === 'marine_disaster_ops'
                                ? 'rgba(244, 63, 94, 0.15)'
                                : item.role === 'admin'
                                ? 'rgba(245, 158, 11, 0.15)'
                                : item.role === 'fisherman'
                                ? 'rgba(34, 197, 94, 0.15)'
                                : 'rgba(168, 85, 247, 0.15)',
                            color:
                              item.role === 'coastal_authority'
                                ? '#93c5fd'
                                : item.role === 'marine_disaster_ops'
                                ? '#fda4af'
                                : item.role === 'admin'
                                ? '#fcd34d'
                                : item.role === 'fisherman'
                                ? '#86efac'
                                : '#c084fc',
                            border:
                              item.role === 'coastal_authority'
                                ? '1px solid rgba(96, 165, 250, 0.3)'
                                : item.role === 'marine_disaster_ops'
                                ? '1px solid rgba(244, 63, 94, 0.3)'
                                : item.role === 'admin'
                                ? '1px solid rgba(245, 158, 11, 0.3)'
                                : item.role === 'fisherman'
                                ? '1px solid rgba(34, 197, 94, 0.3)'
                                : '1px solid rgba(168, 85, 247, 0.3)',
                          }}
                        >
                          {roleLabels[item.role] || item.role || 'Unknown'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '0.8rem' }}>
                        {formatTimestamp(item.timestamp)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: item.status === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: item.status === 'success' ? '#86efac' : '#fca5a5',
                            border: item.status === 'success' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                          }}
                        >
                          {item.status === 'success' ? '✓ Success' : '✕ Failed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )

}
