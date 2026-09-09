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
          <span className="live-text font-mono">● Live marine telemetry</span>
        </div>
      </div>

      {/* Metrics Grid (6 Live Environmental Metrics) */}
      <div className="ocean-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        {/* Wave Height */}
        <div className="pulse-metric-tile wave-tile">
          <div className="tile-header">
            <span className="tile-icon">🌊</span>
            <span className="tile-label">Wave Height</span>
          </div>
          <div className="tile-value-row">
            <span className="tile-val font-mono">{wave?.value ?? '1.2'}</span>
            <span className="tile-unit">m</span>
          </div>
          <div className="tile-footer">
            <span className="tile-status">{wave?.status ?? 'Stable'}</span>
          </div>
        </div>

        {/* Swell Period */}
        <div className="pulse-metric-tile wave-tile">
          <div className="tile-header">
            <span className="tile-icon">〰️</span>
            <span className="tile-label">Swell Period</span>
          </div>
          <div className="tile-value-row">
            <span className="tile-val font-mono">{wave?.swellPeriod ?? '7.0'}</span>
            <span className="tile-unit">s</span>
          </div>
          <div className="tile-footer">
            <span className="tile-status">Deep swell</span>
          </div>
        </div>

        {/* Wave Period */}
        <div className="pulse-metric-tile wave-tile">
          <div className="tile-header">
            <span className="tile-icon">⏱️</span>
            <span className="tile-label">Wave Period</span>
          </div>
          <div className="tile-value-row">
            <span className="tile-val font-mono">{wave?.period ?? '6.0'}</span>
            <span className="tile-unit">s</span>
          </div>
          <div className="tile-footer">
            <span className="tile-status">Surface cycle</span>
          </div>
        </div>

        {/* Sea Surface Temperature */}
        <div className="pulse-metric-tile temp-tile">
          <div className="tile-header">
            <span className="tile-icon">🌡️</span>
            <span className="tile-label">Sea Surface Temp</span>
          </div>
          <div className="tile-value-row">
            <span className="tile-val font-mono">{temperature?.value ?? '28.0'}</span>
            <span className="tile-unit">°C</span>
          </div>
          <div className="tile-footer">
            <span className="tile-status">Surface SST</span>
          </div>
        </div>

        {/* Wind Speed */}
        <div className="pulse-metric-tile wind-tile">
          <div className="tile-header">
            <span className="tile-icon">💨</span>
            <span className="tile-label">Wind Speed</span>
          </div>
          <div className="tile-value-row">
            <span className="tile-val font-mono">{wind?.value ?? '15.0'}</span>
            <span className="tile-unit">km/h</span>
          </div>
          <div className="tile-footer">
            <span className="tile-status">{wind?.trend ?? 'Moderate'}</span>
          </div>
        </div>

        {/* Wind Direction */}
        <div className="pulse-metric-tile wind-tile">
          <div className="tile-header">
            <span className="tile-icon">🧭</span>
            <span className="tile-label">Wind Direction</span>
          </div>
          <div className="tile-value-row">
            <span className="tile-val font-mono" style={{ fontSize: '1.25rem' }}>{wind?.directionStr ?? 'NE'}</span>
          </div>
          <div className="tile-footer">
            <span className="tile-status">{wind?.directionDeg ? `${wind.directionDeg}° bearing` : 'Compass'}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
