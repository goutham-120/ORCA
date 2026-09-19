import { Component, useCallback, useEffect, useMemo, useState } from 'react'
import MapSearch from '../components/mapExplorer/MapSearch'
import MapLayersControl from '../components/mapExplorer/MapLayersControl'
import MapLegend from '../components/mapExplorer/MapLegend'
import LocationInfoPanel from '../components/mapExplorer/LocationInfoPanel'
import MapCanvas from '../components/mapExplorer/MapCanvas'
import { dashboardLocations } from '../data/dashboardData'
import {
  analyzeLocation,
  analyzePFZ,
  analyzeRoute,
  findNearestSuitablePFZ,
  getMapFeatures,
  getMapLayers,
  mapErrorMessage,
  syncPFZ,
} from '../services/mapService'

class ComponentErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[MapExplorer Section Notice] Component error in ${this.props.name || 'section'}:`, error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="map-state map-state-error panel" style={{ padding: '16px', margin: '12px 0' }}>
          <strong>⚠️ {this.props.name || 'Component'} Notice:</strong> Unable to render this section. (
          {this.state.error?.message || 'Component unavailable'})
        </div>
      )
    }
    return this.props.children
  }
}

const LOCATION_COORDINATES = {
  visakhapatnam: { latitude: 17.6868, longitude: 83.2185 },
  chennai: { latitude: 13.0827, longitude: 80.2707 },
  mumbai: { latitude: 19.076, longitude: 72.8777 },
}

function flattenCoordinates(geometry) {
  if (!geometry || !Array.isArray(geometry.coordinates)) return []
  const values = geometry.coordinates.flat(Infinity)
  const points = []
  for (let i = 0; i < values.length - 1; i += 2) {
    const lon = Number(values[i])
    const lat = Number(values[i + 1])
    if (Number.isFinite(lon) && Number.isFinite(lat)) points.push([lon, lat])
  }
  return points
}

function representativePoint(geometry) {
  const pts = flattenCoordinates(geometry)
  if (!pts.length) return null
  const lon = pts.reduce((s, p) => s + p[0], 0) / pts.length
  const lat = pts.reduce((s, p) => s + p[1], 0) / pts.length
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null
  return [lon, lat]
}

function calcDistanceKm(first, second) {
  if (!first || !second || first.length < 2 || second.length < 2) return Infinity
  const rad = (v) => (v * Math.PI) / 180
  const dLat = rad(second[1] - first[1])
  const dLon = rad(second[0] - first[0])
  const lat1 = rad(first[1])
  const lat2 = rad(second[1])
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function findNearestPFZCoordinate(origin, layers) {
  if (!origin || !Array.isArray(layers)) return null
  const pfzLayer = layers.find((l) => String(l?.id || '').toLowerCase() === 'pfz')
  if (!pfzLayer || !Array.isArray(pfzLayer.features) || !pfzLayer.features.length) {
    return null
  }
  const originPt = [Number(origin.longitude), Number(origin.latitude)]
  if (!Number.isFinite(originPt[0]) || !Number.isFinite(originPt[1])) return null

  let nearest = null
  let minDistance = Infinity

  for (const feature of pfzLayer.features) {
    if (!feature) continue
    const geom = feature.geometry || feature
    const pt = representativePoint(geom)
    if (!pt) continue
    const dist = calcDistanceKm(originPt, pt)
    if (dist < minDistance) {
      minDistance = dist
      nearest = {
        latitude: pt[1],
        longitude: pt[0],
        label: `Nearest PFZ (${feature.id || 'Zone'})`,
        distance_km: Math.round(dist * 10) / 10,
      }
    }
  }
  return nearest
}

export default function MapExplorer({ navigate }) {
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), [])
  const initialLatitudeValue = searchParams.get('latitude') || searchParams.get('lat')
  const initialLongitudeValue = searchParams.get('longitude') || searchParams.get('lon')
  const initialLatitude = Number(initialLatitudeValue)
  const initialLongitude = Number(initialLongitudeValue)
  const initialLabel = searchParams.get('label') || 'Selected map coordinate'
  const hasInitialCoordinate =
    Boolean(initialLatitudeValue?.trim() && initialLongitudeValue?.trim()) &&
    Number.isFinite(initialLatitude) &&
    Number.isFinite(initialLongitude)

  const [locationId, setLocationId] = useState('chennai')
  const [layers, setLayers] = useState([])
  const [layersState, setLayersState] = useState({ loading: true, error: '' })
  const [selectedCoordinate, setSelectedCoordinate] = useState(() =>
    hasInitialCoordinate
      ? { latitude: initialLatitude, longitude: initialLongitude, label: initialLabel }
      : null
  )
  const [analysis, setAnalysis] = useState({ loading: false, error: '', data: null })
  const [route, setRoute] = useState({ loading: false, error: '', data: null })
  const [pfz, setPFZ] = useState({ loading: false, error: '', data: null })
  const [pfzSync, setPFZSync] = useState({ loading: false, error: '', message: '' })

  // Nearest Suitable PFZ state
  const [searchRadius, setSearchRadius] = useState(50)
  const [nearestPFZ, setNearestPFZ] = useState({ loading: false, error: '', data: null })

  const [destinationId, setDestinationId] = useState('nearest_pfz')
  const [isExpanded, setIsExpanded] = useState(false)

  const pfzEvaluations = useMemo(() => {
    const map = {}
    if (nearestPFZ.data && Array.isArray(nearestPFZ.data.all_pfzs)) {
      nearestPFZ.data.all_pfzs.forEach((item) => {
        if (!item) return
        if (item.id != null) {
          map[String(item.id).toLowerCase()] = item
        }
        if (item.properties?.id != null) {
          map[String(item.properties.id).toLowerCase()] = item
        }
      })
    }
    return map
  }, [nearestPFZ.data])

  const curatedLocation = useMemo(() => {
    const safeLocations = Array.isArray(dashboardLocations) ? dashboardLocations : []
    const match = safeLocations.find((item) => item?.id === locationId) || safeLocations[0] || { id: 'chennai', name: 'Chennai', region: 'Tamil Nadu' }
    const coords = LOCATION_COORDINATES[match.id] || LOCATION_COORDINATES.chennai
    return {
      id: match.id,
      name: match.name,
      region: match.region,
      ...coords,
      label: match.name,
    }
  }, [locationId])

  const selectedLocation = selectedCoordinate || curatedLocation
  const activeLocation = selectedLocation

  useEffect(() => {
    let isSubscribed = true
    const controller = new AbortController()

    const lat = Number(activeLocation?.latitude)
    const lon = Number(activeLocation?.longitude)

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return undefined
    }

    findNearestSuitablePFZ({
      latitude: lat,
      longitude: lon,
      radiusKm: Number(searchRadius) || 50,
      signal: controller.signal,
    })
      .then((data) => {
        if (isSubscribed) {
          setNearestPFZ({ loading: false, error: '', data })
        }
      })
      .catch((error) => {
        if (isSubscribed && error.name !== 'AbortError') {
          console.warn('PFZ evaluation fetch notice:', mapErrorMessage(error))
          setNearestPFZ({ loading: false, error: 'Unable to load PFZ data.', data: null })
        }
      })

    return () => {
      isSubscribed = false
      controller.abort()
    }
  }, [activeLocation?.latitude, activeLocation?.longitude, searchRadius])

  const fetchLayers = useCallback(async (signal) => {
    try {
      const availableLayers = await getMapLayers({ signal })
      if (!Array.isArray(availableLayers)) return []

      const availableIds = availableLayers
        .filter((layer) => layer?.available)
        .map((layer) => layer.id)
        .filter(Boolean)

      const features = await getMapFeatures(availableIds, { signal }).catch(() => [])
      const safeFeatures = Array.isArray(features) ? features : []

      return availableLayers.map((layer) => {
        if (!layer) return null
        const layerIdStr = String(layer.id || '').toLowerCase()
        const persistedFeatures = safeFeatures.filter((feature) => {
          if (!feature) return false
          const featLayerStr = String(feature.layer || feature.dataset || '').toLowerCase()
          return featLayerStr === layerIdStr
        })
        const allFeatures = persistedFeatures.length > 0 ? persistedFeatures : (Array.isArray(layer.features) ? layer.features : [])
        const count = allFeatures.length
        return {
          ...layer,
          available: count > 0,
          feature_count: count,
          enabled: layer.enabled !== undefined ? Boolean(layer.enabled) : count > 0,
          features: allFeatures,
        }
      }).filter(Boolean)
    } catch (e) {
      console.warn('Failed to fetch GIS layers:', e)
      return []
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchLayers(controller.signal)
      .then((nextLayers) => {
        setLayers(nextLayers)
        setLayersState({ loading: false, error: '' })
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setLayersState({ loading: false, error: mapErrorMessage(error) })
      })
    return () => controller.abort()
  }, [fetchLayers])

  useEffect(() => {
    const handleCustomCoord = (event) => {
      if (
        event.detail &&
        Number.isFinite(event.detail.latitude) &&
        Number.isFinite(event.detail.longitude)
      ) {
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
  const handleSelectLocation = (id) => {
    setLocationId(id)
    setSelectedCoordinate(null)
  }
  const handleToggleLayer = (id) =>
    setLayers((current) =>
      (Array.isArray(current) ? current : []).map((layer) => (layer?.id === id ? { ...layer, enabled: !layer.enabled } : layer))
    )

  const runAnalysis = async () => {
    setAnalysis({ loading: true, error: '', data: null })
    try {
      setAnalysis({
        loading: false,
        error: '',
        data: await analyzeLocation({ location: activeLocation, analysis_type: 'hazard zone check', parameters: {} }),
      })
    } catch (error) {
      setAnalysis({ loading: false, error: mapErrorMessage(error), data: null })
    }
  }

  const runRoute = async (targetDest = null) => {
    setRoute({ loading: true, error: '', data: null })
    try {
      let destCoord = targetDest
      if (!destCoord) {
        if (destinationId === 'nearest_pfz') {
          const nearest = findNearestPFZCoordinate(activeLocation, layers)
          if (!nearest) {
            throw new Error('No PFZ features available. Click "Refresh PFZ source" to load INCOIS PFZ data.')
          }
          destCoord = {
            latitude: nearest.latitude,
            longitude: nearest.longitude,
            label: `${nearest.label} (${nearest.distance_km} km)`,
          }
        } else {
          const safeLocations = Array.isArray(dashboardLocations) ? dashboardLocations : []
          const destObj = safeLocations.find((item) => item.id === destinationId)
          if (destObj) {
            destCoord = { ...LOCATION_COORDINATES[destObj.id], label: destObj.name }
          }
        }
      }
      if (!destCoord) {
        throw new Error('Please select a valid route destination.')
      }
      const data = await analyzeRoute({ origin: activeLocation, destination: destCoord, constraints: {} })
      setRoute({ loading: false, error: '', data })
    } catch (error) {
      setRoute({ loading: false, error: mapErrorMessage(error), data: null })
    }
  }

  const runPFZ = async () => {
    setPFZ({ loading: true, error: '', data: null })
    try {
      setPFZ({ loading: false, error: '', data: await analyzePFZ({ location: activeLocation }) })
    } catch (error) {
      setPFZ({ loading: false, error: mapErrorMessage(error), data: null })
    }
  }

  const runNearestSuitablePFZ = async () => {
    setNearestPFZ({ loading: true, error: '', data: null })
    try {
      const data = await findNearestSuitablePFZ({
        latitude: activeLocation.latitude,
        longitude: activeLocation.longitude,
        radiusKm: Number(searchRadius) || 50,
      })
      setNearestPFZ({ loading: false, error: '', data })
    } catch (error) {
      setNearestPFZ({ loading: false, error: mapErrorMessage(error), data: null })
    }
  }

  const refreshPFZ = async () => {
    setPFZSync({ loading: true, error: '', message: '' })
    try {
      const result = await syncPFZ()
      const nextLayers = await fetchLayers()
      setLayers(nextLayers)
      setPFZSync({
        loading: false,
        error: '',
        message: `${result?.persisted ?? 0} PFZ feature(s) loaded and displayed.`,
      })
    } catch (error) {
      setPFZSync({ loading: false, error: mapErrorMessage(error), message: '' })
    }
  }

  const routeGeometry = route.data?.route?.geometry || null
  const safeDashboardLocations = Array.isArray(dashboardLocations) ? dashboardLocations : []
  const activeLat = Number(activeLocation?.latitude)
  const activeLon = Number(activeLocation?.longitude)

  return (
    <div className={`map-explorer-page ${isExpanded ? 'page-is-expanded' : ''}`}>
      <section className="map-explorer-header">
        <div>
          <p className="eyebrow">SPATIAL INTELLIGENCE</p>
          <h1>Map Explorer</h1>
          <p className="subhead">Explore configured GIS overlays and run source-backed spatial checks.</p>
        </div>
        <div className="map-header-controls">
          <MapSearch locations={safeDashboardLocations} onSelectLocation={handleSelectLocation} />
          <label className="location-dropdown-wrap">
            <span>MONITORING AREA</span>
            <select value={locationId} onChange={(event) => handleSelectLocation(event.target.value)}>
              {safeDashboardLocations.map((item) => (
                <option key={item.id} value={item.id}>
                  📍 {item.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="expand-toggle-btn"
            onClick={() => setIsExpanded((value) => !value)}
          >
            {isExpanded ? 'Restore' : 'Fullscreen'}
          </button>
        </div>
      </section>

      <div className="map-explorer-grid">
        <div className="map-primary-col">
          <ComponentErrorBoundary name="Map Canvas">
            <MapCanvas
              selectedLocation={selectedLocation}
              layers={layers}
              routeGeometry={routeGeometry}
              radiusKm={Number(searchRadius) || 50}
              pfzEvaluations={pfzEvaluations}
              selectedPFZGeometry={nearestPFZ.data?.selected_geometry || null}
              pfzRouteGeometry={nearestPFZ.data?.route_geometry || null}
              onMapLocation={handleMapLocation}
              isExpanded={isExpanded}
              onToggleExpanded={() => setIsExpanded((value) => !value)}
            />
          </ComponentErrorBoundary>

          <ComponentErrorBoundary name="Map Legend">
            <MapLegend layers={layers} routeGeometry={routeGeometry} />
          </ComponentErrorBoundary>

          {/* NEAREST SUITABLE PFZ SEARCH CONTROLS & RESULTS PANEL */}
          <section className="pfz-discovery-section panel" style={{ marginTop: '16px' }}>
            <div className="pfz-discovery-header">
              <div>
                <p className="eyebrow">POTENTIAL FISHING ZONE (PFZ) ENGINE</p>
                <h2>Nearest Suitable PFZ Discovery</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}>
                  Find the closest INCOIS PFZ within your search radius evaluated against Weather, Ocean, and GIS evidence.
                </p>
              </div>
            </div>

            <div className="pfz-controls-bar">
              <div className="radius-control-wrap">
                <label htmlFor="search-radius-slider">
                  Search Radius: <strong>{searchRadius} km</strong>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    id="search-radius-slider"
                    type="range"
                    min="5"
                    max="200"
                    step="5"
                    value={searchRadius}
                    onChange={(e) => setSearchRadius(Number(e.target.value) || 50)}
                    style={{ flex: 1, accentColor: '#0284c7' }}
                  />
                  <input
                    id="search-radius-number"
                    type="number"
                    min="5"
                    max="200"
                    value={searchRadius}
                    onChange={(e) => setSearchRadius(Math.max(5, Math.min(200, Number(e.target.value) || 50)))}
                    style={{ width: '70px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                  <span style={{ fontSize: '12px', color: '#64748b' }}>km</span>
                </div>
              </div>

              <button
                type="button"
                className="find-pfz-btn"
                disabled={nearestPFZ.loading}
                onClick={runNearestSuitablePFZ}
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '14px',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)',
                  transition: 'all 0.2s ease',
                }}
              >
                {nearestPFZ.loading ? '⚡ Evaluating Weather + Ocean + GIS…' : '🐟 Find Nearest Suitable PFZ'}
              </button>
            </div>

            {nearestPFZ.error && (
              <div className="map-state map-state-error" style={{ marginTop: '12px' }}>
                ⚠️ {nearestPFZ.error}
              </div>
            )}

            {/* RESULTS DISPLAY PANEL */}
            {nearestPFZ.data && (
              <div className="pfz-results-panel" style={{ marginTop: '16px', background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                
                {/* SIMPLE FISHERMAN VISUAL NOTICE */}
                <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', padding: '12px 16px', borderRadius: '8px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>🟢</span>
                    <div>
                      <strong style={{ color: '#15803d', fontSize: '14px', display: 'block' }}>
                        NEARBY FISHING ZONES (GREEN PFZs ON MAP)
                      </strong>
                      <span style={{ color: '#166534', fontSize: '12px' }}>
                        PFZs highlighted in GREEN on the map are inside your selected search area ({searchRadius} km).
                      </span>
                    </div>
                  </div>
                  <div style={{ background: '#ffffff', color: '#15803d', padding: '6px 14px', borderRadius: '20px', fontWeight: 800, fontSize: '13px', border: '1px solid #86efac' }}>
                    {Array.isArray(nearestPFZ.data.candidate_pfzs) ? nearestPFZ.data.candidate_pfzs.length : 0} PFZ(s) within radius
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>⭐ 🟢</span> Nearest Suitable PFZ Assessment
                  </h3>
                  <span
                    className={`status-badge status-${nearestPFZ.data.overall_suitability || 'unknown'}`}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      background:
                        nearestPFZ.data.overall_suitability === 'suitable'
                          ? '#dcfce7'
                          : nearestPFZ.data.overall_suitability === 'unsuitable'
                          ? '#fee2e2'
                          : nearestPFZ.data.overall_suitability === 'data_unavailable'
                          ? '#fef3c7'
                          : '#f1f5f9',
                      color:
                        nearestPFZ.data.overall_suitability === 'suitable'
                          ? '#15803d'
                          : nearestPFZ.data.overall_suitability === 'unsuitable'
                          ? '#b91c1c'
                          : nearestPFZ.data.overall_suitability === 'data_unavailable'
                          ? '#b45309'
                          : '#475569',
                    }}
                  >
                    {nearestPFZ.data.overall_suitability || 'N/A'}
                  </span>
                </div>

                {nearestPFZ.data.overall_suitability === 'suitable' && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', padding: '10px 14px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px', fontWeight: 600 }}>
                    ✅ Suitable PFZ Found: <strong>{nearestPFZ.data.selected_pfz?.name || 'PFZ'}</strong> ({nearestPFZ.data.distance_km} km away)
                  </div>
                )}
                {nearestPFZ.data.overall_suitability === 'no_pfz_found' && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '10px 14px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px', fontWeight: 600 }}>
                    ⚠️ No PFZ found within the selected radius.
                  </div>
                )}
                {nearestPFZ.data.overall_suitability === 'unsuitable' && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '10px 14px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px', fontWeight: 600 }}>
                    ⚠️ PFZs were found within the radius, but none passed the suitability checks.
                  </div>
                )}
                {nearestPFZ.data.overall_suitability === 'data_unavailable' && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '10px 14px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px', fontWeight: 600 }}>
                    ⚠️ PFZs were found, but some evidence sources are unavailable.
                  </div>
                )}

                <div className="pfz-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <small style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>SELECTED LOCATION</small>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                      {Number.isFinite(activeLat) ? activeLat.toFixed(4) : '0.0000'}°N, {Number.isFinite(activeLon) ? activeLon.toFixed(4) : '0.0000'}°E
                    </strong>
                  </div>

                  <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <small style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>SEARCH RADIUS</small>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>{nearestPFZ.data.requested_radius_km ?? searchRadius} km</strong>
                  </div>

                  <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <small style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>SELECTED PFZ</small>
                    <strong style={{ fontSize: '13px', color: '#0284c7' }}>
                      {nearestPFZ.data.selected_pfz?.name || 'None within radius'}
                    </strong>
                  </div>

                  <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <small style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>GEOGRAPHIC DISTANCE</small>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                      {nearestPFZ.data.distance_km != null ? `${nearestPFZ.data.distance_km} km` : 'N/A'}
                    </strong>
                  </div>
                </div>

                {/* 3 EVIDENCE SOURCES STATUS BAR */}
                <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#475569' }}>Multi-Source Evidence Breakdown</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                    <div style={{ padding: '8px', borderRadius: '6px', background: '#f8fafc', borderLeft: '3px solid #0ea5e9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>🌤️ Weather</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: nearestPFZ.data.weather_status === 'suitable' ? '#15803d' : nearestPFZ.data.weather_status === 'unsuitable' ? '#dc2626' : '#64748b' }}>
                          {(nearestPFZ.data.weather_status || 'N/A').toUpperCase()}
                        </span>
                      </div>
                      <small style={{ fontSize: '11px', color: '#475569' }}>{nearestPFZ.data.weather_evidence?.summary || 'No weather summary'}</small>
                    </div>

                    <div style={{ padding: '8px', borderRadius: '6px', background: '#f8fafc', borderLeft: '3px solid #0284c7' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>🌊 Ocean</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: nearestPFZ.data.ocean_status === 'suitable' ? '#15803d' : nearestPFZ.data.ocean_status === 'unsuitable' ? '#dc2626' : '#64748b' }}>
                          {(nearestPFZ.data.ocean_status || 'N/A').toUpperCase()}
                        </span>
                      </div>
                      <small style={{ fontSize: '11px', color: '#475569' }}>{nearestPFZ.data.ocean_evidence?.summary || 'No ocean summary'}</small>
                    </div>

                    <div style={{ padding: '8px', borderRadius: '6px', background: '#f8fafc', borderLeft: '3px solid #10b981' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>🗺️ GIS</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: nearestPFZ.data.gis_status === 'suitable' ? '#15803d' : nearestPFZ.data.gis_status === 'unsuitable' ? '#dc2626' : '#64748b' }}>
                          {(nearestPFZ.data.gis_status || 'N/A').toUpperCase()}
                        </span>
                      </div>
                      <small style={{ fontSize: '11px', color: '#475569' }}>{nearestPFZ.data.gis_evidence?.summary || 'No GIS summary'}</small>
                    </div>
                  </div>
                </div>

                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px 12px', borderRadius: '6px', marginBottom: '14px' }}>
                  <small style={{ color: '#1e40af', fontWeight: 600, display: 'block', marginBottom: '2px' }}>SELECTION RATIONALE</small>
                  <p style={{ margin: 0, fontSize: '12px', color: '#1e3a8a' }}>{nearestPFZ.data.reason || 'No evaluation rationale provided.'}</p>
                </div>

                {/* CANDIDATES TABLE */}
                {Array.isArray(nearestPFZ.data.candidate_pfzs) && nearestPFZ.data.candidate_pfzs.length > 0 && (
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#334155' }}>
                      Candidate PFZs Evaluated Inside {nearestPFZ.data.requested_radius_km ?? searchRadius} km Radius ({nearestPFZ.data.candidate_pfzs.length})
                    </h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left', background: '#ffffff', borderRadius: '6px', overflow: 'hidden' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '8px 10px' }}>PFZ Name / ID</th>
                            <th style={{ padding: '8px 10px' }}>Distance</th>
                            <th style={{ padding: '8px 10px' }}>Weather</th>
                            <th style={{ padding: '8px 10px' }}>Ocean</th>
                            <th style={{ padding: '8px 10px' }}>GIS</th>
                            <th style={{ padding: '8px 10px' }}>Suitability</th>
                          </tr>
                        </thead>
                        <tbody>
                          {nearestPFZ.data.candidate_pfzs.map((cand) => (
                            <tr
                              key={cand?.id || Math.random()}
                              style={{
                                borderBottom: '1px solid #f1f5f9',
                                background: nearestPFZ.data?.selected_pfz?.id === cand?.id ? '#f0fdf4' : '#ffffff',
                              }}
                            >
                              <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>
                                {cand?.name || 'PFZ Feature'} {nearestPFZ.data?.selected_pfz?.id === cand?.id && '⭐ (SELECTED)'}
                              </td>
                              <td style={{ padding: '8px 10px' }}>{cand?.distance_km != null ? `${cand.distance_km} km` : 'N/A'}</td>
                              <td style={{ padding: '8px 10px', color: cand?.weather_status === 'suitable' ? '#16a34a' : '#dc2626' }}>
                                {cand?.weather_status || 'N/A'}
                              </td>
                              <td style={{ padding: '8px 10px', color: cand?.ocean_status === 'suitable' ? '#16a34a' : '#dc2626' }}>
                                {cand?.ocean_status || 'N/A'}
                              </td>
                              <td style={{ padding: '8px 10px', color: cand?.gis_status === 'suitable' ? '#16a34a' : '#dc2626' }}>
                                {cand?.gis_status || 'N/A'}
                              </td>
                              <td style={{ padding: '8px 10px' }}>
                                <span
                                  style={{
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    background: cand?.suitability === 'suitable' ? '#dcfce7' : '#fee2e2',
                                    color: cand?.suitability === 'suitable' ? '#15803d' : '#b91c1c',
                                  }}
                                >
                                  {cand?.suitability || 'N/A'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="map-actions-panel panel" style={{ marginTop: '16px' }}>
            <div>
              <p className="eyebrow">SPATIAL ANALYSIS</p>
              <h2>Coordinate and route checks</h2>
            </div>
            <div className="map-action-grid">
              <div>
                <p>
                  Run the available zone check for {Number.isFinite(activeLat) ? activeLat.toFixed(4) : '0.0000'},{' '}
                  {Number.isFinite(activeLon) ? activeLon.toFixed(4) : '0.0000'}.
                </p>
                <button
                  type="button"
                  className="ask-orca-link-btn"
                  disabled={analysis.loading}
                  onClick={runAnalysis}
                >
                  {analysis.loading ? 'Analyzing…' : 'Analyze location'}
                </button>
                {analysis.error && <p className="map-state map-state-error">{analysis.error}</p>}
                {analysis.data && (
                  <p className="map-state">
                    <strong>{analysis.data.status}</strong>: {analysis.data.message}
                  </p>
                )}
              </div>

              <div>
                <label className="route-label" htmlFor="route-destination">
                  Route destination
                </label>
                <select
                  id="route-destination"
                  value={destinationId}
                  onChange={(event) => setDestinationId(event.target.value)}
                >
                  <option value="nearest_pfz">🐟 Nearest PFZ (Auto-detect)</option>
                  {safeDashboardLocations
                    .filter((item) => item.id !== locationId)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  className="expand-toggle-btn"
                  disabled={route.loading}
                  onClick={() => runRoute()}
                >
                  {route.loading ? 'Calculating…' : 'Analyze route'}
                </button>
                <button
                  type="button"
                  className="ask-orca-link-btn"
                  style={{ marginTop: '8px' }}
                  disabled={route.loading}
                  onClick={() => {
                    setDestinationId('nearest_pfz')
                    runRoute()
                  }}
                >
                  🐟 Route to Nearest PFZ
                </button>
                {route.error && <p className="map-state map-state-error">{route.error}</p>}
                {route.data && (
                  <p className="map-state">
                    <strong>{route.data.status}</strong>: {route.data.message}
                    {route.data.route?.distance_km != null && ` (${route.data.route.distance_km} km)`}
                  </p>
                )}
              </div>

              <div>
                <p>Check authorized PFZ evidence and current marine suitability for this coordinate.</p>
                <button type="button" className="ask-orca-link-btn" disabled={pfz.loading} onClick={runPFZ}>
                  {pfz.loading ? 'Checking PFZ…' : 'Check PFZ suitability'}
                </button>
                {pfz.error && <p className="map-state map-state-error">{pfz.error}</p>}
                {pfz.data && (
                  <p className="map-state">
                    <strong>{pfz.data.suitability}</strong>: {pfz.data.assessment}
                  </p>
                )}
                <button type="button" className="expand-toggle-btn" disabled={pfzSync.loading} onClick={refreshPFZ}>
                  {pfzSync.loading ? 'Refreshing PFZ…' : 'Refresh PFZ source'}
                </button>
                {pfzSync.error && <p className="map-state map-state-error">{pfzSync.error}</p>}
                {pfzSync.message && (
                  <p className="map-state">{pfzSync.message} Reload the map to display refreshed features.</p>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="map-sidebar-col">
          <ComponentErrorBoundary name="Location Information Panel">
            <LocationInfoPanel location={selectedLocation} selectedCoordinate={selectedCoordinate} navigate={navigate} />
          </ComponentErrorBoundary>
          <ComponentErrorBoundary name="Map Layers Control">
            <MapLayersControl
              layers={layers}
              loading={layersState.loading}
              error={layersState.error}
              onToggleLayer={handleToggleLayer}
            />
          </ComponentErrorBoundary>
        </div>
      </div>
    </div>
  )
}

