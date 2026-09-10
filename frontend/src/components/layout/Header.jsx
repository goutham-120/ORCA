import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

function formatNow(value) {
  return {
    date: new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(value),
    time: new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(value)
  }
}

export default function Header({ navigate }) {
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
