import './MapLegend.css'

const LAYER_META = {
  hazards: {
    icon: '⚠️',
    color: '#dc2626',
    bg: '#fee2e2',
    border: '#fca5a5',
    tag: 'Marine Hazard',
    title: 'Hazards & Storm Danger Cones',
    description: 'Active storm tracks, projected cyclone surge cones, underwater reefs, and prohibited danger zones.',
  },
  restricted_zones: {
    icon: '🚫',
    color: '#b45309',
    bg: '#fef3c7',
    border: '#fde68a',
    tag: 'Restricted Zone',
    title: 'Restricted & Maritime Boundaries',
    description: 'Protected waters, naval security corridors, marine national parks, and seasonal no-trawl zones.',
  },
  marine_areas: {
    icon: '⚓',
    color: '#059669',
    bg: '#d1fae5',
    border: '#a7f3d0',
    tag: 'Marine Area',
    title: 'Marine Monitoring Areas',
    description: 'Coastal sector boundaries, port jurisdiction waters, and hydrographic monitoring zones.',
  },
  pfz: {
    icon: '🐟',
    color: '#0284c7',
    bg: '#e0f2fe',
    border: '#bae6fd',
    tag: 'PFZ Forecast',
    title: 'Potential Fishing Zones (INCOIS)',
    description: 'Chlorophyll-a ocean color & sea surface temperature frontal lines validated by INCOIS satellite telemetry.',
  },
  routes: {
    icon: '🗺️',
    color: '#16a34a',
    bg: '#dcfce7',
    border: '#86efac',
    tag: 'Navigation Route',
    title: 'Shore-to-PFZ Navigation Route',
    description: 'Computed road transit from land to port + shortest safe marine passage with live GPS waypoints.',
  },
}

export default function MapLegend({ layers = [], routeGeometry }) {
  const safeLayers = Array.isArray(layers) ? layers : []
  // Only display active layers and exclude dummy routes if not geometry
  const activeLayers = safeLayers.filter((layer) => layer?.enabled && String(layer?.id || '').toLowerCase() !== 'routes')
  const isRouteActive = Boolean(routeGeometry)
  const totalActive = activeLayers.length + (isRouteActive ? 1 : 0)

  return (
    <div className="map-legend-box panel">
      <div className="map-legend-header">
        <div>
          <p className="eyebrow">MAP LEGEND & OVERLAYS</p>
          <h3>Active Map Symbology & GIS Overlays</h3>
        </div>
        <span className="legend-active-badge">
          {totalActive} {totalActive === 1 ? 'Layer' : 'Layers'} Active
        </span>
      </div>

      {totalActive > 0 ? (
        <div className="legend-grid-container">
          {/* STANDARD ACTIVE GIS LAYERS */}
          {activeLayers.map((layer) => {
            const key = String(layer?.id || '').toLowerCase()
            const meta = LAYER_META[key] || {
              icon: '📍',
              color: '#0284c7',
              bg: '#e0f2fe',
              border: '#bae6fd',
              tag: layer?.name || 'GIS Layer',
              title: layer?.name || 'Layer',
              description: layer?.description || 'Source-backed spatial vector GIS dataset.',
            }
            const isPFZ = key === 'pfz'

            return (
              <div className="legend-card" key={layer?.id || Math.random()}>
                <div className="legend-card-header">
                  <span
                    className="legend-pill-tag"
                    style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}
                  >
                    <span>{meta.icon}</span>
                    <span>{meta.tag}</span>
                  </span>
                  <span className="legend-layer-name">{layer?.name || meta.title}</span>
                </div>

                <p className="legend-card-desc">{layer?.description || meta.description}</p>

                {isPFZ && (
                  <div className="legend-sub-badges-row">
                    <span className="pfz-symbology-pill in-radius">
                      🟢 Inside Search Radius
                    </span>
                    <span className="pfz-symbology-pill nearest-selected">
                      ⭐ Nearest Suitable PFZ
                    </span>
                    <span className="pfz-symbology-pill outside-radius">
                      🐟 Outside Radius
                    </span>
                    <span className="pfz-symbology-pill in-radius" style={{ background: '#ecfdf5', color: '#047857', borderColor: '#34d399' }}>
                      🟢 ╌ 4 km Operational Catch Zone
                    </span>
                  </div>
                )}
              </div>
            )
          })}

          {/* ACTIVE ROUTE & WAYPOINTS SYMBOLOGY */}
          {isRouteActive && (
            <div className="legend-card">
              <div className="legend-card-header">
                <span
                  className="legend-pill-tag"
                  style={{
                    background: LAYER_META.routes.bg,
                    color: LAYER_META.routes.color,
                    borderColor: LAYER_META.routes.border,
                  }}
                >
                  <span>{LAYER_META.routes.icon}</span>
                  <span>{LAYER_META.routes.tag}</span>
                </span>
                <span className="legend-layer-name">Road Transit & Marine Passage</span>
              </div>
              <p className="legend-card-desc">{LAYER_META.routes.description}</p>
              <div className="legend-sub-badges-row">
                <span className="pfz-symbology-pill in-radius" style={{ background: '#f0fdf4', color: '#166534', borderColor: '#86efac' }}>
                  ━━ Road Transit (Land)
                </span>
                <span className="pfz-symbology-pill outside-radius" style={{ background: '#eff6ff', color: '#1e40af', borderColor: '#93c5fd' }}>
                  ╍╍ Marine Route (PFZ)
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="legend-empty-state">
          <span>ℹ️</span>
          <span>No GIS overlays or routes are currently active. Enable layers from the GIS Overlays panel to display map symbology.</span>
        </div>
      )}
    </div>
  )
}
