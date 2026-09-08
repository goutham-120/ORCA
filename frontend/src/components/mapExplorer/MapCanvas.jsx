import { useState } from 'react'

export default function MapCanvas({
  selectedLocation,
  allLocations,
  onSelectLocation,
  layers,
  zoom,
  onZoomChange,
  onRecenter,
  isExpanded,
  onToggleExpanded
}) {
  const [activePopup, setActivePopup] = useState(null)

  const handleMarkerClick = (type, data) => {
    setActivePopup((prev) => (prev?.type === type && prev?.id === data.id ? null : { type, id: data.id, data }))
  }

  const { mapPosition, name, coordinates, wave, wind, temperature, safety, alertsList, traffic, fishing } = selectedLocation

  return (
    <div className={`map-canvas-container ${isExpanded ? 'is-expanded-canvas' : ''}`}>
      {/* Map Control Bar Overlay */}
      <div className="canvas-toolbar">
        <span className="demo-indicator">● Demo marine intelligence canvas</span>
        <div className="canvas-actions">
          <button
            type="button"
            className="canvas-btn"
            onClick={() => onZoomChange(0.15)}
            title="Zoom In"
            aria-label="Zoom In"
          >
            +
          </button>
          <button
            type="button"
            className="canvas-btn"
            onClick={() => onZoomChange(-0.15)}
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            −
          </button>
          <button
            type="button"
            className="canvas-btn"
            onClick={onRecenter}
            title="Recenter Map"
            aria-label="Recenter Map"
          >
            ⌖
          </button>
          <button
            type="button"
            className={`canvas-btn ${isExpanded ? 'is-active-btn' : ''}`}
            onClick={onToggleExpanded}
            title={isExpanded ? 'Exit Fullscreen' : 'Fullscreen Expanded View'}
            aria-label="Fullscreen View"
          >
            {isExpanded ? '⛶ Exit' : '⛶ Fullscreen'}
          </button>
        </div>
      </div>

      {/* Main Map Ocean Viewport */}
      <div className="map-viewport">
        <div
          className="map-transform-world"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* Base Marine Canvas SVG Background */}
          <svg className="ocean-svg-bg" viewBox="0 0 800 500" preserveAspectRatio="none">
            <defs>
              <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#082342" />
                <stop offset="55%" stopColor="#075d92" />
                <stop offset="100%" stopColor="#128ba0" />
              </linearGradient>

              <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#6ee6e026" strokeWidth="1" />
              </pattern>
            </defs>

            {/* Ocean Surface & Grid */}
            <rect width="800" height="500" fill="url(#oceanGrad)" />
            <rect width="800" height="500" fill="url(#gridPattern)" />

            {/* Stylized Coastline Paths */}
            <path
              d="M -10,0 Q 180,120 220,250 T 150,510 L -10,510 Z"
              fill="#06182c"
              opacity="0.85"
              stroke="#2e547a"
              strokeWidth="2"
            />
            <path
              d="M 620,-10 Q 700,200 660,380 T 810,510 L 810,-10 Z"
              fill="#06182c"
              opacity="0.75"
              stroke="#2e547a"
              strokeWidth="2"
            />
          </svg>

          {/* Dynamic Layer Overlays */}
          {layers.waves && (
            <div className="map-layer wave-overlay">
              <div className="wave-contour wave-c1" />
              <div className="wave-contour wave-c2" />
              <span className="layer-tag wave-tag">Wave Height: {wave.value}m ({wave.status})</span>
            </div>
          )}

          {layers.wind && (
            <div className="map-layer wind-overlay">
              <div className="wind-arrow arrow-1">↗ {wind.value} km/h</div>
              <div className="wind-arrow arrow-2">➔ {wind.value} km/h</div>
              <div className="wind-arrow arrow-3">↗ {wind.status}</div>
            </div>
          )}

          {layers.temperature && (
            <div className="map-layer temperature-overlay">
              <div className="temp-heat-spot spot-1" />
              <div className="temp-heat-spot spot-2" />
              <span className="layer-tag temp-tag">Surface Temp: {temperature.value}°C</span>
            </div>
          )}

          {layers.currents && (
            <div className="map-layer currents-overlay">
              <div className="flow-vector vector-1">~~~~➔</div>
              <div className="flow-vector vector-2">~~~~➔</div>
            </div>
          )}

          {/* All Location Pin Markers */}
          {allLocations.map((loc) => {
            const isSelected = loc.id === selectedLocation.id
            return (
              <div
                key={loc.id}
                className={`map-pin-marker ${isSelected ? 'is-selected-pin' : ''}`}
                style={{ left: `${loc.mapPosition.x}%`, top: `${loc.mapPosition.y}%` }}
                onClick={() => {
                  onSelectLocation(loc.id)
                  handleMarkerClick('location', loc)
                }}
              >
                <span className="pin-pulse" />
                <span className="pin-dot" />
                <strong className="pin-label">{loc.name}</strong>
              </div>
            )
          })}

          {/* Marine Traffic Markers */}
          {layers.traffic && traffic && traffic.map((ship) => (
            <div
              key={ship.id}
              className="map-ship-marker"
              style={{ left: `${ship.mapPosition.x}%`, top: `${ship.mapPosition.y}%` }}
              onClick={() => handleMarkerClick('traffic', ship)}
              title={ship.name}
            >
              <span className="ship-icon">⚓</span>
              <small className="ship-label">{ship.name}</small>
            </div>
          ))}

          {/* Fishing Zone Markers */}
          {layers.fishing && fishing && fishing.map((fish) => (
            <div
              key={fish.id}
              className="map-fishing-marker"
              style={{ left: `${fish.mapPosition.x}%`, top: `${fish.mapPosition.y}%` }}
              onClick={() => handleMarkerClick('fishing', fish)}
              title={fish.zone}
            >
              <span className="fishing-icon">🎣</span>
              <small className="fishing-label">{fish.zone}</small>
            </div>
          ))}

          {/* Hazard Markers */}
          {layers.hazards && alertsList && alertsList.map((hazard) => {
            const pos = hazard.mapPosition || { x: mapPosition.x + 5, y: mapPosition.y - 6 }
            return (
              <div
                key={hazard.id}
                className={`map-hazard-marker severity-${hazard.severity}`}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                onClick={() => handleMarkerClick('hazard', hazard)}
                title={hazard.title}
              >
                <span className="hazard-symbol">
                  {hazard.severity === 'high' ? '🔴' : hazard.severity === 'moderate' ? '🟠' : '🟡'}
                </span>
              </div>
            )
          })}
        </div>

        {/* Interactive Popups Container */}
        {activePopup && (
          <div className="canvas-popup-card">
            <button
              type="button"
              className="popup-close-btn"
              onClick={() => setActivePopup(null)}
              aria-label="Close popup"
            >
              ×
            </button>

            {activePopup.type === 'location' && (
              <div className="popup-content">
                <span className="popup-category">LOCATION DETAILS</span>
                <h3>{name}</h3>
                <small>{coordinates}</small>
                <div className="popup-stats">
                  <div><span>Wave:</span> <strong>{wave.value} {wave.unit}</strong></div>
                  <div><span>Wind:</span> <strong>{wind.value} {wind.unit}</strong></div>
                  <div><span>Temp:</span> <strong>{temperature.value}°C</strong></div>
                  <div><span>Safety:</span> <strong>{safety.score}/100 ({safety.label})</strong></div>
                </div>
              </div>
            )}

            {activePopup.type === 'traffic' && (
              <div className="popup-content">
                <span className="popup-category">VESSEL DETECTION</span>
                <h3>⚓ {activePopup.data.name}</h3>
                <p>Type: <b>{activePopup.data.type}</b></p>
                <small>Status: {activePopup.data.status}</small>
              </div>
            )}

            {activePopup.type === 'fishing' && (
              <div className="popup-content">
                <span className="popup-category">FISHING ACTIVITY ZONE</span>
                <h3>🎣 {activePopup.data.zone}</h3>
                <p>Activity: <b>{activePopup.data.activity}</b></p>
                <small>Depth: {activePopup.data.depth} • {activePopup.data.activeVessels} vessels active</small>
              </div>
            )}

            {activePopup.type === 'hazard' && (
              <div className="popup-content">
                <span className={`popup-category hazard-badge ${activePopup.data.severity}`}>
                  {activePopup.data.severity.toUpperCase()} HAZARD ADVISORY
                </span>
                <h3>{activePopup.data.title}</h3>
                <p>{activePopup.data.detail}</p>
                <small>Guidance: {activePopup.data.guidance}</small>
              </div>
            )}
          </div>
        )}

        {/* Compass Rose Overlay */}
        <div className="map-compass north">N</div>
        <div className="map-scale-line">{Math.round(5 / zoom)} km</div>
      </div>
    </div>
  )
}
