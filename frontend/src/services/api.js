const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

function errorMessage(data, status) {
  if (typeof data?.detail === 'string') return data.detail
  if (Array.isArray(data?.detail)) {
    return data.detail.map((issue) => issue.msg || 'Invalid request.').join(' ')
  }
  return `Request failed (${status})`
}

export async function api(path, { method = 'GET', body, headers = {}, signal } = {}) {
  const mapApiKey = import.meta.env.VITE_MAP_API_KEY
  let authHeaders = {}
  try {
    const sessionStr = localStorage.getItem('orca-auth-session')
    if (sessionStr) {
      const session = JSON.parse(sessionStr)
      if (session?.access_token) {
        authHeaders = { Authorization: `Bearer ${session.access_token}` }
      }
    }
  } catch (e) {}

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    signal,
    headers: {
      Accept: 'application/json',
      ...authHeaders,
      ...(mapApiKey ? { 'X-API-Key': mapApiKey } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const isJson = response.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await response.json() : null
  if (!response.ok) throw new ApiError(errorMessage(data, response.status), response.status, data)
  return data
}

export { API_BASE_URL }
