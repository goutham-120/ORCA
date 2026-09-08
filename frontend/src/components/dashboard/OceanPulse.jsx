import { useMemo } from 'react'

export function OceanPulse({ location, onNavigateAsk }) {
  // Determine dynamic safety status styling with useMemo at top-level
  const safetyTone = useMemo(() => {
    if (!location || !location.safety) {
      return { label: 'Favorable', statusClass: 'status-good', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', text: 'Low Risk' }
    }
    const score = location.safety.score
    if (score >= 80) {
      return { label: 'Favorable', statusClass: 'status-good', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', text: 'Low Risk' }
    } else if (score >= 65) {
      return { label: 'Moderate', statusClass: 'status-warning', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', text: 'Monitor Activity' }
    } else {
      return { label: 'Caution', statusClass: 'status-danger', color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)', text: 'Elevated Risk' }
    }
  }, [location])

  if (!location) return null

  const { wave, wind, temperature, safety, name, coordinates } = location

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
          <span className="ocean-pulse-eyebrow">LIVE OCEAN INTELLIGENCE</span>
          <div className="location-name-row">
            <h2 className="pulse-title">Ocean Pulse — {name}</h2>
            <span className="coords-tag font-mono">{coordinates}</span>
          </div>
        </div>

        <div className="live-status-badge">
          <span className="pulse-dot"></span>
          <span className="live-text font-mono">LIVE</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="ocean-metrics-grid">
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

        {/* Dynamic Safety Status Card */}
        <div className={`pulse-metric-tile safety-tile ${safetyTone.statusClass}`}>
          <div className="tile-header">
            <span className="tile-icon">🛡️</span>
            <span className="tile-label">Safety Index</span>
          </div>
          <div className="tile-value-row">
            <span className="tile-val font-mono" style={{ color: safetyTone.color }}>
              {safety.score}
            </span>
            <span className="tile-unit">/100</span>
          </div>
          <div className="tile-footer">
            <span className="safety-badge-pill" style={{ color: safetyTone.color, backgroundColor: safetyTone.bg }}>
              {safety.label}
            </span>
            <span className="safety-risk-text">{safetyTone.text}</span>
          </div>
        </div>
      </div>

      {/* Interactive Micro-CTA */}
      {onNavigateAsk && (
        <div className="ocean-pulse-footer">
          <p className="footer-brief-snippet">
            💡 {location.brief}
          </p>
          <button
            type="button"
            className="pulse-ask-btn"
            onClick={() => onNavigateAsk(`What are the latest sea conditions for ${name}?`)}
          >
            Ask ORCA AI &rarr;
          </button>
        </div>
      )}
    </section>
  )
}
