import { useState } from 'react'
import { COASTAL_LOCATIONS } from '../../data/coastalLocations'
import CoastalLocationPicker from '../common/CoastalLocationPicker'

const PRESET_LOCATIONS = [
  { id: 'visakhapatnam', name: 'Visakhapatnam', latitude: 17.6868, longitude: 83.2185, region: 'Andhra Pradesh' },
  { id: 'chennai', name: 'Chennai / Kasimedu', latitude: 13.1256, longitude: 80.2978, region: 'Tamil Nadu' },
  { id: 'mumbai', name: 'Mumbai / Sassoon Dock', latitude: 18.9167, longitude: 72.8222, region: 'Maharashtra' },
  { id: 'veraval', name: 'Veraval', latitude: 20.9077, longitude: 70.3679, region: 'Gujarat' },
  { id: 'kochi', name: 'Kochi', latitude: 9.9312, longitude: 76.2673, region: 'Kerala' },
  { id: 'malpe', name: 'Malpe', latitude: 13.3524, longitude: 74.7042, region: 'Karnataka' },
  { id: 'paradip', name: 'Paradip', latitude: 20.3165, longitude: 86.6115, region: 'Odisha' },
  { id: 'digha', name: 'Digha', latitude: 21.6266, longitude: 87.5074, region: 'West Bengal' },
  { id: 'port_blair', name: 'Port Blair', latitude: 11.6233, longitude: 92.7265, region: 'Andaman & Nicobar' },
  { id: 'kavaratti', name: 'Kavaratti', latitude: 10.5667, longitude: 72.6417, region: 'Lakshadweep' }
]

