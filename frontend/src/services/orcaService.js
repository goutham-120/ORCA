import { api } from './api'

export const askOrca = (payload, signal) => api('/orca/query', { method: 'POST', body: payload, signal })
export const simulateScenario = (payload, signal) => api('/orca/simulate', { method: 'POST', body: payload, signal })
export const checkLocationAlerts = (lat, lon, signal) => api(`/alerts/check?latitude=${lat}&longitude=${lon}`, { method: 'GET', signal })
export const getActiveAlerts = (signal) => api('/alerts', { method: 'GET', signal })

