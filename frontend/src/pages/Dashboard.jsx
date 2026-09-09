import { useEffect, useMemo, useState } from 'react'
import { OceanPulse } from '../components/dashboard/OceanPulse'
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
const defaults = {
  locationId: 'visakhapatnam',
  trend: 'waves',
  layers: { waves: true, wind: true, temperature: false, currents: false },
  alertFilter: 'all',
}

function loadPreferences() {
  try {
    const value = JSON.parse(localStorage.getItem(PREFERENCES_KEY))
    const knownLocation = dashboardLocations.some((location) => location.id === value?.locationId)
    const knownTrend = ['waves', 'wind', 'temperature'].includes(value?.trend)
    const knownFilter = ['all', 'high', 'moderate', 'advisory'].includes(value?.alertFilter)
    return {
      locationId: knownLocation ? value.locationId : defaults.locationId,
      trend: knownTrend ? value.trend : defaults.trend,
      layers: { ...defaults.layers, ...(value?.layers && typeof value.layers === 'object' ? value.layers : {}) },
      alertFilter: knownFilter ? value.alertFilter : defaults.alertFilter,
    }
  } catch {
    return defaults
  }
}

export default function Dashboard({ navigate }) {
  const { user } = useAuth()
  const saved = useMemo(() => loadPreferences(), [])
  const name = user?.display_name || user?.email?.split('@')[0] || 'Operator'
  const [locationId, setLocationId] = useState(saved.locationId)
  const [layers, setLayers] = useState(saved.layers)
  const [trend, setTrend] = useState(saved.trend)
  const [alertFilter, setAlertFilter] = useState(saved.alertFilter)
  const [expandedAlert, setExpandedAlert] = useState(null)
  const [zoom, setZoom] = useState(1)

  const location = useMemo(
    () => dashboardLocations.find((item) => item.id === locationId) || dashboardLocations[0],
    [locationId]
  )

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ locationId, layers, trend, alertFilter }))
  }, [locationId, layers, trend, alertFilter])

  const selectLocation = (id) => {
    setLocationId(id)
    setExpandedAlert(null)
    setZoom(1)
  }

  const ask = (query) => navigate(`/ask-orca${query ? `?query=${encodeURIComponent(query)}` : ''}`)
  const selectActivity = (activity) =>
    activity.category === 'Route' ? navigate('/map-explorer') : ask(activity.title)

  return (
    <div className="orca-dashboard-page font-sans">
      {/* 1. HEADER / LOCATION SELECTOR */}
      <section className="dashboard-intro">
        <div>
          <p className="eyebrow font-mono">ORCA COMMAND CENTER</p>
          <h1 className="font-sans">
            {greeting}, {name}
          </h1>
          <p className="font-sans">Integrated marine telemetry & spatial decision support overview.</p>
        </div>
        <label className="location-select font-sans">
          <span className="font-mono">MONITORING LOCATION</span>
          <select
            value={locationId}
            onChange={(event) => selectLocation(event.target.value)}
            aria-label="Select monitoring location"
          >
            {dashboardLocations.map((item) => (
              <option value={item.id} key={item.id}>
                📍 {item.name}
              </option>
            ))}
          </select>
          <small className="font-mono">{location.coordinates}</small>
        </label>
      </section>

      {/* 2. CURRENT MARINE CONDITIONS (3 Tiles: Waves, Wind, Temp) */}
      <OceanPulse location={location} />

      {/* 3. COMMAND GRID: MAP PREVIEW + MARINE SAFETY */}
      <section className="command-grid">
        <MarineMapPreview
          location={location}
          layers={layers}
          onToggleLayer={(id) => setLayers((current) => ({ ...current, [id]: !current[id] }))}
          zoom={zoom}
          onZoom={(amount) => setZoom((value) => Math.min(1.45, Math.max(0.8, value + amount)))}
          onReset={() => setZoom(1)}
        />
        <SafetyStatus safety={location.safety} />
      </section>

      {/* 4. INTELLIGENCE GRID: ORCA INTELLIGENCE + CONDITIONS TREND */}
      <section className="intelligence-grid">
        <IntelligenceBrief location={location} onAsk={(query) => ask(query)} />
        <ConditionsChart trends={location.trends} activeTab={trend} onTabChange={setTrend} />
      </section>

      {/* 5. ACTIVE ALERTS SECTION */}
      <AlertSummary
        alerts={location.alertsList}
        locationName={location.name}
        filter={alertFilter}
        onFilterChange={(filter) => {
          setAlertFilter(filter)
          setExpandedAlert(null)
        }}
        expandedId={expandedAlert}
        onToggleAlert={(id) => setExpandedAlert((current) => (current === id ? null : id))}
        onViewAlerts={() => navigate('/alerts')}
      />

      {/* 6. LOWER GRID: RECENT ACTIVITY + SUGGESTED QUERIES */}
      <section className="dashboard-lower">
        <RecentActivity onSelect={selectActivity} />
        <SuggestedQueries onSelect={ask} />
      </section>
    </div>
  )
}
