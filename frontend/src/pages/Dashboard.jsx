import { useEffect, useMemo, useState } from 'react'
import { OceanPulse } from '../components/dashboard/OceanPulse'
import SummaryCards from '../components/dashboard/SummaryCards'
import SuggestedQueries from '../components/dashboard/SuggestedQueries'
import RecentActivity from '../components/dashboard/RecentActivity'
import MarineMapPreview from '../components/dashboard/MarineMapPreview'
import SafetyStatus from '../components/dashboard/SafetyStatus'
import IntelligenceBrief from '../components/dashboard/IntelligenceBrief'
import ConditionsChart from '../components/dashboard/ConditionsChart'
import AlertSummary from '../components/dashboard/AlertSummary'
import { dashboardLocations } from '../data/dashboardData'
import { useAuth } from '../hooks/useAuth'

const PREFERENCES_KEY = 'orca-dashboard-preferences'
const defaults = { locationId: 'visakhapatnam', trend: 'waves', layers: { waves: true, wind: true, temperature: false, currents: false }, alertFilter: 'all' }
function loadPreferences() { try { const value = JSON.parse(localStorage.getItem(PREFERENCES_KEY)); const knownLocation = dashboardLocations.some((location) => location.id === value?.locationId); const knownTrend = ['waves', 'wind', 'temperature'].includes(value?.trend); const knownFilter = ['all', 'high', 'moderate', 'advisory'].includes(value?.alertFilter); return { locationId: knownLocation ? value.locationId : defaults.locationId, trend: knownTrend ? value.trend : defaults.trend, layers: { ...defaults.layers, ...(value?.layers && typeof value.layers === 'object' ? value.layers : {}) }, alertFilter: knownFilter ? value.alertFilter : defaults.alertFilter } } catch { return defaults } }

export default function Dashboard({ navigate }) {
  const { user } = useAuth()
  const saved = useMemo(() => loadPreferences(), [])
  const name = user?.display_name || user?.email?.split('@')[0] || 'Explorer'
  const [locationId, setLocationId] = useState(saved.locationId)
  const [layers, setLayers] = useState(saved.layers)
  const [trend, setTrend] = useState(saved.trend)
  const [alertFilter, setAlertFilter] = useState(saved.alertFilter)
  const [expandedAlert, setExpandedAlert] = useState(null)
  const [zoom, setZoom] = useState(1)
  const location = useMemo(() => dashboardLocations.find((item) => item.id === locationId) || dashboardLocations[0], [locationId])
  const visibleAlerts = useMemo(() => alertFilter === 'all' ? location.alertsList : location.alertsList.filter((alert) => alert.severity === alertFilter), [alertFilter, location])
  const alertSummary = useMemo(() => ({ total: visibleAlerts.length, high: visibleAlerts.filter((alert) => alert.severity === 'high').length, moderate: visibleAlerts.filter((alert) => alert.severity === 'moderate').length, filtered: alertFilter !== 'all' }), [alertFilter, visibleAlerts])
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  useEffect(() => { localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ locationId, layers, trend, alertFilter })) }, [locationId, layers, trend, alertFilter])
  const selectLocation = (id) => { setLocationId(id); setExpandedAlert(null); setZoom(1) }
  const ask = (query) => navigate(`/ask-orca${query ? `?query=${encodeURIComponent(query)}` : ''}`)
  const selectActivity = (activity) => activity.category === 'Route' ? navigate('/map-explorer') : ask(activity.title)
  return <>
    <section className="dashboard-intro"><div><p className="eyebrow">ORCA COMMAND CENTER</p><h1>{greeting}, {name}</h1><p>Here's your marine intelligence overview.</p></div><label className="location-select"><span>MONITORING LOCATION</span><select value={locationId} onChange={(event) => selectLocation(event.target.value)} aria-label="Select mock monitoring location">{dashboardLocations.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><small>{location.coordinates}</small></label></section>
    <OceanPulse location={location} onNavigateAsk={ask} />
    <SummaryCards location={location} alertSummary={alertSummary} onViewAlerts={() => navigate('/alerts')} />
    <section className="command-grid"><MarineMapPreview location={location} layers={layers} onToggleLayer={(id) => setLayers((current) => ({ ...current, [id]: !current[id] }))} zoom={zoom} onZoom={(amount) => setZoom((value) => Math.min(1.45, Math.max(.8, value + amount)))} onReset={() => setZoom(1)} /><SafetyStatus safety={location.safety} /></section>
    <section className="intelligence-grid"><IntelligenceBrief location={location} onAsk={() => ask('')} /><ConditionsChart trends={location.trends} activeTab={trend} onTabChange={setTrend} /></section>
    <section className="dashboard-lower"><RecentActivity onSelect={selectActivity} /><SuggestedQueries onSelect={ask} /><AlertSummary alerts={location.alertsList} locationName={location.name} filter={alertFilter} onFilterChange={(filter) => { setAlertFilter(filter); setExpandedAlert(null) }} expandedId={expandedAlert} onToggleAlert={(id) => setExpandedAlert((current) => current === id ? null : id)} onViewAlerts={() => navigate('/alerts')} /></section>
  </>
}
