import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

function formatNow(value) {
  return {
    date: new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(value),
    time: new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(value)
  }
}

export default function Header({ navigate, onToggleSidebar, isSidebarOpen }) {
  const { user } = useAuth()
  const [now, setNow] = useState(() => new Date())
  const initials = (user?.display_name || user?.email || 'OR').slice(0, 2).toUpperCase()
  const formatted = formatNow(now)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <header className="topbar font-sans">
      <div className="topbar-left">
        <button
          type="button"
          className="sidebar-hamburger-btn"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isSidebarOpen}
          title={isSidebarOpen ? 'Close menu' : 'Open menu'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>

        <div className="topbar-brand-indicator" onClick={() => navigate?.('/dashboard')} role="button" tabIndex={0}>
          <span className="brand-pulse-dot" aria-hidden="true" />
          <strong className="topbar-brand-title font-sora">ORCA</strong>
          <span className="topbar-brand-subhead font-mono">COMMAND CENTER</span>
        </div>
      </div>

      <div className="topbar-meta">
        <span>
          ● Demo marine data
          <br />
          <small>Frontend workspace</small>
        </span>
        <span>
          {formatted.date}
          <br />
          <small>{formatted.time}</small>
        </span>
        <button
          type="button"
          className="avatar"
          style={{ cursor: 'pointer', border: 'none', background: 'transparent', padding: 0 }}
          onClick={() => navigate?.('/personalization')}
          title={`Signed in as ${user?.display_name || user?.email || 'Explorer'} — Click for Personalization`}
        >
          {initials}
        </button>
      </div>
    </header>
  )
}
