import { INDIA_TEMPERATURE_BOUNDS } from '../services/temperatureService'

export const AIR_TEMP_STOPS = [
  { temp: 20, rgb: [29, 78, 216], hex: '#1d4ed8' },
  { temp: 23, rgb: [6, 182, 212], hex: '#06b6d4' },
  { temp: 26, rgb: [16, 185, 129], hex: '#10b981' },
  { temp: 29, rgb: [234, 179, 8], hex: '#eab308' },
  { temp: 32, rgb: [249, 115, 22], hex: '#f97316' },
  { temp: 35, rgb: [239, 68, 68], hex: '#ef4444' },
]

export const SST_STOPS = [
  { temp: 26, rgb: [6, 182, 212], hex: '#06b6d4' },
  { temp: 28, rgb: [14, 165, 233], hex: '#0ea5e9' },
  { temp: 30, rgb: [234, 179, 8], hex: '#eab308' },
  { temp: 32, rgb: [234, 88, 12], hex: '#ea580c' },
]

const INDIA_MAINLAND = [
  [68.0, 23.9], [71.5, 24.2], [74.3, 23.1], [76.4, 21.5], [78.6, 20.2],
  [80.9, 18.9], [83.2, 18.4], [86.0, 20.0], [88.9, 22.5], [89.8, 21.6],
  [88.9, 20.4], [87.4, 19.2], [85.6, 18.0], [84.2, 16.6], [82.0, 14.1],
  [80.3, 11.9], [79.2, 10.2], [78.4, 8.7], [77.2, 7.7], [76.1, 8.4],
  [75.3, 10.2], [74.7, 12.1], [74.1, 14.5], [73.3, 16.4], [72.6, 18.3],
  [72.0, 20.2], [70.7, 21.6], [69.4, 22.6], [68.0, 23.9],
]

const SRI_LANKA = [
  [79.5, 9.9], [80.8, 9.8], [81.8, 8.9], [81.9, 7.3], [81.3, 6.2],
  [80.2, 5.8], [79.5, 6.8], [79.4, 8.5], [79.5, 9.9],
]

const COASTAL_WATER_TRACKS = [
  [[68.2, 22.8], [69.6, 21.9], [71.0, 20.8], [72.1, 19.3], [72.7, 17.7], [73.3, 16.0], [74.0, 14.2], [74.6, 12.5], [75.2, 10.8], [76.1, 9.0], [77.2, 7.7]],
  [[77.2, 7.7], [78.4, 8.8], [79.3, 10.3], [80.2, 12.0], [81.1, 13.6], [82.3, 15.2], [83.6, 16.7], [85.0, 18.4], [86.7, 20.1], [88.4, 21.5], [89.3, 22.0]],
  [[72.0, 8.0], [72.8, 9.5], [73.4, 11.2]],
  [[92.4, 6.8], [92.1, 8.2], [92.5, 9.8], [92.8, 11.5], [92.7, 13.1]],
]

const RAD = Math.PI / 180
const EARTH_RADIUS_KM = 6371

function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * RAD
  const dLon = (lon2 - lon1) * RAD
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLon / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function pointInPolygon(lon, lat, polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0]
    const yi = polygon[i][1]
    const xj = polygon[j][0]
    const yj = polygon[j][1]
    const intersects = ((yi > lat) !== (yj > lat)) &&
      (lon < ((xj - xi) * (lat - yi)) / (yj - yi || 1e-9) + xi)
    if (intersects) inside = !inside
  }
  return inside
}

function distanceToSegmentKm(lat, lon, start, end) {
  const meanLat = ((lat + start[1] + end[1]) / 3) * RAD
  const kmPerDegreeLon = 111.32 * Math.cos(meanLat)
  const px = lon * kmPerDegreeLon
  const py = lat * 110.57
  const ax = start[0] * kmPerDegreeLon
  const ay = start[1] * 110.57
  const bx = end[0] * kmPerDegreeLon
  const by = end[1] * 110.57
  const dx = bx - ax
  const dy = by - ay
  const lengthSq = dx * dx + dy * dy
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq))
  const sx = ax + t * dx
  const sy = ay + t * dy
  return Math.hypot(px - sx, py - sy)
}

function distanceToTrackKm(lat, lon, track) {
  let minDistance = Infinity
  for (let index = 0; index < track.length - 1; index++) {
    minDistance = Math.min(minDistance, distanceToSegmentKm(lat, lon, track[index], track[index + 1]))
  }
  return minDistance
}

