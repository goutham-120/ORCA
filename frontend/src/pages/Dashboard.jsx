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
import { COASTAL_STATES, COASTAL_LOCATIONS } from '../data/coastalLocations'
import CoastalLocationPicker from '../components/common/CoastalLocationPicker'
import '../components/dashboard/LocationSelector.css'
import { fetchLiveLocationData } from '../services/openMeteoService'
import { useAuth } from '../hooks/useAuth'
import { cacheActiveAlerts, markAlertAsRead } from '../services/alertService'
import orcaLogo from '../assets/orcalogo.png'

const PREFERENCES_KEY = 'orca-dashboard-preferences'
const defaults = {
  locationId: 'visakhapatnam',
  trend: 'waves',
  layers: { temperature: true, sst: false, waves: false, pfz: false, currents: false },
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

  // Live telemetry state
  const [liveLocationData, setLiveLocationData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let isMounted = true

    const runLiveFetch = async () => {
      setIsLoading(true)
      setIsError(false)
      try {
        const data = await fetchLiveLocationData(locationId)
        if (isMounted) {
          setLiveLocationData(data)
          if (data?.alertsList) {
            cacheActiveAlerts(data.alertsList)
          }
          setIsLoading(false)
        }
      } catch {
        if (isMounted) {
          setIsError(true)
          setIsLoading(false)
        }
      }
    }

    runLiveFetch()

    // 5-minute periodic refresh timer
    const interval = setInterval(runLiveFetch, 300000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [locationId, retryCount])

  const fallbackLocation = useMemo(
    () => dashboardLocations.find((item) => item.id === locationId) || dashboardLocations[0],
    [locationId]
  )

  const activeLocation = liveLocationData || fallbackLocation

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ locationId, layers, trend, alertFilter }))
  }, [locationId, layers, trend, alertFilter])

  const [isPickerOpen, setIsPickerOpen] = useState(false)

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <img src={orcaLogo} alt="ORCA Logo" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
            <p className="eyebrow font-mono" style={{ margin: 0 }}>ORCA COMMAND CENTER</p>
          </div>
          <h1 className="font-sans">
            {greeting}, {name}
          </h1>
          <p className="font-sans">Integrated marine telemetry & spatial decision support across 84 coastal landing centers.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="dashboard-location-trigger-card font-sans"
            onClick={() => setIsPickerOpen(true)}
            title="Click to change monitoring location or enter custom GPS coordinates"
            aria-label="Change monitoring location"
          >
            <div className="location-trigger-content">
              <div className="location-trigger-header">
                <span className="location-label font-mono">MONITORING LOCATION</span>
                <span className="change-location-badge">Change Location 📍</span>
              </div>
              <div className="location-selected-value">
                <span className="location-name">{activeLocation.name || 'Visakhapatnam'}</span>
              </div>
              <small className="location-coords font-mono">
                {activeLocation.coordinates || activeLocation.coordinatesStr || '17.6868° N · 83.2185° E'}
              </small>
            </div>
            <div className="location-chevron-wrap" aria-hidden="true">
              <svg
                className="location-chevron-svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </button>
        </div>
      </section>

      {/* Coastal Location Modal Picker */}
      <CoastalLocationPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        selectedId={locationId}
        title="Change Monitoring Location"
        onSelectLocation={(newId) => {
          selectLocation(newId)
        }}
      />

      {/* Loading Indicator */}
      {isLoading && (
        <div style={{ padding: '0.75rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#0B2E49', color: '#22B9F2', borderRadius: '8px', border: '1px solid rgba(34, 185, 242, 0.3)' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#22B9F2', animation: 'pulse 1.5s infinite' }}></span>
          <span style={{ fontWeight: 600, fontSize: 'var(--text-md, 14px)' }}>Loading live marine telemetry...</span>
        </div>
      )}

      {/* Error & Retry Banner */}
      {isError && (
        <div style={{ padding: '0.75rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#3D1518', color: '#FF7B7B', borderRadius: '8px', border: '1px solid rgba(255, 123, 123, 0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span>⚠️</span>
            <span style={{ fontWeight: 600, fontSize: 'var(--text-md, 14px)' }}>Live telemetry unavailable</span>
          </div>
          <button
            type="button"
            className="orca-btn"
            style={{ padding: '0.35rem 0.85rem', fontSize: 'var(--text-sm, 13px)', fontWeight: 600, lineHeight: 1.2 }}
            onClick={() => setRetryCount((c) => c + 1)}
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* 2. CURRENT MARINE CONDITIONS (6 Tiles Grid) */}
      <OceanPulse location={activeLocation} />

      {/* 3. COMMAND GRID: MAP PREVIEW + MARINE SAFETY */}
      <section className="command-grid">
        <MarineMapPreview
          location={activeLocation}
          layers={layers}
          onToggleLayer={(id) => setLayers((current) => ({ ...current, [id]: !current[id] }))}
          zoom={zoom}
          onZoom={(amount) => setZoom((value) => Math.min(1.45, Math.max(0.8, value + amount)))}
          onReset={() => setZoom(1)}
        />
        <SafetyStatus safety={activeLocation.safety} />
      </section>

      {/* 4. INTELLIGENCE GRID: ORCA INTELLIGENCE + CONDITIONS TREND */}
      <section className="intelligence-grid">
        <IntelligenceBrief location={activeLocation} onAsk={(query) => ask(query)} />
        <ConditionsChart trends={activeLocation.trends} activeTab={trend} onTabChange={setTrend} />
      </section>

      {/* 5. ACTIVE ALERTS SECTION */}
      <AlertSummary
        alerts={activeLocation.alertsList}
        locationName={activeLocation.name}
        filter={alertFilter}
        onFilterChange={(filter) => {
          setAlertFilter(filter)
          setExpandedAlert(null)
        }}
        expandedId={expandedAlert}
        onToggleAlert={(id) => {
          setExpandedAlert((current) => (current === id ? null : id))
          markAlertAsRead(id)
        }}
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
