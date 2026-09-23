import { useEffect, useRef, useState } from 'react'
import {
  LngLatBounds,
  Map,
  Marker,
  NavigationControl,
  Popup,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const DEFAULT_STYLE = import.meta.env.VITE_MAP_STYLE_URL || {
  version: 8,
  sources: {
    openstreetmap: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'openstreetmap',
      type: 'raster',
      source: 'openstreetmap',
    },
  ],
}

const featureCollection = (features = []) => ({
  type: 'FeatureCollection',
  features: Array.isArray(features) ? features.filter(Boolean) : [],
})

const DEFAULT_LOCATION = {
  latitude: 13.0827,
  longitude: 80.2707,
  label: 'Chennai',
}

function flattenCoordinates(geometry) {
  if (!geometry || !Array.isArray(geometry.coordinates)) {
    return []
  }

  const values = geometry.coordinates.flat(Infinity)
  const points = []

  for (let index = 0; index < values.length - 1; index += 2) {
    const longitude = Number(values[index])
    const latitude = Number(values[index + 1])

    if (
      Number.isFinite(longitude) &&
      Number.isFinite(latitude)
    ) {
      points.push([longitude, latitude])
    }
  }

  return points
}

function representativePoint(geometry) {
  const coordinates = flattenCoordinates(geometry)

  if (!coordinates.length) {
    return null
  }

  const longitude =
    coordinates.reduce((sum, point) => sum + point[0], 0) /
    coordinates.length

  const latitude =
    coordinates.reduce((sum, point) => sum + point[1], 0) /
    coordinates.length

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null
  }

  return [longitude, latitude]
}

function distanceKm(first, second) {
  if (!first || !second || first.length < 2 || second.length < 2) return Infinity
  const radians = (value) => (value * Math.PI) / 180

  const latitudeDelta = radians(second[1] - first[1])
  const longitudeDelta = radians(second[0] - first[0])

  const latitudeOne = radians(first[1])
  const latitudeTwo = radians(second[1])

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeOne) *
      Math.cos(latitudeTwo) *
      Math.sin(longitudeDelta / 2) ** 2

  return (
    6371 *
    2 *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  )
}

