export default function LocationInfoPanel({ location, selectedCoordinate, navigate }) {
  const coordinate = selectedCoordinate || location || {}
  const label = coordinate.label || coordinate.name || location?.name || 'Selected Location'
  const lat = Number(coordinate.latitude ?? coordinate.lat ?? 13.0827)
  const lon = Number(coordinate.longitude ?? coordinate.lng ?? 80.2707)

  const handleAskOrca = () => {
    const safeLat = Number.isFinite(lat) ? lat.toFixed(4) : '13.0827'
    const safeLon = Number.isFinite(lon) ? lon.toFixed(4) : '80.2707'
    const query = encodeURIComponent(`What are the current ocean conditions, weather, and marine safety risks near ${label}?`)
    const targetUrl = `/ask-orca?latitude=${safeLat}&longitude=${safeLon}&label=${encodeURIComponent(label)}&query=${query}`
    if (navigate) {
      navigate(targetUrl)
    }
  }

  return (
    <div className="location-info-panel panel font-sans">
      <div className="panel-title">
        <div>
          <p className="eyebrow font-mono">SELECTED LOCATION</p>
          <h2 className="font-sans">📍 {label}</h2>
          <small className="location-coords font-mono">
            {Number.isFinite(lat) ? lat.toFixed(4) : '13.0827'}° N · {Number.isFinite(lon) ? lon.toFixed(4) : '80.2707'}° E
          </small>
        </div>
      </div>
      <p className="map-state font-sans">
        Monitoring locations and clicked coordinates are inputs for spatial analysis. Marine conditions, advisories, vessel activity, and PFZ data are retrieved directly from connected evidence sources.
      </p>
      <div className="panel-actions">
        <button
          type="button"
          className="ask-orca-link-btn glow font-sans"
          onClick={handleAskOrca}
        >
          <span>Ask ORCA about this area</span>
          <i>→</i>
        </button>
      </div>
    </div>
  )
}

