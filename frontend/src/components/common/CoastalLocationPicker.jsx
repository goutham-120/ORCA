import { useState, useMemo } from 'react'
import { COASTAL_STATES, COASTAL_LOCATIONS, filterCoastalLocations } from '../../data/coastalLocations'
import './CoastalLocationPicker.css'

export default function CoastalLocationPicker({
  selectedId = 'visakhapatnam',
  onSelectLocation,
  isOpen = false,
  onClose,
  isModal = true,
  title = 'Select Coastal Location'
}) {
  const [selectedState, setSelectedState] = useState('All States / UTs')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredLocations = useMemo(() => {
    return filterCoastalLocations({ state: selectedState, query: searchQuery })
  }, [selectedState, searchQuery])

  const activeLocation = useMemo(() => {
    return COASTAL_LOCATIONS.find((loc) => loc.id === selectedId) || COASTAL_LOCATIONS[0]
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

  const content = (
    <div className="coastal-location-picker" onClick={(e) => e.stopPropagation()}>
      <div className="clp-header">
        <div className="clp-header-title">
          <span className="clp-wave-icon" aria-hidden="true">🌊</span>
          <div>
            <h3>{title}</h3>
            <p className="clp-subtitle">
              84 verified Indian fishing harbors & fish landing centers
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
          <span className="clp-active-label">CURRENTLY ACTIVE MONITORING HARBOR</span>
          <strong>📍 {activeLocation.name}</strong>
          <span className="clp-active-meta">
            {activeLocation.state} · {activeLocation.coordinatesStr} · <span className="clp-type-tag">{activeLocation.type}</span>
          </span>
        </div>
      </div>

      {/* Search & State Filter Bar */}
      <div className="clp-controls">
        <div className="clp-search-wrap">
          <label htmlFor="clp-search-input" className="clp-field-label">Search</label>
          <div className="clp-input-container">
            <span className="clp-search-icon" aria-hidden="true">🔍</span>
            <input
              id="clp-search-input"
              type="text"
              placeholder="Search location, harbor, or coast..."
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
          FISHING & COASTAL LOCATIONS (<strong>{filteredLocations.length}</strong> {filteredLocations.length === 1 ? 'result' : 'results'})
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
            <h4>No coastal harbors found</h4>
            <p>Try searching for a different keyword or resetting the State filter.</p>
            <button type="button" className="clp-reset-btn-large" onClick={handleClearFilters}>
              Show All Indian Coastal Harbors
            </button>
          </div>
        )}
      </div>

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
