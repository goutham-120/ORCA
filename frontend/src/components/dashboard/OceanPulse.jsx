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
          <span className="live-text font-mono">Live marine telemetry</span>
        </div>
      </div>

      {/* Metrics Grid (6 Live Environmental Metrics) */}
      <div className="ocean-metrics-grid">
        {/* Wave Height */}
        <div className="pulse-metric-tile wave-tile">
          <div className="tile-header">
            <span className="tile-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>
            </span>
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
            <span className="tile-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h2a4 4 0 0 1 4 4 4 4 0 0 0 4 4 4 4 0 0 0 4-4 4 4 0 0 1 4-4h2"/></svg>
            </span>
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
            <span className="tile-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </span>
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
            <span className="tile-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>
            </span>
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
            <span className="tile-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>
            </span>
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
            <span className="tile-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
            </span>
            <span className="tile-label">Wind Direction</span>
          </div>
          <div className="tile-value-row">
            <span className="tile-val font-mono">{wind?.directionStr ?? 'NE'}</span>
          </div>
          <div className="tile-footer">
            <span className="tile-status">{wind?.directionDeg ? `${wind.directionDeg}° bearing` : 'Compass'}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
