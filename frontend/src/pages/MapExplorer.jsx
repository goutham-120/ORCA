import { useCallback, useEffect, useMemo, useState } from 'react'
import MapSearch from '../components/mapExplorer/MapSearch'
import MapLayersControl from '../components/mapExplorer/MapLayersControl'
import MapLegend from '../components/mapExplorer/MapLegend'
import LocationInfoPanel from '../components/mapExplorer/LocationInfoPanel'
import MapCanvas from '../components/mapExplorer/MapCanvas'
import { dashboardLocations } from '../data/dashboardData'
import { analyzeLocation, analyzePFZ, analyzeRoute, getMapFeatures, getMapLayers, mapErrorMessage, syncPFZ } from '../services/mapService'

const LOCATION_COORDINATES = { visakhapatnam: { latitude: 17.6868, longitude: 83.2185 }, chennai: { latitude: 13.0827, longitude: 80.2707 }, mumbai: { latitude: 19.076, longitude: 72.8777 } }

export default function MapExplorer({ navigate }) {
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), [])
  const initialLatitudeValue = searchParams.get('latitude') || searchParams.get('lat')
  const initialLongitudeValue = searchParams.get('longitude') || searchParams.get('lon')
  const initialLatitude = Number(initialLatitudeValue)
  const initialLongitude = Number(initialLongitudeValue)
  const initialLabel = searchParams.get('label') || 'Selected map coordinate'
  const hasInitialCoordinate = Boolean(initialLatitudeValue?.trim() && initialLongitudeValue?.trim()) && Number.isFinite(initialLatitude) && Number.isFinite(initialLongitude)
  const [locationId, setLocationId] = useState('chennai')
  const [layers, setLayers] = useState([])
  const [layersState, setLayersState] = useState({ loading: true, error: '' })
  const [selectedCoordinate, setSelectedCoordinate] = useState(() => hasInitialCoordinate ? { latitude: initialLatitude, longitude: initialLongitude, label: initialLabel } : null)
  const [analysis, setAnalysis] = useState({ loading: false, error: '', data: null })
  const [route, setRoute] = useState({ loading: false, error: '', data: null })
  const [pfz, setPFZ] = useState({ loading: false, error: '', data: null })
  const [pfzSync, setPFZSync] = useState({ loading: false, error: '', message: '' })
  const [destinationId, setDestinationId] = useState('chennai')
  const [isExpanded, setIsExpanded] = useState(false)
  const curatedLocation = useMemo(() => {
    const match = dashboardLocations.find((item) => item.id === locationId) || dashboardLocations[0]
    return { id: match.id, name: match.name, region: match.region, ...LOCATION_COORDINATES[match.id], label: match.name }
  }, [locationId])
  const selectedLocation = selectedCoordinate || curatedLocation
  const activeLocation = selectedLocation

  const fetchLayers = useCallback(async (signal) => {
    const availableLayers = await getMapLayers({ signal })
    const availableIds = availableLayers.filter((layer) => layer.available).map((layer) => layer.id)
    const features = await getMapFeatures(availableIds, { signal })
    return availableLayers.map((layer) => {
      const persistedFeatures = features.filter((feature) => (feature.layer || feature.dataset).toLowerCase() === layer.id.toLowerCase())
      const allFeatures = persistedFeatures.length > 0 ? persistedFeatures : (layer.features || [])
      const count = allFeatures.length
      return {
        ...layer,
        available: count > 0,
        feature_count: count,
        enabled: layer.id.toLowerCase() === 'pfz' ? count > 0 : Boolean(layer.enabled),
        features: allFeatures,
      }
    })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchLayers(controller.signal).then((nextLayers) => { setLayers(nextLayers); setLayersState({ loading: false, error: '' }) }).catch((error) => { if (error.name !== 'AbortError') setLayersState({ loading: false, error: mapErrorMessage(error) }) })
    return () => controller.abort()
  }, [fetchLayers])

  useEffect(() => {
    const handleCustomCoord = (event) => {
      if (event.detail && Number.isFinite(event.detail.latitude) && Number.isFinite(event.detail.longitude)) {
        setSelectedCoordinate({
          latitude: event.detail.latitude,
          longitude: event.detail.longitude,
          label: event.detail.label || 'Selected map coordinate',
        })
      }
    }
    window.addEventListener('orca-select-coord', handleCustomCoord)
    return () => window.removeEventListener('orca-select-coord', handleCustomCoord)
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
  const runPFZ = async () => {
    setPFZ({ loading: true, error: '', data: null })
    try { setPFZ({ loading: false, error: '', data: await analyzePFZ({ location: activeLocation }) }) } catch (error) { setPFZ({ loading: false, error: mapErrorMessage(error), data: null }) }
  }
  const refreshPFZ = async () => {
    setPFZSync({ loading: true, error: '', message: '' })
    try {
      const result = await syncPFZ()
      const nextLayers = await fetchLayers()
      setLayers(nextLayers)
      setPFZSync({ loading: false, error: '', message: `${result.persisted ?? 0} PFZ feature(s) loaded and displayed.` })
    } catch (error) { setPFZSync({ loading: false, error: mapErrorMessage(error), message: '' }) }
  }
  const routeGeometry = route.data?.route?.geometry || null

  return <div className={`map-explorer-page ${isExpanded ? 'page-is-expanded' : ''}`}><section className="map-explorer-header"><div><p className="eyebrow">SPATIAL INTELLIGENCE</p><h1>Map Explorer</h1><p className="subhead">Explore configured GIS overlays and run source-backed spatial checks.</p></div><div className="map-header-controls"><MapSearch locations={dashboardLocations} onSelectLocation={handleSelectLocation} /><label className="location-dropdown-wrap"><span>MONITORING AREA</span><select value={locationId} onChange={(event) => handleSelectLocation(event.target.value)}>{dashboardLocations.map((item) => <option key={item.id} value={item.id}>📍 {item.name}</option>)}</select></label><button type="button" className="expand-toggle-btn" onClick={() => setIsExpanded((value) => !value)}>{isExpanded ? 'Restore' : 'Fullscreen'}</button></div></section>
    <div className="map-explorer-grid"><div className="map-primary-col"><MapCanvas selectedLocation={selectedLocation} layers={layers} routeGeometry={routeGeometry} onMapLocation={handleMapLocation} isExpanded={isExpanded} onToggleExpanded={() => setIsExpanded((value) => !value)} /><MapLegend layers={layers} routeGeometry={routeGeometry} /><section className="map-actions-panel panel"><div><p className="eyebrow">SPATIAL ANALYSIS</p><h2>Coordinate and route checks</h2></div><div className="map-action-grid"><div><p>Run the available zone check for {activeLocation.latitude.toFixed(4)}, {activeLocation.longitude.toFixed(4)}.</p><button type="button" className="ask-orca-link-btn" disabled={analysis.loading} onClick={runAnalysis}>{analysis.loading ? 'Analyzing…' : 'Analyze location'}</button>{analysis.error && <p className="map-state map-state-error">{analysis.error}</p>}{analysis.data && <p className="map-state"><strong>{analysis.data.status}</strong>: {analysis.data.message}</p>}</div><div><label className="route-label" htmlFor="route-destination">Route destination</label><select id="route-destination" value={destinationId} onChange={(event) => setDestinationId(event.target.value)}>{dashboardLocations.filter((item) => item.id !== locationId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button type="button" className="expand-toggle-btn" disabled={route.loading} onClick={runRoute}>{route.loading ? 'Calculating…' : 'Analyze route'}</button>{route.error && <p className="map-state map-state-error">{route.error}</p>}{route.data && <p className="map-state"><strong>{route.data.status}</strong>: {route.data.message}{route.data.route?.distance_km != null && ` (${route.data.route.distance_km} km)`}</p>}</div><div><p>Check authorized PFZ evidence and current marine suitability for this coordinate.</p><button type="button" className="ask-orca-link-btn" disabled={pfz.loading} onClick={runPFZ}>{pfz.loading ? 'Checking PFZ…' : 'Check PFZ suitability'}</button>{pfz.error && <p className="map-state map-state-error">{pfz.error}</p>}{pfz.data && <p className="map-state"><strong>{pfz.data.suitability}</strong>: {pfz.data.assessment}</p>}<button type="button" className="expand-toggle-btn" disabled={pfzSync.loading} onClick={refreshPFZ}>{pfzSync.loading ? 'Refreshing PFZ…' : 'Refresh PFZ source'}</button>{pfzSync.error && <p className="map-state map-state-error">{pfzSync.error}</p>}{pfzSync.message && <p className="map-state">{pfzSync.message} Reload the map to display refreshed features.</p>}</div></div></section></div><div className="map-sidebar-col"><LocationInfoPanel location={selectedLocation} selectedCoordinate={selectedCoordinate} navigate={navigate} /><MapLayersControl layers={layers} loading={layersState.loading} error={layersState.error} onToggleLayer={handleToggleLayer} /></div></div></div>
}