function smoothstep(edge0, edge1, value) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function marineAlpha(lat, lon, bounds) {
  if (pointInPolygon(lon, lat, INDIA_MAINLAND) || pointInPolygon(lon, lat, SRI_LANKA)) {
    return 0
  }

  const nearestTrackKm = COASTAL_WATER_TRACKS.reduce(
    (minValue, track) => Math.min(minValue, distanceToTrackKm(lat, lon, track)),
    Infinity
  )

  const coastalAlpha = 1 - smoothstep(360, 560, nearestTrackKm)
  const edgeDistance = Math.min(
    lon - bounds.west,
    bounds.east - lon,
    lat - bounds.south,
    bounds.north - lat
  )
  const edgeAlpha = smoothstep(0, 1.2, edgeDistance)

  return Math.max(0, Math.min(1, coastalAlpha * edgeAlpha))
}

export function computeIDW(targetLat, targetLon, points, propName = 'air_temperature_c', power = 2) {
  if (!Array.isArray(points) || !points.length) return null

  let totalWeight = 0
  let weightedSum = 0

  for (const point of points) {
    const value = Number(point[propName])
    if (!Number.isFinite(value)) continue

    const distance = haversineKm(targetLat, targetLon, point.latitude, point.longitude)
    if (distance < 0.001) return value

    const weight = 1 / (distance ** power)
    weightedSum += weight * value
    totalWeight += weight
  }

  return totalWeight > 0 ? weightedSum / totalWeight : null
}

export function interpolateColor(value, colorStops = AIR_TEMP_STOPS) {
  if (value <= colorStops[0].temp) return colorStops[0].rgb
  const last = colorStops[colorStops.length - 1]
  if (value >= last.temp) return last.rgb

  for (let index = 0; index < colorStops.length - 1; index++) {
    const current = colorStops[index]
    const next = colorStops[index + 1]
    if (value >= current.temp && value <= next.temp) {
      const t = (value - current.temp) / (next.temp - current.temp)
      return [
        Math.round(current.rgb[0] + t * (next.rgb[0] - current.rgb[0])),
        Math.round(current.rgb[1] + t * (next.rgb[1] - current.rgb[1])),
        Math.round(current.rgb[2] + t * (next.rgb[2] - current.rgb[2])),
      ]
    }
  }

  return colorStops[0].rgb
}

export function isValidTemperatureCoordinate(lat, lon, bounds = INDIA_TEMPERATURE_BOUNDS) {
  return marineAlpha(lat, lon, bounds) > 0.08
}

export function generateTemperatureRaster(
  points,
  width = 512,
  height = 512,
  alpha = 150,
  propName = 'air_temperature_c',
  colorStops = AIR_TEMP_STOPS,
  bounds = INDIA_TEMPERATURE_BOUNDS
) {
  if (!Array.isArray(points) || !points.length) return null

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  const imageData = ctx.createImageData(width, height)
  const data = imageData.data
  const latSpan = bounds.north - bounds.south
  const lngSpan = bounds.east - bounds.west

  for (let y = 0; y < height; y++) {
    const lat = bounds.north - ((y + 0.5) / height) * latSpan
    for (let x = 0; x < width; x++) {
      const lon = bounds.west + ((x + 0.5) / width) * lngSpan
      const maskAlpha = marineAlpha(lat, lon, bounds)
      const pixelIdx = (y * width + x) * 4

      if (maskAlpha <= 0.005) {
        data[pixelIdx + 3] = 0
        continue
      }

      const value = computeIDW(lat, lon, points, propName, 2)
      if (!Number.isFinite(value)) {
        data[pixelIdx + 3] = 0
        continue
      }

      const [r, g, b] = interpolateColor(value, colorStops)
      data[pixelIdx] = r
      data[pixelIdx + 1] = g
      data[pixelIdx + 2] = b
      data[pixelIdx + 3] = Math.round(alpha * maskAlpha)
    }
  }

  ctx.putImageData(imageData, 0, 0)

  return {
    canvas,
    dataUrl: canvas.toDataURL('image/png'),
    resolution: { width, height },
    bounds,
    coordinates: [
      [bounds.west, bounds.north],
      [bounds.east, bounds.north],
      [bounds.east, bounds.south],
      [bounds.west, bounds.south],
    ],
  }
}
