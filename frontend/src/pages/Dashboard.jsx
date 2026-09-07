import SummaryCards from '../components/dashboard/SummaryCards'
import SuggestedQueries from '../components/dashboard/SuggestedQueries'
import RecentActivity from '../components/dashboard/RecentActivity'
import { useAuth } from '../hooks/useAuth'

export default function Dashboard({ navigate }) {
  const { user } = useAuth()
  const name = user?.display_name || user?.email?.split('@')[0] || 'Explorer'
  const ask = (query) => navigate(`/ask-orca${query ? `?query=${encodeURIComponent(query)}` : ''}`)
  return <><section className="welcome"><div><h1>Welcome back, {name}</h1><p>Get real-time insights for safer and smarter decisions at sea.</p></div><strong>Understand today.<br />Navigate tomorrow.</strong></section><SummaryCards /><div className="dashboard-grid"><section className="panel marine-conditions"><div className="panel-title"><h2>Live Marine Conditions</h2><button onClick={() => navigate('/map-explorer')}>View in Map Explorer →</button></div><div className="map-preview"><div><span className="map-place">Visakhapatnam</span><span className="map-pin">●</span><p>Bay of Bengal<br /><small>Live data layers connect here</small></p></div><aside><b>Layer preview</b><small>◼ Wave height</small><small>□ Wind speed</small><small>□ Sea temperature</small><small>□ Currents</small></aside></div></section><SuggestedQueries onSelect={ask} /></div><div className="bottom-grid"><RecentActivity /><section className="panel alerts-preview"><div className="panel-title"><h2>Latest alerts</h2><button onClick={() => navigate('/alerts')}>See all →</button></div><div className="activity-row"><span>▲</span><b>High wave alert<small>Wave height expected to reach 3.5 m</small></b><time>2 hours ago</time></div><div className="activity-row"><span>▲</span><b>Strong wind advisory<small>Winds up to 40 km/h from NE</small></b><time>5 hours ago</time></div><div className="activity-row"><span>▲</span><b>Rough sea conditions<small>Advisory for small vessels</small></b><time>1 day ago</time></div></section></div></>
}
