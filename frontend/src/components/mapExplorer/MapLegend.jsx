const LAYER_META = {
  hazards: { icon: '⚠️', color: '#dc2626', bg: '#fee2e2', border: '#f87171', label: 'Marine Hazard (Danger)' },
  restricted_zones: { icon: '🚫', color: '#d97706', bg: '#fef3c7', border: '#fbbf24', label: 'Restricted Maritime Zone' },
  marine_areas: { icon: '⚓', color: '#059669', bg: '#d1fae5', border: '#34d399', label: 'Marine Monitoring Area' },
  pfz: { icon: '🐟', color: '#0891b2', bg: '#cffafe', border: '#22d3ee', label: 'Potential Fishing Zone' },
  routes: { icon: '🧭', color: '#2563eb', bg: '#dbeafe', border: '#60a5fa', label: 'Navigation Route' },
}

export default function MapLegend({ layers, routeGeometry }) {
  const active = layers.filter((layer) => layer.enabled)
  return (
    <div className="map-legend-box panel">
      <div className="legend-header">
        <p className="eyebrow">MAP LEGEND & OVERLAYS</p>
      </div>
      <div className="legend-items-list">
        {active.map((layer) => {
          const key = (layer.id || '').toLowerCase()
          const meta = LAYER_META[key] || { icon: '📍', color: '#0284c7', bg: '#e0f2fe', border: '#38bdf8', label: layer.name }
          return (
            <div className="legend-item" key={layer.id}>
              <div className="legend-item-title-row">
                <span
                  className="legend-color-chip"
                  style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}
                >
                  <span className="legend-icon">{meta.icon}</span>
                  <span className="legend-type-tag">{meta.label}</span>
                </span>
                <span className="legend-label">{layer.name}</span>
              </div>
              <small>{layer.description}</small>
            </div>
          )
        })}
        {routeGeometry && (
          <div className="legend-item">
            <div className="legend-item-title-row">
              <span
                className="legend-color-chip"
                style={{ background: '#dbeafe', color: '#2563eb', borderColor: '#60a5fa' }}
              >
                <span className="legend-icon">🧭</span>
                <span className="legend-type-tag">Calculated Route</span>
              </span>
              <span className="legend-label">Navigation Waypoints</span>
            </div>
            <small>Active computed marine voyage path between selected endpoints</small>
          </div>
        )}
        {!active.length && !routeGeometry && <span className="no-layers-text">No GIS overlays active</span>}
      </div>
    </div>
  )
}
