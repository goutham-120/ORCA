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

const PFZ_RADIUS_KM = 50

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

function nearestCoordinate(geometry, selectedLocation) {
  const coordinates = flattenCoordinates(geometry)

  const latitude = Number(selectedLocation?.latitude)
  const longitude = Number(selectedLocation?.longitude)

  if (
    !coordinates.length ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null
  }

  const target = [longitude, latitude]

  return coordinates.reduce(
    (nearest, coordinate) =>
      distanceKm(target, coordinate) <
      distanceKm(target, nearest)
        ? coordinate
        : nearest,
    coordinates[0]
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

        if (!map.getLayer('orca-fill')) {
          map.addLayer({
            id: 'orca-fill',
            type: 'fill',
            source: 'orca-layers',
            filter: ['==', '$type', 'Polygon'],
            paint: {
              'fill-color': '#f59e0b',
              'fill-opacity': 0.25,
            },
          })
        }

        if (!map.getLayer('orca-line')) {
          map.addLayer({
            id: 'orca-line',
            type: 'line',
            source: 'orca-layers',
            filter: ['==', '$type', 'LineString'],
            paint: {
              'line-color': '#14b8a6',
              'line-width': 6,
              'line-opacity': 1,
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

        if (!map.getSource('orca-pfz-markers')) {
          map.addSource('orca-pfz-markers', {
            type: 'geojson',
            data: featureCollection([]),
          })
        }

        if (!map.getLayer('orca-pfz-marker')) {
          map.addLayer({
            id: 'orca-pfz-marker',
            type: 'circle',
            source: 'orca-pfz-markers',
            paint: {
              'circle-radius': 8,
              'circle-color': '#0ea5e9',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
            },
          })
        }

        map.on('click', 'orca-pfz-marker', (event) => {
          const feature = event.features?.[0]
          const coordinates = feature?.geometry?.coordinates
          if (!Array.isArray(coordinates)) return
          const properties = feature.properties || {}
          new Popup({ offset: 12 })
            .setLngLat(coordinates)
            .setHTML(`<strong>PFZ${properties.data_status === 'demo' ? ' Demo Data' : ''}</strong><br/>Source: ${properties.source || 'INCOIS'}<br/>Status: ${properties.data_status || 'available'}<br/>${coordinates[1].toFixed(4)}, ${coordinates[0].toFixed(4)}`)
            .addTo(map)
        })

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

    const visibleLayers = layers
      .filter(
        (layer) =>
          layer?.enabled !== false &&
          Array.isArray(layer?.features)
      )
      .map((layer) => {
        const isPFZ =
          String(layer.id).toLowerCase() === 'pfz'

        if (!isPFZ) {
          return layer
        }

        /*
         * Only display PFZ features whose nearest coordinate
         * is within 50 km of the selected location.
         */
        const filteredFeatures = layer.features.filter(
          (feature) => {
            const geometry =
              feature.geometry || feature

            const nearest = nearestCoordinate(
              geometry,
              selectedLocation
            )

            return (
              nearest &&
              distanceKm(target, nearest) <=
                PFZ_RADIUS_KM
            )
          }
        )

        return {
          ...layer,
          features: filteredFeatures,
        }
      })

    const features = visibleLayers
      .flatMap((layer) => layer.features)
      .map((feature) => ({
        type: 'Feature',
        geometry: feature.geometry || feature,
        properties: feature.properties || {},
      }))

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

    /*
     * PFZ marker at nearest PFZ coordinate.
     */
    const pfzMarkers = visibleLayers
      .filter(
        (layer) =>
          String(layer.id).toLowerCase() === 'pfz'
      )
      .flatMap((layer) => layer.features)
      .map((feature) => {
        const geometry =
          feature.geometry || feature

        const coordinates =
          nearestCoordinate(
            geometry,
            selectedLocation
          ) || representativePoint(geometry)

        if (!coordinates) {
          return null
        }

        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates,
          },
          properties: {
            ...(feature.properties || {}),
            layer: 'PFZ',
            source: feature.source || feature.properties?.source,
          },
        }
      })
      .filter(Boolean)

    map
      .getSource('orca-layers')
      ?.setData(featureCollection(features))

    map
      .getSource('orca-pfz-markers')
      ?.setData(featureCollection(pfzMarkers))

    /*
     * Fit map to visible GIS data.
     */
    const points = visibleLayers
      .flatMap((layer) => layer.features)
      .flatMap((feature) =>
        flattenCoordinates(
          feature.geometry || feature
        )
      )

    if (!points.length) {
      points.push(target)
    }

    const bounds = points.reduce(
      (result, point) => result.extend(point),
      new LngLatBounds(points[0], points[0])
    )

    const frame = window.requestAnimationFrame(() => {
      map.fitBounds(bounds, {
        padding: 80,
        maxZoom: 9,
        duration: 700,
      })
    })

    return () => {
      window.cancelAnimationFrame(frame)
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
