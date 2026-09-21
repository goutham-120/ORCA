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
          {safeLayers.map((layer) => {
            const count = Array.isArray(layer?.features) ? layer.features.length : (layer?.feature_count || 0)
            const isPFZ = String(layer?.id || '').toLowerCase() === 'pfz'
            return (
              <button
                key={layer?.id || Math.random()}
                type="button"
                disabled={!layer?.available}
                className={`layer-toggle-chip ${layer?.enabled ? 'is-active' : ''}`}
                onClick={() => onToggleLayer?.(layer?.id)}
                aria-pressed={Boolean(layer?.enabled)}
                title={layer?.description || ''}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="layer-checkbox">{layer?.enabled ? '☑' : '☐'}</span>
                  <span className="layer-label" style={{ fontWeight: layer?.enabled ? 700 : 500 }}>
                    {isPFZ ? '🐟 ' : ''}{layer?.name || 'Unnamed Layer'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {count > 0 && (
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        background: isPFZ ? '#dcfce7' : '#e0f2fe',
                        color: isPFZ ? '#15803d' : '#0369a1',
                        fontWeight: 700,
                      }}
                    >
                      {count} {isPFZ ? 'zones' : 'features'}
                    </span>
                  )}
                  <small style={{ color: '#64748b' }}>{layer?.available ? layer?.layer_type || 'vector' : 'Unavailable'}</small>
                </div>
              </button>
            )
          })}
        </div>
      )}
      {!loading && !error && (safeLayers.length === 0 || safeLayers.every((layer) => !layer?.available)) && (
        <p className="map-state">No source-backed GIS layers are configured. No marine, vessel, PFZ, or hazard data is displayed.</p>
      )}
    </div>
  )
}
