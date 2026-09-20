import { useState, useMemo } from 'react'
import { COASTAL_STATES, COASTAL_LOCATIONS, filterCoastalLocations } from '../../data/coastalLocations'
import { registerCustomLocation } from '../../services/openMeteoService'
import './CoastalLocationPicker.css'

export default function CoastalLocationPicker({
  selectedId = 'visakhapatnam',
  onSelectLocation,
  isOpen = false,
  onClose,
  isModal = true,
  title = 'Change Monitoring Location'
}) {
  const [activeTab, setActiveTab] = useState('browse') // 'browse' | 'custom'
  const [selectedState, setSelectedState] = useState('All States / UTs')
  const [searchQuery, setSearchQuery] = useState('')

  // Custom coordinates state
  const [customLat, setCustomLat] = useState('')
  const [customLng, setCustomLng] = useState('')
  const [customName, setCustomName] = useState('')
  const [customError, setCustomError] = useState('')
  const [pastedCoords, setPastedCoords] = useState('')

  const filteredLocations = useMemo(() => {
    return filterCoastalLocations({ state: selectedState, query: searchQuery })
  }, [selectedState, searchQuery])

  const activeLocation = useMemo(() => {
    return (
      COASTAL_LOCATIONS.find((loc) => loc.id === selectedId) || {
        id: selectedId,
        name: selectedId.startsWith('custom_') ? 'Custom GPS Point' : 'Selected Location',
        state: 'Active Point',
        coordinatesStr: 'Selected Coordinates',
        type: 'Monitoring Point'
      }
    )
  }, [selectedId])

  const handleSelect = (loc) => {
    if (onSelectLocation) {
      onSelectLocation(loc.id, loc)
    }
    if (onClose) {
      onClose()
    }
  }

  const handleClearFilters = () => {
    setSelectedState('All States / UTs')
    setSearchQuery('')
  }

  const handleQuickPaste = (val) => {
    setPastedCoords(val)
    if (!val) return
    const match = val.match(/([-+]?\d*\.?\d+)[,\s]+([-+]?\d*\.?\d+)/)
    if (match) {
      setCustomLat(match[1])
      setCustomLng(match[2])
      setCustomError('')
    }
  }

  const handleUseBrowserLocation = () => {
    if (!navigator.geolocation) {
      setCustomError('Geolocation is not supported by your browser.')
      return
    }
    setCustomError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCustomLat(pos.coords.latitude.toFixed(4))
        setCustomLng(pos.coords.longitude.toFixed(4))
        if (!customName) {
          setCustomName('My Current GPS Position')
        }
      },
      (err) => {
        setCustomError(`GPS Error: ${err.message || 'Location permission denied'}`)
      }
    )
  }

  const handleApplyCustomCoords = (e) => {
    e?.preventDefault()
    const lat = parseFloat(customLat)
    const lng = parseFloat(customLng)

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setCustomError('Please enter a valid Latitude between -90 and 90.')
      return
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setCustomError('Please enter a valid Longitude between -180 and 180.')
      return
    }

    const customId = `custom_${lat.toFixed(4)}_${lng.toFixed(4)}`
    const coordsStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`
    const finalName = customName.trim() || `Custom Point (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`

    const customLoc = {
      id: customId,
      name: finalName,
      state: 'Custom Coordinates',
      region: 'Custom GPS Point',
      coast: 'Offshore',
      type: 'GPS Coordinate Point',
      lat,
      lng,
      latitude: lat,
      longitude: lng,
      coordinatesStr: coordsStr,
      coordinates: coordsStr,
      mapPosition: { x: 50, y: 50 }
    }

    registerCustomLocation(customLoc)

    if (onSelectLocation) {
      onSelectLocation(customId, customLoc)
    }
    if (onClose) {
      onClose()
    }
  }

  const content = (
    <div className="coastal-location-picker" onClick={(e) => e.stopPropagation()}>
      <div className="clp-header">
        <div className="clp-header-title">
          <span className="clp-wave-icon" aria-hidden="true">🌊</span>
          <div>
            <h3>{title}</h3>
            <p className="clp-subtitle">
              84 verified Indian coastal locations & custom GPS coordinates
            </p>
          </div>
        </div>
        {isModal && onClose && (
          <button
            type="button"
            className="clp-close-btn"
            onClick={onClose}
            aria-label="Close location selector"
          >
            ×
          </button>
        )}
      </div>

      {/* Active Selected Location Banner */}
      <div className="clp-active-banner">
        <span className="clp-pulse-indicator" />
        <div className="clp-active-info">
          <span className="clp-active-label">CURRENTLY ACTIVE MONITORING LOCATION</span>
          <strong>📍 {activeLocation.name}</strong>
          <span className="clp-active-meta">
            {activeLocation.state} · {activeLocation.coordinatesStr} · <span className="clp-type-tag">{activeLocation.type}</span>
          </span>
        </div>
      </div>

      {/* Segmented Mode Tabs */}
      <div className="clp-tabs">
        <button
          type="button"
          className={`clp-tab-btn ${activeTab === 'browse' ? 'active' : ''}`}
          onClick={() => setActiveTab('browse')}
        >
          <span>📍</span> Coastal Locations (84)
        </button>
        <button
          type="button"
          className={`clp-tab-btn ${activeTab === 'custom' ? 'active' : ''}`}
          onClick={() => setActiveTab('custom')}
        >
          <span>🌐</span> Enter Coordinates
        </button>
      </div>

      {activeTab === 'browse' ? (
        <>
          {/* Search & State Filter Bar */}
          <div className="clp-controls">
            <div className="clp-search-wrap">
              <label htmlFor="clp-search-input" className="clp-field-label">Search</label>
              <div className="clp-input-container">
                <span className="clp-search-icon" aria-hidden="true">🔍</span>
                <input
                  id="clp-search-input"
                  type="text"
                  placeholder="Search location or coast..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="clp-search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="clp-input-clear"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            <div className="clp-state-wrap">
              <label htmlFor="clp-state-select" className="clp-field-label">State / Union Territory</label>
              <select
                id="clp-state-select"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="clp-state-select"
              >
                {COASTAL_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st} {st !== 'All States / UTs' ? `(${COASTAL_LOCATIONS.filter(l => l.state === st).length})` : `(${COASTAL_LOCATIONS.length})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location Results List */}
          <div className="clp-results-header">
            <span>
              COASTAL LOCATIONS (<strong>{filteredLocations.length}</strong> {filteredLocations.length === 1 ? 'result' : 'results'})
            </span>
            {(selectedState !== 'All States / UTs' || searchQuery) && (
              <button type="button" className="clp-reset-btn" onClick={handleClearFilters}>
                Reset filters
              </button>
            )}
          </div>

          <div className="clp-list-container" role="listbox" aria-label="Coastal Locations">
            {filteredLocations.length > 0 ? (
              filteredLocations.map((loc) => {
                const isSelected = loc.id === selectedId
                return (
                  <button
                    key={loc.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`clp-list-item ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleSelect(loc)}
                  >
                    <div className="clp-item-left">
                      <span className="clp-item-pin">{isSelected ? '🎯' : '⚓'}</span>
                      <div className="clp-item-details">
                        <span className="clp-item-name">{loc.name}</span>
                        <span className="clp-item-sub">
                          <span className="clp-state-badge">{loc.state}</span>
                          {loc.coast && <span className="clp-coast-text">· {loc.coast}</span>}
                          {loc.type && <span className="clp-item-type">· {loc.type}</span>}
                        </span>
                      </div>
                    </div>
                    <div className="clp-item-right">
                      <span className="clp-item-coords font-mono">{loc.coordinatesStr}</span>
                      {isSelected && <span className="clp-selected-badge">ACTIVE</span>}
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="clp-empty-state">
                <span className="clp-empty-icon">🧭</span>
                <h4>No coastal locations found</h4>
                <p>Try searching for a different keyword or resetting the State filter.</p>
                <button type="button" className="clp-reset-btn-large" onClick={handleClearFilters}>
                  Show All Indian Coastal Locations
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Custom GPS Coordinates Tab */
        <div className="clp-custom-container">
          <form onSubmit={handleApplyCustomCoords} className="clp-custom-form">
            <div className="clp-custom-intro">
              <span className="clp-custom-badge font-mono">DIRECT SPATIAL INPUT</span>
              <h4>Enter Marine or Coastal Coordinates</h4>
              <p>Type any custom GPS coordinates to monitor live Open-Meteo sea conditions, wind, wave heights, and SST.</p>
            </div>

            {customError && (
              <div className="clp-custom-error-banner">
                <span>⚠️</span> {customError}
              </div>
            )}

            <div className="clp-custom-inputs-grid">
              <div className="clp-custom-field">
                <label htmlFor="custom-lat-input" className="clp-field-label">
                  Latitude (°N / °S) <span className="req">*</span>
                </label>
                <input
                  id="custom-lat-input"
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  placeholder="e.g. 17.6868"
                  value={customLat}
                  onChange={(e) => {
                    setCustomLat(e.target.value)
                    setCustomError('')
                  }}
                  className="clp-custom-input font-mono"
                  required
                />
                <span className="clp-field-hint">-90.0 to +90.0 (Positive = North)</span>
              </div>

              <div className="clp-custom-field">
                <label htmlFor="custom-lng-input" className="clp-field-label">
                  Longitude (°E / °W) <span className="req">*</span>
                </label>
                <input
                  id="custom-lng-input"
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  placeholder="e.g. 83.2185"
                  value={customLng}
                  onChange={(e) => {
                    setCustomLng(e.target.value)
                    setCustomError('')
                  }}
                  className="clp-custom-input font-mono"
                  required
                />
                <span className="clp-field-hint">-180.0 to +180.0 (Positive = East)</span>
              </div>
            </div>

            <div className="clp-custom-field">
              <label htmlFor="custom-name-input" className="clp-field-label">
                Location Label / Description <span className="opt">(optional)</span>
              </label>
              <input
                id="custom-name-input"
                type="text"
                placeholder="e.g. Offshore Survey Buoy #4 or Custom Spot"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="clp-custom-input"
              />
            </div>

            <div className="clp-custom-field">
              <label htmlFor="custom-paste-input" className="clp-field-label">
                Quick Paste Helper <span className="opt">(paste "lat, lng")</span>
              </label>
              <input
                id="custom-paste-input"
                type="text"
                placeholder="e.g. 13.0827, 80.2707"
                value={pastedCoords}
                onChange={(e) => handleQuickPaste(e.target.value)}
                className="clp-custom-input font-mono"
              />
            </div>

            <div className="clp-custom-actions">
              <button
                type="button"
                className="clp-gps-btn"
                onClick={handleUseBrowserLocation}
                title="Detect your device GPS coordinates"
              >
                <span>📡</span> Use Current Device GPS
              </button>

              <button
                type="submit"
                className="clp-submit-btn"
                disabled={!customLat || !customLng}
              >
                <span>🚀</span> Set Custom Location
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="clp-footer">
        <span className="clp-footer-info font-mono">
          Live Open-Meteo Marine Telemetry & GIS Spatial Verification Enabled
        </span>
      </div>
    </div>
  )

  if (!isModal) {
    return content
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="clp-modal-overlay" onClick={onClose}>
      {content}
    </div>
  )
}
