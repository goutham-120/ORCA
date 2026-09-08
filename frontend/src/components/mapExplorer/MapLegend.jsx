export default function MapLegend({ layers, routeGeometry }) {
  const active = layers.filter((layer) => layer.enabled)
  return <div className="map-legend-box panel"><p className="eyebrow">MAP LEGEND</p><div className="legend-items-list">{active.map((layer) => <div className="legend-item" key={layer.id}><span className="legend-label">{layer.name}</span><small>{layer.description}</small></div>)}{routeGeometry && <div className="legend-item"><span className="legend-label">Route geometry</span><small>Calculated from selected endpoints</small></div>}{!active.length && !routeGeometry && <span className="no-layers-text">No GIS overlays active</span>}</div></div>
}
