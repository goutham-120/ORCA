import { api } from './api'

export const askOrca = (payload, signal) => api('/orca/query', { method: 'POST', body: payload, signal })
export const simulateScenario = (payload, signal) => api('/orca/simulate', { method: 'POST', body: payload, signal })

