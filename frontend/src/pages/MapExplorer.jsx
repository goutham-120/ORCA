import { useState, useMemo, useEffect } from 'react'
import MapSearch from '../components/mapExplorer/MapSearch'
import MapLayersControl from '../components/mapExplorer/MapLayersControl'
import MapLegend from '../components/mapExplorer/MapLegend'
import LocationInfoPanel from '../components/mapExplorer/LocationInfoPanel'
import MapCanvas from '../components/mapExplorer/MapCanvas'
import { dashboardLocations } from '../data/dashboardData'

const PREFERENCES_KEY = 'orca-dashboard-preferences'
const defaultLayers = {
  waves: true,
  wind: true,
  temperature: false,
  currents: false,
  traffic: true,
  fishing: false,
  hazards: true
}

function loadSavedLocationId() {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (dashboardLocations.some((loc) => loc.id === parsed.locationId)) {
        return parsed.locationId
      }
    }
  } catch {
    // Ignore parse error
  }
  return 'visakhapatnam'
}

export default function MapExplorer({ navigate }) {
  const [locationId, setLocationId] = useState(() => loadSavedLocationId())
  const [layers, setLayers] = useState(defaultLayers)
  const [zoom, setZoom] = useState(1)
  const [isExpanded, setIsExpanded] = useState(false)

  const selectedLocation = useMemo(
    () => dashboardLocations.find((item) => item.id === locationId) || dashboardLocations[0],
    [locationId]
  )

  // Persist location selection changes to LocalStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFERENCES_KEY)
      const existing = raw ? JSON.parse(raw) : {}
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ ...existing, locationId }))
    } catch {
      // Ignore storage error
    }
  }, [locationId])

  const handleSelectLocation = (id) => {
    setLocationId(id)
    setZoom(1)
  }

  const handleToggleLayer = (layerId) => {
    setLayers((prev) => ({ ...prev, [layerId]: !prev[layerId] }))
  }

  const handleZoomChange = (amount) => {
    setZoom((prev) => Math.min(1.6, Math.max(0.75, prev + amount)))
  }

  const handleRecenter = () => {
    setZoom(1)
  }

  return (
    <div className={`map-explorer-page ${isExpanded ? 'page-is-expanded' : ''}`}>
      {/* Top Header & Bar Controls */}
      <section className="map-explorer-header">
        <div>
          <p className="eyebrow">SPATIAL INTELLIGENCE</p>
          <h1>Map Explorer</h1>
          <p className="subhead">Interactive spatial exploration of sea state, weather vectors, vessel activity, and advisories.</p>
        </div>

        <div className="map-header-controls">
          <MapSearch
            locations={dashboardLocations}
            onSelectLocation={handleSelectLocation}
          />

          <label className="location-dropdown-wrap" aria-label="Select location">
            <span>MONITORING AREA</span>
            <select
              value={locationId}
              onChange={(e) => handleSelectLocation(e.target.value)}
            >
              {dashboardLocations.map((item) => (
                <option key={item.id} value={item.id}>
                  📍 {item.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="expand-toggle-btn"
            onClick={() => setIsExpanded((prev) => !prev)}
            title={isExpanded ? 'Restore window layout' : 'Expand map layout'}
          >
            {isExpanded ? '⛶ Restore' : '⛶ Fullscreen'}
          </button>
        </div>
      </section>

      {/* Main Grid Workspace */}
      <div className="map-explorer-grid">
        <div className="map-primary-col">
          <MapCanvas
            selectedLocation={selectedLocation}
            allLocations={dashboardLocations}
            onSelectLocation={handleSelectLocation}
            layers={layers}
            zoom={zoom}
            onZoomChange={handleZoomChange}
            onRecenter={handleRecenter}
            isExpanded={isExpanded}
            onToggleExpanded={() => setIsExpanded((prev) => !prev)}
          />

          <MapLegend layers={layers} />
        </div>

        <div className="map-sidebar-col">
          <LocationInfoPanel
            location={selectedLocation}
            navigate={navigate}
          />

          <MapLayersControl
            layers={layers}
            onToggleLayer={handleToggleLayer}
          />
        </div>
      </div>
    </div>
  )
}
