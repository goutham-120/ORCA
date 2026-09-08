const availableLayers = [
  { id: 'waves', label: 'Wave Height', icon: '🌊' },
  { id: 'wind', label: 'Wind Vectors', icon: '💨' },
  { id: 'temperature', label: 'Water Temp', icon: '🌡️' },
  { id: 'currents', label: 'Currents Flow', icon: '🌀' },
  { id: 'traffic', label: 'Marine Traffic', icon: '⚓' },
  { id: 'fishing', label: 'Fishing Activity', icon: '🎣' },
  { id: 'hazards', label: 'Hazards & Alerts', icon: '🔴' },
]

export default function MapLayersControl({ layers, onToggleLayer }) {
  return (
    <div className="map-layers-panel panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">MAP LAYERS</p>
          <h2>Active Overlays</h2>
        </div>
      </div>

      <div className="layers-grid">
        {availableLayers.map((layer) => {
          const isActive = !!layers[layer.id]
          return (
            <button
              key={layer.id}
              type="button"
              className={`layer-toggle-chip ${isActive ? 'is-active' : ''}`}
              onClick={() => onToggleLayer(layer.id)}
              aria-pressed={isActive}
            >
              <span className="layer-checkbox">{isActive ? '☑' : '☐'}</span>
              <span className="layer-icon">{layer.icon}</span>
              <span className="layer-label">{layer.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
