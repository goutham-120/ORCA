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

const featureCollection = (features) => ({
  type: 'FeatureCollection',
  features,
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

  return [longitude, latitude]
}

function distanceKm(first, second) {
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

export default function MapCanvas({
  selectedLocation,
  layers = [],
  routeGeometry,
  onMapLocation,
  isExpanded,
  onToggleExpanded,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const gisMarkersRef = useRef([])
  const initialLocationRef = useRef(selectedLocation)
  const locationHandlerRef = useRef(onMapLocation)

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
      Number(initialLocation.latitude)
    )
      ? Number(initialLocation.latitude)
      : DEFAULT_LOCATION.latitude

    const longitude = Number.isFinite(
      Number(initialLocation.longitude)
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

        // 4. Default Polygons Fallback
        if (!map.getLayer('orca-fill-default')) {
          map.addLayer({
            id: 'orca-fill-default',
            type: 'fill',
            source: 'orca-layers',
            filter: ['all', ['==', '$type', 'Polygon'], ['!=', ['get', 'layer'], 'marine_areas'], ['!=', ['get', 'layer'], 'restricted_zones'], ['!=', ['get', 'layer'], 'hazards']],
            paint: {
              'fill-color': '#0ea5e9',
              'fill-opacity': 0.2,
            },
          })
        }

        // 5. Lines & Shipping Tracks
        if (!map.getLayer('orca-line-casing')) {
          map.addLayer({
            id: 'orca-line-casing',
            type: 'line',
            source: 'orca-layers',
            filter: ['all', ['==', '$type', 'LineString'], ['!=', ['get', 'kind'], 'route']],
            paint: {
              'line-color': '#0f766e',
              'line-width': 6,
              'line-opacity': 0.5,
            },
          })
        }

        if (!map.getLayer('orca-line')) {
          map.addLayer({
            id: 'orca-line',
            type: 'line',
            source: 'orca-layers',
            filter: ['all', ['==', '$type', 'LineString'], ['!=', ['get', 'kind'], 'route']],
            paint: {
              'line-color': '#06b6d4',
              'line-width': 3.5,
              'line-opacity': 0.95,
            },
          })
        }

        // 6. Navigation Route Line
        if (!map.getLayer('orca-route-line')) {
          map.addLayer({
            id: 'orca-route-line',
            type: 'line',
            source: 'orca-layers',
            filter: ['==', ['get', 'kind'], 'route'],
            paint: {
              'line-color': '#2563eb',
              'line-width': 5,
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
          e.originalEvent.cancelBubble = true
          const props = feature.properties || {}
          const layerId = (props.layer || '').toLowerCase()
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

        map.on('mouseenter', 'orca-fill-marine', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'orca-fill-marine', () => { map.getCanvas().style.cursor = '' })
        map.on('mouseenter', 'orca-fill-restricted', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'orca-fill-restricted', () => { map.getCanvas().style.cursor = '' })
        map.on('mouseenter', 'orca-fill-hazards', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'orca-fill-hazards', () => { map.getCanvas().style.cursor = '' })
        map.on('mouseenter', 'orca-fill-default', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'orca-fill-default', () => { map.getCanvas().style.cursor = '' })

        map.on('click', 'orca-line', (e) => {
          const feature = e.features?.[0]
          if (!feature) return
          e.originalEvent.cancelBubble = true
          const props = feature.properties || {}
          const isPFZ = props.layer === 'pfz' || props.dataset === 'PFZ' || String(props.id).toLowerCase().includes('pfz')
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
          e.originalEvent.cancelBubble = true
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

        map.on('mouseenter', 'orca-line', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'orca-line', () => { map.getCanvas().style.cursor = '' })
        map.on('mouseenter', 'orca-route-line', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'orca-route-line', () => { map.getCanvas().style.cursor = '' })

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

      map.once('style.load', activateOverlay)
      map.once('load', activateOverlay)

      map.on('click', (event) => {
        const bbox = [[event.point.x - 6, event.point.y - 6], [event.point.x + 6, event.point.y + 6]]
        const featureLayers = [
          'orca-fill-hazards',
          'orca-fill-restricted',
          'orca-fill-marine',
          'orca-fill-default',
          'orca-line',
          'orca-route-line',
          'orca-point',
        ].filter((id) => map.getLayer(id))

        const hits = map.queryRenderedFeatures(bbox, { layers: featureLayers })
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
      gisMarkersRef.current.forEach((m) => m.remove())
      gisMarkersRef.current = []
      map?.remove()
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

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return
    }

    const target = [longitude, latitude]

    const visibleLayers = layers.filter(
      (layer) => layer?.enabled !== false && Array.isArray(layer?.features)
    )

    const features = visibleLayers
      .flatMap((layer) => {
        const layerId = String(layer.id || '').toLowerCase()
        return (layer.features || []).map((feature) => {
          const geom = feature.geometry || feature
          const props = {
            id: feature.id || feature.source_identifier || 'GIS-feature',
            name: feature.name || feature.properties?.name || feature.id || layer.name,
            source: feature.source || feature.properties?.source || layer.source || 'ORCA GIS',
            freshness_status: feature.freshness_status || feature.properties?.freshness_status || feature.source_status || 'live',
            ...(feature.properties || {}),
            layer: (feature.properties?.layer || feature.layer || layerId).toLowerCase(),
          }
          return {
            type: 'Feature',
            geometry: geom,
            properties: props,
          }
        })
      })

    /*
     * Add route to the same GeoJSON source.
     */
    if (routeGeometry) {
      features.push({
        type: 'Feature',
        geometry: routeGeometry,
        properties: {
          kind: 'route',
        },
      })
    }

    map.getSource('orca-layers')?.setData(featureCollection(features))

    /*
     * Remove existing GIS & PFZ DOM markers and create new interactive ones.
     */
    gisMarkersRef.current.forEach((marker) => marker.remove())
    gisMarkersRef.current = []

    visibleLayers.forEach((layer) => {
      const layerId = String(layer.id || '').toLowerCase()
      const layerFeatures = layer.features || []

      layerFeatures.forEach((feature) => {
        const geometry = feature.geometry || feature
        const repCoord = representativePoint(geometry)
        if (!repCoord) return

        const props = feature.properties || {}
        const name = props.name || feature.name || feature.id || layer.name
        const dist = Number.isFinite(latitude) && Number.isFinite(longitude)
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
                <p style="margin: 2px 0;"><strong>Coordinates:</strong> ${repCoord[1].toFixed(4)}°N, ${repCoord[0].toFixed(4)}°E</p>
                ${dist ? `<p style="margin: 2px 0; color: #dc2626;"><strong>Distance:</strong> ${dist} km from center</p>` : ''}
                ${props.notice ? `<p style="margin: 4px 0 2px 0; color: #64748b; font-size: 12px;"><em>${props.notice}</em></p>` : ''}
              </div>
              <div style="margin-top: 8px;">
                <button style="background: #dc2626; color: #fff; border: none; border-radius: 4px; padding: 4px 8px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="window.dispatchEvent(new CustomEvent('orca-select-coord', {detail: {latitude: ${repCoord[1]}, longitude: ${repCoord[0]}, label: '${name}'}}))">📍 Focus Here</button>
              </div>
            </div>
          `)
          const marker = new Marker({ element: el }).setLngLat(repCoord).setPopup(popup).addTo(map)
          gisMarkersRef.current.push(marker)

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
                <p style="margin: 2px 0;"><strong>Coordinates:</strong> ${repCoord[1].toFixed(4)}°N, ${repCoord[0].toFixed(4)}°E</p>
                ${dist ? `<p style="margin: 2px 0; color: #d97706;"><strong>Distance:</strong> ${dist} km from center</p>` : ''}
                ${props.notice ? `<p style="margin: 4px 0 2px 0; color: #64748b; font-size: 12px;"><em>${props.notice}</em></p>` : ''}
              </div>
              <div style="margin-top: 8px;">
                <button style="background: #d97706; color: #fff; border: none; border-radius: 4px; padding: 4px 8px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="window.dispatchEvent(new CustomEvent('orca-select-coord', {detail: {latitude: ${repCoord[1]}, longitude: ${repCoord[0]}, label: '${name}'}}))">📍 Focus Here</button>
              </div>
            </div>
          `)
          const marker = new Marker({ element: el }).setLngLat(repCoord).setPopup(popup).addTo(map)
          gisMarkersRef.current.push(marker)

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
                <p style="margin: 2px 0;"><strong>Coordinates:</strong> ${repCoord[1].toFixed(4)}°N, ${repCoord[0].toFixed(4)}°E</p>
                ${dist ? `<p style="margin: 2px 0; color: #059669;"><strong>Distance:</strong> ${dist} km from center</p>` : ''}
              </div>
              <div style="margin-top: 8px;">
                <button style="background: #059669; color: #fff; border: none; border-radius: 4px; padding: 4px 8px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="window.dispatchEvent(new CustomEvent('orca-select-coord', {detail: {latitude: ${repCoord[1]}, longitude: ${repCoord[0]}, label: '${name}'}}))">📍 Focus Here</button>
              </div>
            </div>
          `)
          const marker = new Marker({ element: el }).setLngLat(repCoord).setPopup(popup).addTo(map)
          gisMarkersRef.current.push(marker)

        } else if (layerId === 'pfz') {
          el.className = 'gis-interactive-marker pfz-marker'
          el.innerHTML = '<div class="gis-marker-bubble pfz-bubble"><span>🐟</span><strong>PFZ</strong></div>'

          const popup = new Popup({ offset: 15, maxWidth: '280px' }).setHTML(`
            <div style="font-family: system-ui, sans-serif; color: #0f172a; padding: 4px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                <span style="font-size: 20px;">🐟</span>
                <div>
                  <strong style="color: #0891b2; font-size: 13px; display: block;">Potential Fishing Zone</strong>
                  <small style="color: #64748b; font-size: 12px;">Official INCOIS Advisory</small>
                </div>
              </div>
              <div style="font-size: 12px; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 6px; color: #334155;">
                <p style="margin: 2px 0;"><strong>Feature ID:</strong> ${feature.id || 'INCOIS-PFZ'}</p>
                <p style="margin: 2px 0;"><strong>Source:</strong> ${feature.source || props.source || 'INCOIS'} (${feature.freshness_status || props.freshness_status || 'live'})</p>
                <p style="margin: 2px 0;"><strong>Coordinates:</strong> ${repCoord[1].toFixed(4)}°N, ${repCoord[0].toFixed(4)}°E</p>
                ${dist ? `<p style="margin: 2px 0; color: #0284c7;"><strong>Distance:</strong> ${dist} km from center</p>` : ''}
                ${props.depth_m ? `<p style="margin: 2px 0;"><strong>Target Depth:</strong> ${props.depth_m} m</p>` : ''}
                ${props.bearing_deg ? `<p style="margin: 2px 0;"><strong>Bearing:</strong> ${props.bearing_deg}°</p>` : ''}
              </div>
              <div style="margin-top: 8px;">
                <button style="background: #0891b2; color: #fff; border: none; border-radius: 4px; padding: 4px 8px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="window.dispatchEvent(new CustomEvent('orca-select-coord', {detail: {latitude: ${repCoord[1]}, longitude: ${repCoord[0]}, label: 'PFZ: ${feature.id || 'Zone'}'}}))">📍 Focus Here</button>
              </div>
            </div>
          `)
          const marker = new Marker({ element: el }).setLngLat(repCoord).setPopup(popup).addTo(map)
          gisMarkersRef.current.push(marker)
        }
      })
    })

    /*
     * If route geometry is active, zoom to route bounds.
     */
    if (routeGeometry?.coordinates?.length >= 2) {
      const routeBounds = routeGeometry.coordinates.reduce(
        (b, pt) => b.extend(pt),
        new LngLatBounds(routeGeometry.coordinates[0], routeGeometry.coordinates[0])
      )
      map.fitBounds(routeBounds, {
        padding: 80,
        maxZoom: 9,
        duration: 700,
      })
    }
  }, [
    layers,
    routeGeometry,
    selectedLocation,
    mapStatus,
  ])

  /*
   * Selected location marker.
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

    markerRef.current?.remove()

    const locationLabel =
      selectedLocation.label ||
      selectedLocation.name ||
      'Selected map coordinate'

    markerRef.current = new Marker({
      color: '#0ea5e9',
    })
      .setLngLat([longitude, latitude])
      .setPopup(
        new Popup({ offset: 20 }).setText(
          locationLabel
        )
      )
      .addTo(map)

    map.flyTo({
      center: [longitude, latitude],
      zoom: Math.max(map.getZoom(), 7),
      essential: true,
    })
  }, [selectedLocation, mapStatus])

  useEffect(() => {
    mapRef.current?.resize()
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
            onClick={() =>
              mapRef.current?.zoomIn()
            }
            aria-label="Zoom in"
          >
            +
          </button>

          <button
            type="button"
            className="canvas-btn"
            onClick={() =>
              mapRef.current?.zoomOut()
            }
            aria-label="Zoom out"
          >
            −
          </button>

          <button
            type="button"
            className="canvas-btn"
            onClick={() =>
              mapRef.current?.flyTo({
                center: [
                  Number(selectedLocation.longitude),
                  Number(selectedLocation.latitude),
                ],
                zoom: 7,
              })
            }
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
          Unable to load the interactive map.
        </div>
      )}
    </div>
  )
}
