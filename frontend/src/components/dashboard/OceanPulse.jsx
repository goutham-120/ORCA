export function OceanPulse({ location }) {
  if (!location) return null

  const { wave, wind, temperature, name, coordinates } = location

  return (
    <section className="ocean-pulse-card font-sans">
      {/* Animated SVG Wave Background Layer */}
      <div className="ocean-wave-backdrop" aria-hidden="true">
        <svg className="wave-svg wave-svg-1" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,0 C150,90 350,-40 500,40 C650,120 900,10 1200,60 L1200,120 L0,120 Z" fill="rgba(56, 189, 248, 0.08)"></path>
        </svg>
        <svg className="wave-svg wave-svg-2" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,30 C200,100 450,0 700,70 C950,140 1100,20 1200,40 L1200,120 L0,120 Z" fill="rgba(20, 184, 166, 0.06)"></path>
        </svg>
        <div className="ocean-gradient-glow"></div>
      </div>

      {/* Header Bar */}
      <div className="ocean-pulse-header">
        <div className="header-title-group">
          <span className="ocean-pulse-eyebrow">CURRENT MARINE CONDITIONS</span>
          <div className="location-name-row">
            <h2 className="pulse-title">Ocean Pulse — {name}</h2>
            <span className="coords-tag font-mono">{coordinates}</span>
          </div>
        </div>

        <div className="live-status-badge">
          <span className="pulse-dot"></span>
          <span className="live-text font-mono">TELEMETRY</span>
        </div>
      </div>

      {/* Metrics Grid (3 Primary Environmental Conditions) */}
      <div className="ocean-metrics-grid three-col">
        {/* Waves Card */}
        <div className="pulse-metric-tile wave-tile">
          <div className="tile-header">
            <span className="tile-icon">🌊</span>
            <span className="tile-label">Waves</span>
          </div>
          <div className="tile-value-row">
            <span className="tile-val font-mono">{wave.value}</span>
            <span className="tile-unit">{wave.unit}</span>
          </div>
          <div className="tile-footer">
            <span className="tile-status">{wave.status}</span>
            <span className="tile-trend font-mono">{wave.trend}</span>
          </div>
        </div>

        {/* Wind Card */}
        <div className="pulse-metric-tile wind-tile">
          <div className="tile-header">
            <span className="tile-icon">💨</span>
            <span className="tile-label">Wind Velocity</span>
          </div>
          <div className="tile-value-row">
            <span className="tile-val font-mono">{wind.value}</span>
            <span className="tile-unit">{wind.unit}</span>
          </div>
          <div className="tile-footer">
            <span className="tile-status">{wind.status}</span>
            <span className="tile-trend font-mono">{wind.trend}</span>
          </div>
        </div>

        {/* Temperature Card */}
        <div className="pulse-metric-tile temp-tile">
          <div className="tile-header">
            <span className="tile-icon">🌡️</span>
            <span className="tile-label">Sea Temperature</span>
          </div>
          <div className="tile-value-row">
            <span className="tile-val font-mono">{temperature.value}</span>
            <span className="tile-unit">°C</span>
          </div>
          <div className="tile-footer">
            <span className="tile-status">{temperature.status}</span>
            <span className="tile-trend font-mono">{temperature.trend}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
