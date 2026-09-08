export default function MapLegend({ layers }) {
  const activeCount = Object.values(layers).filter(Boolean).length

  if (activeCount === 0) {
    return (
      <div className="map-legend-box panel">
        <p className="eyebrow">MAP LEGEND</p>
        <span className="no-layers-text">No layers active</span>
      </div>
    )
  }

  return (
    <div className="map-legend-box panel">
      <p className="eyebrow">MAP LEGEND</p>

      <div className="legend-items-list">
        {layers.waves && (
          <div className="legend-item">
            <span className="legend-label">Wave Height</span>
            <div className="gradient-bar wave-gradient" />
            <div className="legend-range">
              <span>0m</span>
              <span>1.5m</span>
              <span>3m+</span>
            </div>
          </div>
        )}

        {layers.wind && (
          <div className="legend-item">
            <span className="legend-label">Wind Vectors</span>
            <div className="vector-sample">
              <span>↗ 12 km/h</span>
              <span>➔ 25 km/h</span>
            </div>
          </div>
        )}

        {layers.temperature && (
          <div className="legend-item">
            <span className="legend-label">Water Temp</span>
            <div className="gradient-bar temp-gradient" />
            <div className="legend-range">
              <span>26°C</span>
              <span>28°C</span>
              <span>30°C+</span>
            </div>
          </div>
        )}

        {layers.currents && (
          <div className="legend-item">
            <span className="legend-label">Currents Flow</span>
            <div className="current-sample">
              <span className="flow-line">~~~~→</span>
            </div>
          </div>
        )}

        {layers.traffic && (
          <div className="legend-item">
            <span className="legend-label">Marine Traffic</span>
            <div className="symbol-key">
              <span>⚓ Vessel</span>
            </div>
          </div>
        )}

        {layers.fishing && (
          <div className="legend-item">
            <span className="legend-label">Fishing Activity</span>
            <div className="symbol-key">
              <span>🎣 Fishing Zone</span>
            </div>
          </div>
        )}

        {layers.hazards && (
          <div className="legend-item">
            <span className="legend-label">Hazards</span>
            <div className="hazard-keys">
              <span className="key-high">🔴 High</span>
              <span className="key-moderate">🟠 Mod</span>
              <span className="key-advisory">🟡 Adv</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
