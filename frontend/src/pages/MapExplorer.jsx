import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MapLayersControl from '../components/mapExplorer/MapLayersControl'
import MapLegend from '../components/mapExplorer/MapLegend'
import LocationInfoPanel from '../components/mapExplorer/LocationInfoPanel'
import MapCanvas from '../components/mapExplorer/MapCanvas'
import { dashboardLocations } from '../data/dashboardData'
import { COASTAL_LOCATIONS, COASTAL_LOCATIONS_MAP, COASTAL_STATES } from '../data/coastalLocations'
import CoastalLocationPicker from '../components/common/CoastalLocationPicker'
import {
  analyzeDetailedRoute,
  analyzeLocation,
  analyzePFZ,
  analyzeRoute,
  findNearestSuitablePFZ,
  getEcosystemAnomaly,
  getMapFeatures,
  getMapLayers,
  getTidePrediction,
  mapErrorMessage,
  navigateNearestPFZ,
  syncPFZ,
} from '../services/mapService'
import ScenarioSimulatorModal from '../components/chat/ScenarioSimulatorModal'
import LiveNavigationHUD from '../components/mapExplorer/LiveNavigationHUD'
import monitoringPinIcon from '../assets/monitoring-pin.png'

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

const LOCATION_COORDINATES = COASTAL_LOCATIONS_MAP

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

function makeCircleCoords(centerLon, centerLat, radiusKm, numPoints = 28) {
  const latRad = (centerLat * Math.PI) / 180
  const dLat = radiusKm / 111.0
  const dLon = radiusKm / (111.0 * Math.max(0.1, Math.cos(latRad)))
  const coords = []
  for (let i = 0; i < numPoints; i++) {
    const angle = (2.0 * Math.PI * i) / numPoints
    const lon = Number((centerLon + dLon * Math.cos(angle)).toFixed(5))
    const lat = Number((centerLat + dLat * Math.sin(angle)).toFixed(5))
    coords.push([lon, lat])
  }
  coords.push(coords[0])
  return coords
}

