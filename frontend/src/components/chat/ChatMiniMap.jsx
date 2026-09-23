import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LngLatBounds, Map, Marker, NavigationControl, Popup, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import './ChatMiniMap.css'

try {
  setWorkerUrl(workerUrl)
} catch {
  // Ignore worker registration if already set
}

const DEFAULT_MAP_STYLE = {
  version: 8,
  sources: {
    osm_tiles: {
      type: 'raster',
      tiles: [
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap',
    },
  },
  layers: [
    {
      id: 'osm_tiles_layer',
      type: 'raster',
      source: 'osm_tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
}

function populateMapLayers(map, spatialData, centerLng, centerLat, markersRef, padding = 35) {
  markersRef.current.forEach((m) => {
    try { m.remove() } catch {}
  })
  markersRef.current = []

  const bounds = new LngLatBounds()
  let hasCoords = false

  // 1. User / Query Center Marker & Search Radius Circle
  if (Number.isFinite(centerLng) && Number.isFinite(centerLat)) {
    const el = document.createElement('div')
    el.className = 'mini-map-pulse-marker'
    el.title = spatialData.location_label || 'Query Location'

    const marker = new Marker({ element: el })
      .setLngLat([centerLng, centerLat])
      .setPopup(new Popup({ offset: 12 }).setHTML(`<strong>📍 ${spatialData.location_label || 'Location'}</strong><br/><span style="font-size:11px">${centerLat.toFixed(4)}°N, ${centerLng.toFixed(4)}°E</span>`))
      .addTo(map)

    markersRef.current.push(marker)
    bounds.extend([centerLng, centerLat])
    hasCoords = true

    // Render search radius ring if radius is specified or for spatial awareness
    const radiusKm = spatialData.radius_km || spatialData.search_radius_km || (spatialData.features?.length ? 25 : null)
    if (radiusKm && radiusKm > 0) {
      const coords = []
      const kmPerLat = 111.32
      const kmPerLon = 111.32 * Math.cos((centerLat * Math.PI) / 180)
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * 2 * Math.PI
        const dx = radiusKm * Math.sin(theta)
        const dy = radiusKm * Math.cos(theta)
        coords.push([centerLng + dx / kmPerLon, centerLat + dy / kmPerLat])
      }

      const circleGeoJSON = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [coords],
        },
        properties: {},
      }

      const radiusSourceId = 'chat-mini-radius'
      if (map.getSource(radiusSourceId)) {
        map.getSource(radiusSourceId).setData(circleGeoJSON)
      } else {
        map.addSource(radiusSourceId, {
          type: 'geojson',
          data: circleGeoJSON,
        })
        map.addLayer({
          id: 'chat-mini-radius-fill',
          type: 'fill',
          source: radiusSourceId,
          paint: {
            'fill-color': '#0284c7',
            'fill-opacity': 0.12,
          },
        })
        map.addLayer({
          id: 'chat-mini-radius-line',
          type: 'line',
          source: radiusSourceId,
          paint: {
            'line-color': '#0284c7',
            'line-width': 2,
            'line-dasharray': [3, 2],
            'line-opacity': 0.9,
          },
        })
      }
    }
  }

  // 2. Route Geometry (LineString)
  const routeGeom = spatialData.route_geometry
  if (routeGeom && routeGeom.coordinates && routeGeom.coordinates.length >= 2) {
    const sourceId = 'chat-mini-route'
    const layerId = 'chat-mini-route-line'
    const casingId = 'chat-mini-route-casing'

    if (map.getSource(sourceId)) {
      map.getSource(sourceId).setData({
        type: 'Feature',
        geometry: routeGeom,
        properties: {},
      })
    } else {
      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: routeGeom,
          properties: {},
        },
      })

      map.addLayer({
        id: casingId,
        type: 'line',
        source: sourceId,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#0284c7',
          'line-width': 6,
          'line-opacity': 0.6,
        },
      })

      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#38bdf8',
          'line-width': 3.5,
          'line-dasharray': [1, 0],
        },
      })
    }

    routeGeom.coordinates.forEach((coord) => {
      if (Number.isFinite(coord[0]) && Number.isFinite(coord[1])) {
        bounds.extend([coord[0], coord[1]])
        hasCoords = true
      }
    })
  }

  // 3. Waypoints
  const waypoints = spatialData.waypoints || []
  waypoints.forEach((wp) => {
    const lon = Number(wp.longitude)
    const lat = Number(wp.latitude)
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return

    const wpEl = document.createElement('div')
    wpEl.className = `mini-map-wp-marker ${wp.safety_status === 'CAUTION' ? 'caution' : ''}`
    wpEl.innerHTML = `<span>${wp.waypoint_index || '•'}</span>`

    const popupHtml = `
      <div style="font-family:sans-serif;font-size:12px;padding:4px">
        <strong>${wp.name || `Waypoint #${wp.waypoint_index}`}</strong><br/>
        <span>${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E</span><br/>
        ${wp.leg_distance_nm ? `<span>Dist: <strong>${wp.leg_distance_nm} NM</strong></span>` : ''}
        ${wp.leg_bearing_deg ? ` • <span>Course: <strong>${wp.leg_bearing_deg}°</strong></span>` : ''}
      </div>
    `

    const marker = new Marker({ element: wpEl })
      .setLngLat([lon, lat])
      .setPopup(new Popup({ offset: 10 }).setHTML(popupHtml))
      .addTo(map)

    markersRef.current.push(marker)
    bounds.extend([lon, lat])
    hasCoords = true
  })

  // 4. PFZ Features (Points and LineStrings)
  const features = spatialData.features || []
  features.forEach((feat, idx) => {
    const geom = feat.geometry || feat
    if (!geom) return

    if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
      const [lon, lat] = geom.coordinates
      if (Number.isFinite(lon) && Number.isFinite(lat)) {
        const pfzEl = document.createElement('div')
        pfzEl.className = 'mini-map-pfz-marker'
        pfzEl.innerHTML = '🐟'

        const name = feat.properties?.name || feat.name || `PFZ Zone #${idx + 1}`
        const depth = feat.properties?.depth_m ? `${feat.properties.depth_m}m depth` : ''
        const sst = feat.properties?.sst_c ? `${feat.properties.sst_c}°C SST` : ''

        const marker = new Marker({ element: pfzEl })
          .setLngLat([lon, lat])
          .setPopup(new Popup({ offset: 12 }).setHTML(`<strong>🐟 ${name}</strong><br/><span>${[depth, sst].filter(Boolean).join(' • ')}</span>`))
          .addTo(map)

        markersRef.current.push(marker)
        bounds.extend([lon, lat])
        hasCoords = true
      }
    } else if (geom.type === 'LineString' && Array.isArray(geom.coordinates)) {
      const lineSourceId = `pfz-line-${idx}`
      const lineLayerId = `pfz-layer-${idx}`
      if (!map.getSource(lineSourceId)) {
        map.addSource(lineSourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: geom,
            properties: feat.properties || {},
          },
        })
        map.addLayer({
          id: lineLayerId,
          type: 'line',
          source: lineSourceId,
          paint: {
            'line-color': '#10b981',
            'line-width': 3,
            'line-dasharray': [2, 1],
          },
        })
      }
      geom.coordinates.forEach((c) => {
        if (Number.isFinite(c[0]) && Number.isFinite(c[1])) {
          bounds.extend([c[0], c[1]])
          hasCoords = true
        }
      })
    }
  })

  if (hasCoords && !bounds.isEmpty()) {
    map.fitBounds(bounds, { padding, maxZoom: 12, duration: 800 })
  }
}

