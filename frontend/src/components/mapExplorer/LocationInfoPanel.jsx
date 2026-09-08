export default function LocationInfoPanel({ location, navigate }) {
  if (!location) return null

  const handleAskOrca = () => {
    const q = `What are the current marine conditions and safety risks in ${location.name}?`
    navigate(`/ask-orca?query=${encodeURIComponent(q)}`)
  }

  const { name, region, coordinates, wave, wind, temperature, visibility, currents, safety, alertsList } = location

  return (
    <div className="location-info-panel panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">SELECTED LOCATION</p>
          <h2>📍 {name}</h2>
          <small className="location-coords">{coordinates} • {region}</small>
        </div>
        <span className={`safety-badge-pill ${safety.label.toLowerCase()}`}>
          {safety.label} ({safety.score}/100)
        </span>
      </div>

      <div className="metrics-summary-grid">
        <div className="info-metric-card">
          <span className="metric-icon">🌊</span>
          <div>
            <small>Wave Height</small>
            <strong>{wave.value} {wave.unit}</strong>
            <em>{wave.status}</em>
          </div>
        </div>

        <div className="info-metric-card">
          <span className="metric-icon">💨</span>
          <div>
            <small>Wind Speed</small>
            <strong>{wind.value} {wind.unit}</strong>
            <em>{wind.status}</em>
          </div>
        </div>

        <div className="info-metric-card">
          <span className="metric-icon">🌡️</span>
          <div>
            <small>Water Temp</small>
            <strong>{temperature.value}°{temperature.unit}</strong>
            <em>{temperature.status}</em>
          </div>
        </div>

        <div className="info-metric-card">
          <span className="metric-icon">👁️</span>
          <div>
            <small>Visibility</small>
            <strong>{visibility}</strong>
            <em>Clear range</em>
          </div>
        </div>
      </div>

      {currents && (
        <div className="currents-readout-row">
          <span className="readout-label">🌀 Coastal Drift:</span>
          <strong>{currents.speed} ({currents.direction})</strong>
          <small>{currents.status}</small>
        </div>
      )}

      {alertsList && alertsList.length > 0 && (
        <div className="panel-alerts-section">
          <p className="eyebrow">ACTIVE ADVISORIES ({alertsList.length})</p>
          <div className="panel-alerts-list">
            {alertsList.map((alert) => (
              <div key={alert.id} className={`panel-alert-item ${alert.severity}`}>
                <strong>{alert.title}</strong>
                <p>{alert.detail}</p>
                <small>{alert.time}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel-actions">
        <button
          type="button"
          className="ask-orca-link-btn"
          onClick={handleAskOrca}
        >
          <span>Ask ORCA about {name}</span>
          <i aria-hidden="true">→</i>
        </button>
      </div>
    </div>
  )
}
