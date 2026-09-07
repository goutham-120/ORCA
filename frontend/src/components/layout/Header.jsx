import { useAuth } from '../../hooks/useAuth'

export default function Header() {
  const { user } = useAuth()
  const initials = (user?.display_name || user?.email || 'OR').slice(0, 2).toUpperCase()
  return <header className="topbar"><div className="global-search">⌕ <span>Search locations, conditions, or ask ORCA...</span></div><div className="topbar-meta"><span>● Visakhapatnam, AP<br /><small>17.6868° N, 83.2185° E</small></span><span>☀ Sat, 6 Sep 2026<br /><small>12:24 PM</small></span><span className="avatar">{initials}</span></div></header>
}
