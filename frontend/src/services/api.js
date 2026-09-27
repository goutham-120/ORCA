const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '')

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

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = `${API_BASE_URL}${normalizedPath}`

  // Automatic cold-start retry: if Render is waking up (502 / network drop), retry once after 2.5s
  let lastErr
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, {
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

      if ((response.status === 502 || response.status === 503 || response.status === 504) && attempt === 0) {
        await new Promise((r) => setTimeout(r, 2500))
        continue
      }

      const isJson = response.headers.get('content-type')?.includes('application/json')
      const data = isJson ? await response.json() : null
      if (!response.ok) throw new ApiError(errorMessage(data, response.status), response.status, data)
      return data
    } catch (err) {
      lastErr = err
      if (attempt === 0 && (err.name === 'TypeError' || err.message?.includes('Failed to fetch'))) {
        await new Promise((r) => setTimeout(r, 2500))
        continue
      }
      throw err
    }
  }
  throw lastErr
}

export { API_BASE_URL }
