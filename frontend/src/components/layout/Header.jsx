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
  const [searchQuery, setSearchQuery] = useState('')
  const initials = (user?.display_name || user?.email || 'OR').slice(0, 2).toUpperCase()
  const formatted = formatNow(now)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000)
    return () => window.clearInterval(timer)
  }, [])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (searchQuery.trim() && navigate) {
      navigate(`/ask-orca?query=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  return (
    <header className="topbar font-sans">
      <form onSubmit={handleSearchSubmit} className="global-search-form">
        <input
          type="text"
          className="global-search-input"
          placeholder="Search locations, conditions, or ask ORCA..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Global search query"
        />
      </form>
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
        <span className="avatar" title={`Signed in as ${user?.display_name || user?.email || 'Explorer'}`}>
          {initials}
        </span>
      </div>
    </header>
  )
}
