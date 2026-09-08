import { useState, useEffect } from 'react'
import { getAllAlerts } from '../../data/dashboardData'

const navigation = [
  ['dashboard', 'Dashboard', '⌂'],
  ['ask-orca', 'Ask ORCA', '◌'],
  ['map-explorer', 'Map Explorer', '⌑'],
  ['alerts', 'Alerts', '♧'],
  ['reports', 'Reports', '▤'],
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
    <aside className="sidebar font-sans">
      <button className="brand" onClick={() => navigate('/dashboard')} type="button" aria-label="Go to Dashboard">
        <span className="brand-mark">◒</span>
        <span>
          ORCA<small>MARINE INTELLIGENCE</small>
        </span>
      </button>

      <nav aria-label="Primary navigation">
        {navigation.map(([slug, label, icon]) => {
          const isActive = path === `/${slug}`
          return (
            <button
              key={slug}
              type="button"
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => navigate(`/${slug}`)}
            >
              <span>{icon}</span>
              {label}
              {slug === 'alerts' && unreadCount > 0 && <b>{unreadCount}</b>}
            </button>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <p>
          Safer seas.
          <br />
          Brighter tomorrows.
        </p>
        <button className="nav-item logout" onClick={onLogout} type="button">
          <span>⇥</span>Log out
        </button>
      </div>
    </aside>
  )
}
