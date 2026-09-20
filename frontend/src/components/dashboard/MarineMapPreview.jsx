import { useEffect, useRef, useState } from 'react'
import { Map, Marker, Popup, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  fetchSpatialGrid,
  fetchOceanCurrentPoints,
  fetchOceanCurrentPointsForBounds,
  generateCurvedStreamlineFeatures,
} from '../../services/spatialDataService'
import TemperatureLegend from './TemperatureLegend'
import { registerOmProtocol, OM_TEMPERATURE_URL, OM_WIND_URL } from '../../utils/omProtocolHelper'

setWorkerUrl(workerUrl)
registerOmProtocol()

const layerLabels = {
  temperature: 'Temperature',
  wind: 'Wind',
  currents: 'Ocean Current Direction',
}

/**
 * Static Canvas Overlay for Ocean Current Direction
 * Renders many short, gently curved static streamline segments following the Open-Meteo direction field.
 * STABLE, ZERO animation, ZERO moving particles, ZERO particle simulation.
 */
function StaticOceanCurrentCanvas({ map, isVisible, observationPoints }) {
  const canvasRef = useRef(null)
  const cachedStreamlinesRef = useRef([])

  useEffect(() => {
    if (observationPoints && observationPoints.length) {
      cachedStreamlinesRef.current = generateCurvedStreamlineFeatures(observationPoints)
    } else {
      cachedStreamlinesRef.current = []
    }
  }, [observationPoints])

  useEffect(() => {
    if (!map || !isVisible || !cachedStreamlinesRef.current.length) {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const updateCanvasSize = () => {
      const container = map.getContainer()
      if (!container) return
      const width = container.clientWidth
      const height = container.clientHeight
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
    }

    const renderStaticStreamlines = () => {
      updateCanvasSize()
      const width = canvas.width
      const height = canvas.height
      if (!width || !height) return

      ctx.clearRect(0, 0, width, height)

      const streamlines = cachedStreamlinesRef.current
      if (!streamlines || !streamlines.length) return

      ctx.lineWidth = 1.2
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)' // Clean light white stroke matching reference UI
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'   // Subtle arrowhead tip

      const headLength = 4.0

      streamlines.forEach((pathCoords) => {
        if (!pathCoords || pathCoords.length < 2) return

        // Project all control points to screen pixel space
        const pixelPoints = pathCoords.map((coord) => map.project(coord))

        // Check if path is within screen view
        const first = pixelPoints[0]
        const last = pixelPoints[pixelPoints.length - 1]
        if (
          (first.x < -40 && last.x < -40) ||
          (first.x > width + 40 && last.x > width + 40) ||
          (first.y < -40 && last.y < -40) ||
          (first.y > height + 40 && last.y > height + 40)
        ) {
          return
        }

        // Draw multi-point curved streamline path
        ctx.beginPath()
        ctx.moveTo(first.x, first.y)

        for (let i = 1; i < pixelPoints.length; i++) {
          ctx.lineTo(pixelPoints[i].x, pixelPoints[i].y)
        }
        ctx.stroke()

        // Draw small integrated tip arrowhead at last segment
        const pPrev = pixelPoints[pixelPoints.length - 2]
        const pEnd = pixelPoints[pixelPoints.length - 1]
        const angle = Math.atan2(pEnd.y - pPrev.y, pEnd.x - pPrev.x)

        ctx.save()
        ctx.translate(pEnd.x, pEnd.y)
        ctx.rotate(angle)
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(-headLength, -2.2)
        ctx.lineTo(-headLength * 0.7, 0)
        ctx.lineTo(-headLength, 2.2)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      })
    }

    // Initial render frame
    renderStaticStreamlines()

    map.on('move', renderStaticStreamlines)
    map.on('zoom', renderStaticStreamlines)
    map.on('resize', renderStaticStreamlines)

    return () => {
      map.off('move', renderStaticStreamlines)
      map.off('zoom', renderStaticStreamlines)
      map.off('resize', renderStaticStreamlines)
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [map, isVisible, observationPoints])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5,
        display: isVisible ? 'block' : 'none',
      }}
    />
  )
}

