import { api, ApiError } from './api'

function ensureObject(value, label) {
  if (!value || typeof value !== 'object') throw new Error(`Malformed ${label} response.`)
  return value
}

export async function getMapLayers(options) {
  const response = ensureObject(await api('/map/layers', options), 'map layers')
  if (!Array.isArray(response.layers)) throw new Error('Malformed map layers response.')
  return response.layers
}

export async function getMapFeatures(layerIds = [], { latitude, longitude, radiusKm = 50, ...options } = {}) {
  const params = new URLSearchParams()
  layerIds.forEach((layerId) => params.append('layer', layerId))
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    params.set('latitude', latitude)
    params.set('longitude', longitude)
    params.set('radius_km', radiusKm)
  }
  const response = ensureObject(await api(`/map/features${params.toString() ? `?${params}` : ''}`, options), 'map features')
  if (!Array.isArray(response.features)) throw new Error('Malformed map features response.')
  return response.features
}

export async function analyzeLocation(payload, options) {
  return ensureObject(await api('/map/analyze', { method: 'POST', body: payload, ...options }), 'map analysis')
}

export async function analyzeRoute(payload, options) {
  return ensureObject(await api('/map/route', { method: 'POST', body: payload, ...options }), 'route analysis')
}

export async function analyzePFZ(payload, options) {
  return ensureObject(await api('/decisions/pfz/suitability', { method: 'POST', body: payload, ...options }), 'PFZ analysis')
}

export async function syncPFZ(options) {
  return ensureObject(await api('/map/pfz/sync', { method: 'POST', ...options }), 'PFZ sync')
}

export async function findNearestSuitablePFZ({ latitude, longitude, radiusKm = 50 }, options) {
  return ensureObject(
    await api('/map/pfz/nearest-suitable', {
      method: 'POST',
      body: { latitude, longitude, radius_km: radiusKm },
      ...options,
    }),
    'nearest suitable PFZ'
  )
}

export async function analyzeDetailedRoute(payload, options) {
  return ensureObject(
    await api('/map/analyze-route', {
      method: 'POST',
      body: payload,
      ...options,
    }),
    'detailed route analysis'
  )
}

export async function navigateNearestPFZ({ latitude, longitude, radiusKm = 150, vesselSpeedKnots = 12.0 }, options) {
  return ensureObject(
    await api('/map/navigate-nearest-pfz', {
      method: 'POST',
      body: {
        latitude,
        longitude,
        radius_km: radiusKm,
        vessel_speed_knots: vesselSpeedKnots,
      },
      ...options,
    }),
    'live PFZ navigation'
  )
}

export async function getTidePrediction({ latitude, longitude }, options) {
  const params = new URLSearchParams({ latitude, longitude })
  return ensureObject(await api(`/map/tide?${params.toString()}`, options), 'tide prediction')
}

export async function getEcosystemAnomaly({ latitude, longitude, sst, chlorophyll }, options) {
  const params = new URLSearchParams({ latitude, longitude })
  if (sst !== undefined) params.set('sst', sst)
  if (chlorophyll !== undefined) params.set('chlorophyll', chlorophyll)
  return ensureObject(await api(`/map/ecosystem-anomaly?${params.toString()}`, options), 'ecosystem anomaly')
}

export function mapErrorMessage(error) {
  if (error instanceof ApiError) return error.message
  if (error?.name === 'AbortError') return 'Request cancelled.'
  return error?.message || 'GIS data unavailable. Please try again.'
}

