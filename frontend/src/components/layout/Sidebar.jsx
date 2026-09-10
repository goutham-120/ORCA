import { useState, useEffect } from 'react'
import { getAllAlerts } from '../../data/dashboardData'
import orcaLogo from '../../assets/orcologo.jpeg'

const DashboardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </svg>
)

const AskOrcaIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    <circle cx="12" cy="11.5" r="1" fill="currentColor" />
    <circle cx="8" cy="11.5" r="1" fill="currentColor" />
    <circle cx="16" cy="11.5" r="1" fill="currentColor" />
  </svg>
)

const MapExplorerIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6" />
    <line x1="9" y1="3" x2="9" y2="18" />
    <line x1="15" y1="6" x2="15" y2="21" />
  </svg>
)

const AlertsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

const ReportsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
)

const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

const PersonalizationIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const mainNavigation = [
  ['dashboard', 'Dashboard', DashboardIcon],
  ['personalization', 'Personalization', PersonalizationIcon],
  ['ask-orca', 'Ask ORCA', AskOrcaIcon],
  ['map-explorer', 'Map Explorer', MapExplorerIcon],
  ['alerts', 'Alerts', AlertsIcon],
  ['reports', 'Reports', ReportsIcon],
]

export default function Sidebar({ path, navigate, onLogout }) {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const updateCount = () => {
      const allAlerts = getAllAlerts()
      try {
        const stored = localStorage.getItem('orca-alerts-read')
        const readIds = stored ? JSON.parse(stored) : []
        const unread = allAlerts.filter((a) => !readIds.includes(a.id)).length
        setUnreadCount(unread)
      } catch {
        setUnreadCount(allAlerts.length)
      }
    }
    updateCount()
    window.addEventListener('storage', updateCount)
    return () => window.removeEventListener('storage', updateCount)
  }, [path])

  return (
    <aside className="sidebar font-inter">
      {/* Brand Header */}
      <button className="brand font-sora" onClick={() => navigate('/dashboard')} type="button" aria-label="Go to Dashboard">
        <div className="brand-logo-badge">
          <img src={orcaLogo} alt="ORCA Logo" className="brand-logo-img" />
        </div>
        <div className="brand-titles">
          <strong className="brand-name font-sora">ORCA</strong>
          <small className="brand-subhead font-inter">MARINE INTELLIGENCE</small>
        </div>
      </button>

      {/* Main Navigation Section */}
      <div className="sidebar-nav-section">
        <span className="nav-section-label font-inter">MAIN</span>
        <nav aria-label="Main navigation">
          {mainNavigation.map(([slug, label, Icon]) => {
            const isActive = path === `/${slug}`
            return (
              <button
                key={slug}
                type="button"
                className={`nav-item font-inter ${isActive ? 'active' : ''}`}
                onClick={() => navigate(`/${slug}`)}
              >
                <span className="nav-icon"><Icon /></span>
                <span className="nav-label">{label}</span>
                {slug === 'alerts' && unreadCount > 0 && <b className="unread-badge font-inter">{unreadCount}</b>}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Flexible Spacer to fit inside 100vh viewport */}
      <div className="sidebar-spacer" />

      {/* Sidebar Footer with Logout Button */}
      <div className="sidebar-footer font-inter">
        <button className="nav-item logout font-inter" onClick={onLogout} type="button">
          <span className="nav-icon"><LogoutIcon /></span>
          <span>Log out</span>
        </button>
      </div>
    </aside>
  )
}
