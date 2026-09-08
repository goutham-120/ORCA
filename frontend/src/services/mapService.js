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

export async function analyzeLocation(payload, options) {
  return ensureObject(await api('/map/analyze', { method: 'POST', body: payload, ...options }), 'map analysis')
}

export async function analyzeRoute(payload, options) {
  return ensureObject(await api('/map/route', { method: 'POST', body: payload, ...options }), 'route analysis')
}

export function mapErrorMessage(error) {
  if (error instanceof ApiError) return error.message
  if (error?.name === 'AbortError') return 'Request cancelled.'
  return error?.message || 'GIS data unavailable. Please try again.'
}
