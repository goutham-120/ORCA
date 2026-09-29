import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { authService } from '../services/authService'
import orcaLogo from '../assets/orcalogo.png'
import './AdminDashboard.css'

export default function AdminDashboard({ navigate }) {
  const { token, user, logout } = useAuth()
  const [pendingUsers, setPendingUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [actionBusyId, setActionBusyId] = useState(null)
  const [activeTab, setActiveTab] = useState('pending') // 'pending' | 'activity'

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
    marine_disaster_ops: 'Marine & Disaster Ops',
    researcher: 'Marine Researcher',
    fisherman: 'Fisherman',
    admin: 'Administrator',
  }

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'coastal_authority': return 'role-coastal'
      case 'marine_disaster_ops': return 'role-disaster'
      case 'researcher': return 'role-researcher'
      case 'fisherman': return 'role-fisherman'
      case 'admin': return 'role-admin'
      default: return 'role-researcher'
    }
  }

  const getInitials = (name, email) => {
    if (name) {
      const parts = name.trim().split(' ')
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      return name.slice(0, 2).toUpperCase()
    }
    if (email) return email.slice(0, 2).toUpperCase()
    return 'OR'
  }

  const formatTimestamp = (ts) => {
    if (!ts) return '—'
    try {
      const d = new Date(ts)
      return isNaN(d.getTime()) ? ts : d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ts
    }
  }

  const coastalPendingCount = pendingUsers.filter((u) => u.role === 'coastal_authority').length
  const disasterPendingCount = pendingUsers.filter((u) => u.role === 'marine_disaster_ops').length

  return (
    <div className="admin-dashboard-page">
      {/* HEADER */}
      <header className="admin-header">
        <div className="admin-header-inner">
          <div className="admin-brand">
            <div className="admin-logo-badge">
              <img src={orcaLogo} alt="ORCA Admin" />
            </div>
            <div>
              <h1 className="admin-brand-title">ORCA Admin Portal</h1>
              <span className="admin-brand-subtitle">Maritime Registration & Activity Audit Command</span>
            </div>
          </div>

          <div className="admin-header-actions">
            <div className="admin-live-badge">
              <span className="admin-pulse-dot" />
              Live Security Hub
            </div>
            <div className="admin-user-pill">
              Admin: <strong>{user?.email || 'admin@orca.gov'}</strong>
            </div>
            <button onClick={handleLogout} className="admin-logout-btn" title="Sign out of Admin Portal">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="admin-main">
        {/* TOP STATS ROW */}
        <div className="admin-kpi-grid">
          <div className="admin-kpi-card amber">
            <div className="admin-kpi-header">
              <span className="admin-kpi-label">Pending Requests</span>
              <div className="admin-kpi-icon amber">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
            </div>
            <div className="admin-kpi-value">{pendingUsers.length}</div>
            <div className="admin-kpi-sub">Awaiting credential verification</div>
          </div>

          <div className="admin-kpi-card cyan">
            <div className="admin-kpi-header">
              <span className="admin-kpi-label">Coastal Authority</span>
              <div className="admin-kpi-icon cyan">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
            </div>
            <div className="admin-kpi-value">{coastalPendingCount}</div>
            <div className="admin-kpi-sub">Port & patrol officer approvals</div>
          </div>

          <div className="admin-kpi-card rose">
            <div className="admin-kpi-header">
              <span className="admin-kpi-label">Disaster Ops</span>
              <div className="admin-kpi-icon rose">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
            </div>
            <div className="admin-kpi-value">{disasterPendingCount}</div>
            <div className="admin-kpi-sub">Emergency responder requests</div>
          </div>

          <div className="admin-kpi-card purple">
            <div className="admin-kpi-header">
              <span className="admin-kpi-label">Audit Logs</span>
              <div className="admin-kpi-icon purple">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
            </div>
            <div className="admin-kpi-value">{loginActivities.length}</div>
            <div className="admin-kpi-sub">Total session events tracked</div>
          </div>
        </div>

        {/* FEEDBACK BANNERS */}
        {actionMessage && (
          <div className="admin-banner success">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{actionMessage}</span>
          </div>
        )}

        {error && (
          <div className="admin-banner error">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* TAB CONTROLS */}
        <div className="admin-tabs">
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <polyline points="16 11 18 13 22 9" />
            </svg>
            <span>Pending Approvals</span>
            <span className="admin-tab-count">{pendingUsers.length}</span>
          </button>

          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            <span>Login Audit Log</span>
            <span className="admin-tab-count">{loginActivities.length}</span>
          </button>
        </div>

        {/* SECTION 1: PENDING USERS */}
        {activeTab === 'pending' && (
          <div className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h2 className="admin-panel-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Registration Clearance Queue
                </h2>
                <span className="admin-panel-desc">Restricted maritime roles require manual verification before granting portal access</span>
              </div>
              <button onClick={fetchPendingUsers} className="admin-refresh-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                <span>Refresh Queue</span>
              </button>
            </div>

            {loading ? (
              <div className="admin-empty-state">
                <div className="admin-empty-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeDasharray="30" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="admin-empty-title">Loading Queue…</div>
                <div className="admin-empty-desc">Fetching pending maritime credentials from the database.</div>
              </div>
            ) : pendingUsers.length === 0 ? (
              <div className="admin-empty-state">
                <div className="admin-empty-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <div className="admin-empty-title">All Requests Cleared</div>
                <div className="admin-empty-desc">There are currently zero pending registration applications requiring administrative action.</div>
              </div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Applicant</th>
                      <th>Requested Role</th>
                      <th>Organization</th>
                      <th>Designation</th>
                      <th>Applied On</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Clearance Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="admin-user-cell">
                            <div className="admin-avatar-chip">
                              {getInitials(item.name || item.display_name, item.email)}
                            </div>
                            <div>
                              <span className="admin-user-name">{item.name || item.display_name || 'Anonymous Applicant'}</span>
                              <span className="admin-user-email">{item.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`admin-badge ${getRoleBadgeClass(item.role)}`}>
                            {roleLabels[item.role] || item.role}
                          </span>
                        </td>
                        <td>{item.organization || <span style={{ color: '#64748b' }}>—</span>}</td>
                        <td>{item.designation || <span style={{ color: '#64748b' }}>—</span>}</td>
                        <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                          {item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                        </td>
                        <td>
                          <span className="admin-badge status-pending">
                            Pending Review
                          </span>
                        </td>
                        <td>
                          <div className="admin-actions-cell">
                            <button
                              disabled={actionBusyId === item.id}
                              onClick={() => handleApprove(item.id, item.email)}
                              className="admin-btn-approve"
                              title="Approve and activate account"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              <span>{actionBusyId === item.id ? 'Processing…' : 'Approve'}</span>
                            </button>
                            <button
                              disabled={actionBusyId === item.id}
                              onClick={() => handleReject(item.id, item.email)}
                              className="admin-btn-reject"
                              title="Reject registration request"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                              <span>{actionBusyId === item.id ? 'Processing…' : 'Reject'}</span>
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
        )}

        {/* SECTION 2: LOGIN ACTIVITY */}
        {activeTab === 'activity' && (
          <div className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h2 className="admin-panel-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  System Login Activity Log
                </h2>
                <span className="admin-panel-desc">Real-time audit log of security sessions and authentication events</span>
              </div>

              <div className="admin-filters-bar">
                {/* Role Filter */}
                <div className="admin-filter-item">
                  <label className="admin-filter-label">Role</label>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="admin-select"
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
                <div className="admin-filter-item">
                  <label className="admin-filter-label">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="admin-select"
                  >
                    <option value="all">All Statuses</option>
                    <option value="success">Success</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

                {/* Date Filter */}
                <div className="admin-filter-item">
                  <label className="admin-filter-label">Date</label>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="admin-date-input"
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
                    className="admin-clear-btn"
                  >
                    Reset
                  </button>
                )}

                <button onClick={fetchLoginActivity} className="admin-refresh-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {activityError && (
              <div className="admin-banner error" style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none', margin: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{activityError}</span>
              </div>
            )}

            {loadingActivities ? (
              <div className="admin-empty-state">
                <div className="admin-empty-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeDasharray="30" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="admin-empty-title">Loading Logs…</div>
                <div className="admin-empty-desc">Fetching security and login audit history.</div>
              </div>
            ) : loginActivities.length === 0 ? (
              <div className="admin-empty-state">
                <div className="admin-empty-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <div className="admin-empty-title">No Logs Found</div>
                <div className="admin-empty-desc">No login activity matched the selected criteria. Try adjusting the filters.</div>
              </div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Role</th>
                      <th>Timestamp</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginActivities.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="admin-user-cell">
                            <div className="admin-avatar-chip">
                              {getInitials(item.user || item.name, item.email)}
                            </div>
                            <div>
                              <span className="admin-user-name">{item.user || item.name || item.email || 'Anonymous User'}</span>
                              <span className="admin-user-email">{item.email || '—'}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`admin-badge ${getRoleBadgeClass(item.role)}`}>
                            {roleLabels[item.role] || item.role || 'User'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                          {formatTimestamp(item.timestamp)}
                        </td>
                        <td>
                          <span className={`admin-badge ${item.status === 'success' ? 'status-success' : 'status-failed'}`}>
                            {item.status === 'success' ? (
                              <>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>Success</span>
                              </>
                            ) : (
                              <>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                                <span>Failed</span>
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}