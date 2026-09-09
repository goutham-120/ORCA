export default function LocationInfoPanel({ location, selectedCoordinate, navigate }) {
  const coordinate = selectedCoordinate || location
  const label = coordinate.label || location.name

  const handleAskOrca = () => {
    const lat = coordinate.latitude.toFixed(4)
    const lon = coordinate.longitude.toFixed(4)
    const query = encodeURIComponent(`What are the current ocean conditions, weather, and marine safety risks near ${label}?`)
    const targetUrl = `/ask-orca?latitude=${lat}&longitude=${lon}&label=${encodeURIComponent(label)}&query=${query}`
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
            {coordinate.latitude.toFixed(4)}° N · {coordinate.longitude.toFixed(4)}° E
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
