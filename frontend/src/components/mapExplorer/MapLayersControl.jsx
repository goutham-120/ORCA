export default function MapLayersControl({ layers = [], loading = false, error = '', onToggleLayer }) {
  const safeLayers = Array.isArray(layers) ? layers : []

  return (
    <div className="map-layers-panel panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">MAP LAYERS</p>
          <h2>GIS overlays</h2>
        </div>
      </div>
      {loading && <p className="map-state">Loading available GIS layers…</p>}
      {error && <p className="map-state map-state-error">GIS data unavailable: {error}</p>}
      {!loading && !error && (
        <div className="layers-grid">
          {safeLayers.map((layer) => (
            <button
              key={layer?.id || Math.random()}
              type="button"
              disabled={!layer?.available}
              className={`layer-toggle-chip ${layer?.enabled ? 'is-active' : ''}`}
              onClick={() => onToggleLayer?.(layer?.id)}
              aria-pressed={Boolean(layer?.enabled)}
              title={layer?.description || ''}
            >
              <span className="layer-checkbox">{layer?.enabled ? '☑' : '☐'}</span>
              <span className="layer-label">{layer?.name || 'Unnamed Layer'}</span>
              <small>{layer?.available ? layer?.layer_type || 'vector' : 'Unavailable'}</small>
            </button>
          ))}
        </div>
      )}
      {!loading && !error && (safeLayers.length === 0 || safeLayers.every((layer) => !layer?.available)) && (
        <p className="map-state">No source-backed GIS layers are configured. No marine, vessel, PFZ, or hazard data is displayed.</p>
      )}
    </div>
  )
}
