import { useCallback, useEffect, useMemo, useState } from 'react'
import MapSearch from '../components/mapExplorer/MapSearch'
import MapLayersControl from '../components/mapExplorer/MapLayersControl'
import MapLegend from '../components/mapExplorer/MapLegend'
import LocationInfoPanel from '../components/mapExplorer/LocationInfoPanel'
import MapCanvas from '../components/mapExplorer/MapCanvas'
import { dashboardLocations } from '../data/dashboardData'
import { analyzeLocation, analyzeRoute, getMapLayers, mapErrorMessage } from '../services/mapService'

const LOCATION_COORDINATES = { visakhapatnam: { latitude: 17.6868, longitude: 83.2185 }, chennai: { latitude: 13.0827, longitude: 80.2707 }, mumbai: { latitude: 19.076, longitude: 72.8777 } }

export default function MapExplorer({ navigate }) {
  const [locationId, setLocationId] = useState('visakhapatnam')
  const [layers, setLayers] = useState([])
  const [layersState, setLayersState] = useState({ loading: true, error: '' })
  const [selectedCoordinate, setSelectedCoordinate] = useState(null)
  const [analysis, setAnalysis] = useState({ loading: false, error: '', data: null })
  const [route, setRoute] = useState({ loading: false, error: '', data: null })
  const [destinationId, setDestinationId] = useState('chennai')
  const [isExpanded, setIsExpanded] = useState(false)
  const selectedLocation = useMemo(() => {
    const match = dashboardLocations.find((item) => item.id === locationId) || dashboardLocations[0]
    return { id: match.id, name: match.name, region: match.region, ...LOCATION_COORDINATES[match.id], label: match.name }
  }, [locationId])
  const activeLocation = selectedCoordinate || selectedLocation

  useEffect(() => {
    const controller = new AbortController()
    getMapLayers({ signal: controller.signal }).then((availableLayers) => {
      setLayers(availableLayers.map((layer) => ({ ...layer, enabled: false, features: [] })))
      setLayersState({ loading: false, error: '' })
    }).catch((error) => { if (error.name !== 'AbortError') setLayersState({ loading: false, error: mapErrorMessage(error) }) })
    return () => controller.abort()
  }, [])

  const handleMapLocation = useCallback((coordinate) => setSelectedCoordinate(coordinate), [])
  const handleSelectLocation = (id) => { setLocationId(id); setSelectedCoordinate(null) }
  const handleToggleLayer = (id) => setLayers((current) => current.map((layer) => layer.id === id ? { ...layer, enabled: !layer.enabled } : layer))
  const runAnalysis = async () => {
    setAnalysis({ loading: true, error: '', data: null })
    try { setAnalysis({ loading: false, error: '', data: await analyzeLocation({ location: activeLocation, analysis_type: 'hazard zone check', parameters: {} }) }) } catch (error) { setAnalysis({ loading: false, error: mapErrorMessage(error), data: null }) }
  }
  const runRoute = async () => {
    const destination = dashboardLocations.find((item) => item.id === destinationId)
    setRoute({ loading: true, error: '', data: null })
    try { setRoute({ loading: false, error: '', data: await analyzeRoute({ origin: activeLocation, destination: { ...LOCATION_COORDINATES[destination.id], label: destination.name }, constraints: {} }) }) } catch (error) { setRoute({ loading: false, error: mapErrorMessage(error), data: null }) }
  }
  const routeGeometry = route.data?.route?.geometry || null

  return <div className={`map-explorer-page ${isExpanded ? 'page-is-expanded' : ''}`}><section className="map-explorer-header"><div><p className="eyebrow">SPATIAL INTELLIGENCE</p><h1>Map Explorer</h1><p className="subhead">Explore configured GIS overlays and run source-backed spatial checks.</p></div><div className="map-header-controls"><MapSearch locations={dashboardLocations} onSelectLocation={handleSelectLocation} /><label className="location-dropdown-wrap"><span>MONITORING AREA</span><select value={locationId} onChange={(event) => handleSelectLocation(event.target.value)}>{dashboardLocations.map((item) => <option key={item.id} value={item.id}>📍 {item.name}</option>)}</select></label><button type="button" className="expand-toggle-btn" onClick={() => setIsExpanded((value) => !value)}>{isExpanded ? 'Restore' : 'Fullscreen'}</button></div></section>
    <div className="map-explorer-grid"><div className="map-primary-col"><MapCanvas selectedLocation={selectedLocation} layers={layers} routeGeometry={routeGeometry} onMapLocation={handleMapLocation} isExpanded={isExpanded} onToggleExpanded={() => setIsExpanded((value) => !value)} /><MapLegend layers={layers} routeGeometry={routeGeometry} /><section className="map-actions-panel panel"><div><p className="eyebrow">SPATIAL ANALYSIS</p><h2>Coordinate and route checks</h2></div><div className="map-action-grid"><div><p>Run the available zone check for {activeLocation.latitude.toFixed(4)}, {activeLocation.longitude.toFixed(4)}.</p><button type="button" className="ask-orca-link-btn" disabled={analysis.loading} onClick={runAnalysis}>{analysis.loading ? 'Analyzing…' : 'Analyze location'}</button>{analysis.error && <p className="map-state map-state-error">{analysis.error}</p>}{analysis.data && <p className="map-state"><strong>{analysis.data.status}</strong>: {analysis.data.message}</p>}</div><div><label className="route-label" htmlFor="route-destination">Route destination</label><select id="route-destination" value={destinationId} onChange={(event) => setDestinationId(event.target.value)}>{dashboardLocations.filter((item) => item.id !== locationId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button type="button" className="expand-toggle-btn" disabled={route.loading} onClick={runRoute}>{route.loading ? 'Calculating…' : 'Analyze route'}</button>{route.error && <p className="map-state map-state-error">{route.error}</p>}{route.data && <p className="map-state"><strong>{route.data.status}</strong>: {route.data.message}{route.data.route?.distance_km != null && ` (${route.data.route.distance_km} km)`}</p>}</div></div></section></div><div className="map-sidebar-col"><LocationInfoPanel location={selectedLocation} selectedCoordinate={selectedCoordinate} navigate={navigate} /><MapLayersControl layers={layers} loading={layersState.loading} error={layersState.error} onToggleLayer={handleToggleLayer} /></div></div></div>
}
