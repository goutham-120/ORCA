import { useState, useEffect } from 'react'
import './LiveNavigationHUD.css'

export default function LiveNavigationHUD({
  navigationData,
  currentLocation,
  isTracking,
  onToggleTracking,
  onRecenter,
  onStopNavigation,
  onRecalculate,
  isLoading,
}) {
  const [showWaypoints, setShowWaypoints] = useState(false)
  const [vesselSpeed, setVesselSpeed] = useState(12.0)

  if (!navigationData && !isLoading) return null

  const summary = navigationData?.navigation_summary || {}
  const route = navigationData?.route || {}
  const msi = route?.marine_safety_index
  const waypoints = route?.waypoints || []
  const pfz = navigationData?.selected_pfz

  const pfzName = summary.pfz_name || pfz?.properties?.name || pfz?.name || 'Nearest Fishing Zone'
  const distanceNM = summary.distance_nm ?? (summary.distance_km ? (summary.distance_km * 0.54).toFixed(1) : '--')
  const distanceKM = summary.distance_km ? Number(summary.distance_km).toFixed(1) : '--'
  const bearing = summary.bearing_deg != null ? `${summary.bearing_deg}°` : '--'
  const heading = summary.compass_heading || '--'
  const eta = summary.estimated_time_formatted || route.estimated_travel_time || '--'
  const overallStatus = summary.overall_status || route.overall_status || 'SAFE'

  const msiScore = msi?.score != null ? Number(msi.score).toFixed(0) : (summary.msi_score != null ? Number(summary.msi_score).toFixed(0) : null)
  const msiTier = msi?.tier_label || summary.msi_tier || 'Optimal'

  const landTransit = navigationData?.land_transit

  return (
    <div className="live-nav-hud">
      {/* HEADER BAR */}
      <div className="live-nav-header">
        <div className="live-nav-title-group">
          <span className="live-nav-radar-dot"></span>
          <div className="live-nav-title">
            <span className="live-nav-label">
              {landTransit?.land_transit_needed ? 'ORCA MULTI-MODAL NAVIGATION' : 'ORCA LIVE MARINE NAVIGATION'}
            </span>
            <span className="live-nav-target-name">{pfzName}</span>
          </div>
        </div>

        <div className="live-nav-header-actions">
          {overallStatus && (
            <span className={`live-nav-status-badge status-${overallStatus.toLowerCase()}`}>
              {overallStatus === 'SAFE' && '🟢 '}
              {overallStatus === 'CAUTION' && '🟡 '}
              {overallStatus === 'UNSAFE' && '🔴 '}
              {overallStatus}
            </span>
          )}
          <button
            className="live-nav-btn-close"
            onClick={onStopNavigation}
            title="End Live Navigation"
          >
            ✕ Exit Nav
          </button>
        </div>
      </div>

      {/* MULTI-MODAL JOURNEY OVERVIEW BANNER (LAND TO SHORE TO SEA) */}
      {landTransit?.land_transit_needed && (
        <div className="live-nav-multimodal-banner">
          <div className="multimodal-leg road">
            <span className="leg-badge">🚗 Road Leg</span>
            <span className="leg-info">{landTransit.distance_km} km ({landTransit.formatted_duration}) to {landTransit.harbor?.name || 'Harbor'}</span>
          </div>
          <span className="multimodal-arrow">➔</span>
          <div className="multimodal-leg harbor">
            <span className="leg-badge">⚓ Embark</span>
            <span className="leg-info">{landTransit.harbor?.name || 'Port'}</span>
          </div>
          <span className="multimodal-arrow">➔</span>
          <div className="multimodal-leg sea">
            <span className="leg-badge">🚢 Sea Leg</span>
            <span className="leg-info">{distanceNM} NM ({eta}) to PFZ</span>
          </div>
        </div>
      )}

      {/* METRICS GRID */}
      <div className="live-nav-metrics-grid">
        <div className="live-nav-metric-card primary">
          <span className="metric-label">{landTransit?.land_transit_needed ? 'SEA COURSE (HEADING)' : 'BEARING / COURSE'}</span>
          <div className="metric-value-row">
            <span className="metric-icon">🧭</span>
            <span className="metric-val highlight">{bearing} {heading}</span>
          </div>
          <span className="metric-sub">{landTransit?.land_transit_needed ? `From ${landTransit.harbor?.name || 'Harbor'}` : 'Direct Steer Angle'}</span>
        </div>

        <div className="live-nav-metric-card">
          <span className="metric-label">SEA DISTANCE REMAINING</span>
          <div className="metric-value-row">
            <span className="metric-icon">📏</span>
            <span className="metric-val">{distanceNM} <small>NM</small></span>
          </div>
          <span className="metric-sub">{distanceKM} km marine voyage</span>
        </div>

        <div className="live-nav-metric-card">
          <span className="metric-label">VOYAGE ETA</span>
          <div className="metric-value-row">
            <span className="metric-icon">⏱️</span>
            <span className="metric-val">{eta}</span>
          </div>
          <span className="metric-sub">@ {vesselSpeed} kts cruise</span>
        </div>

        {msiScore != null && (
          <div className="live-nav-metric-card msi">
            <span className="metric-label">CORRIDOR MSI</span>
            <div className="metric-value-row">
              <span className="metric-icon">🛡️</span>
              <span className="metric-val">{msiScore}<small>/100</small></span>
            </div>
            <span className="metric-sub">{msiTier}</span>
          </div>
        )}
      </div>

      {/* DETECTED RISKS / OBSTACLES BANNER */}
      {route.detected_obstacles?.length > 0 && (
        <div className="live-nav-alert-banner">
          <span className="alert-icon">⚠️</span>
          <div className="alert-text">
            <strong>Obstacle Detour Active:</strong> Safe marine route charted around {route.detected_obstacles.join(', ')}.
          </div>
        </div>
      )}

      {/* LIVE VESSEL TELEMETRY & CONTROLS */}
      <div className="live-nav-telemetry-bar">
        <div className="vessel-gps-pill">
          <span className="gps-indicator active"></span>
          <span className="gps-text">
            {landTransit?.land_transit_needed ? '📍 Start (Land): ' : '⛵ Vessel: '}
            {currentLocation?.latitude ? `${currentLocation.latitude.toFixed(4)}°N, ${currentLocation.longitude.toFixed(4)}°E` : 'Acquiring GPS…'}
            {currentLocation?.accuracy && ` (±${Math.round(currentLocation.accuracy)}m)`}
          </span>
        </div>

        <div className="live-nav-actions-group">
          <button
            className={`live-nav-ctrl-btn ${isTracking ? 'active' : ''}`}
            onClick={onToggleTracking}
            title={isTracking ? 'GPS Tracking Active' : 'Enable Live GPS Tracking'}
          >
            {isTracking ? '📡 Tracking: ON' : '📡 Track Boat'}
          </button>

          <button
            className="live-nav-ctrl-btn highlight-gold"
            onClick={onRecalculate}
            disabled={isLoading}
            title="Display Land-to-Shore Road Route and Marine PFZ Route on Map"
          >
            {isLoading ? '⚡ Calculating…' : '🗺️ Show Route'}
          </button>

          <button
            className="live-nav-ctrl-btn"
            onClick={onRecenter}
            title="Recenter Camera on Position"
          >
            🎯 Recenter
          </button>

          {(waypoints.length > 0 || landTransit?.road_steps?.length > 0) && (
            <button
              className={`live-nav-ctrl-btn ${showWaypoints ? 'open' : ''}`}
              onClick={() => setShowWaypoints(!showWaypoints)}
            >
              🗺️ Turn-by-Turn {showWaypoints ? '▲' : '▼'}
            </button>
          )}

          <button
            className="live-nav-ctrl-btn recalc"
            onClick={onRecalculate}
            disabled={isLoading}
            title="Recalculate Safe Route"
          >
            {isLoading ? '⚡ Routing…' : '🔄 Refresh Passage'}
          </button>
        </div>
      </div>

      {/* EXPANDABLE TURN-BY-TURN MULTI-MODAL DRAWER */}
      {showWaypoints && (
        <div className="live-nav-waypoints-drawer">
          {/* 1. ROAD DRIVING STEPS TO HARBOR */}
          {landTransit?.land_transit_needed && Array.isArray(landTransit.road_steps) && landTransit.road_steps.length > 0 && (
            <div className="drawer-nav-section road-section">
              <div className="nav-section-title">
                <span>🚗 Phase 1: Road Navigation to Shore ({landTransit.distance_km} km · {landTransit.formatted_duration})</span>
                <span className="section-pill road">Land Transit</span>
              </div>
              <div className="road-steps-list">
                {landTransit.road_steps.map((step, sIdx) => (
                  <div key={sIdx} className="road-step-item">
                    <div className="road-step-badge">{step.step_number || sIdx + 1}</div>
                    <div className="road-step-content">
                      <div className="road-step-inst">{step.instruction}</div>
                      <div className="road-step-meta">
                        {step.road_name && <span>🛣️ {step.road_name}</span>}
                        {step.distance_meters > 0 && <span>📏 {step.distance_meters > 1000 ? `${(step.distance_meters / 1000).toFixed(1)} km` : `${Math.round(step.distance_meters)} m`}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* HARBOR EMBARKATION TRANSITION BADGE */}
              <div className="harbor-transition-card">
                <div className="harbor-trans-icon">⚓</div>
                <div className="harbor-trans-info">
                  <strong>Arrive at {landTransit.harbor?.name || 'Harbor Jetty'}</strong>
                  <span>Board fishing vessel & depart harbor fairway for marine passage</span>
                </div>
              </div>
            </div>
          )}

          {/* 2. MARINE PASSAGE WAYPOINTS */}
          {waypoints.length > 0 && (
            <div className="drawer-nav-section sea-section">
              <div className="nav-section-title">
                <span>🚢 {landTransit?.land_transit_needed ? 'Phase 2: Marine Passage to PFZ' : 'Marine Passage Waypoints & Course Legs'}</span>
                <span className="section-pill sea">{distanceNM} NM · {waypoints.length} checkpoints</span>
              </div>
              <div className="waypoints-list">
                {waypoints.map((wp, idx) => (
                  <div key={idx} className="waypoint-item">
                    <div className="wp-number-badge">
                      {idx === waypoints.length - 1 ? '🎯' : `WP ${wp.waypoint_number || idx + 1}`}
                    </div>
                    <div className="wp-details">
                      <div className="wp-coords">
                        {idx === waypoints.length - 1 ? <strong>Target PFZ: </strong> : ''}
                        {wp.latitude?.toFixed(4)}°N, {wp.longitude?.toFixed(4)}°E
                      </div>
                      <div className="wp-meta">
                        {wp.bearing_deg != null && <span>Course: {wp.bearing_deg}° {wp.compass_heading}</span>}
                        {wp.leg_distance_nm != null && <span>Leg: {wp.leg_distance_nm} NM</span>}
                        {wp.leg_eta_minutes != null && <span>Est: ~{wp.leg_eta_minutes}m</span>}
                      </div>
                    </div>
                    <div className="wp-status">
                      <span className={`wp-status-pill ${wp.safety_status?.toLowerCase() || 'safe'}`}>
                        {wp.safety_status || 'SAFE'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
