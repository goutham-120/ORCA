const layerLabels = {
  waves: 'Wave Height',
  wind: 'Wind',
  temperature: 'Temperature',
  currents: 'Currents',
}

export default function MarineMapPreview({ location, layers, onToggleLayer, zoom, onZoom, onReset }) {
  const activeLayers = Object.entries(layerLabels).filter(([id]) => layers[id])

  return (
    <section className="marine-map panel font-sans" aria-label="Marine conditions map preview">
      <div className="panel-title">
        <div>
          <p className="eyebrow font-mono">MARINE CONDITIONS MAP</p>
          <h2 className="font-sans">Spatial Overview</h2>
        </div>
        <span className="sample-badge font-mono">MAP PREVIEW</span>
      </div>

      <div className="map-canvas">
        <div className="map-world" style={{ transform: `scale(${zoom})` }}>
          <div className="map-grid" aria-hidden="true" />
          <div className="map-contour contour-one" aria-hidden="true" />
          <div className="map-contour contour-two" aria-hidden="true" />
          <div className={`map-layer-visual wave-layer ${layers.waves ? 'is-visible' : ''}`} />
          <div className={`map-layer-visual wind-layer ${layers.wind ? 'is-visible' : ''}`} />
          <div className={`map-layer-visual temperature-layer ${layers.temperature ? 'is-visible' : ''}`} />
          <div className={`map-layer-visual current-layer ${layers.currents ? 'is-visible' : ''}`} />
        </div>

        <div className="map-coordinate north font-mono">N</div>
        <div className="map-scale font-mono">{Math.round(5 / zoom)} km</div>

        <div className="map-controls">
          <button type="button" onClick={() => onZoom(0.15)} aria-label="Zoom in">+</button>
          <button type="button" onClick={() => onZoom(-0.15)} aria-label="Zoom out">&minus;</button>
          <button type="button" onClick={onReset} aria-label="Reset map view">⌖</button>
        </div>

        <div
          className="map-marker"
          style={{
            left: `${location.mapPosition?.x || 50}%`,
            top: `${location.mapPosition?.y || 50}%`,
          }}
        >
          <span className="marker-pulse" />
          <span className="marker-dot" />
          <strong className="font-sans">{location.name}</strong>
          <small className="font-mono">{location.coordinates}</small>
        </div>

        <div className="map-legend font-mono">
          {activeLayers.length ? (
            activeLayers.map(([id, label]) => (
              <span key={id}>
                <i className={`legend-${id}`} /> {label}
              </span>
            ))
          ) : (
            <span>No layers selected</span>
          )}
        </div>
      </div>

      <div className="map-layers font-sans" aria-label="Map layer controls">
        {Object.entries(layerLabels).map(([id, label]) => (
          <button
            type="button"
            className={layers[id] ? 'layer-active' : ''}
            key={id}
            onClick={() => onToggleLayer(id)}
            aria-pressed={layers[id]}
          >
            <i />
            {label}
          </button>
        ))}
      </div>
    </section>
  )
}
