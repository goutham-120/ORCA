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
  baseMapMode = 'standard',
  onToggleBaseMapMode,
  isCloudIRVisible = false,
  onToggleCloudIR,
  cloudIROpacity = 0.75,
  onCloudIROpacityChange,
}) {
  const safeLayers = Array.isArray(layers) ? layers : []

  // Filter out any stale dummy 'routes' layer so we render the active interactive navigation route layer
  const standardLayers = safeLayers.filter((l) => String(l?.id || '').toLowerCase() !== 'routes')

  // Calculate active count
  const activeStandardCount = standardLayers.filter((l) => l?.enabled).length
  const totalActiveCount = activeStandardCount + (isRouteVisible ? 1 : 0) + (isCloudIRVisible ? 1 : 0)
  const totalLayersCount = standardLayers.length + 2

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
          <p className="eyebrow">MAP VIEW & GIS LAYERS</p>
          <h2>
            <span>Cartography & Overlays</span>
          </h2>
        </div>
        <span className="map-layers-count-badge">
          {totalActiveCount} / {totalLayersCount} Active
        </span>
      </div>

      {/* 0. BASEMAP MODE SELECTOR */}
      <div className="basemap-mode-container">
        <div className="basemap-mode-label">
          <span>🌍 EARTH BASEMAP</span>
          <span className="basemap-tag">{baseMapMode === 'satellite' ? 'Maxar/Airbus High-Res' : 'Vector Chart'}</span>
        </div>
        <div className="basemap-switch-group">
          <button
            type="button"
            className={`basemap-btn ${baseMapMode === 'standard' ? 'is-active' : ''}`}
            onClick={() => onToggleBaseMapMode?.('standard')}
            title="Switch to Standard Nautical / Vector Cartography"
          >
            <span>🗺️</span> Standard Chart
          </button>
          <button
            type="button"
            className={`basemap-btn ${baseMapMode === 'satellite' ? 'is-active' : ''}`}
            onClick={() => onToggleBaseMapMode?.('satellite')}
            title="Switch to ESRI High-Resolution World Imagery with Boundaries & Places"
          >
            <span>🛰️</span> ESRI Satellite
          </button>
        </div>
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
          {/* 1. METEOROLOGICAL CLOUD & THERMAL IR (INSAT-3D/3DR) LAYER */}
          <div className={`layer-card-chip insat-cloud-chip ${isCloudIRVisible ? 'is-active' : ''}`}>
            <button
              type="button"
              className="layer-click-header"
              onClick={() => onToggleCloudIR?.()}
              aria-pressed={Boolean(isCloudIRVisible)}
              title="Toggle ISRO INSAT-3D/3DR TIR1 & Water Vapor Cloud-Top Brightness Temperature"
            >
              <div className="layer-left-info">
                <span className="layer-checkbox-custom">
                  {isCloudIRVisible ? '✓' : ''}
                </span>
                <span className="layer-icon-emoji">☁️</span>
                <div className="layer-text-group">
                  <span className="layer-title-text" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    INSAT Thermal IR Clouds
                    <span className="insat-badge">ISRO MOSDAC</span>
                  </span>
                  <span className="layer-sub-desc">
                    TIR1 Cloud-Top Temp (&lt; -60°C Convective Tops)
                  </span>
                </div>
              </div>

              <div className="layer-right-meta">
                {isCloudIRVisible ? (
                  <span className="layer-badge" style={{ background: '#7e22ce', color: '#f3e8ff', borderColor: '#a855f7' }}>
                    Live IR
                  </span>
                ) : (
                  <span className="layer-badge vector">
                    Off
                  </span>
                )}
              </div>
            </button>

            {isCloudIRVisible && (
              <div className="cloud-opacity-slider-row">
                <span className="opacity-label">IR Cloud Opacity:</span>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={cloudIROpacity}
                  onChange={(e) => onCloudIROpacityChange?.(Number(e.target.value))}
                  className="marine-range-slider"
                  style={{ height: '4px', flex: 1 }}
                />
                <span className="opacity-val font-mono">{Math.round(cloudIROpacity * 100)}%</span>
              </div>
            )}
          </div>
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
