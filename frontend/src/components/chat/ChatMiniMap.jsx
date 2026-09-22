import { useEffect, useRef, useState } from 'react'
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

export default function ChatMiniMap({ spatialData, onNavigateFullMap }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const [mapLoaded, setMapLoaded] = useState(false)

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

    // Clear old markers
    markersRef.current.forEach((m) => m.remove())
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
      map.fitBounds(bounds, { padding: 35, maxZoom: 12, duration: 800 })
    }
  }, [mapLoaded, spatialData, centerLat, centerLng])

  return (
    <div className="chat-mini-map-card">
      <div className="mini-map-header">
        <div className="mini-map-title">
          <span className="mini-map-pulse-dot"></span>
          <strong>GEOSPATIAL SITUATIONAL PREVIEW</strong>
          {spatialData?.decision_type && (
            <span className="mini-map-tag font-mono">{spatialData.decision_type.toUpperCase()}</span>
          )}
        </div>
        {onNavigateFullMap && (
          <button
            type="button"
            className="mini-map-expand-btn font-mono"
            onClick={onNavigateFullMap}
            title="Open in full Map Explorer"
          >
            🗺️ Open in Full Map ↗
          </button>
        )}
      </div>

      <div className="mini-map-viewport" ref={mapContainerRef}></div>

      <div className="mini-map-footer font-sans">
        <span className="mini-map-coord-chip font-mono">
          📍 {centerLat.toFixed(4)}°N, {centerLng.toFixed(4)}°E
        </span>
        <div className="mini-map-legend">
          <span className="legend-item"><span className="legend-dot user"></span> Vessel / Query</span>
          {spatialData?.route_geometry && <span className="legend-item"><span className="legend-line route"></span> Safe Route</span>}
          {spatialData?.features?.length > 0 && <span className="legend-item"><span className="legend-line pfz"></span> PFZ Zone</span>}
        </div>
      </div>
    </div>
  )
}
