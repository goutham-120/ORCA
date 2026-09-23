import './MapLayersControl.css'

export default function MapLayersControl({
  layers = [],
  loading = false,
  error = '',
  onToggleLayer,
  isRouteVisible = false,
  isRouteLoading = false,
  onToggleRoute,
  routeData = null,
  isPFZSyncing = false,
  searchRadius = 50,
  onRadiusChange,
}) {
  const safeLayers = Array.isArray(layers) ? layers : []

  // Filter out any stale dummy 'routes' layer so we render the active interactive navigation route layer
  const standardLayers = safeLayers.filter((l) => String(l?.id || '').toLowerCase() !== 'routes')

  // Calculate active count
  const activeStandardCount = standardLayers.filter((l) => l?.enabled).length
  const totalActiveCount = activeStandardCount + (isRouteVisible ? 1 : 0)
  const totalLayersCount = standardLayers.length + 1

  const getLayerIcon = (id, isPFZ) => {
    if (isPFZ) return '🐟'
    const idLower = String(id || '').toLowerCase()
    if (idLower.includes('hazard')) return '⚠️'
    if (idLower.includes('restrict')) return '🚫'
    if (idLower.includes('marine') || idLower.includes('mpa')) return '🌊'
    return '🗺️'
  }

  const getLayerSubtitle = (layer, isPFZ) => {
    if (isPFZ) return 'INCOIS validated oceanic coordinates'
    const idLower = String(layer?.id || '').toLowerCase()
    if (idLower.includes('hazard')) return 'Storm surge, cyclone danger & rocks'
    if (idLower.includes('restrict')) return 'Maritime boundaries & sanctuaries'
    if (idLower.includes('marine')) return 'Protected marine habitats & MPAs'
    return layer?.description || 'Source-backed vector GIS layer'
  }

  return (
    <div className="map-layers-panel">
      <div className="map-layers-header">
        <div>
          <p className="eyebrow">MAP LAYERS</p>
          <h2>
            <span>GIS Overlays & Routes</span>
          </h2>
        </div>
        <span className="map-layers-count-badge">
          {totalActiveCount} / {totalLayersCount} Active
        </span>
      </div>

      {loading && (
        <div className="map-layers-loading-box">
          <span className="layer-spinner" />
          <span>Loading source-backed GIS layers…</span>
        </div>
      )}

      {error && !loading && (
        <div className="map-state map-state-error" style={{ margin: '8px 0', padding: '10px', fontSize: '12px' }}>
          ⚠️ GIS data notice: {error}
        </div>
      )}

      {!loading && (
        <div className="layers-list-container">
          {/* 1. STANDARD GIS OVERLAYS */}
          {standardLayers.map((layer) => {
            const count = Array.isArray(layer?.features) ? layer.features.length : (layer?.feature_count || 0)
            const isPFZ = String(layer?.id || '').toLowerCase() === 'pfz'
            const isThisLayerSyncing = isPFZ && isPFZSyncing
            const isEnabled = Boolean(layer?.enabled)

            return (
              <button
                key={layer?.id || Math.random()}
                type="button"
                disabled={!layer?.available && !isThisLayerSyncing}
                className={`layer-card-chip ${isEnabled ? 'is-active' : ''}`}
                onClick={() => onToggleLayer?.(layer?.id)}
                aria-pressed={isEnabled}
                title={layer?.description || ''}
              >
                <div className="layer-left-info">
                  <span className="layer-checkbox-custom">
                    {isEnabled ? '✓' : ''}
                  </span>
                  <span className="layer-icon-emoji">
                    {getLayerIcon(layer?.id, isPFZ)}
                  </span>
                  <div className="layer-text-group">
                    <span className="layer-title-text">
                      {layer?.name || 'Unnamed Layer'}
                    </span>
                    <span className="layer-sub-desc">
                      {getLayerSubtitle(layer, isPFZ)}
                    </span>
                  </div>
                </div>

                <div className="layer-right-meta">
                  {isThisLayerSyncing ? (
                    <span className="layer-badge loading">
                      <span className="layer-spinner green" /> Syncing…
                    </span>
                  ) : count > 0 ? (
                    <span className={`layer-badge ${isPFZ ? 'pfz' : 'vector'}`}>
                      {count} {isPFZ ? 'zones' : 'features'}
                    </span>
                  ) : (
                    <span className="layer-badge vector">
                      {layer?.available ? 'vector' : 'Empty'}
                    </span>
                  )}
                </div>
              </button>
            )
          })}

          {/* 2. DEDICATED NAVIGATION ROUTE & WAYPOINTS LAYER */}
          <button
            type="button"
            className={`layer-card-chip is-route-layer ${isRouteVisible ? 'is-active' : ''}`}
            onClick={() => onToggleRoute?.()}
            aria-pressed={Boolean(isRouteVisible)}
            title={isRouteVisible ? 'Click to hide shore & PFZ navigation route' : 'Calculate and overlay road transit & marine navigation route to nearest PFZ'}
          >
            <div className="layer-left-info">
              <span className="layer-checkbox-custom">
                {isRouteVisible ? '✓' : ''}
              </span>
              <span className="layer-icon-emoji">🗺️</span>
              <div className="layer-text-group">
                <span className="layer-title-text">
                  Shore & PFZ Navigation Route
                </span>
                <span className="layer-sub-desc">
                  {isRouteLoading
                    ? 'Computing multi-modal route & safety check…'
                    : isRouteVisible
                    ? 'Active transit path with waypoints & HUD'
                    : 'Land-to-harbor road & marine passage'}
                </span>
              </div>
            </div>

            <div className="layer-right-meta">
              {isRouteLoading ? (
                <span className="layer-badge loading">
                  <span className="layer-spinner amber" /> Planning…
                </span>
              ) : isRouteVisible ? (
                <span className="layer-badge route" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span className="layer-pulse-dot" />
                  {routeData?.route?.total_distance_km
                    ? `${routeData.route.total_distance_km} km`
                    : 'Active'}
                </span>
              ) : (
                <span className="layer-badge route-off">
                  Toggle Route
                </span>
              )}
            </div>
          </button>
        </div>
      )}

      {/* 3. OPERATIONAL SEARCH RADIUS SLIDER (PLACED DOWNSIDE OF GIS LAYERS) */}
      <div className="map-radius-control-section">
        <div className="radius-control-header">
          <label htmlFor="sidebar-search-radius-slider" className="radius-label">
            <span>🎯 PFZ Search Radius:</span>
            <strong className="radius-val font-mono">{searchRadius} km</strong>
          </label>
          <span className="radius-hint font-mono">5 – 200 km</span>
        </div>
        <div className="radius-slider-row">
          <input
            id="sidebar-search-radius-slider"
            type="range"
            min="5"
            max="200"
            step="5"
            value={searchRadius}
            onChange={(e) => onRadiusChange?.(Number(e.target.value) || 50)}
            className="marine-range-slider"
          />
          <input
            id="sidebar-search-radius-number"
            type="number"
            min="5"
            max="200"
            value={searchRadius}
            onChange={(e) => onRadiusChange?.(Math.max(5, Math.min(200, Number(e.target.value) || 50)))}
            className="marine-number-input font-mono"
          />
          <span className="unit-label font-mono">km</span>
        </div>
      </div>

      {!loading && !error && standardLayers.length === 0 && (
        <p className="map-state" style={{ margin: '8px 0', fontSize: '11.5px', color: '#64748b' }}>
          No source-backed GIS layers are configured.
        </p>
      )}
    </div>
  )
}