function pointToSegmentDistanceKm(p, a, b) {
  if (!p || !a || !b) return Infinity
  const [px, py] = p
  const [ax, ay] = a
  const [bx, by] = b
  const dx = bx - ax
  const dy = by - ay
  if (dx === 0 && dy === 0) {
    return distanceKm(p, a)
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  const projection = [ax + t * dx, ay + t * dy]
  return distanceKm(p, projection)
}

function extractLinesFromGeometry(geometry) {
  if (!geometry || !geometry.type || !geometry.coordinates) return []
  const type = geometry.type
  const coords = geometry.coordinates

  if (type === 'LineString') {
    return [coords]
  }
  if (type === 'MultiLineString' || type === 'Polygon') {
    return coords
  }
  if (type === 'MultiPolygon') {
    return coords.flat(1)
  }
  return []
}

function isPointInRing(pt, ring) {
  if (!pt || !Array.isArray(pt) || pt.length < 2 || !ring || !Array.isArray(ring) || !ring.length) return false
  const [px, py] = [Number(pt[0]), Number(pt[1])]
  if (!Number.isFinite(px) || !Number.isFinite(py)) return false
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const ptI = ring[i], ptJ = ring[j]
    if (!Array.isArray(ptI) || !Array.isArray(ptJ) || ptI.length < 2 || ptJ.length < 2) continue
    const xi = Number(ptI[0]), yi = Number(ptI[1])
    const xj = Number(ptJ[0]), yj = Number(ptJ[1])
    if (!Number.isFinite(xi) || !Number.isFinite(yi) || !Number.isFinite(xj) || !Number.isFinite(yj)) continue
    const intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi + 1e-12) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

function isPointInPolygonCoords(pt, polyCoords) {
  if (!polyCoords || !Array.isArray(polyCoords) || !polyCoords.length) return false
  const exterior = polyCoords[0]
  if (!isPointInRing(pt, exterior)) return false
  for (let k = 1; k < polyCoords.length; k++) {
    if (isPointInRing(pt, polyCoords[k])) return false // inside hole
  }
  return true
}

function minDistanceToGeometryKm(originPt, geometry) {
  if (!originPt || !geometry || !geometry.type || !geometry.coordinates) return Infinity

  if (geometry.type === 'Point') {
    const pts = flattenCoordinates(geometry)
    return pts.length > 0 ? distanceKm(originPt, pts[0]) : Infinity
  }

  // Handle Polygons (if origin inside polygon, minimum distance = 0 km)
  if (geometry.type === 'Polygon') {
    if (isPointInPolygonCoords(originPt, geometry.coordinates)) return 0.0
  } else if (geometry.type === 'MultiPolygon') {
    if (Array.isArray(geometry.coordinates)) {
      for (const poly of geometry.coordinates) {
        if (isPointInPolygonCoords(originPt, poly)) return 0.0
      }
    }
  }

  const lines = extractLinesFromGeometry(geometry)
  let minDist = Infinity

  for (const line of lines) {
    if (!Array.isArray(line) || line.length < 2) continue
    for (let i = 0; i < line.length - 1; i++) {
      const p1 = line[i]
      const p2 = line[i + 1]
      if (Array.isArray(p1) && Array.isArray(p2) && p1.length >= 2 && p2.length >= 2) {
        const pt1 = [Number(p1[0]), Number(p1[1])]
        const pt2 = [Number(p2[0]), Number(p2[1])]
        if (Number.isFinite(pt1[0]) && Number.isFinite(pt1[1]) && Number.isFinite(pt2[0]) && Number.isFinite(pt2[1])) {
          const dist = pointToSegmentDistanceKm(originPt, pt1, pt2)
          if (dist < minDist) minDist = dist
        }
      }
    }
  }

  return minDist
}

function createCirclePolygon(center, radiusKm, points = 64) {
  if (!center || center.length < 2) return null
  const [lon, lat] = [Number(center[0]), Number(center[1])]
  if (!Number.isFinite(lon) || !Number.isFinite(lat) || !radiusKm || radiusKm <= 0) return null
  const coords = []
  const kmPerLat = 111.32
  const kmPerLon = 111.32 * Math.cos((lat * Math.PI) / 180)
  for (let i = 0; i <= points; i++) {
    const theta = (i / points) * 2 * Math.PI
    const dx = radiusKm * Math.sin(theta)
    const dy = radiusKm * Math.cos(theta)
    coords.push([lon + dx / kmPerLon, lat + dy / kmPerLat])
  }
  return {
    type: 'Polygon',
    coordinates: [coords],
  }
}

export default function MapCanvas({
  selectedLocation,
  layers = [],
  routeGeometry,
  detailedRouteStatus = null,
  radiusKm = 50,
  pfzEvaluations = {},
  selectedPFZGeometry = null,
  selectedPFZId = null,
  pfzRouteGeometry = null,
  onMapLocation,
  isExpanded,
  onToggleExpanded,
  liveVesselLocation = null,
  navigationWaypoints = [],
  isTracking = false,
  landTransit = null,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const radiusMarkerRef = useRef(null)
  const vesselMarkerRef = useRef(null)
  const waypointMarkersRef = useRef([])
  const harborMarkerRef = useRef(null)
  const gisMarkersRef = useRef([])
  const initialLocationRef = useRef(selectedLocation)
  const locationHandlerRef = useRef(onMapLocation)
  const [inspectedPFZ, setInspectedPFZ] = useState(null)

  const [mapStatus, setMapStatus] = useState('loading')

  useEffect(() => {
    locationHandlerRef.current = onMapLocation
  }, [onMapLocation])

  /*
   * Create the MapLibre map.
   */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return undefined
    }

    const initialLocation =
      initialLocationRef.current || DEFAULT_LOCATION

    const latitude = Number.isFinite(
      Number(initialLocation?.latitude)
    )
      ? Number(initialLocation.latitude)
      : DEFAULT_LOCATION.latitude

    const longitude = Number.isFinite(
      Number(initialLocation?.longitude)
    )
      ? Number(initialLocation.longitude)
      : DEFAULT_LOCATION.longitude

    let map
    let styleReady = false

    const activateOverlay = () => {
      if (styleReady || !map) {
        return
      }

      try {
        if (!map.getSource('orca-layers')) {
          map.addSource('orca-layers', {
            type: 'geojson',
            data: featureCollection([]),
          })
        }

        // 1. Marine Areas (Green #10b981)
        if (!map.getLayer('orca-fill-marine')) {
          map.addLayer({
            id: 'orca-fill-marine',
            type: 'fill',
            source: 'orca-layers',
            filter: ['all', ['==', '$type', 'Polygon'], ['==', ['get', 'layer'], 'marine_areas']],
            paint: {
              'fill-color': '#10b981',
              'fill-opacity': 0.22,
            },
          })
        }
        if (!map.getLayer('orca-line-marine')) {
          map.addLayer({
            id: 'orca-line-marine',
            type: 'line',
            source: 'orca-layers',
            filter: ['all', ['==', '$type', 'Polygon'], ['==', ['get', 'layer'], 'marine_areas']],
            paint: {
              'line-color': '#059669',
              'line-width': 2.5,
              'line-opacity': 0.9,
            },
          })
        }

        // 2. Restricted Zones (Orange #f59e0b with dashed border)
        if (!map.getLayer('orca-fill-restricted')) {
          map.addLayer({
            id: 'orca-fill-restricted',
            type: 'fill',
            source: 'orca-layers',
            filter: ['all', ['==', '$type', 'Polygon'], ['==', ['get', 'layer'], 'restricted_zones']],
            paint: {
              'fill-color': '#f59e0b',
              'fill-opacity': 0.28,
            },
          })
        }
        if (!map.getLayer('orca-line-restricted')) {
          map.addLayer({
            id: 'orca-line-restricted',
            type: 'line',
            source: 'orca-layers',
            filter: ['all', ['==', '$type', 'Polygon'], ['==', ['get', 'layer'], 'restricted_zones']],
            paint: {
              'line-color': '#d97706',
              'line-width': 2.5,
              'line-dasharray': [3, 1.5],
              'line-opacity': 0.95,
            },
          })
        }

        // 3. Hazards (Red #ef4444 with high visibility crimson border)
        if (!map.getLayer('orca-fill-hazards')) {
          map.addLayer({
            id: 'orca-fill-hazards',
            type: 'fill',
            source: 'orca-layers',
            filter: ['all', ['==', '$type', 'Polygon'], ['==', ['get', 'layer'], 'hazards']],
            paint: {
              'fill-color': '#ef4444',
              'fill-opacity': 0.32,
            },
          })
        }
        if (!map.getLayer('orca-line-hazards')) {
          map.addLayer({
            id: 'orca-line-hazards',
            type: 'line',
            source: 'orca-layers',
            filter: ['all', ['==', '$type', 'Polygon'], ['==', ['get', 'layer'], 'hazards']],
            paint: {
              'line-color': '#dc2626',
              'line-width': 2.8,
              'line-opacity': 0.98,
            },
          })
        }

        // 4. Search Radius Circle & Outer Glow Ring (High Contrast)
        if (!map.getLayer('orca-fill-search-radius')) {
          map.addLayer({
            id: 'orca-fill-search-radius',
            type: 'fill',
            source: 'orca-layers',
            filter: ['==', ['get', 'kind'], 'search-radius'],
            paint: {
              'fill-color': '#0284c7',
              'fill-opacity': 0.12,
            },
          })
        }
        if (!map.getLayer('orca-line-search-radius-glow')) {
          map.addLayer({
            id: 'orca-line-search-radius-glow',
            type: 'line',
            source: 'orca-layers',
            filter: ['==', ['get', 'kind'], 'search-radius'],
            paint: {
              'line-color': '#38bdf8',
              'line-width': 7,
              'line-opacity': 0.4,
            },
          })
        }
        if (!map.getLayer('orca-line-search-radius')) {
          map.addLayer({
            id: 'orca-line-search-radius',
            type: 'line',
            source: 'orca-layers',
            filter: ['==', ['get', 'kind'], 'search-radius'],
            paint: {
              'line-color': '#0284c7',
              'line-width': 2.8,
              'line-dasharray': [4, 2],
              'line-opacity': 0.95,
            },
          })
        }

        // 4.5. PFZ Operational Fishing Buffer Zone (4 km Catch Corridor Halo)
        if (!map.getLayer('orca-pfz-buffer-fill')) {
          map.addLayer({
            id: 'orca-pfz-buffer-fill',
            type: 'fill',
            source: 'orca-layers',
            filter: ['==', ['get', 'kind'], 'pfz-operational-buffer'],
            paint: {
              'fill-color': '#10b981',
              'fill-opacity': 0.2,
            },
          })
        }
        if (!map.getLayer('orca-pfz-buffer-line')) {
          map.addLayer({
            id: 'orca-pfz-buffer-line',
            type: 'line',
            source: 'orca-layers',
            filter: ['==', ['get', 'kind'], 'pfz-operational-buffer'],
            paint: {
              'line-color': '#059669',
              'line-width': 2.5,
              'line-dasharray': [3, 2],
              'line-opacity': 0.9,
            },
          })
        }

        // 5. Default Polygons Fallback
        if (!map.getLayer('orca-fill-default')) {
          map.addLayer({
            id: 'orca-fill-default',
            type: 'fill',
            source: 'orca-layers',
            filter: ['all', ['==', '$type', 'Polygon'], ['!=', ['get', 'layer'], 'marine_areas'], ['!=', ['get', 'layer'], 'restricted_zones'], ['!=', ['get', 'layer'], 'hazards'], ['!=', ['get', 'kind'], 'search-radius'], ['!=', ['get', 'kind'], 'pfz-operational-buffer']],
            paint: {
              'fill-color': '#0ea5e9',
              'fill-opacity': 0.2,
            },
          })
        }

        // 6. Selected PFZ Glow Casing & Highlight Line
        if (!map.getLayer('orca-selected-pfz-casing')) {
          map.addLayer({
            id: 'orca-selected-pfz-casing',
            type: 'line',
            source: 'orca-layers',
            filter: ['==', ['get', 'kind'], 'selected-pfz'],
            paint: {
              'line-color': '#059669',
              'line-width': 12,
              'line-opacity': 0.45,
            },
          })
        }
        if (!map.getLayer('orca-selected-pfz-highlight')) {
          map.addLayer({
            id: 'orca-selected-pfz-highlight',
            type: 'line',
            source: 'orca-layers',
            filter: ['==', ['get', 'kind'], 'selected-pfz'],
            paint: {
              'line-color': '#10b981',
              'line-width': 7.5,
              'line-opacity': 1.0,
            },
          })
        }

        // 7. PFZ Lines Inside Search Radius (Vibrant GREEN Highlight for Fishermen)
        if (!map.getLayer('orca-line-pfz-in-radius-casing')) {
          map.addLayer({
            id: 'orca-line-pfz-in-radius-casing',
            type: 'line',
            source: 'orca-layers',
            filter: ['all', ['==', '$type', 'LineString'], ['==', ['get', 'is_pfz'], true], ['==', ['get', 'is_in_radius'], true], ['!=', ['get', 'kind'], 'selected-pfz']],
            paint: {
              'line-color': '#15803d',
              'line-width': 10,
              'line-opacity': 0.45,
            },
          })
        }
        if (!map.getLayer('orca-line-pfz-in-radius')) {
          map.addLayer({
            id: 'orca-line-pfz-in-radius',
            type: 'line',
            source: 'orca-layers',
            filter: ['all', ['==', '$type', 'LineString'], ['==', ['get', 'is_pfz'], true], ['==', ['get', 'is_in_radius'], true], ['!=', ['get', 'kind'], 'selected-pfz']],
            paint: {
              'line-color': '#22c55e',
              'line-width': 6,
              'line-opacity': 0.98,
            },
          })
        }

        // 8. PFZ Lines Outside Search Radius (Standard Visible Style)
        if (!map.getLayer('orca-line-pfz-default')) {
          map.addLayer({
            id: 'orca-line-pfz-default',
            type: 'line',
            source: 'orca-layers',
            filter: ['all', ['==', '$type', 'LineString'], ['==', ['get', 'is_pfz'], true], ['!=', ['get', 'is_in_radius'], true], ['!=', ['get', 'kind'], 'selected-pfz']],
            paint: {
              'line-color': '#06b6d4',
              'line-width': 3,
              'line-opacity': 0.65,
            },
          })
        }

        // 9. Other Non-PFZ Vector Lines & Shipping Tracks
        if (!map.getLayer('orca-line')) {
          map.addLayer({
            id: 'orca-line',
            type: 'line',
            source: 'orca-layers',
            filter: ['all', ['==', '$type', 'LineString'], ['!=', ['get', 'is_pfz'], true], ['!=', ['get', 'kind'], 'route'], ['!=', ['get', 'kind'], 'pfz-route'], ['!=', ['get', 'kind'], 'selected-pfz']],
            paint: {
              'line-color': '#06b6d4',
              'line-width': 3.5,
              'line-opacity': 0.95,
            },
          })
        }

        // 10. Navigation & PFZ Route Connection Line (Green Marine Route)
        if (!map.getLayer('orca-pfz-route-line')) {
          map.addLayer({
            id: 'orca-pfz-route-line',
            type: 'line',
            source: 'orca-layers',
            filter: ['==', ['get', 'kind'], 'pfz-route'],
            paint: {
              'line-color': '#16a34a',
              'line-width': 4.5,
              'line-dasharray': [3, 1.5],
              'line-opacity': 0.95,
            },
          })
        }

        // 11. Multi-Modal Land Road Route (Amber / Gold Real Road Track)
        if (!map.getLayer('orca-land-route-casing')) {
          map.addLayer({
            id: 'orca-land-route-casing',
            type: 'line',
            source: 'orca-layers',
            filter: ['==', ['get', 'kind'], 'land-road-route'],
            paint: {
              'line-color': '#78350f',
              'line-width': 8,
              'line-opacity': 0.8,
            },
          })
        }
        if (!map.getLayer('orca-land-route-line')) {
          map.addLayer({
            id: 'orca-land-route-line',
            type: 'line',
            source: 'orca-layers',
            filter: ['==', ['get', 'kind'], 'land-road-route'],
            paint: {
              'line-color': '#f59e0b',
              'line-width': 5,
              'line-opacity': 1.0,
            },
          })
        }

        if (!map.getLayer('orca-route-line')) {
          map.addLayer({
            id: 'orca-route-line',
            type: 'line',
            source: 'orca-layers',
            filter: ['==', ['get', 'kind'], 'route'],
            paint: {
              'line-color': [
                'match',
                ['get', 'status'],
                'UNSAFE', '#dc2626',
                'CAUTION', '#d97706',
                'SAFE', '#16a34a',
                '#16a34a',
              ],
              'line-width': 5.5,
              'line-dasharray': [2, 1],
              'line-opacity': 0.95,
            },
          })
        }

        if (!map.getLayer('orca-point')) {
          map.addLayer({
            id: 'orca-point',
            type: 'circle',
            source: 'orca-layers',
            filter: ['==', '$type', 'Point'],
            paint: {
              'circle-radius': 6,
              'circle-color': '#ef4444',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
            },
          })
        }

        // Click popups on polygon features
        const handlePolygonClick = (e) => {
          const feature = e.features?.[0]
          if (!feature) return
          if (e.originalEvent) e.originalEvent.cancelBubble = true
          const props = feature.properties || {}
          const layerId = String(props.layer || '').toLowerCase()
          const isHazard = layerId === 'hazards'
          const isRestricted = layerId === 'restricted_zones'
          const badgeColor = isHazard ? '#dc2626' : isRestricted ? '#d97706' : '#059669'
          const icon = isHazard ? '⚠️' : isRestricted ? '🚫' : '⚓'
          const title = isHazard ? 'Marine Hazard Area' : isRestricted ? 'Restricted Maritime Zone' : 'Marine Monitoring Area'

          new Popup({ offset: 12, maxWidth: '290px' })
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family: system-ui, sans-serif; color: #0f172a; padding: 4px;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
                  <span style="font-size: 18px;">${icon}</span>
                  <div>
                    <strong style="color: ${badgeColor}; font-size: 13px; display: block;">${title}</strong>
                    <small style="color: #64748b; font-size: 12px;">${props.name || props.id || 'GIS Feature'}</small>
                  </div>
                </div>
                <div style="font-size: 12px; line-height: 1.4; border-top: 1px solid #e2e8f0; padding-top: 5px; color: #334155;">
                  <p style="margin: 2px 0;"><strong>Source:</strong> ${props.source || 'ORCA GIS'}</p>
                  <p style="margin: 2px 0;"><strong>Position:</strong> ${e.lngLat.lat.toFixed(4)}°N, ${e.lngLat.lng.toFixed(4)}°E</p>
                  ${props.notice ? `<p style="margin: 4px 0 2px 0; color: #64748b; font-size: 12px;"><em>${props.notice}</em></p>` : ''}
                </div>
                <div style="margin-top: 8px;">
                  <button style="background: ${badgeColor}; color: #fff; border: none; border-radius: 4px; padding: 4px 8px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="window.dispatchEvent(new CustomEvent('orca-select-coord', {detail: {latitude: ${e.lngLat.lat}, longitude: ${e.lngLat.lng}, label: '${props.name || title}'}}))">📍 Focus Here</button>
                </div>
              </div>
            `)
            .addTo(map)
        }

        map.on('click', 'orca-fill-marine', handlePolygonClick)
        map.on('click', 'orca-fill-restricted', handlePolygonClick)
        map.on('click', 'orca-fill-hazards', handlePolygonClick)
        map.on('click', 'orca-fill-default', handlePolygonClick)

        map.on('mouseenter', 'orca-fill-marine', () => { if (map.getCanvas()) map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'orca-fill-marine', () => { if (map.getCanvas()) map.getCanvas().style.cursor = '' })
        map.on('mouseenter', 'orca-fill-restricted', () => { if (map.getCanvas()) map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'orca-fill-restricted', () => { if (map.getCanvas()) map.getCanvas().style.cursor = '' })
        map.on('mouseenter', 'orca-fill-hazards', () => { if (map.getCanvas()) map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'orca-fill-hazards', () => { if (map.getCanvas()) map.getCanvas().style.cursor = '' })
        map.on('mouseenter', 'orca-fill-default', () => { if (map.getCanvas()) map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'orca-fill-default', () => { if (map.getCanvas()) map.getCanvas().style.cursor = '' })

        map.on('click', 'orca-line', (e) => {
          const feature = e.features?.[0]
          if (!feature) return
          if (e.originalEvent) e.originalEvent.cancelBubble = true
          const props = feature.properties || {}
          const isPFZ = props.layer === 'pfz' || props.dataset === 'PFZ' || String(props.id || '').toLowerCase().includes('pfz')
          new Popup({ offset: 12, maxWidth: '280px' })
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family: system-ui, sans-serif; color: #0f172a; padding: 4px;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                  <span style="font-size: 16px;">${isPFZ ? '🐟' : '📍'}</span>
                  <strong style="color: ${isPFZ ? '#0891b2' : '#d97706'}; font-size: 13px;">
                    ${isPFZ ? 'Potential Fishing Zone Track' : 'GIS Line Feature'}
                  </strong>
                </div>
                <div style="font-size: 12px; line-height: 1.4; color: #334155;">
                  <p style="margin: 2px 0;"><strong>ID:</strong> ${props.id || 'PFZ Feature'}</p>
                  <p style="margin: 2px 0;"><strong>Source:</strong> ${props.source || 'INCOIS'} (${props.freshness_status || 'live'})</p>
                  <p style="margin: 2px 0;"><strong>Position:</strong> ${e.lngLat.lat.toFixed(4)}°N, ${e.lngLat.lng.toFixed(4)}°E</p>
                </div>
              </div>
            `)
            .addTo(map)
        })

        map.on('click', 'orca-route-line', (e) => {
          if (e.originalEvent) e.originalEvent.cancelBubble = true
          new Popup({ offset: 12, maxWidth: '260px' })
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family: system-ui, sans-serif; color: #0f172a; padding: 4px;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                  <span style="font-size: 16px;">🧭</span>
                  <strong style="color: #2563eb; font-size: 13px;">Calculated Navigation Route</strong>
                </div>
                <p style="margin: 2px 0; font-size: 12px; color: #334155;">Active computed marine voyage path between selected endpoints.</p>
              </div>
            `)
            .addTo(map)
        })

        map.on('mouseenter', 'orca-line', () => { if (map.getCanvas()) map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'orca-line', () => { if (map.getCanvas()) map.getCanvas().style.cursor = '' })
        map.on('mouseenter', 'orca-route-line', () => { if (map.getCanvas()) map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'orca-route-line', () => { if (map.getCanvas()) map.getCanvas().style.cursor = '' })

        styleReady = true
        setMapStatus('ready')
      } catch (error) {
        console.error('Failed to create GIS overlay:', error)
        setMapStatus('error')
      }
    }

    const timeoutId = window.setTimeout(() => {
      if (!styleReady) {
        activateOverlay()
      }
    }, 12000)

    try {
      map = new Map({
        container: containerRef.current,
        style: DEFAULT_STYLE,
        center: [longitude, latitude],
        zoom: 7,
      })

      mapRef.current = map

      map.addControl(
        new NavigationControl(),
        'top-right'
      )

      if (map.isStyleLoaded()) {
        activateOverlay()
      } else {
        map.once('style.load', activateOverlay)
        map.once('load', activateOverlay)
      }

      map.on('styledata', () => {
        if (!map.getSource('orca-layers')) {
          styleReady = false
          activateOverlay()
        }
      })

      map.on('click', (event) => {
        if (!map || !map.getLayer) return
        const bbox = [[event.point.x - 6, event.point.y - 6], [event.point.x + 6, event.point.y + 6]]
        const featureLayers = [
          'orca-fill-hazards',
          'orca-fill-restricted',
          'orca-fill-marine',
          'orca-fill-default',
          'orca-line',
          'orca-route-line',
          'orca-point',
        ].filter((id) => {
          try { return Boolean(map.getLayer(id)) } catch { return false }
        })

        const hits = map.queryRenderedFeatures ? map.queryRenderedFeatures(bbox, { layers: featureLayers }) : []
        if (hits.length > 0) {
          return
        }
        locationHandlerRef.current?.({
          latitude: event.lngLat.lat,
          longitude: event.lngLat.lng,
          label: 'Selected map coordinate',
        })
      })
    } catch (error) {
      console.error('MapLibre initialization failed:', error)
      window.clearTimeout(timeoutId)
      window.setTimeout(() => setMapStatus('error'), 0)
    }

    return () => {
      window.clearTimeout(timeoutId)
      markerRef.current?.remove()
      radiusMarkerRef.current?.remove()
      gisMarkersRef.current.forEach((m) => {
        try { m.remove() } catch {}
      })
      gisMarkersRef.current = []
      if (map) {
        try { map.remove() } catch {}
      }
      mapRef.current = null
    }
  }, [])

  /*
   * Draw GIS layers.
   */
  useEffect(() => {
    const map = mapRef.current

    if (!map || mapStatus !== 'ready') {
      return
    }

    const latitude = Number(selectedLocation?.latitude)
    const longitude = Number(selectedLocation?.longitude)

    const target = (Number.isFinite(latitude) && Number.isFinite(longitude))
      ? [longitude, latitude]
      : [DEFAULT_LOCATION.longitude, DEFAULT_LOCATION.latitude]

    const safeLayers = Array.isArray(layers) ? layers : []

    const visibleLayers = safeLayers.filter(
      (layer) => layer?.enabled !== false && Array.isArray(layer?.features)
    )

    const features = visibleLayers
      .flatMap((layer) => {
        const layerId = String(layer?.id || '').toLowerCase()
        return (layer?.features || []).map((feature) => {
          if (!feature) return null
          const geom = feature.geometry || feature
          const isPFZ = layerId === 'pfz' || String(feature.id || '').toLowerCase().includes('pfz') || feature.dataset === 'PFZ'

          const featIdKey = String(feature.id || feature.source_identifier || feature.properties?.id || '').toLowerCase()
          const evalInfo = (pfzEvaluations && typeof pfzEvaluations === 'object') ? pfzEvaluations[featIdKey] : null

          let distToOrigin = Infinity
          let isInRadius = false

          if (evalInfo) {
            distToOrigin = Number(evalInfo.distance_km)
            isInRadius = Boolean(evalInfo.within_radius)
          } else if (Number.isFinite(latitude) && Number.isFinite(longitude) && radiusKm > 0) {
            distToOrigin = minDistanceToGeometryKm(target, geom)
            isInRadius = distToOrigin <= radiusKm
          }

          const props = {
            id: feature.id || feature.source_identifier || 'GIS-feature',
            name: feature.name || feature.properties?.name || feature.id || layer.name || 'Feature',
            source: feature.source || feature.properties?.source || layer.source || 'ORCA GIS',
            freshness_status: feature.freshness_status || feature.properties?.freshness_status || feature.source_status || 'live',
            ...(feature.properties || {}),
            layer: String(feature.properties?.layer || feature.layer || layerId || '').toLowerCase(),
            is_pfz: Boolean(isPFZ),
            is_in_radius: Boolean(isInRadius),
            dist_km: Number.isFinite(distToOrigin) && distToOrigin !== Infinity ? Math.round(distToOrigin * 10) / 10 : null,
          }
          return {
            type: 'Feature',
            geometry: geom,
            properties: props,
          }
        }).filter(Boolean)
      })

    /*
     * Add search radius circle, selected PFZ highlight, and route geometries.
     */
    if (radiusKm && radiusKm > 0 && target) {
      const circleGeom = createCirclePolygon(target, radiusKm)
      if (circleGeom) {
        features.push({
          type: 'Feature',
          geometry: circleGeom,
          properties: {
            kind: 'search-radius',
          },
        })
      }
    }

    if (selectedPFZGeometry) {
      features.push({
        type: 'Feature',
        geometry: selectedPFZGeometry,
        properties: {
          kind: 'selected-pfz',
        },
      })
    }

    // 4 km Operational Fishing Buffer Zone (Halo around Selected or Clicked PFZ)
    let bufferCenter = null
    let bufferName = 'Nearest Suitable PFZ'

    if (inspectedPFZ && (inspectedPFZ.geometry || inspectedPFZ.rep_point)) {
      bufferCenter = inspectedPFZ.rep_point || representativePoint(inspectedPFZ.geometry)
      bufferName = inspectedPFZ.name || inspectedPFZ.properties?.name || 'Inspected PFZ'
    } else if (selectedPFZGeometry) {
      bufferCenter = representativePoint(selectedPFZGeometry)
      bufferName = 'Nearest Suitable PFZ'
    } else if (selectedPFZId) {
      const allPFZFeatures = visibleLayers.filter((l) => String(l?.id || '').toLowerCase() === 'pfz').flatMap((l) => l.features || [])
      const found = allPFZFeatures.find((f) => String(f.id || f.properties?.id || '').toLowerCase() === String(selectedPFZId).toLowerCase())
      if (found) {
        bufferCenter = representativePoint(found.geometry || found)
        bufferName = found.properties?.name || found.name || 'Nearest Suitable PFZ'
      }
    }

    if (bufferCenter && Array.isArray(bufferCenter) && bufferCenter.length >= 2 && Number.isFinite(bufferCenter[0]) && Number.isFinite(bufferCenter[1])) {
      const bufferGeom = createCirclePolygon(bufferCenter, 4.0, 48)
      if (bufferGeom) {
        features.push({
          type: 'Feature',
          geometry: bufferGeom,
          properties: {
            kind: 'pfz-operational-buffer',
            name: `${bufferName} (4 km Fishing Corridor)`,
            radius_km: 4.0,
          },
        })
      }
    }

    if (pfzRouteGeometry) {
      features.push({
        type: 'Feature',
        geometry: pfzRouteGeometry,
        properties: {
          kind: 'pfz-route',
        },
      })
    }

    if (routeGeometry) {
      features.push({
        type: 'Feature',
        geometry: routeGeometry,
        properties: {
          kind: 'route',
          status: detailedRouteStatus || routeGeometry.status || 'default',
        },
      })
    }

    if (landTransit?.road_geometry) {
      features.push({
        type: 'Feature',
        geometry: landTransit.road_geometry,
        properties: {
          kind: 'land-road-route',
          harbor_name: landTransit.harbor?.name || 'Departure Harbor',
        },
      })
    }

    try {
      if (map.getSource && map.getSource('orca-layers')) {
        map.getSource('orca-layers').setData(featureCollection(features))
      }
    } catch (e) {
      console.warn('Failed to update map features:', e)
    }

    gisMarkersRef.current.forEach((marker) => {
      try { marker.remove() } catch {}
    })
    gisMarkersRef.current = []

    visibleLayers.forEach((layer) => {
      if (!layer) return
      const layerId = String(layer.id || '').toLowerCase()
      const layerFeatures = Array.isArray(layer.features) ? layer.features : []

      layerFeatures.forEach((feature) => {
        if (!feature) return
        const geometry = feature.geometry || feature
        const repCoord = representativePoint(geometry)
        if (!repCoord || !Array.isArray(repCoord) || repCoord.length < 2) return
        const [repLon, repLat] = repCoord
        if (!Number.isFinite(repLon) || !Number.isFinite(repLat)) return

        const props = feature.properties || {}
        const name = props.name || feature.name || feature.id || layer.name || 'Feature'
        const dist = (Number.isFinite(latitude) && Number.isFinite(longitude))
          ? distanceKm(target, repCoord).toFixed(1)
          : null

        const el = document.createElement('div')

        if (layerId === 'hazards') {
          el.className = 'gis-interactive-marker hazard-marker'
          el.innerHTML = '<div class="gis-marker-bubble hazard-bubble"><span>⚠️</span><strong>HAZARD</strong></div>'

          const popup = new Popup({ offset: 15, maxWidth: '290px' }).setHTML(`
            <div style="font-family: system-ui, sans-serif; color: #0f172a; padding: 4px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                <span style="font-size: 20px;">⚠️</span>
                <div>
                  <strong style="color: #dc2626; font-size: 13px; display: block;">Marine Navigation Hazard</strong>
                  <small style="color: #64748b; font-size: 12px;">${name}</small>
                </div>
              </div>
              <div style="font-size: 12px; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 6px; color: #334155;">
                <p style="margin: 2px 0;"><strong>Source:</strong> ${feature.source || props.source || 'ORCA GIS'}</p>
                <p style="margin: 2px 0;"><strong>Coordinates:</strong> ${repLat.toFixed(4)}°N, ${repLon.toFixed(4)}°E</p>
                ${dist ? `<p style="margin: 2px 0; color: #dc2626;"><strong>Distance:</strong> ${dist} km from center</p>` : ''}
                ${props.notice ? `<p style="margin: 4px 0 2px 0; color: #64748b; font-size: 12px;"><em>${props.notice}</em></p>` : ''}
              </div>
              <div style="margin-top: 8px;">
                <button style="background: #dc2626; color: #fff; border: none; border-radius: 4px; padding: 4px 8px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="window.dispatchEvent(new CustomEvent('orca-select-coord', {detail: {latitude: ${repLat}, longitude: ${repLon}, label: '${name}'}}))">📍 Focus Here</button>
              </div>
            </div>
          `)
          try {
            const marker = new Marker({ element: el }).setLngLat(repCoord).setPopup(popup).addTo(map)
            gisMarkersRef.current.push(marker)
          } catch {}

        } else if (layerId === 'restricted_zones') {
          el.className = 'gis-interactive-marker restricted-marker'
          el.innerHTML = '<div class="gis-marker-bubble restricted-bubble"><span>🚫</span><strong>RESTRICTED</strong></div>'

          const popup = new Popup({ offset: 15, maxWidth: '290px' }).setHTML(`
            <div style="font-family: system-ui, sans-serif; color: #0f172a; padding: 4px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                <span style="font-size: 20px;">🚫</span>
                <div>
                  <strong style="color: #d97706; font-size: 13px; display: block;">Restricted Maritime Zone</strong>
                  <small style="color: #64748b; font-size: 12px;">${name}</small>
                </div>
              </div>
              <div style="font-size: 12px; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 6px; color: #334155;">
                <p style="margin: 2px 0;"><strong>Source:</strong> ${feature.source || props.source || 'ORCA GIS'}</p>
                <p style="margin: 2px 0;"><strong>Coordinates:</strong> ${repLat.toFixed(4)}°N, ${repLon.toFixed(4)}°E</p>
                ${dist ? `<p style="margin: 2px 0; color: #d97706;"><strong>Distance:</strong> ${dist} km from center</p>` : ''}
                ${props.notice ? `<p style="margin: 4px 0 2px 0; color: #64748b; font-size: 12px;"><em>${props.notice}</em></p>` : ''}
              </div>
              <div style="margin-top: 8px;">
                <button style="background: #d97706; color: #fff; border: none; border-radius: 4px; padding: 4px 8px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="window.dispatchEvent(new CustomEvent('orca-select-coord', {detail: {latitude: ${repLat}, longitude: ${repLon}, label: '${name}'}}))">📍 Focus Here</button>
              </div>
            </div>
          `)
          try {
            const marker = new Marker({ element: el }).setLngLat(repCoord).setPopup(popup).addTo(map)
            gisMarkersRef.current.push(marker)
          } catch {}

        } else if (layerId === 'marine_areas') {
          el.className = 'gis-interactive-marker marine-marker'
          el.innerHTML = '<div class="gis-marker-bubble marine-bubble"><span>⚓</span><strong>MARINE ZONE</strong></div>'

          const popup = new Popup({ offset: 15, maxWidth: '290px' }).setHTML(`
            <div style="font-family: system-ui, sans-serif; color: #0f172a; padding: 4px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                <span style="font-size: 20px;">⚓</span>
                <div>
                  <strong style="color: #059669; font-size: 13px; display: block;">Marine Monitoring Area</strong>
                  <small style="color: #64748b; font-size: 12px;">${name}</small>
                </div>
              </div>
              <div style="font-size: 12px; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 6px; color: #334155;">
                <p style="margin: 2px 0;"><strong>Source:</strong> ${feature.source || props.source || 'ORCA GIS'}</p>
                <p style="margin: 2px 0;"><strong>Coordinates:</strong> ${repLat.toFixed(4)}°N, ${repLon.toFixed(4)}°E</p>
                ${dist ? `<p style="margin: 2px 0; color: #059669;"><strong>Distance:</strong> ${dist} km from center</p>` : ''}
              </div>
              <div style="margin-top: 8px;">
                <button style="background: #059669; color: #fff; border: none; border-radius: 4px; padding: 4px 8px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="window.dispatchEvent(new CustomEvent('orca-select-coord', {detail: {latitude: ${repLat}, longitude: ${repLon}, label: '${name}'}}))">📍 Focus Here</button>
              </div>
            </div>
          `)
          try {
            const marker = new Marker({ element: el }).setLngLat(repCoord).setPopup(popup).addTo(map)
            gisMarkersRef.current.push(marker)
          } catch {}

        } else if (layerId === 'pfz') {
          const featIdKey = String(feature.id || feature.source_identifier || feature.properties?.id || '').toLowerCase()
          const evalInfo = (pfzEvaluations && typeof pfzEvaluations === 'object') ? pfzEvaluations[featIdKey] : null

          let distVal = Infinity
          let isInRadius = false

          if (evalInfo) {
            distVal = Number(evalInfo.distance_km)
            isInRadius = Boolean(evalInfo.within_radius)
          } else if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            distVal = minDistanceToGeometryKm(target, geometry)
            isInRadius = distVal <= radiusKm
          }

          const isSelectedPFZ = Boolean(
            selectedPFZId &&
            (String(feature.id || '').toLowerCase() === String(selectedPFZId).toLowerCase() ||
             String(props.id || '').toLowerCase() === String(selectedPFZId).toLowerCase() ||
             featIdKey === String(selectedPFZId).toLowerCase())
          )

          const isStarPFZ = isSelectedPFZ
          const borderCol = isStarPFZ ? '#f59e0b' : (isInRadius ? '#22c55e' : '#06b6d4')
          const bgCol = isStarPFZ ? '#fef9c3' : (isInRadius ? '#dcfce7' : '#ecfeff')
          const textCol = isStarPFZ ? '#854d0e' : (isInRadius ? '#15803d' : '#0e7490')
          const badgeLabel = isStarPFZ
            ? `<span>⭐ 🟢</span><strong>NEAREST PFZ (${Number.isFinite(distVal) && distVal !== Infinity ? `${distVal.toFixed(1)} km` : ''})</strong>`
            : isInRadius
            ? `<span>🟢</span><strong>PFZ (${Number.isFinite(distVal) && distVal !== Infinity ? `${distVal.toFixed(1)} km` : ''})</strong>`
            : '<span>🐟</span><strong>PFZ</strong>'

          el.className = `gis-interactive-marker pfz-marker ${isStarPFZ ? 'pfz-marker-selected-star' : (isInRadius ? 'pfz-marker-in-radius' : 'pfz-marker-outside')}`
          const shadowStyle = isStarPFZ
            ? 'box-shadow: 0 0 16px rgba(245, 158, 11, 0.85), 0 0 0 3px rgba(34, 197, 94, 0.65); z-index: 10;'
            : (isInRadius ? 'box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.45);' : '')

          el.innerHTML = `<div class="gis-marker-bubble pfz-bubble ${isStarPFZ ? 'star-bubble' : ''}" style="background: ${bgCol}; color: ${textCol}; border-color: ${borderCol}; font-weight: ${isStarPFZ || isInRadius ? '800' : '600'}; ${shadowStyle}">${badgeLabel}</div>`

          const popup = new Popup({ offset: 15, maxWidth: '300px' }).setHTML(`
            <div style="font-family: system-ui, sans-serif; color: #0f172a; padding: 4px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                <span style="font-size: 22px;">${isStarPFZ ? '⭐ 🟢' : (isInRadius ? '🟢' : '🐟')}</span>
                <div>
                  <strong style="color: ${borderCol}; font-size: 13px; display: block;">${isStarPFZ ? '⭐ NEAREST SUITABLE PFZ' : 'Potential Fishing Zone'}</strong>
                  <small style="color: ${isStarPFZ ? '#854d0e' : (isInRadius ? '#15803d' : '#64748b')}; font-weight: 700; font-size: 11px;">
                    ${isStarPFZ ? '⭐ SELECTED OPTIMAL TARGET (Passed Weather + Ocean + GIS)' : (isInRadius ? '🟢 Inside Search Radius (GREEN)' : 'Outside Search Radius')}
                  </small>
                </div>
              </div>
              <div style="font-size: 12px; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 6px; color: #334155;">
                <p style="margin: 2px 0;"><strong>Feature ID:</strong> ${feature.id || 'INCOIS-PFZ'}</p>
                <p style="margin: 2px 0;"><strong>Source:</strong> ${feature.source || props.source || 'INCOIS'} (${feature.freshness_status || props.freshness_status || 'live'})</p>
                <p style="margin: 2px 0;"><strong>Coordinates:</strong> ${repLat.toFixed(4)}°N, ${repLon.toFixed(4)}°E</p>
                <p style="margin: 2px 0;"><strong>Distance to Line:</strong> <strong style="color: ${borderCol};">${Number.isFinite(distVal) && distVal !== Infinity ? `${distVal.toFixed(1)} km` : 'N/A'}</strong></p>
                ${props.depth_m ? `<p style="margin: 2px 0;"><strong>Target Depth:</strong> ${props.depth_m} m</p>` : ''}
                ${props.bearing_deg ? `<p style="margin: 2px 0;"><strong>Bearing:</strong> ${props.bearing_deg}°</p>` : ''}
              </div>
              <div style="margin-top: 8px;">
                <button style="background: ${borderCol}; color: #fff; border: none; border-radius: 4px; padding: 4px 8px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="window.dispatchEvent(new CustomEvent('orca-select-coord', {detail: {latitude: ${repLat}, longitude: ${repLon}, label: 'PFZ: ${feature.id || 'Zone'}'}}))">📍 Focus Here</button>
              </div>
            </div>
          `)
          try {
            el.addEventListener('click', () => {
              setInspectedPFZ(feature)
            })
            const marker = new Marker({ element: el }).setLngLat(repCoord).setPopup(popup).addTo(map)
            gisMarkersRef.current.push(marker)
          } catch {}
        }
      })
    })

    /*
     * If route or land transit geometry is active, zoom to encompass full multi-modal bounds.
     */
    const allRouteCoords = [
      ...(Array.isArray(landTransit?.road_geometry?.coordinates) ? landTransit.road_geometry.coordinates : []),
      ...(Array.isArray(routeGeometry?.coordinates) ? routeGeometry.coordinates : []),
    ]

    if (allRouteCoords.length >= 2) {
      try {
        const routeBounds = allRouteCoords.reduce(
          (b, pt) => (Array.isArray(pt) && pt.length >= 2 ? b.extend(pt) : b),
          new LngLatBounds(allRouteCoords[0], allRouteCoords[0])
        )
        map.fitBounds(routeBounds, {
          padding: 70,
          maxZoom: 11,
          duration: 700,
        })
      } catch (e) {
        console.warn('Failed to fit multi-modal route bounds:', e)
      }
    }
  }, [
    layers,
    routeGeometry,
    landTransit,
    radiusKm,
    selectedPFZGeometry,
    pfzRouteGeometry,
    selectedLocation,
    mapStatus,
  ])

  /*
   * Selected location marker with radar pulse ring & operational radius badge.
   */
  useEffect(() => {
    const map = mapRef.current

    if (!map || mapStatus !== 'ready') {
      return
    }

    const latitude = Number(
      selectedLocation?.latitude
    )

    const longitude = Number(
      selectedLocation?.longitude
    )

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return
    }

    try {
      markerRef.current?.remove()
      radiusMarkerRef.current?.remove()

      const locationLabel =
        selectedLocation.label ||
        selectedLocation.name ||
        'Selected map coordinate'

      const el = document.createElement('div')
      el.className = 'orca-map-pointer-wrap'
      el.innerHTML = `
        <div class="orca-pointer-pulse-ring"></div>
        <div class="orca-pointer-core">
          <div class="orca-pointer-dot"></div>
        </div>
      `

      markerRef.current = new Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat([longitude, latitude])
        .setPopup(
          new Popup({ offset: 20 }).setHTML(`
            <div style="font-family: system-ui, -apple-system, sans-serif; padding: 4px; min-width: 170px;">
              <strong style="color: #0284c7; font-size: 13px; display: block;">📍 ${locationLabel}</strong>
              <div style="color: #64748b; font-size: 11px; margin-top: 2px;">${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E</div>
              <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #0369a1; font-weight: 700;">
                ⭕ Operational Radius: ${radiusKm || 50} km
              </div>
            </div>
          `)
        )
        .addTo(map)

      // Radius Badge Marker at northern perimeter of the radius circle
      if (radiusKm && radiusKm > 0) {
        const kmPerLat = 111.32
        const topLat = latitude + radiusKm / kmPerLat
        const badgeEl = document.createElement('div')
        badgeEl.className = 'orca-radius-badge'
        badgeEl.innerHTML = `⭕ ${radiusKm} km Search Radius`

        radiusMarkerRef.current = new Marker({
          element: badgeEl,
          anchor: 'bottom',
        })
          .setLngLat([longitude, topLat])
          .addTo(map)
      }

      map.flyTo({
        center: [longitude, latitude],
        zoom: Math.max(map.getZoom(), 7),
        essential: true,
      })
    } catch (e) {
      console.warn('Failed to update selected location marker:', e)
    }
  }, [selectedLocation, radiusKm, mapStatus])

  /*
   * Live Vessel GPS Position Marker & Auto-Tracking Camera
   */
  useEffect(() => {
    const map = mapRef.current
    if (!map || mapStatus !== 'ready') return

    if (
      !liveVesselLocation ||
      !Number.isFinite(Number(liveVesselLocation.latitude)) ||
      !Number.isFinite(Number(liveVesselLocation.longitude))
    ) {
      vesselMarkerRef.current?.remove()
      vesselMarkerRef.current = null
      return
    }

    const lat = Number(liveVesselLocation.latitude)
    const lon = Number(liveVesselLocation.longitude)

    try {
      if (!vesselMarkerRef.current) {
        const el = document.createElement('div')
        el.className = 'live-vessel-map-marker'
        el.innerHTML = `
          <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: rgba(56, 189, 248, 0.35); border: 2px solid #0284c7; animation: radarPulse 1.8s infinite;"></div>
            <div style="position: relative; width: 24px; height: 24px; border-radius: 50%; background: #0284c7; color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; box-shadow: 0 2px 8px rgba(0,0,0,0.4); font-weight: bold; border: 2px solid #ffffff;">
              ⛵
            </div>
          </div>
        `
        const popup = new Popup({ offset: 18 }).setHTML(`
          <div style="font-family: inherit; font-size: 12px; color: #0f172a; padding: 2px 4px;">
            <strong style="color: #0284c7;">📍 Live Vessel Position</strong><br/>
            ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E
            ${liveVesselLocation.accuracy ? `<br/><small style="color: #64748b;">Accuracy: ±${Math.round(liveVesselLocation.accuracy)}m</small>` : ''}
          </div>
        `)
        vesselMarkerRef.current = new Marker({ element: el })
          .setLngLat([lon, lat])
          .setPopup(popup)
          .addTo(map)
      } else {
        vesselMarkerRef.current.setLngLat([lon, lat])
      }

      if (isTracking) {
        map.easeTo({
          center: [lon, lat],
          zoom: Math.max(map.getZoom(), 11),
          duration: 1000,
        })
      }
    } catch (e) {
      console.warn('Failed to update live vessel marker:', e)
    }
  }, [liveVesselLocation, isTracking, mapStatus])

  /*
   * Turn-by-Turn Navigation Waypoint Pins
   */
  useEffect(() => {
    const map = mapRef.current
    if (!map || mapStatus !== 'ready') return

    waypointMarkersRef.current.forEach((m) => m.remove())
    waypointMarkersRef.current = []

    if (!Array.isArray(navigationWaypoints) || navigationWaypoints.length === 0) return

    navigationWaypoints.forEach((wp, idx) => {
      const lat = Number(wp.latitude)
      const lon = Number(wp.longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return

      const isLast = idx === navigationWaypoints.length - 1
      const label = isLast ? '🎯' : `W${wp.waypoint_number || idx + 1}`

      const el = document.createElement('div')
      el.className = 'navigation-waypoint-pin'
      el.innerHTML = `
        <div style="background: ${isLast ? '#10b981' : '#0284c7'}; color: white; font-weight: 800; font-size: 11px; padding: 2px 6px; border-radius: 12px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35); cursor: pointer; white-space: nowrap;">
          ${label}
        </div>
      `

      const popup = new Popup({ offset: 15 }).setHTML(`
        <div style="font-family: inherit; font-size: 12px; color: #0f172a; padding: 2px;">
          <strong style="color: ${isLast ? '#059669' : '#0284c7'};">${isLast ? '🎯 Destination PFZ' : `Waypoint ${wp.waypoint_number || idx + 1}`}</strong><br/>
          <strong>Coords:</strong> ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E<br/>
          ${wp.bearing_deg != null ? `<strong>Course:</strong> ${wp.bearing_deg}° ${wp.compass_heading || ''}<br/>` : ''}
          ${wp.leg_distance_nm != null ? `<strong>Leg Distance:</strong> ${wp.leg_distance_nm} NM<br/>` : ''}
          <strong>Safety:</strong> <span style="color: ${wp.safety_status === 'UNSAFE' ? '#dc2626' : wp.safety_status === 'CAUTION' ? '#d97706' : '#16a34a'}; font-weight: bold;">${wp.safety_status || 'SAFE'}</span>
        </div>
      `)

      const marker = new Marker({ element: el })
        .setLngLat([lon, lat])
        .setPopup(popup)
        .addTo(map)

      waypointMarkersRef.current.push(marker)
    })

    // If land transit to a coastal harbor is active, add an Amber Harbor Departure pin
    if (landTransit?.harbor && landTransit?.land_transit_needed) {
      const hLon = Number(landTransit.harbor.longitude)
      const hLat = Number(landTransit.harbor.latitude)
      if (Number.isFinite(hLon) && Number.isFinite(hLat)) {
        const el = document.createElement('div')
        el.className = 'harbor-departure-pin'
        el.innerHTML = `
          <div style="background: #f59e0b; color: #0f172a; font-weight: 800; font-size: 11px; padding: 3px 8px; border-radius: 14px; border: 2px solid #ffffff; box-shadow: 0 3px 10px rgba(0,0,0,0.45); cursor: pointer; white-space: nowrap; display: flex; align-items: center; gap: 4px;">
            <span style="font-size: 13px;">⚓</span> ${landTransit.harbor.name || 'Harbor'}
          </div>
        `
        const popup = new Popup({ offset: 16 }).setHTML(`
          <div style="font-family: inherit; font-size: 12px; color: #0f172a; padding: 2px;">
            <strong style="color: #b45309; font-size: 13px;">⚓ Departure Fishing Harbor</strong><br/>
            <strong>${landTransit.harbor.name}</strong><br/>
            <span style="color: #64748b;">${landTransit.harbor.state || ''} · ${landTransit.harbor.type || 'Fishing Harbor'}</span><br/>
            <strong>Road Distance:</strong> ${landTransit.distance_km} km (${landTransit.formatted_duration || ''})<br/>
            <strong>Coordinates:</strong> ${hLat.toFixed(4)}°N, ${hLon.toFixed(4)}°E<br/>
            <div style="margin-top: 4px; padding: 3px 6px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 4px; color: #065f46; font-weight: 600; font-size: 11px;">
              ⛵ Transition point from road transit to marine voyage
            </div>
          </div>
        `)
        const marker = new Marker({ element: el })
          .setLngLat([hLon, hLat])
          .setPopup(popup)
          .addTo(map)
        waypointMarkersRef.current.push(marker)
      }
    }
  }, [navigationWaypoints, landTransit, mapStatus])

  useEffect(() => {
    try {
      mapRef.current?.resize()
    } catch {}
  }, [isExpanded])

  return (
    <div
      className={`map-canvas-container ${
        isExpanded ? 'is-expanded-canvas' : ''
      }`}
    >
      <div className="canvas-toolbar">
        <span className="demo-indicator">
          {mapStatus === 'ready'
            ? 'MapLibre basemap • GIS overlays are source-backed'
            : mapStatus === 'error'
              ? 'PFZ overlay view • basemap unavailable'
              : 'Loading map…'}
        </span>

        <div className="canvas-actions">
          <button
            type="button"
            className="canvas-btn"
            onClick={() => {
              try { mapRef.current?.zoomIn() } catch {}
            }}
            aria-label="Zoom in"
          >
            +
          </button>

          <button
            type="button"
            className="canvas-btn"
            onClick={() => {
              try { mapRef.current?.zoomOut() } catch {}
            }}
            aria-label="Zoom out"
          >
            −
          </button>

          <button
            type="button"
            className="canvas-btn"
            onClick={() => {
              try {
                const lat = Number(selectedLocation?.latitude || DEFAULT_LOCATION.latitude)
                const lon = Number(selectedLocation?.longitude || DEFAULT_LOCATION.longitude)
                mapRef.current?.flyTo({
                  center: [
                    Number.isFinite(lon) ? lon : DEFAULT_LOCATION.longitude,
                    Number.isFinite(lat) ? lat : DEFAULT_LOCATION.latitude,
                  ],
                  zoom: 7,
                })
              } catch {}
            }}
            aria-label="Center map"
          >
            ⌖
          </button>

          <button
            type="button"
            className="canvas-btn"
            onClick={onToggleExpanded}
          >
            {isExpanded ? 'Exit' : 'Fullscreen'}
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="maplibre-viewport"
      />

      {mapStatus === 'error' && (
        <div className="map-unavailable">
          Map could not be loaded.
        </div>
      )}
    </div>
  )
}
