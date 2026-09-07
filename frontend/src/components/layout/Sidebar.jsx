const navigation = [
  ['dashboard', 'Dashboard', '⌂'], ['ask-orca', 'Ask ORCA', '◌'], ['map-explorer', 'Map Explorer', '⌑'], ['alerts', 'Alerts', '♧'], ['reports', 'Reports', '▤'],
]

export default function Sidebar({ path, navigate, onLogout }) {
  return <aside className="sidebar">
    <button className="brand" onClick={() => navigate('/dashboard')}><span className="brand-mark">◒</span><span>ORCA<small>MARINE INTELLIGENCE</small></span></button>
    <nav aria-label="Primary navigation">{navigation.map(([slug, label, icon]) => <button key={slug} className={`nav-item ${path === `/${slug}` ? 'active' : ''}`} onClick={() => navigate(`/${slug}`)}><span>{icon}</span>{label}{slug === 'alerts' && <b>3</b>}</button>)}</nav>
    <div className="sidebar-footer"><p>Safer seas.<br />Brighter tomorrows.</p><button className="nav-item logout" onClick={onLogout}><span>⇥</span>Log out</button></div>
  </aside>
}