export default function LocationContextPanel({
  location,
  onChangeLocation,
  onNavigateMap,
  isOpen,
  onClose,
  onRequestBrowserLocation
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempLabel, setTempLabel] = useState(location?.label || '')
  const [tempLat, setTempLat] = useState(location?.latitude != null ? String(location.latitude) : '')
  const [tempLon, setTempLon] = useState(location?.longitude != null ? String(location.longitude) : '')
  const [inputError, setInputError] = useState('')

  const hasCoords = location?.latitude != null && location?.longitude != null

  const [isFullPickerOpen, setIsFullPickerOpen] = useState(false)

  const handleFullPickerSelect = (id, loc) => {
    setInputError('')
    onChangeLocation({
      latitude: loc.lat,
      longitude: loc.lng,
      label: loc.name
    })
    setIsEditing(false)
    setIsFullPickerOpen(false)
  }

  const handleApplyPreset = (preset) => {
    setInputError('')
    onChangeLocation({
      latitude: preset.latitude,
      longitude: preset.longitude,
      label: preset.name
    })
    setIsEditing(false)
  }

  const handleCustomSubmit = (e) => {
    e.preventDefault()
    setInputError('')

    if (!tempLat.trim() && !tempLon.trim()) {
      onChangeLocation(null)
      setIsEditing(false)
      return
    }

    const lat = Number(tempLat)
    const lon = Number(tempLon)

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setInputError('Latitude must be a valid number between -90 and 90.')
      return
    }

    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
      setInputError('Longitude must be a valid number between -180 and 180.')
      return
    }

    onChangeLocation({
      latitude: lat,
      longitude: lon,
      label: tempLabel.trim() || `${lat.toFixed(4)}, ${lon.toFixed(4)}`
    })
    setIsEditing(false)
  }

  const handleClearLocation = () => {
    setTempLabel('')
    setTempLat('')
    setTempLon('')
    setInputError('')
    onChangeLocation(null)
    setIsEditing(false)
  }

  if (!isOpen) return null

  return (
    <div className="location-context-card panel no-print font-inter">
      <div className="card-header-row">
        <div className="header-meta">
          <p className="eyebrow font-sora">ANALYSIS LOCATION</p>
          <h3 className="location-name font-sora">
            📍 {location?.label || (hasCoords ? `${location.latitude.toFixed(4)}°, ${location.longitude.toFixed(4)}°` : 'No location specified')}
          </h3>
          {hasCoords && (
            <span className="location-coords font-inter">
              {Math.abs(location.latitude).toFixed(4)}° {location.latitude >= 0 ? 'N' : 'S'} · {Math.abs(location.longitude).toFixed(4)}° {location.longitude >= 0 ? 'E' : 'W'}
            </span>
          )}
        </div>

        <div className="header-actions-row">
          {onRequestBrowserLocation && (
            <button
              type="button"
              className="location-use-current-btn font-inter"
              onClick={onRequestBrowserLocation}
              title="Use current location from device"
            >
              📍 Use current location
            </button>
          )}

          <button
            type="button"
            className="location-action-btn font-inter"
            onClick={() => setIsEditing((prev) => !prev)}
          >
            {isEditing ? 'Cancel' : 'Change Location'}
          </button>

          <button
            type="button"
            className="location-action-btn font-inter"
            onClick={() => {
              if (hasCoords) {
                onNavigateMap(`/map-explorer?lat=${location.latitude}&lon=${location.longitude}`)
              } else {
                onNavigateMap('/map-explorer')
              }
            }}
          >
            🗺️ Open Map
          </button>

          <button
            type="button"
            className="close-panel-btn"
            onClick={onClose}
            aria-label="Close location context"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Capability Badges */}
      <div className="capability-pills-row font-mono">
        <span className={`cap-pill ${hasCoords ? 'active' : 'inactive'}`}>
          Ocean {hasCoords ? '✓' : '◌'}
        </span>
        <span className={`cap-pill ${hasCoords ? 'active' : 'inactive'}`}>
          Weather {hasCoords ? '✓' : '◌'}
        </span>
        <span className={`cap-pill ${hasCoords ? 'active' : 'inactive'}`}>
          GIS {hasCoords ? '✓' : '◌'}
        </span>
        <span className="cap-hint">
          {hasCoords
            ? 'Live Open-Meteo & GIS vector checks ready'
            : 'Specify location coordinates for live ocean/weather telemetry'}
        </span>
      </div>

      {/* Editing Presets / Form */}
      {isEditing && (
        <div className="location-picker-drawer">
          <div className="presets-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="picker-title font-mono">PRESET MONITORING AREAS</span>
              <button
                type="button"
                onClick={() => setIsFullPickerOpen(true)}
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  color: '#38bdf8',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                🌊 Browse All 84 Harbors by State
              </button>
            </div>
            <div className="presets-grid">
              {PRESET_LOCATIONS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`preset-btn ${location?.label === preset.name ? 'selected' : ''}`}
                  onClick={() => handleApplyPreset(preset)}
                >
                  <span className="preset-name">{preset.name}</span>
                  <span className="preset-region">{preset.region}</span>
                </button>
              ))}
            </div>
          </div>

          <CoastalLocationPicker
            isOpen={isFullPickerOpen}
            onClose={() => setIsFullPickerOpen(false)}
            selectedId={COASTAL_LOCATIONS.find(l => l.name.toLowerCase() === location?.label?.toLowerCase())?.id || 'visakhapatnam'}
            onSelectLocation={handleFullPickerSelect}
          />

          <form className="custom-coords-form" onSubmit={handleCustomSubmit}>
            <span className="picker-title font-mono">MANUAL COORDINATES</span>
            <div className="form-inputs-grid">
              <input
                type="text"
                value={tempLabel}
                onChange={(e) => setTempLabel(e.target.value)}
                placeholder="Location label (e.g. Visakhapatnam Port)"
                className="location-input"
              />
              <input
                type="text"
                value={tempLat}
                onChange={(e) => setTempLat(e.target.value)}
                placeholder="Latitude (e.g. 17.6868)"
                className="location-input"
                inputMode="decimal"
              />
              <input
                type="text"
                value={tempLon}
                onChange={(e) => setTempLon(e.target.value)}
                placeholder="Longitude (e.g. 83.2185)"
                className="location-input"
                inputMode="decimal"
              />
            </div>

            {inputError && <div className="form-error-msg">{inputError}</div>}

            <div className="form-buttons-row">
              <button type="submit" className="orca-btn primary text-xs glow">
                Apply Location
              </button>
              {hasCoords && (
                <button
                  type="button"
                  className="orca-btn danger text-xs"
                  onClick={handleClearLocation}
                >
                  Clear Coordinates
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