function ExpandedMapModal({
  spatialData,
  centerLat,
  centerLng,
  onClose,
  onNavigateFullMap,
}) {
  const modalMapContainerRef = useRef(null)
  const modalMapRef = useRef(null)
  const modalMarkersRef = useRef([])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    if (!modalMapContainerRef.current) return

    let map = null
    try {
      map = new Map({
        container: modalMapContainerRef.current,
        style: DEFAULT_MAP_STYLE,
        center: [centerLng, centerLat],
        zoom: 9.5,
        attributionControl: false,
      })

      map.addControl(new NavigationControl({ showCompass: true, showZoom: true }), 'top-right')

      map.on('load', () => {
        populateMapLayers(map, spatialData, centerLng, centerLat, modalMarkersRef, 60)
        setTimeout(() => {
          try {
            map.resize()
          } catch {}
        }, 120)
        setTimeout(() => {
          try {
            map.resize()
          } catch {}
        }, 320)
      })

      modalMapRef.current = map
    } catch (err) {
      console.warn('Expanded map initialization failed:', err)
    }

    return () => {
      modalMarkersRef.current.forEach((m) => {
        try { m.remove() } catch {}
      })
      modalMarkersRef.current = []
      if (map) {
        try { map.remove() } catch {}
      }
      modalMapRef.current = null
    }
  }, [centerLat, centerLng, spatialData])

  return createPortal(
    <div
      className="expanded-map-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Expanded Geospatial Map"
    >
      <div className="expanded-map-modal">
        {/* Header */}
        <div className="expanded-map-header">
          <div className="mini-map-title">
            <span className="mini-map-pulse-dot"></span>
            <strong>GEOSPATIAL SITUATIONAL MAP (EXPANDED VIEW)</strong>
          </div>

          <button
            type="button"
            className="expanded-map-close-btn font-mono"
            onClick={onClose}
            title="Close expanded map (Esc)"
          >
            ✕ Close
          </button>
        </div>

        {/* Viewport */}
        <div className="expanded-map-viewport" ref={modalMapContainerRef}></div>

        {/* Glass Footer */}
        <div
          className="mini-map-footer font-sans"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 5,
            background: 'rgba(11, 21, 38, 0.65)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#f8fafc',
            padding: '10px 18px',
          }}
        >
          <span
            className="mini-map-coord-chip font-mono"
            style={{ color: '#f8fafc', fontWeight: 600, fontSize: '11.5px', textShadow: '0 1px 3px rgba(0, 0, 0, 0.75)' }}
          >
            📍 {centerLat.toFixed(4)}°N, {centerLng.toFixed(4)}°E {spatialData?.location_label ? `(${spatialData.location_label})` : ''}
          </span>
          <div className="mini-map-legend" style={{ color: '#f8fafc', gap: '14px', fontSize: '11px' }}>
            <span
              className="legend-item"
              style={{ color: '#f8fafc', fontWeight: 500, textShadow: '0 1px 3px rgba(0, 0, 0, 0.75)' }}
            >
              <span className="legend-dot user"></span> Vessel / Query
            </span>
            {spatialData?.route_geometry && (
              <span
                className="legend-item"
                style={{ color: '#f8fafc', fontWeight: 500, textShadow: '0 1px 3px rgba(0, 0, 0, 0.75)' }}
              >
                <span className="legend-line route"></span> Safe Route
              </span>
            )}
            {spatialData?.features?.length > 0 && (
              <span
                className="legend-item"
                style={{ color: '#f8fafc', fontWeight: 500, textShadow: '0 1px 3px rgba(0, 0, 0, 0.75)' }}
              >
                <span className="legend-line pfz"></span> PFZ Zone
              </span>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function ChatMiniMap({ spatialData, onNavigateFullMap }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const [mapLoaded, setMapLoaded] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const rawCoords = spatialData?.center || spatialData?.coordinates || (spatialData?.location ? [spatialData.location.longitude, spatialData.location.latitude] : null) || [80.2707, 13.0827]
  const centerLng = Number(Array.isArray(rawCoords) ? rawCoords[0] : rawCoords?.longitude) || 80.2707
  const centerLat = Number(Array.isArray(rawCoords) ? rawCoords[1] : rawCoords?.latitude) || 13.0827

  useEffect(() => {
    if (!mapContainerRef.current) return

    let map = null
    try {
      map = new Map({
        container: mapContainerRef.current,
        style: DEFAULT_MAP_STYLE,
        center: [centerLng, centerLat],
        zoom: 9,
        attributionControl: false,
      })

      map.addControl(new NavigationControl({ showCompass: true, showZoom: true }), 'top-right')

      map.on('load', () => {
        setMapLoaded(true)
      })

      mapRef.current = map
    } catch (err) {
      console.warn('MapLibre ChatMiniMap initialization skipped or failed:', err)
    }

    return () => {
      markersRef.current.forEach((m) => {
        try { m.remove() } catch {}
      })
      markersRef.current = []
      if (map) {
        try { map.remove() } catch {}
      }
      mapRef.current = null
    }
  }, [centerLat, centerLng])

  // Add layers, routes, PFZ tracks and waypoints once map is loaded
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded || !spatialData) return

    populateMapLayers(map, spatialData, centerLng, centerLat, markersRef, 35)
  }, [mapLoaded, spatialData, centerLat, centerLng])

  return (
    <>
      <div className="chat-mini-map-card">
        <div className="mini-map-header">
          <div className="mini-map-title">
            <span className="mini-map-pulse-dot"></span>
            <strong>GEOSPATIAL SITUATIONAL PREVIEW</strong>
          </div>
          <button
            type="button"
            className="mini-map-expand-btn font-mono"
            onClick={() => setIsExpanded(true)}
            title="Open expanded map view"
          >
            🗺️ Open in Full Map ↗
          </button>
        </div>

        <div className="mini-map-viewport" ref={mapContainerRef}></div>

        <div
          className="mini-map-footer font-sans"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 5,
            background: 'rgba(11, 21, 38, 0.65)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#f8fafc',
          }}
        >
          <span
            className="mini-map-coord-chip font-mono"
            style={{ color: '#f8fafc', fontWeight: 600, textShadow: '0 1px 3px rgba(0, 0, 0, 0.75)' }}
          >
            📍 {centerLat.toFixed(4)}°N, {centerLng.toFixed(4)}°E
          </span>
          <div className="mini-map-legend" style={{ color: '#f8fafc' }}>
            <span
              className="legend-item"
              style={{ color: '#f8fafc', fontWeight: 500, textShadow: '0 1px 3px rgba(0, 0, 0, 0.75)' }}
            >
              <span className="legend-dot user"></span> Vessel / Query
            </span>
            {spatialData?.route_geometry && (
              <span
                className="legend-item"
                style={{ color: '#f8fafc', fontWeight: 500, textShadow: '0 1px 3px rgba(0, 0, 0, 0.75)' }}
              >
                <span className="legend-line route"></span> Safe Route
              </span>
            )}
            {spatialData?.features?.length > 0 && (
              <span
                className="legend-item"
                style={{ color: '#f8fafc', fontWeight: 500, textShadow: '0 1px 3px rgba(0, 0, 0, 0.75)' }}
              >
                <span className="legend-line pfz"></span> PFZ Zone
              </span>
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <ExpandedMapModal
          spatialData={spatialData}
          centerLat={centerLat}
          centerLng={centerLng}
          onClose={() => setIsExpanded(false)}
          onNavigateFullMap={onNavigateFullMap}
        />
      )}
    </>
  )
}