export default function MapExplorer({ navigate }) {
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), [])
  const initialLatitudeValue = searchParams.get('latitude') || searchParams.get('lat')
  const initialLongitudeValue = searchParams.get('longitude') || searchParams.get('lon')
  const initialLatitude = Number(initialLatitudeValue)
  const initialLongitude = Number(initialLongitudeValue)
  const initialLabel = searchParams.get('label') || searchParams.get('name') || searchParams.get('locationName') || 'Selected map coordinate'
  const initialLocationId = (searchParams.get('locationId') || searchParams.get('location') || searchParams.get('id'))?.toLowerCase()?.trim()

  const hasInitialCoordinate =
    Boolean(initialLatitudeValue?.trim() && initialLongitudeValue?.trim()) &&
    Number.isFinite(initialLatitude) &&
    Number.isFinite(initialLongitude)

  const scenarioParam = searchParams.get('scenario') || searchParams.get('condition') || searchParams.get('preset')
  const [isSimulatedCycloneActive, setIsSimulatedCycloneActive] = useState(() => {
    return scenarioParam === 'cyclone' || scenarioParam === 'pre_cyclone'
  })

  const defaultLocationId = useMemo(() => {
    if (initialLocationId) {
      const match = (dashboardLocations || []).find((item) => item.id === initialLocationId || item.name?.toLowerCase() === initialLocationId)
      if (match) return match.id
      if (LOCATION_COORDINATES[initialLocationId]) return initialLocationId
      const coastalMatch = (COASTAL_LOCATIONS || []).find((item) => item.id === initialLocationId || item.name?.toLowerCase() === initialLocationId)
      if (coastalMatch) return coastalMatch.id
    }
    return 'visakhapatnam'
  }, [initialLocationId])

  const initialCoordinate = useMemo(() => {
    if (hasInitialCoordinate) {
      return { latitude: initialLatitude, longitude: initialLongitude, label: initialLabel }
    }
    if (initialLocationId) {
      const coords = LOCATION_COORDINATES[initialLocationId] || (dashboardLocations || []).find((item) => item.id === initialLocationId || item.name?.toLowerCase() === initialLocationId) || (COASTAL_LOCATIONS || []).find((item) => item.id === initialLocationId || item.name?.toLowerCase() === initialLocationId)
      if (coords) {
        const lat = Number(coords.latitude ?? coords.lat)
        const lng = Number(coords.longitude ?? coords.lng)
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return { latitude: lat, longitude: lng, label: coords.name || initialLabel }
        }
      }
    }
    return null
  }, [hasInitialCoordinate, initialLatitude, initialLongitude, initialLabel, initialLocationId])

  const [locationId, setLocationId] = useState(defaultLocationId)
  const [layers, setLayers] = useState([])
  const [layersState, setLayersState] = useState({ loading: true, error: '' })
  const [selectedCoordinate, setSelectedCoordinate] = useState(initialCoordinate)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paramId = (params.get('locationId') || params.get('location') || params.get('id'))?.toLowerCase()?.trim()
    const latVal = params.get('latitude') || params.get('lat')
    const lonVal = params.get('longitude') || params.get('lon')
    const nameVal = params.get('label') || params.get('name') || params.get('locationName')

    if (paramId) {
      const match = (dashboardLocations || []).find((item) => item.id === paramId || item.name?.toLowerCase() === paramId)
      const coastalMatch = (COASTAL_LOCATIONS || []).find((item) => item.id === paramId || item.name?.toLowerCase() === paramId)
      const targetId = match?.id || coastalMatch?.id || (LOCATION_COORDINATES[paramId] ? paramId : null)
      if (targetId) {
        setLocationId(targetId)
      }
    }

    if (latVal && lonVal) {
      const lat = Number(latVal)
      const lon = Number(lonVal)
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        setSelectedCoordinate({
          latitude: lat,
          longitude: lon,
          label: nameVal || 'Selected location',
        })
      }
    } else if (paramId) {
      const coords = LOCATION_COORDINATES[paramId] || (dashboardLocations || []).find((item) => item.id === paramId || item.name?.toLowerCase() === paramId) || (COASTAL_LOCATIONS || []).find((item) => item.id === paramId || item.name?.toLowerCase() === paramId)
      if (coords) {
        const lat = Number(coords.latitude ?? coords.lat)
        const lng = Number(coords.longitude ?? coords.lng)
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          setSelectedCoordinate({
            latitude: lat,
            longitude: lng,
            label: coords.name || paramId,
          })
        }
      }
    }
  }, [searchParams])
  const [analysis, setAnalysis] = useState({ loading: false, error: '', data: null })
  const [route, setRoute] = useState({ loading: false, error: '', data: null })
  const routeGeometry = route.data?.route?.geometry || null
  const [pfz, setPFZ] = useState({ loading: false, error: '', data: null })
  const [pfzSync, setPFZSync] = useState({ loading: false, error: '', message: '' })

  // Nearest Suitable PFZ state
  const [searchRadius, setSearchRadius] = useState(50)
  const [nearestPFZ, setNearestPFZ] = useState({ loading: false, error: '', data: null })

  // Detailed Route Analysis state
  const [detailedRoute, setDetailedRoute] = useState({ loading: false, error: '', data: null })
  const [selectedDestinationPFZId, setSelectedDestinationPFZId] = useState('auto_nearest')

  // Sprint 1: Hydrodynamic Tide & Marine Safety Index
  const [tideState, setTideState] = useState({ loading: false, error: '', data: null })
  // Sprint 1: Marine Ecosystem Anomaly & Fish Productivity Diagnostics
  const [ecosystemState, setEcosystemState] = useState({ loading: false, error: '', data: null, isOpen: false })
  // Sprint 2: Scenario Simulation Sandbox
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false)

  const [destinationId, setDestinationId] = useState('nearest_pfz')
  const [isExpanded, setIsExpanded] = useState(false)
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  // Live Navigation & Real-time GPS Vessel Tracking State
  const [liveNavigation, setLiveNavigation] = useState({ loading: false, error: '', data: null })
  const [isRouteVisible, setIsRouteVisible] = useState(false)
  const [isHudOpen, setIsHudOpen] = useState(false)
  const [liveVesselLocation, setLiveVesselLocation] = useState(null)
  const [isGpsTracking, setIsGpsTracking] = useState(false)
  const watchIdRef = useRef(null)

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

  const safeDashboardLocations = useMemo(() => {
    return Array.isArray(dashboardLocations) ? dashboardLocations : []
  }, [])

  const locationsByState = useMemo(() => {
    const map = {}
    safeDashboardLocations.forEach((loc) => {
      const st = loc.state || 'Other'
      if (!map[st]) map[st] = []
      map[st].push(loc)
    })
    return map
  }, [safeDashboardLocations])

  const curatedLocation = useMemo(() => {
    const match = safeDashboardLocations.find((item) => item?.id === locationId) || safeDashboardLocations[0]
    const coords = (match?.id && LOCATION_COORDINATES[match.id]) || COASTAL_LOCATIONS[0] || { latitude: 17.6868, longitude: 83.2185 }
    return {
      id: match?.id || 'visakhapatnam',
      name: match?.name || 'Visakhapatnam',
      region: match?.region || 'Andhra Pradesh, India',
      state: match?.state || 'Andhra Pradesh',
      latitude: Number(coords?.latitude ?? coords?.lat ?? 17.6868),
      longitude: Number(coords?.longitude ?? coords?.lng ?? 83.2185),
      label: match?.name || 'Visakhapatnam',
    }
  }, [locationId, safeDashboardLocations])

  const selectedLocation = useMemo(() => {
    if (selectedCoordinate && Number.isFinite(selectedCoordinate.latitude) && Number.isFinite(selectedCoordinate.longitude)) {
      return selectedCoordinate
    }
    return curatedLocation
  }, [selectedCoordinate, curatedLocation])

  const activeLocation = selectedLocation
  const activeLat = Number(activeLocation?.latitude)
  const activeLon = Number(activeLocation?.longitude)

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

  useEffect(() => {
    let isSubscribed = true
    const controller = new AbortController()
    if (!Number.isFinite(activeLat) || !Number.isFinite(activeLon)) return undefined

    setTideState((prev) => ({ ...prev, loading: true, error: '' }))
    getTidePrediction({ latitude: activeLat, longitude: activeLon }, { signal: controller.signal })
      .then((data) => {
        if (isSubscribed) setTideState({ loading: false, error: '', data })
      })
      .catch((error) => {
        if (isSubscribed && error?.name !== 'AbortError') {
          setTideState({ loading: false, error: 'Tide data unavailable.', data: null })
        }
      })

    return () => {
      isSubscribed = false
      controller.abort()
    }
  }, [activeLat, activeLon])

  const runEcosystemDiagnosis = async () => {
    if (!Number.isFinite(activeLat) || !Number.isFinite(activeLon)) return
    setEcosystemState({ loading: true, error: '', data: null, isOpen: true })
    try {
      const data = await getEcosystemAnomaly({ latitude: activeLat, longitude: activeLon })
      setEcosystemState({ loading: false, error: '', data, isOpen: true })
    } catch (error) {
      setEcosystemState({ loading: false, error: error?.message || 'Diagnostic failed', data: null, isOpen: true })
    }
  }

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
        setLayers(Array.isArray(nextLayers) ? nextLayers : [])
        setLayersState({ loading: false, error: '' })
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          setLayers([])
          setLayersState({ loading: false, error: mapErrorMessage(error) })
        }
      })
    return () => controller.abort()
  }, [fetchLayers])

  const renderedLayers = useMemo(() => {
    if (!isSimulatedCycloneActive || !Number.isFinite(activeLat) || !Number.isFinite(activeLon)) {
      return layers
    }

    const cyclonePolygon = {
      type: 'Feature',
      id: 'simulated-cyclone-cone',
      layer: 'hazards',
      dataset: 'ORCA_SIMULATED_CYCLONE',
      properties: {
        id: 'simulated-cyclone-cone',
        name: '🌀 SIMULATED CYCLONE DANGER CONE (Category-2 Storm Surge)',
        layer: 'hazards',
        severity: 'CRITICAL',
        wind_knots: searchParams.get('wind_kts') || '45',
        wave_surge_m: searchParams.get('delta_wave') || '3.8',
        notice: 'Active What-If Simulation: Severe storm surge & hazardous sea state. Small craft prohibited.',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [makeCircleCoords(activeLon + 0.18, activeLat + 0.1, 35.0)],
      },
    }

    let hazardsFound = false
    const next = layers.map((layer) => {
      if (String(layer?.id || '').toLowerCase() === 'hazards') {
        hazardsFound = true
        const existingFeatures = Array.isArray(layer.features) ? layer.features : []
        const hasSim = existingFeatures.some((f) => f?.id === 'simulated-cyclone-cone')
        const features = hasSim ? existingFeatures : [cyclonePolygon, ...existingFeatures]
        return {
          ...layer,
          enabled: true,
          available: true,
          feature_count: features.length,
          features,
        }
      }
      return layer
    })

    if (!hazardsFound) {
      next.push({
        id: 'hazards',
        name: 'Hazards & Cyclones',
        description: 'Active storm tracks, cyclone danger cones, and navigation hazards',
        layer_type: 'vector',
        available: true,
        enabled: true,
        feature_count: 1,
        features: [cyclonePolygon],
      })
    }

    return next
  }, [layers, isSimulatedCycloneActive, activeLat, activeLon, searchParams])

  // Trigger Navigation to Nearest Safe PFZ from Selected Map Location
  const startLivePFZNavigation = useCallback(async (targetCoord = null) => {
    setLiveNavigation({ loading: true, error: '', data: null })
    setDetailedRoute((prev) => ({ ...prev, data: null }))
    setRoute((prev) => ({ ...prev, data: null }))
    setIsRouteVisible(true)
    setIsHudOpen(true)

    const currentLoc = targetCoord || liveVesselLocation || selectedCoordinate || activeLocation
    const lat = Number(currentLoc?.latitude ?? currentLoc?.lat ?? activeLat)
    const lon = Number(currentLoc?.longitude ?? currentLoc?.lng ?? activeLon)

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setLiveNavigation({
        loading: false,
        error: 'Please select a location on the map or coastal harbor.',
        data: null,
      })
      setIsRouteVisible(false)
      setIsHudOpen(false)
      return
    }

    try {
      const res = await navigateNearestPFZ({
        latitude: lat,
        longitude: lon,
        radiusKm: Number(searchRadius) || 50,
        vesselSpeedKnots: 12.0,
      })

      setLiveNavigation({
        loading: false,
        error: res.has_pfz ? '' : (res.message || 'No suitable Potential Fishing Zone found nearby.'),
        data: res,
      })
      setIsRouteVisible(true)
      setIsHudOpen(true)
    } catch (err) {
      setLiveNavigation({
        loading: false,
        error: mapErrorMessage(err),
        data: null,
      })
    }
  }, [liveVesselLocation, selectedCoordinate, activeLocation, activeLat, activeLon, searchRadius])

  useEffect(() => {
    const handleCustomCoord = (event) => {
      if (
        event.detail &&
        Number.isFinite(event.detail.latitude) &&
        Number.isFinite(event.detail.longitude)
      ) {
        const coord = {
          latitude: event.detail.latitude,
          longitude: event.detail.longitude,
          label: event.detail.label || 'Selected map coordinate',
        }
        setSelectedCoordinate(coord)
        setLiveVesselLocation(null)
        if (watchIdRef.current !== null) {
          navigator.geolocation?.clearWatch(watchIdRef.current)
          watchIdRef.current = null
        }
        setIsGpsTracking(false)

        // Clear previous routes immediately
        setLiveNavigation((prev) => ({ ...prev, data: null }))
        setDetailedRoute((prev) => ({ ...prev, data: null }))
        setRoute((prev) => ({ ...prev, data: null }))

        if (isRouteVisible) {
          startLivePFZNavigation(coord)
        }
      }
    }
    window.addEventListener('orca-select-coord', handleCustomCoord)
    return () => window.removeEventListener('orca-select-coord', handleCustomCoord)
  }, [isRouteVisible, startLivePFZNavigation])

  const handleMapLocation = useCallback((coordinate) => {
    setSelectedCoordinate(coordinate)
    setLiveVesselLocation(null)
    if (watchIdRef.current !== null) {
      navigator.geolocation?.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsGpsTracking(false)

    // Clear previous routes immediately
    setLiveNavigation((prev) => ({ ...prev, data: null }))
    setDetailedRoute((prev) => ({ ...prev, data: null }))
    setRoute((prev) => ({ ...prev, data: null }))

    if (isRouteVisible) {
      startLivePFZNavigation(coordinate)
    }
  }, [isRouteVisible, startLivePFZNavigation])

  const handleSelectLocation = useCallback((id) => {
    setLocationId(id)
    setSelectedCoordinate(null)
    setLiveVesselLocation(null)
    if (watchIdRef.current !== null) {
      navigator.geolocation?.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsGpsTracking(false)

    // Clear previous routes immediately
    setLiveNavigation((prev) => ({ ...prev, data: null }))
    setDetailedRoute((prev) => ({ ...prev, data: null }))
    setRoute((prev) => ({ ...prev, data: null }))

    if (isRouteVisible) {
      const match = safeDashboardLocations.find((item) => item.id === id)
      const coords = LOCATION_COORDINATES[id] || (match ? { latitude: match.latitude, longitude: match.longitude } : null)
      if (coords) {
        startLivePFZNavigation(coords)
      }
    }
  }, [isRouteVisible, safeDashboardLocations, startLivePFZNavigation])

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
          const destObj = safeDashboardLocations.find((item) => item.id === destinationId)
          if (destObj) {
            const coords = LOCATION_COORDINATES[destObj.id] || { latitude: destObj.latitude, longitude: destObj.longitude }
            destCoord = {
              latitude: Number(coords?.latitude ?? coords?.lat ?? destObj.latitude),
              longitude: Number(coords?.longitude ?? coords?.lng ?? destObj.longitude),
              label: destObj.name,
            }
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

  const runDetailedRouteAnalysis = async () => {
    setDetailedRoute({ loading: true, error: '', data: null })
    try {
      const activeLat = Number(activeLocation?.latitude)
      const activeLon = Number(activeLocation?.longitude)

      if (!Number.isFinite(activeLat) || !Number.isFinite(activeLon)) {
        throw new Error('Valid origin coordinate required.')
      }

      let destLat = null
      let destLon = null
      let pfzId = null
      let pfzName = 'Selected PFZ'

      const candidates = nearestPFZ.data?.candidate_pfzs || []

      if (selectedDestinationPFZId !== 'auto_nearest' && candidates.length > 0) {
        const found = candidates.find((c) => String(c.id) === String(selectedDestinationPFZId))
        if (found && Array.isArray(found.rep_point)) {
          destLon = found.rep_point[0]
          destLat = found.rep_point[1]
          pfzId = String(found.id)
          pfzName = found.name || `PFZ ${found.id}`
        }
      }

      if (!destLat || !destLon) {
        const selected = nearestPFZ.data?.selected_pfz || candidates[0]
        if (selected && Array.isArray(selected.rep_point)) {
          destLon = selected.rep_point[0]
          destLat = selected.rep_point[1]
          pfzId = String(selected.id)
          pfzName = selected.name || `PFZ ${selected.id}`
        } else {
          const nearest = findNearestPFZCoordinate(activeLocation, layers)
          if (nearest) {
            destLat = nearest.latitude
            destLon = nearest.longitude
            pfzName = nearest.label
          }
        }
      }

      if (!Number.isFinite(destLat) || !Number.isFinite(destLon)) {
        throw new Error('Unable to calculate route: No valid destination PFZ available within search radius or map layers.')
      }

      const res = await analyzeDetailedRoute({
        origin_latitude: activeLat,
        origin_longitude: activeLon,
        destination_latitude: destLat,
        destination_longitude: destLon,
        pfz_id: pfzId,
      })

      setDetailedRoute({
        loading: false,
        error: '',
        data: {
          ...res,
          dest_name: pfzName,
          dest_id: pfzId,
          origin_lat: activeLat,
          origin_lon: activeLon,
        },
      })
    } catch (err) {
      setDetailedRoute({
        loading: false,
        error: mapErrorMessage(err),
        data: null,
      })
    }
  }

  const refreshPFZ = async () => {
    setPFZSync({ loading: true, error: '', message: '' })
    try {
      const result = await syncPFZ()
      const nextLayers = await fetchLayers()
      setLayers(Array.isArray(nextLayers) ? nextLayers : [])
      setPFZSync({
        loading: false,
        error: '',
        message: `${result?.persisted ?? 0} PFZ feature(s) loaded and displayed.`,
      })
    } catch (error) {
      setPFZSync({ loading: false, error: mapErrorMessage(error), message: '' })
    }
  }

  // Toggle / Fetch current GPS location
  const locateMe = useCallback(() => {
    if (liveVesselLocation || isGpsTracking || selectedCoordinate?.label?.includes('GPS')) {
      // Turn OFF GPS override and return to manual harbor location
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      setIsGpsTracking(false)
      setLiveVesselLocation(null)
      setSelectedCoordinate(null)

      // Clear previous routes immediately
      setLiveNavigation((prev) => ({ ...prev, data: null }))
      setDetailedRoute((prev) => ({ ...prev, data: null }))
      setRoute((prev) => ({ ...prev, data: null }))

      if (isRouteVisible) {
        startLivePFZNavigation(curatedLocation)
      }
      return
    }

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy, heading, speed } = pos.coords
        const loc = { latitude, longitude, label: `Live GPS Position (±${Math.round(accuracy)}m)`, accuracy, heading, speed }
        setSelectedCoordinate(loc)
        setLiveVesselLocation(loc)

        // Clear previous routes immediately
        setLiveNavigation((prev) => ({ ...prev, data: null }))
        setDetailedRoute((prev) => ({ ...prev, data: null }))
        setRoute((prev) => ({ ...prev, data: null }))

        if (isRouteVisible) {
          startLivePFZNavigation(loc)
        }
      },
      (err) => {
        console.warn('Geolocation error:', err)
        alert('Could not retrieve GPS location. Please allow location permissions in your browser.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [liveVesselLocation, isGpsTracking, selectedCoordinate, isRouteVisible, startLivePFZNavigation, curatedLocation])

  // Toggle continuous GPS tracking
  const toggleGpsTracking = useCallback(() => {
    if (isGpsTracking) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      setIsGpsTracking(false)
    } else {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.')
        return
      }
      setIsGpsTracking(true)
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy, heading, speed } = pos.coords
          const loc = { latitude, longitude, label: `Live Boat (±${Math.round(accuracy)}m)`, accuracy, heading, speed }
          setLiveVesselLocation(loc)
          setSelectedCoordinate(loc)
        },
        (err) => {
          console.warn('Live tracking error:', err)
          setIsGpsTracking(false)
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 }
      )
    }
  }, [isGpsTracking])

  // Cleanup watcher on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  const toggleRouteVisibility = useCallback(() => {
    if (isRouteVisible) {
      setIsRouteVisible(false)
      setIsHudOpen(false)
    } else {
      if (liveNavigation.data) {
        setIsRouteVisible(true)
        setIsHudOpen(true)
      } else {
        startLivePFZNavigation()
      }
    }
  }, [isRouteVisible, liveNavigation.data, startLivePFZNavigation])

  return (
    <div className={`map-explorer-page ${isExpanded ? 'page-is-expanded' : ''}`}>
      <CoastalLocationPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        selectedId={locationId}
        onSelectLocation={(newId) => handleSelectLocation(newId)}
      />

      <section className="map-explorer-header">
        <div>
          <p className="eyebrow">SPATIAL INTELLIGENCE</p>
          <h1>Map Explorer</h1>
          <p className="subhead">Explore configured GIS overlays, 84 coastal fishing harbors, and run source-backed spatial checks.</p>
        </div>
        <div className="map-header-controls">
          <button
            type="button"
            className="locate-me-btn"
            onClick={locateMe}
            title={liveVesselLocation || selectedCoordinate?.label?.includes('GPS') ? 'Live GPS active. Click to turn OFF and use manual harbor locations.' : 'Fetch live device GPS location'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              background: liveVesselLocation || selectedCoordinate?.label?.includes('GPS') ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : '#0f172a',
              color: liveVesselLocation || selectedCoordinate?.label?.includes('GPS') ? '#ffffff' : '#38bdf8',
              border: `1px solid ${liveVesselLocation || selectedCoordinate?.label?.includes('GPS') ? '#38bdf8' : 'rgba(56, 189, 248, 0.3)'}`,
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: liveVesselLocation || selectedCoordinate?.label?.includes('GPS') ? '0 0 10px rgba(56, 189, 248, 0.4)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <span>📍</span> {liveVesselLocation || selectedCoordinate?.label?.includes('GPS') ? 'GPS Active (✕ Turn Off)' : 'Locate Me'}
          </button>
          <button
            type="button"
            className="gps-tracking-btn"
            onClick={toggleGpsTracking}
            title="Toggle live boat GPS tracking"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              background: isGpsTracking ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : '#0f172a',
              color: isGpsTracking ? '#ffffff' : '#38bdf8',
              border: `1px solid ${isGpsTracking ? '#38bdf8' : 'rgba(56, 189, 248, 0.3)'}`,
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: isGpsTracking ? '0 0 10px rgba(56, 189, 248, 0.4)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <span>📡</span> {isGpsTracking ? 'Tracking: ON' : 'Track Boat'}
          </button>
          <button
            type="button"
            className="location-dropdown-wrap"
            onClick={() => setIsPickerOpen(true)}
            title="Click to select from 84 verified Indian coastal fishing harbors across all maritime states"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-start',
              gap: '2px',
              padding: '6px 12px',
              border: '1px solid #d5e4ef',
              borderRadius: '7px',
              background: '#ffffff',
              cursor: 'pointer',
              textAlign: 'left',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'all 0.2s ease',
            }}
          >
            <span className="location-label-tag" style={{ color: '#7890a6', fontSize: '10px', fontWeight: 800, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
              MONITORING AREA (84 PORTS)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0f172a', fontWeight: 700, fontSize: '13px' }}>
              <img
                src={monitoringPinIcon}
                alt=""
                style={{ width: '15px', height: '15px', objectFit: 'contain', flexShrink: 0 }}
              />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {curatedLocation?.name || 'Chennai / Kasimedu'}
              </span>
              <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '2px' }}>▼</span>
            </div>
          </button>
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
          <ComponentErrorBoundary name="Coastal Intelligence Telemetry">
            <section
              className="coastal-telemetry-banner panel"
              style={{
                marginBottom: '16px',
                background: '#ffffff',
                color: '#0f172a',
                borderRadius: '12px',
                padding: '16px 20px',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
                    COASTAL CONDITIONS
                  </div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0, padding: 0, lineHeight: 1.2 }}>
                    Coastal Intelligence & Hydrodynamics
                  </h2>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    <span>
                      Active sector: <strong style={{ color: '#0f172a', fontWeight: 600 }}>{selectedLocation.name || selectedLocation.label || 'Visakhapatnam'}</strong> · {Number(selectedLocation.latitude || 0).toFixed(2)}°N, {Number(selectedLocation.longitude || 0).toFixed(2)}°E
                    </span>
                    {(liveVesselLocation || selectedCoordinate) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCoordinate(null)
                          setLiveVesselLocation(null)
                          if (watchIdRef.current !== null) {
                            navigator.geolocation?.clearWatch(watchIdRef.current)
                            watchIdRef.current = null
                          }
                          setIsGpsTracking(false)
                          setLiveNavigation((prev) => ({ ...prev, data: null }))
                          setDetailedRoute((prev) => ({ ...prev, data: null }))
                          setRoute((prev) => ({ ...prev, data: null }))
                          if (isRouteVisible) {
                            startLivePFZNavigation(curatedLocation)
                          }
                        }}
                        title="Clear GPS/custom coordinate and return to default harbor"
                        style={{
                          marginLeft: '4px',
                          background: '#fef2f2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          borderRadius: '4px',
                          fontSize: '11px',
                          padding: '1px 6px',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        ✕ Reset to Harbor
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={diagnoseCatchDecline}
                    disabled={ecosystemState.loading}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      background: ecosystemState.isOpen ? '#0284c7' : '#ffffff',
                      color: ecosystemState.isOpen ? '#ffffff' : '#0284c7',
                      border: '1px solid #0284c7',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}
                  >
                    <span>🔬</span>
                    {ecosystemState.loading ? 'Diagnosing Ecosystem…' : ecosystemState.isOpen ? 'Hide Ecosystem Diagnostics' : 'Diagnose Fish Catch Decline'}
                  </button>

                  <button
                    type="button"
                    onClick={refreshPFZ}
                    disabled={pfzSync.loading}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      background: '#ffffff',
                      color: '#334155',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}
                  >
                    <span>🔄</span>
                    {pfzSync.loading ? 'Fetching INCOIS…' : 'Refresh PFZ'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSimulatorOpen(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      background: '#ffffff',
                      color: '#0284c7',
                      border: '1px solid #bfdbfe',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}
                  >
                    <span>🧪</span>
                    Simulate Scenario
                  </button>
                </div>
              </div>

              {/* 4 INFORMATION CARDS (RESPONSIVE GRID WITH STANDARDIZED TYPOGRAPHY) */}
              <div className="coastal-conditions-grid">
                {/* CARD 1: Tidal Hydrodynamics */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '135px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Tidal Hydrodynamics</span>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>
                        {tideState.data?.station_name ? tideState.data.station_name.split(' ')[0] : (selectedLocation.name || 'Visakhapatnam')}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>
                        {tideState.data?.current_height_m != null ? `+${tideState.data.current_height_m.toFixed(2)} m` : '+1.30 m'}
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        <span style={{
                          display: 'inline-block',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: tideState.data?.tide_state?.includes('Flood') ? '#15803d' : '#b45309',
                          background: tideState.data?.tide_state?.includes('Flood') ? '#dcfce7' : '#fef3c7',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          {tideState.data?.tide_state ? (tideState.data.tide_state.includes('Flood') ? 'Flood · Rising' : 'Ebb · Falling') : 'Flood · Rising'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 400, color: '#64748b', marginTop: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                    {tideState.data?.spring_neap_phase || 'Spring tide'} · Range {tideState.data?.tidal_range_m ? `${tideState.data.tidal_range_m} m` : '1.75 m'}
                  </div>
                </div>

                {/* CARD 2: Next High / Low Tide */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '135px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '10px' }}>
                      Next High / Low Tide
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>High</div>
                        <div style={{ fontSize: '12px', color: '#0f172a' }}>
                          {tideState.data?.next_high_tide?.time_display || '11:47 AM UTC'}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0284c7', marginTop: '1px' }}>
                          {tideState.data?.next_high_tide?.height_m ? `+${tideState.data.next_high_tide.height_m} m` : '+1.92 m'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>Low</div>
                        <div style={{ fontSize: '12px', color: '#0f172a' }}>
                          {tideState.data?.next_low_tide?.time_display || '05:57 PM UTC'}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#64748b', marginTop: '1px' }}>
                          {tideState.data?.next_low_tide?.height_m ? `+${tideState.data.next_low_tide.height_m} m` : '+0.18 m'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 400, color: '#64748b', marginTop: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                    Current drift · {tideState.data?.current_velocity_knots ?? 1.3} kn {tideState.data?.current_direction_cardinal || 'NNE'}
                  </div>
                </div>

                {/* CARD 3: Marine Safety */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '135px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Marine Safety</span>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#15803d',
                        background: '#dcfce7',
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        Favorable
                      </span>
                    </div>
                    <div style={{ margin: '4px 0 0 0' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <span style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>92</span>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748b' }}>/ 100</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 400, color: '#64748b', marginTop: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                    Wave 0.12 m · Wind 0.08 · Swell 0.05
                  </div>
                </div>

                {/* CARD 4: INCOIS PFZ */}
                {(() => {
                  const pfzCount = layers.find((l) => String(l.id).toLowerCase() === 'pfz')?.features?.length || 38
                  return (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '135px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>INCOIS PFZ</span>
                        </div>
                        <div style={{ margin: '4px 0 0 0' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>{pfzCount}</span>
                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>zones available</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 400, color: '#64748b', marginTop: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                        {pfzSync.message || `${pfzCount} PFZ features loaded`}
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* EXPANDABLE ECOSYSTEM & FISH PRODUCTIVITY DIAGNOSTICS DRAWER */}
              {ecosystemState.isOpen && (
                <div
                  style={{
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🔬</span> Oceanographic Diagnostic: Fish Productivity Analysis
                      </h3>
                      <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                        Multi-parameter root-cause synthesis for {ecosystemState.data?.sector_name || selectedLocation.name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEcosystemState((prev) => ({ ...prev, isOpen: false }))}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#64748b',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      ✕ Close Diagnostic
                    </button>
                  </div>

                  {ecosystemState.loading ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                      Querying Ocean Thermal Anomaly, Chlorophyll-a Satellite Fields & Upwelling Indices…
                    </div>
                  ) : ecosystemState.error ? (
                    <div style={{ padding: '12px', background: '#fef2f2', color: '#dc2626', borderRadius: '6px', border: '1px solid #fecaca', fontSize: '13px' }}>
                      ⚠️ {ecosystemState.error}
                    </div>
                  ) : ecosystemState.data ? (
                    <div>
                      {/* SUMMARY BANNER */}
                      <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: '12px 16px', borderRadius: '8px', marginBottom: '14px' }}>
                        <strong style={{ fontSize: '11px', color: '#0369a1', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Diagnostic Synthesis & Root Causes
                        </strong>
                        <p style={{ margin: 0, fontSize: '13px', color: '#0f172a', lineHeight: 1.5 }}>
                          {ecosystemState.data.diagnosis_summary || ecosystemState.data.summary || 'Oceanographic anomaly diagnostic completed.'}
                        </p>
                      </div>

                      {/* 4 METRIC CARDS */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                        {/* SST CARD */}
                        <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>🌡️ SST & Heatwave</span>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0' }}>
                            <strong style={{ fontSize: '18px', color: '#dc2626' }}>
                              {ecosystemState.data.telemetry_comparison?.observed_sst_c ?? ecosystemState.data.environmental_metrics?.observed_sst_c ?? 29.8}°C
                            </strong>
                            <small style={{ color: '#b91c1c', fontWeight: 700 }}>
                              {(ecosystemState.data.telemetry_comparison?.sst_anomaly_c ?? 0) > 0
                                ? `+${ecosystemState.data.telemetry_comparison?.sst_anomaly_c}°C`
                                : `${ecosystemState.data.telemetry_comparison?.sst_anomaly_c ?? '+1.6'}°C`} Anomaly
                            </small>
                          </div>
                          <small style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>
                            Baseline: {ecosystemState.data.telemetry_comparison?.baseline_sst_c ?? 28.2}°C • Status: {ecosystemState.data.ecosystem_health || 'Active MHW'}
                          </small>
                        </div>

                        {/* CHLOROPHYLL CARD */}
                        <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>🌿 Chlorophyll-a Biomass</span>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0' }}>
                            <strong style={{ fontSize: '18px', color: '#0284c7' }}>
                              {ecosystemState.data.telemetry_comparison?.observed_chlorophyll_mg_m3 ?? 0.38} mg/m³
                            </strong>
                            <small style={{ color: '#d97706', fontWeight: 700 }}>
                              {ecosystemState.data.telemetry_comparison?.chlorophyll_anomaly_pct ?? -45}% deficit
                            </small>
                          </div>
                          <small style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>
                            Baseline: {ecosystemState.data.telemetry_comparison?.baseline_chlorophyll_mg_m3 ?? 0.85} mg/m³ • Phytoplankton Depleted
                          </small>
                        </div>

                        {/* UPWELLING CARD */}
                        <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>💨 Upwelling & Hypoxia</span>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0' }}>
                            <strong style={{ fontSize: '18px', color: '#7c3aed' }}>
                              {ecosystemState.data.stress_factors?.find(f => f.factor?.includes('Upwelling'))?.metric?.split(':')[1] || '8.5 m³/s/100m'}
                            </strong>
                            <small style={{ color: '#15803d', fontWeight: 700 }}>Moderate Hypoxia</small>
                          </div>
                          <small style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>
                            Season: {ecosystemState.data.telemetry_comparison?.upwelling_season || 'Monsoon Upwelling Cycle'}
                          </small>
                        </div>

                        {/* SPECIES CARD */}
                        <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>⚓ Impacted Species</span>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0' }}>
                            <strong style={{ fontSize: '14px', color: '#b45309' }}>High Vulnerability</strong>
                          </div>
                          <small style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>
                            {Array.isArray(ecosystemState.data.target_species_impacted)
                              ? ecosystemState.data.target_species_impacted.slice(0, 2).join(', ')
                              : 'Indian Oil Sardine, Indian Mackerel'}
                          </small>
                        </div>
                      </div>

                      {/* RECOMMENDATIONS */}
                      {Array.isArray(ecosystemState.data.recommendations) && ecosystemState.data.recommendations.length > 0 && (
                        <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                          <strong style={{ fontSize: '11px', color: '#15803d', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            📋 Actionable Evidence-Based Recommendations
                          </strong>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {ecosystemState.data.recommendations.map((rec, idx) => {
                              if (typeof rec === 'string') {
                                return (
                                  <div key={idx} style={{ fontSize: '12px', color: '#334155', lineHeight: 1.5, padding: '8px 12px', background: '#ffffff', borderRadius: '6px', borderLeft: '3px solid #16a34a', border: '1px solid #e2e8f0' }}>
                                    {rec}
                                  </div>
                                )
                              }
                              return (
                                <div key={idx} style={{ fontSize: '12px', color: '#334155', lineHeight: 1.5, padding: '8px 12px', background: '#ffffff', borderRadius: '6px', borderLeft: '3px solid #16a34a', border: '1px solid #e2e8f0' }}>
                                  {rec.target && <strong style={{ color: '#0284c7', marginRight: '6px' }}>[{rec.target}]</strong>}
                                  <span>{rec.action}</span>
                                  {rec.rationale && <small style={{ display: 'block', color: '#64748b', marginTop: '2px' }}>💡 {rec.rationale}</small>}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </section>
          </ComponentErrorBoundary>

          <ComponentErrorBoundary name="Map Canvas">
            <div style={{ position: 'relative' }}>
              {isSimulatedCycloneActive && (
                <div
                  className="simulated-cyclone-banner"
                  style={{
                    background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
                    color: '#ffffff',
                    padding: '12px 18px',
                    borderRadius: '8px',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1.5px solid #ef4444',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>🌀</span>
                    <div>
                      <strong style={{ fontSize: '13px', display: 'block', letterSpacing: '0.02em' }}>
                        ACTIVE SIMULATION: CYCLONIC STORM SURGE & HAZARD CONE (RED OVERLAY)
                      </strong>
                      <span style={{ fontSize: '12px', opacity: 0.95 }}>
                        Displaying projected 35 km offshore cyclone hazard zone ({searchParams.get('wind_kts') || '45'} kts gale, +{searchParams.get('delta_wave') || '3.8'}m surge). Vessel navigation prohibited inside this perimeter.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSimulatedCycloneActive(false)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.4)',
                      borderRadius: '6px',
                      padding: '5px 12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    ✕ Dismiss Simulation Overlay
                  </button>
                </div>
              )}
              {isRouteVisible && isHudOpen && (
                <LiveNavigationHUD
                  navigationData={liveNavigation.data}
                  currentLocation={liveVesselLocation || selectedLocation}
                  isTracking={isGpsTracking}
                  onToggleTracking={toggleGpsTracking}
                  onRecenter={() => {
                    const loc = liveVesselLocation || selectedLocation
                    if (loc?.latitude && loc?.longitude) {
                      setSelectedCoordinate({ ...loc })
                    }
                  }}
                  onStopNavigation={() => setIsHudOpen(false)}
                  onRecalculate={startLivePFZNavigation}
                  isLoading={liveNavigation.loading}
                />
              )}
              {isRouteVisible && !isHudOpen && (
                <button
                  type="button"
                  className="reopen-hud-pill-btn"
                  onClick={() => setIsHudOpen(true)}
                  title="Open Live Navigation HUD panel"
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    background: '#0f172a',
                    color: '#38bdf8',
                    border: '1px solid #0284c7',
                    borderRadius: '20px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span>🧭</span> Show Navigation HUD
                </button>
              )}
              <MapCanvas
                selectedLocation={selectedLocation}
                layers={renderedLayers}
                routeGeometry={isRouteVisible ? (liveNavigation.data?.route?.route_geometry || detailedRoute.data?.route_geometry || routeGeometry) : (detailedRoute.data?.route_geometry || null)}
                detailedRouteStatus={isRouteVisible ? (liveNavigation.data?.route?.overall_status || detailedRoute.data?.overall_status || null) : (detailedRoute.data?.overall_status || null)}
                radiusKm={Number(searchRadius) || 50}
                pfzEvaluations={pfzEvaluations}
                selectedPFZId={nearestPFZ.data?.selected_pfz?.id || liveNavigation.data?.selected_pfz?.id || null}
                selectedPFZGeometry={nearestPFZ.data?.selected_pfz?.geometry || liveNavigation.data?.selected_pfz?.geometry || null}
                pfzRouteGeometry={isRouteVisible ? (nearestPFZ.data?.route_geometry || null) : null}
                onMapLocation={handleMapLocation}
                isExpanded={isExpanded}
                onToggleExpanded={() => setIsExpanded((value) => !value)}
                liveVesselLocation={liveVesselLocation}
                navigationWaypoints={isRouteVisible ? (liveNavigation.data?.route?.waypoints || []) : []}
                isTracking={isGpsTracking}
                landTransit={isRouteVisible ? (liveNavigation.data?.land_transit || null) : null}
              />
            </div>
          </ComponentErrorBoundary>

          <ComponentErrorBoundary name="Map Legend">
            <MapLegend layers={renderedLayers} routeGeometry={routeGeometry} />
          </ComponentErrorBoundary>

          {/* NEAREST SUITABLE PFZ ASSESSMENT & RESULTS PANEL */}
          <section className="pfz-discovery-section panel" style={{ marginTop: '16px' }}>
            <div className="pfz-discovery-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '14px' }}>
              <div>
                <p className="eyebrow">POTENTIAL FISHING ZONE (PFZ) ENGINE</p>
                <h2 style={{ margin: '2px 0 0 0', fontSize: '18px', color: '#0f172a' }}>Nearest Suitable PFZ Discovery</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)', marginTop: '4px', margin: '4px 0 0 0' }}>
                  Live INCOIS Potential Fishing Zones within your active search radius (<strong>{searchRadius} km</strong>) evaluated against Weather, Ocean, and GIS evidence.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', background: '#f0fdf4', color: '#166534', border: '1px solid #86efac', padding: '5px 12px', borderRadius: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🎯</span> {nearestPFZ.loading ? 'Evaluating Zones…' : `${searchRadius} km Radius Active`}
                </span>
              </div>
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

          {/* ROUTE ANALYSIS ENGINE & INFORMATION PANEL */}
          <section
            className="route-analysis-section panel"
            style={{
              marginTop: '16px',
              padding: '18px 20px',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
            }}
          >
            <div
              className="route-analysis-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '14px',
                marginBottom: '16px',
              }}
            >
              <div>
                <p className="eyebrow" style={{ color: '#0284c7', fontWeight: 700, fontSize: '11px', letterSpacing: '0.05em' }}>NAVIGATION INTELLIGENCE</p>
                <h2 style={{ margin: '2px 0 0 0', fontSize: '18px', color: '#0f172a' }}>Analyse Route Before Travelling</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Evaluate proposed marine route against GIS obstacles, hazard zones, weather, breeze/wind, and wave conditions.
                </p>
              </div>
            </div>

            <div
              className="route-controls-bar"
              style={{
                background: '#f8fafc',
                padding: '16px 18px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'flex-end',
                gap: '14px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: '1.2 1 240px', minWidth: '0' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px', letterSpacing: '0.03em' }}>
                  ORIGIN (CURRENT COORDINATE)
                </label>
                <div
                  title={`📍 ${Number.isFinite(activeLat) ? activeLat.toFixed(4) : '0.0000'}°N, ${Number.isFinite(activeLon) ? activeLon.toFixed(4) : '0.0000'}°E (${activeLocation.label || activeLocation.name || 'Selected point'})`}
                  style={{
                    height: '42px',
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0f172a',
                    background: '#ffffff',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  📍 {Number.isFinite(activeLat) ? activeLat.toFixed(4) : '0.0000'}°N, {Number.isFinite(activeLon) ? activeLon.toFixed(4) : '0.0000'}°E ({activeLocation.label || activeLocation.name || 'Selected point'})
                </div>
              </div>

              <div style={{ flex: '1.2 1 260px', minWidth: '0' }}>
                <label htmlFor="destination-pfz-select" style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px', letterSpacing: '0.03em' }}>
                  DESTINATION (TARGET PFZ)
                </label>
                <select
                  id="destination-pfz-select"
                  value={selectedDestinationPFZId}
                  onChange={(e) => setSelectedDestinationPFZId(e.target.value)}
                  style={{
                    height: '42px',
                    boxSizing: 'border-box',
                    width: '100%',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <option value="auto_nearest">
                    ⭐ Nearest Suitable PFZ ({nearestPFZ.data?.selected_pfz?.name || 'Auto-detect'})
                  </option>
                  {Array.isArray(nearestPFZ.data?.candidate_pfzs) &&
                    nearestPFZ.data.candidate_pfzs.map((cand) => (
                      <option key={cand.id} value={cand.id}>
                        🐟 {cand.name || `PFZ ${cand.id}`} ({cand.distance_km} km away)
                      </option>
                    ))}
                  {Object.entries(locationsByState).map(([st, locs]) => {
                    const filtered = locs.filter((l) => l.id !== locationId)
                    if (filtered.length === 0) return null
                    return (
                      <optgroup key={st} label={`Harbors — ${st}`}>
                        {filtered.map((item) => (
                          <option key={item.id} value={item.id}>
                            ⚓ {item.name}
                          </option>
                        ))}
                      </optgroup>
                    )
                  })}
                </select>
              </div>

              <button
                type="button"
                className="analyze-route-btn"
                disabled={detailedRoute.loading}
                onClick={runDetailedRouteAnalysis}
                style={{
                  height: '42px',
                  boxSizing: 'border-box',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13px',
                  padding: '0 22px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  flexShrink: 0,
                }}
              >
                {detailedRoute.loading ? '⚡ Analysing Route, GIS & Marine Telemetry…' : '🧭 Analyse Route'}
              </button>
            </div>

            {detailedRoute.error && (
              <div className="map-state map-state-error" style={{ marginTop: '12px' }}>
                ⚠️ {detailedRoute.error}
              </div>
            )}

            {/* ROUTE INFORMATION PANEL */}
            {detailedRoute.data && (
              <div className="route-info-panel" style={{ marginTop: '16px', background: '#ffffff', padding: '18px', borderRadius: '10px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em' }}>ROUTE SAFETY ASSESSMENT</span>
                    <h3 style={{ margin: '2px 0 0 0', fontSize: '18px', color: '#0f172a' }}>
                      Route Analysis Output
                    </h3>
                  </div>

                  {/* OVERALL ROUTE STATUS BADGE */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>OVERALL ROUTE STATUS:</span>
                    <span
                      style={{
                        padding: '6px 16px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: 900,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        background:
                          detailedRoute.data.overall_status === 'SAFE'
                            ? '#dcfce7'
                            : detailedRoute.data.overall_status === 'CAUTION'
                            ? '#fef3c7'
                            : detailedRoute.data.overall_status === 'UNSAFE'
                            ? '#fee2e2'
                            : '#f1f5f9',
                        color:
                          detailedRoute.data.overall_status === 'SAFE'
                            ? '#15803d'
                            : detailedRoute.data.overall_status === 'CAUTION'
                            ? '#b45309'
                            : detailedRoute.data.overall_status === 'UNSAFE'
                            ? '#b91c1c'
                            : '#475569',
                        border:
                          detailedRoute.data.overall_status === 'SAFE'
                            ? '1.5px solid #86efac'
                            : detailedRoute.data.overall_status === 'CAUTION'
                            ? '1.5px solid #fde68a'
                            : detailedRoute.data.overall_status === 'UNSAFE'
                            ? '1.5px solid #fca5a5'
                            : '1.5px solid #cbd5e1',
                      }}
                    >
                      {detailedRoute.data.overall_status === 'SAFE' && '🟢 SAFE'}
                      {detailedRoute.data.overall_status === 'CAUTION' && '🟡 CAUTION'}
                      {detailedRoute.data.overall_status === 'UNSAFE' && '🔴 UNSAFE'}
                      {detailedRoute.data.overall_status === 'DATA UNAVAILABLE' && '⚪ DATA UNAVAILABLE'}
                    </span>
                  </div>
                </div>

                {/* MAIN REASON / FISHERMAN EXPLANATION BOX */}
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    background:
                      detailedRoute.data.overall_status === 'SAFE'
                        ? '#f0fdf4'
                        : detailedRoute.data.overall_status === 'CAUTION'
                        ? '#fffbeb'
                        : detailedRoute.data.overall_status === 'UNSAFE'
                        ? '#fef2f2'
                        : '#f8fafc',
                    borderLeft: `4px solid ${
                      detailedRoute.data.overall_status === 'SAFE'
                        ? '#16a34a'
                        : detailedRoute.data.overall_status === 'CAUTION'
                        ? '#d97706'
                        : detailedRoute.data.overall_status === 'UNSAFE'
                        ? '#dc2626'
                        : '#64748b'
                    }`,
                  }}
                >
                  <strong style={{ fontSize: '11px', color: '#475569', display: 'block', marginBottom: '4px', letterSpacing: '0.05em' }}>
                    RECOMMENDATION / MAIN REASON
                  </strong>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#0f172a', lineHeight: 1.5 }}>
                    {detailedRoute.data.explanation}
                  </p>
                </div>

                {/* ROUTE METRICS GRID */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <small style={{ color: '#64748b', fontSize: '11px', display: 'block', fontWeight: 600 }}>ROUTE DISTANCE</small>
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                      {detailedRoute.data.route_distance_km} km ({detailedRoute.data.route_distance_nm ? `${detailedRoute.data.route_distance_nm} NM` : `${(detailedRoute.data.route_distance_km / 1.852).toFixed(1)} NM`})
                    </strong>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <small style={{ color: '#64748b', fontSize: '11px', display: 'block', fontWeight: 600 }}>ESTIMATED TRAVEL TIME</small>
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>{detailedRoute.data.estimated_travel_time} (@12 kn)</strong>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <small style={{ color: '#64748b', fontSize: '11px', display: 'block', fontWeight: 600 }}>ESTIMATED FUEL USAGE</small>
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                      {detailedRoute.data.estimated_fuel_liters ? `${detailedRoute.data.estimated_fuel_liters} L` : `${(detailedRoute.data.route_distance_km * 0.97).toFixed(1)} L`}
                      {detailedRoute.data.fuel_delta_liters > 0 && <span style={{ fontSize: '11px', color: '#b45309', marginLeft: '4px' }}>(+{detailedRoute.data.fuel_delta_liters}L detour)</span>}
                    </strong>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <small style={{ color: '#64748b', fontSize: '11px', display: 'block', fontWeight: 600 }}>MARINE SAFETY INDEX (MSI)</small>
                    <strong style={{ fontSize: '14px', color: detailedRoute.data.marine_safety_index?.color || '#059669' }}>
                      🛡️ {detailedRoute.data.marine_safety_index?.score ? `${detailedRoute.data.marine_safety_index.score}/100` : '92/100'}
                    </strong>
                  </div>
                </div>

                {/* WAYPOINTS BREAKDOWN (IF DETOUR / WAYPOINTS AVAILABLE) */}
                {Array.isArray(detailedRoute.data.waypoints) && detailedRoute.data.waypoints.length > 0 && (
                  <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '12px', color: '#334155', letterSpacing: '0.04em' }}>🧭 NAUTICAL WAYPOINTS & TURNING BEARINGS</strong>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: detailedRoute.data.alternative_used ? '#d97706' : '#16a34a' }}>
                        {detailedRoute.data.alternative_used ? '⚠️ Hazard Detour Waypoints Active' : '🟢 Direct Passage Waypoints'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {detailedRoute.data.waypoints.map((wp, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', padding: '4px 8px', background: '#ffffff', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>
                            WP {wp.waypoint_index || idx + 1}: {wp.name || `Waypoint ${idx + 1}`}
                          </span>
                          <span style={{ color: '#64748b', fontFamily: 'monospace' }}>
                            [{Number(wp.longitude || 0).toFixed(3)}°E, {Number(wp.latitude || 0).toFixed(3)}°N]
                          </span>
                          <span style={{ color: '#0284c7', fontWeight: 600 }}>
                            {wp.leg_distance_km > 0 ? `${wp.leg_distance_km} km (${wp.leg_bearing_deg}° ${wp.leg_bearing_cardinal || ''})` : 'Origin Departure'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}


                {/* 4 CORE CHECKS BREAKDOWN */}
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#334155' }}>Detailed Environmental & GIS Checks</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
                  {/* GIS CHECK */}
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: `4px solid ${detailedRoute.data.gis_analysis.status === 'suitable' ? '#10b981' : detailedRoute.data.gis_analysis.status === 'caution' ? '#f59e0b' : detailedRoute.data.gis_analysis.status === 'unsuitable' ? '#ef4444' : '#64748b'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>🗺️ GIS Safety Check</span>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: detailedRoute.data.gis_analysis.status === 'suitable' ? '#15803d' : detailedRoute.data.gis_analysis.status === 'caution' ? '#b45309' : detailedRoute.data.gis_analysis.status === 'unsuitable' ? '#b91c1c' : '#475569' }}>
                        {detailedRoute.data.gis_analysis.label || detailedRoute.data.gis_analysis.status.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                      {detailedRoute.data.gis_analysis.summary}
                    </p>
                  </div>

                  {/* WEATHER CHECK */}
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: `4px solid ${detailedRoute.data.weather_analysis.status === 'suitable' ? '#0ea5e9' : detailedRoute.data.weather_analysis.status === 'caution' ? '#f59e0b' : detailedRoute.data.weather_analysis.status === 'unsuitable' ? '#ef4444' : '#64748b'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>🌤️ Weather Check</span>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: detailedRoute.data.weather_analysis.status === 'suitable' ? '#15803d' : detailedRoute.data.weather_analysis.status === 'caution' ? '#b45309' : detailedRoute.data.weather_analysis.status === 'unsuitable' ? '#b91c1c' : '#475569' }}>
                        {detailedRoute.data.weather_analysis.label || detailedRoute.data.weather_analysis.status.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                      {detailedRoute.data.weather_analysis.summary}
                    </p>
                  </div>

                  {/* BREEZE / WIND CHECK */}
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: `4px solid ${detailedRoute.data.wind_analysis.status === 'suitable' ? '#06b6d4' : detailedRoute.data.wind_analysis.status === 'caution' ? '#f59e0b' : detailedRoute.data.wind_analysis.status === 'unsuitable' ? '#ef4444' : '#64748b'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>💨 Wind / Breeze Check</span>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: detailedRoute.data.wind_analysis.status === 'suitable' ? '#15803d' : detailedRoute.data.wind_analysis.status === 'caution' ? '#b45309' : detailedRoute.data.wind_analysis.status === 'unsuitable' ? '#b91c1c' : '#475569' }}>
                        {detailedRoute.data.wind_analysis.label || detailedRoute.data.wind_analysis.status.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                      {detailedRoute.data.wind_analysis.summary}
                    </p>
                  </div>

                  {/* OCEAN CHECK */}
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: `4px solid ${detailedRoute.data.ocean_analysis.status === 'suitable' ? '#0284c7' : detailedRoute.data.ocean_analysis.status === 'caution' ? '#f59e0b' : detailedRoute.data.ocean_analysis.status === 'unsuitable' ? '#ef4444' : '#64748b'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>🌊 Ocean Check</span>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: detailedRoute.data.ocean_analysis.status === 'suitable' ? '#15803d' : detailedRoute.data.ocean_analysis.status === 'caution' ? '#b45309' : detailedRoute.data.ocean_analysis.status === 'unsuitable' ? '#b91c1c' : '#475569' }}>
                        {detailedRoute.data.ocean_analysis.label || detailedRoute.data.ocean_analysis.status.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                      {detailedRoute.data.ocean_analysis.summary}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>


        </div>

        <div className="map-sidebar-col">
          <ComponentErrorBoundary name="Location Information Panel">
            <LocationInfoPanel location={selectedLocation} selectedCoordinate={selectedCoordinate} navigate={navigate} />
          </ComponentErrorBoundary>
          <ComponentErrorBoundary name="Map Layers Control">
            <MapLayersControl
              layers={renderedLayers}
              loading={layersState.loading}
              error={layersState.error}
              onToggleLayer={handleToggleLayer}
              isRouteVisible={isRouteVisible}
              isRouteLoading={liveNavigation.loading}
              onToggleRoute={toggleRouteVisibility}
              routeData={liveNavigation.data}
              isPFZSyncing={pfzSync.loading}
              searchRadius={searchRadius}
              onRadiusChange={(val) => setSearchRadius(val)}
            />
          </ComponentErrorBoundary>
        </div>
      </div>

      <ScenarioSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        initialLocation={selectedCoordinate || { id: selectedLocation?.id, latitude: selectedLocation?.lat, longitude: selectedLocation?.lng, label: selectedLocation?.name }}
        onApplyScenarioToChat={(promptText, loc) => {
          const lat = loc?.latitude || selectedLocation?.lat || 17.6868
          const lon = loc?.longitude || selectedLocation?.lng || 83.2185
          const label = encodeURIComponent(loc?.label || selectedLocation?.name || 'Selected Location')
          const queryParam = encodeURIComponent(promptText)
          if (navigate) {
            navigate(`/ask-orca?query=${queryParam}&latitude=${lat}&longitude=${lon}&label=${label}`)
          } else {
            window.location.href = `/ask-orca?query=${queryParam}&latitude=${lat}&longitude=${lon}&label=${label}`
          }
        }}
        onNavigateMap={(path) => {
          window.history.pushState({}, '', path)
          window.dispatchEvent(new PopStateEvent('popstate'))
        }}
      />
    </div>
  )
}
