import { useEffect, useRef, useState } from 'react'
import { Map, Marker, NavigationControl, Popup } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const DEFAULT_STYLE = import.meta.env.VITE_MAP_STYLE_URL || 'https://demotiles.maplibre.org/style.json'
const featureCollection = (features) => ({ type: 'FeatureCollection', features })

export default function MapCanvas({ selectedLocation, layers, routeGeometry, onMapLocation, isExpanded, onToggleExpanded }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const initialLocationRef = useRef(selectedLocation)
  const locationHandlerRef = useRef(onMapLocation)
  const [mapStatus, setMapStatus] = useState('loading')

  useEffect(() => { locationHandlerRef.current = onMapLocation }, [onMapLocation])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined
    const initialLocation = initialLocationRef.current
    const map = new Map({ container: containerRef.current, style: DEFAULT_STYLE, center: [initialLocation.longitude, initialLocation.latitude], zoom: 7 })
    mapRef.current = map
    map.addControl(new NavigationControl(), 'top-right')
    map.on('load', () => {
      map.addSource('orca-layers', { type: 'geojson', data: featureCollection([]) })
      map.addLayer({ id: 'orca-fill', type: 'fill', source: 'orca-layers', filter: ['==', '$type', 'Polygon'], paint: { 'fill-color': '#f59e0b', 'fill-opacity': 0.25 } })
      map.addLayer({ id: 'orca-line', type: 'line', source: 'orca-layers', filter: ['==', '$type', 'LineString'], paint: { 'line-color': '#38bdf8', 'line-width': 3 } })
      map.addLayer({ id: 'orca-point', type: 'circle', source: 'orca-layers', filter: ['==', '$type', 'Point'], paint: { 'circle-radius': 6, 'circle-color': '#ef4444', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } })
      setMapStatus('ready')
    })
    map.on('error', () => setMapStatus('error'))
    map.on('click', (event) => locationHandlerRef.current({ latitude: event.lngLat.lat, longitude: event.lngLat.lng, label: 'Selected map coordinate' }))
    return () => { map.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || mapStatus !== 'ready') return
    const features = layers.filter((layer) => layer.enabled && Array.isArray(layer.features)).flatMap((layer) => layer.features).map((feature) => ({ type: 'Feature', geometry: feature.geometry || feature, properties: feature.properties || {} }))
    if (routeGeometry) features.push({ type: 'Feature', geometry: routeGeometry, properties: { kind: 'route' } })
    map.getSource('orca-layers')?.setData(featureCollection(features))
  }, [layers, routeGeometry, mapStatus])

  useEffect(() => {
    const map = mapRef.current
    if (!map || mapStatus !== 'ready') return
    markerRef.current?.remove()
    markerRef.current = new Marker({ color: '#0ea5e9' }).setLngLat([selectedLocation.longitude, selectedLocation.latitude]).setPopup(new Popup({ offset: 20 }).setText(`${selectedLocation.name} (curated monitoring location)`)).addTo(map)
    map.flyTo({ center: [selectedLocation.longitude, selectedLocation.latitude], zoom: Math.max(map.getZoom(), 7), essential: true })
  }, [selectedLocation, mapStatus])

  useEffect(() => { mapRef.current?.resize() }, [isExpanded])

  return <div className={`map-canvas-container ${isExpanded ? 'is-expanded-canvas' : ''}`}>
    <div className="canvas-toolbar"><span className="demo-indicator">{mapStatus === 'ready' ? 'MapLibre basemap • GIS overlays are source-backed' : mapStatus === 'error' ? 'Basemap unavailable' : 'Loading map…'}</span><div className="canvas-actions">
      <button type="button" className="canvas-btn" onClick={() => mapRef.current?.zoomIn()} aria-label="Zoom in">+</button><button type="button" className="canvas-btn" onClick={() => mapRef.current?.zoomOut()} aria-label="Zoom out">−</button><button type="button" className="canvas-btn" onClick={() => mapRef.current?.flyTo({ center: [selectedLocation.longitude, selectedLocation.latitude], zoom: 7 })}>⌖</button><button type="button" className="canvas-btn" onClick={onToggleExpanded}>{isExpanded ? 'Exit' : 'Fullscreen'}</button>
    </div></div><div ref={containerRef} className="maplibre-viewport" />{mapStatus === 'error' && <div className="map-unavailable">Basemap unavailable. GIS controls remain available when the API is reachable.</div>}
  </div>
}