export default function MarineMapPreview({ location, layers, onToggleLayer, zoom, onZoom, onReset }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  const [oceanCurrentPoints, setOceanCurrentPoints] = useState([])
  const [spatialGrid, setSpatialGrid] = useState(null)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [hasDataError, setHasDataError] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [lastUpdatedTime, setLastUpdatedTime] = useState(null)

  // Independent Opacity Controls
  const [tempOpacity, setTempOpacity] = useState(0.75)
  const [windOpacity, setWindOpacity] = useState(0.75)

  const lng = location.longitude ?? 78.9
  const lat = location.latitude ?? 20.5

  // Fetch live Open-Meteo telemetry & ocean current points
  useEffect(() => {
    let isMounted = true

    const loadData = async (isBackground = false) => {
      if (!isBackground) {
        setIsLoadingData(true)
      }
      setHasDataError(false)
      try {
        const [gridRes, currentPts] = await Promise.all([
          fetchSpatialGrid(lat, lng),
          fetchOceanCurrentPoints(),
        ])
        if (isMounted) {
          if (gridRes && gridRes.status === 'ok') {
            setSpatialGrid(gridRes)
            const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            setLastUpdatedTime(formattedTime)
          } else {
            setHasDataError(true)
          }
          if (Array.isArray(currentPts)) {
            setOceanCurrentPoints(currentPts)
          }
          setIsLoadingData(false)
        }
      } catch (err) {
        console.warn('Background telemetry refresh error:', err)
        if (isMounted) {
          setHasDataError(true)
          setIsLoadingData(false)
        }
      }
    }

    loadData(false)

    const intervalId = setInterval(() => {
      loadData(true)
    }, 300000)

    return () => {
      isMounted = false
      clearInterval(intervalId)
    }
  }, [lat, lng])

  // Initialize MapLibre GL JS map instance centered over India & coastal waters
  useEffect(() => {
    if (!mapContainerRef.current) return

    const baseTileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

    const mapStyle = {
      version: 8,
      sources: {
        'base-tiles': {
          type: 'raster',
          tiles: [baseTileUrl],
          tileSize: 256,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        },
        'om-temperature-source': {
          type: 'raster',
          url: 'om://' + OM_TEMPERATURE_URL,
          maxzoom: 12,
        },
        'om-wind-source': {
          type: 'raster',
          url: 'om://' + OM_WIND_URL,
          maxzoom: 12,
        },
      },
      layers: [
        {
          id: 'base-tiles-layer',
          type: 'raster',
          source: 'base-tiles',
          minzoom: 0,
          maxzoom: 19,
        },
        {
          id: 'om-temperature-layer',
          type: 'raster',
          source: 'om-temperature-source',
          layout: {
            visibility: layers.temperature !== false ? 'visible' : 'none',
          },
          paint: {
            'raster-opacity': tempOpacity,
          },
        },
        {
          id: 'om-wind-layer',
          type: 'raster',
          source: 'om-wind-source',
          layout: {
            visibility: Boolean(layers.wind) ? 'visible' : 'none',
          },
          paint: {
            'raster-opacity': windOpacity,
          },
        },
      ],
    }

    const initialCenter = location?.longitude && location?.latitude ? [lng, lat] : [78.9, 20.5]
    const initialZoom = location?.longitude && location?.latitude ? 6 : 4

    const map = new Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: initialCenter,
      zoom: initialZoom,
      attributionControl: true,
    })

    mapRef.current = map

    // Center Location Marker
    const markerEl = document.createElement('div')
    markerEl.className = 'maplibre-marker-wrap'
    markerEl.style.display = 'flex'
    markerEl.style.flexDirection = 'column'
    markerEl.style.alignItems = 'center'
    markerEl.style.transform = 'translate(-50%, -50%)'
    markerEl.style.pointerEvents = 'none'

    markerEl.innerHTML = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 15px; height: 15px;">
        <span class="marker-pulse" style="position: absolute; width: 45px; height: 45px; border: 1.5px solid #38bdf8; border-radius: 50%; animation: markerPulse 2.4s ease-out infinite;"></span>
        <span class="marker-dot" style="width: 15px; height: 15px; border: 3px solid #ffffff; border-radius: 50%; background: #ef4444; box-shadow: 0 0 12px #ef444499;"></span>
      </div>
      <strong style="margin-top: 6px; font-size: 11px; font-family: sans-serif; color: #ffffff; text-shadow: 0 1px 6px rgba(0,0,0,0.9); font-weight: 700;">${location.name || 'India Coastal Focus'}</strong>
      <small style="color: #38bdf8; font-size: 9px; font-family: monospace; text-shadow: 0 1px 6px rgba(0,0,0,0.9); white-space: nowrap;">${location.coordinates || ''}</small>
    `

    const marker = new Marker({ element: markerEl })
      .setLngLat([lng, lat])
      .addTo(map)

    markerRef.current = marker

    // Setup ResizeObserver for responsive canvas scaling
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.resize()
      }
    })
    resizeObserver.observe(mapContainerRef.current)

    // Handle Map Click Point Inspection
    const handleMapClick = (e) => {
      const clickLat = e.lngLat.lat
      const clickLng = e.lngLat.lng

      new Popup({ closeButton: true, closeOnClick: true })
        .setLngLat([clickLng, clickLat])
        .setHTML(`
          <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 11px; color: #0f172a; padding: 4px; min-width: 185px;">
            <strong style="color: #0369a1; font-size: 12px; display: block; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">
              📍 Open-Meteo Marine Inspection
            </strong>
            <div style="display: grid; gap: 4px;">
              <div style="font-size: 10px; color: #64748b; font-family: monospace;">
                Lat: ${clickLat.toFixed(4)}°N • Lng: ${clickLng.toFixed(4)}°E
              </div>
              <div style="color: #0284c7; font-weight: 600;">
                Source: Open-Meteo Marine API (ocean_current_direction)
              </div>
            </div>
          </div>
        `)
        .addTo(map)
    }

    map.on('click', handleMapClick)

    const handleMapMoveEnd = async () => {
      const bounds = map.getBounds()
      if (!bounds) return
      const boundsObj = {
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
      }
      try {
        const pts = await fetchOceanCurrentPointsForBounds(boundsObj)
        if (Array.isArray(pts) && pts.length > 0) {
          setOceanCurrentPoints(pts)
        }
      } catch (err) {
        console.warn('Bounds current fetch error:', err)
      }
    }

    map.on('moveend', handleMapMoveEnd)

    return () => {
      map.off('click', handleMapClick)
      map.off('moveend', handleMapMoveEnd)
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [isDarkMode])

  // Update MapLibre Weather & Marine Layers Visibility & Opacity dynamically
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const updateProperties = () => {
      if (map.getLayer('om-temperature-layer')) {
        map.setLayoutProperty('om-temperature-layer', 'visibility', layers.temperature !== false ? 'visible' : 'none')
        map.setPaintProperty('om-temperature-layer', 'raster-opacity', tempOpacity)
      }
      if (map.getLayer('om-wind-layer')) {
        map.setLayoutProperty('om-wind-layer', 'visibility', Boolean(layers.wind) ? 'visible' : 'none')
        map.setPaintProperty('om-wind-layer', 'raster-opacity', windOpacity)
      }
    }

    if (map.isStyleLoaded()) {
      updateProperties()
    } else {
      map.once('load', updateProperties)
    }
  }, [layers.temperature, layers.wind, tempOpacity, windOpacity])

  // Fly map when location selection changes
  useEffect(() => {
    if (!mapRef.current) return

    mapRef.current.flyTo({
      center: [lng, lat],
      zoom: 7,
      duration: 1200,
    })

    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat])
      const el = markerRef.current.getElement()
      if (el) {
        const strong = el.querySelector('strong')
        const small = el.querySelector('small')
        if (strong) strong.textContent = location.name
        if (small) small.textContent = location.coordinates || ''
      }
    }
  }, [lng, lat, location.name, location.coordinates])

  const handleZoomIn = () => {
    onZoom(0.15)
    if (mapRef.current) mapRef.current.zoomIn()
  }

  const handleZoomOut = () => {
    onZoom(-0.15)
    if (mapRef.current) mapRef.current.zoomOut()
  }

  const isCurrentsActive = Boolean(layers.currents || layers['ocean-current-direction'] || layers.oceanCurrentDirection)

  return (
    <section className="marine-map panel font-sans" aria-label="Operational marine GIS map preview">
      <div className="panel-title">
        <div>
          <p className="eyebrow font-mono">ORCA SPATIAL OVERVIEW</p>
          <h2 className="font-sans">Open-Meteo Weather & Marine Layers</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {lastUpdatedTime && (
            <span className="font-mono" style={{ fontSize: '10px', color: '#94a3b8', background: 'rgba(15,23,42,0.8)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
              Updated: {lastUpdatedTime}
            </span>
          )}
          {isLoadingData && (
            <span className="font-mono" style={{ fontSize: '10px', color: '#38bdf8', background: 'rgba(56,189,248,0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(56,189,248,0.3)' }}>
              Connecting Open-Meteo...
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsDarkMode((prev) => !prev)}
            style={{
              background: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(241, 245, 249, 0.9)',
              border: isDarkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1',
              color: isDarkMode ? '#e2e8f0' : '#0f172a',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {isDarkMode ? '🌙 Dark Base' : '☀️ Light Base'}
          </button>
        </div>
      </div>

      <div className="map-canvas" style={{ position: 'relative', minHeight: '480px', background: isDarkMode ? '#09131d' : '#e2e8f0' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '480px', borderRadius: '8px', overflow: 'hidden' }} />

        {/* Real-time Static Canvas Flow Overlay for Ocean Currents */}
        <StaticOceanCurrentCanvas
          map={mapRef.current}
          isVisible={isCurrentsActive}
          observationPoints={oceanCurrentPoints}
        />

        <div className="map-controls" style={{ position: 'absolute', right: '12px', top: '12px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button type="button" onClick={handleZoomIn} aria-label="Zoom in">+</button>
          <button type="button" onClick={handleZoomOut} aria-label="Zoom out">&minus;</button>
          <button type="button" onClick={onReset} aria-label="Reset map view">⌖</button>
        </div>

        {/* Dynamic Context Legend Overlay */}
        <div
          className="map-legend font-mono"
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            zIndex: 10,
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '8px 12px',
            color: '#e2e8f0',
            maxWidth: '340px',
            fontSize: '10px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
          }}
        >
          <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '3px', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            <span>OPEN-METEO PROTOCOL (OM://)</span>
            {lastUpdatedTime && <span>UPDATED: {lastUpdatedTime}</span>}
          </div>

          <div style={{ display: 'grid', gap: '8px' }}>
            {layers.temperature !== false && (
              <div>
                <TemperatureLegend minTemp={20.0} maxTemp={35.0} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', gap: '8px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '9px' }}>Temp Opacity:</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={tempOpacity}
                    onChange={(e) => setTempOpacity(parseFloat(e.target.value))}
                    style={{ cursor: 'pointer', accentColor: '#38bdf8', width: '90px' }}
                  />
                  <span style={{ color: '#38bdf8', fontSize: '9px', width: '28px', textAlign: 'right' }}>
                    {Math.round(tempOpacity * 100)}%
                  </span>
                </div>
              </div>
            )}

            {Boolean(layers.wind) && (
              <div style={{ borderTop: layers.temperature !== false ? '1px solid rgba(255,255,255,0.08)' : 'none', paddingTop: layers.temperature !== false ? '6px' : '0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#38bdf8', marginBottom: '4px' }}>
                  <span>WIND SPEED (m/s)</span>
                  <span>0 - 20 m/s</span>
                </div>
                <div style={{ height: '8px', borderRadius: '4px', background: 'linear-gradient(to right, #38bdf8, #34d399, #facc15, #f97316, #ef4444)', marginBottom: '4px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#94a3b8' }}>
                  <span>0m/s</span>
                  <span>5m/s</span>
                  <span>10m/s</span>
                  <span>15m/s</span>
                  <span>20m/s+</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', gap: '8px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '9px' }}>Wind Opacity:</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={windOpacity}
                    onChange={(e) => setWindOpacity(parseFloat(e.target.value))}
                    style={{ cursor: 'pointer', accentColor: '#34d399', width: '90px' }}
                  />
                  <span style={{ color: '#34d399', fontSize: '9px', width: '28px', textAlign: 'right' }}>
                    {Math.round(windOpacity * 100)}%
                  </span>
                </div>
              </div>
            )}

            {isCurrentsActive && (
              <div style={{ borderTop: (layers.temperature !== false || Boolean(layers.wind)) ? '1px solid rgba(255,255,255,0.08)' : 'none', paddingTop: (layers.temperature !== false || Boolean(layers.wind)) ? '6px' : '0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#38bdf8', marginBottom: '6px' }}>
                  <span>OCEAN CURRENT DIRECTION</span>
                  <span style={{ fontSize: '9px', color: '#94a3b8' }}>Static Flow Lines</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '9.5px', background: 'rgba(2, 132, 199, 0.1)', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#e2e8f0' }}>
                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>↑</span>
                    <span>North (0°)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#e2e8f0' }}>
                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>→</span>
                    <span>East (90°)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#e2e8f0' }}>
                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>↓</span>
                    <span>South (180°)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#e2e8f0' }}>
                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>←</span>
                    <span>West (270°)</span>
                  </div>
                </div>
                <div style={{ marginTop: '4px', fontSize: '8.5px', color: '#94a3b8', fontStyle: 'italic' }}>
                  Static streamlines with terminal arrowheads following ocean current flow
                </div>
              </div>
            )}

            {layers.temperature === false && !layers.wind && !isCurrentsActive && (
              <span style={{ color: '#64748b', fontStyle: 'italic' }}>Select Temperature, Wind, or Ocean Current Direction layer below to activate spatial overlays.</span>
            )}
          </div>
        </div>
      </div>

      <div className="map-layers font-sans" aria-label="Map layer controls">
        {Object.entries(layerLabels).map(([id, label]) => (
          <button
            type="button"
            className={(id === 'temperature' ? layers.temperature !== false : Boolean(layers[id])) ? 'layer-active' : ''}
            key={id}
            data-layer={id}
            onClick={() => onToggleLayer(id)}
            aria-pressed={Boolean(id === 'temperature' ? layers.temperature !== false : Boolean(layers[id]))}
          >
            <i />
            {label}
          </button>
        ))}
      </div>
    </section>
  )
}

