import { getAlertsByLocation, dashboardLocations } from '../data/dashboardData'

const READ_ALERTS_KEY = 'orca-alerts-read'
const CACHED_ALERTS_KEY = 'orca-cached-alerts'
const PREFERENCES_KEY = 'orca-dashboard-preferences'
export const ALERTS_UPDATED_EVENT = 'orca-alerts-updated'

/**
 * Retrieve the set of read alert IDs from localStorage
 */
export function getReadAlertIds() {
  try {
    const raw = localStorage.getItem(READ_ALERTS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return new Set(parsed)
    }
  } catch {
    // Ignore parse error
  }
  return new Set()
}

/**
 * Mark a single alert as read and broadcast change
 */
export function markAlertAsRead(alertId) {
  if (!alertId) return
  try {
    const readSet = getReadAlertIds()
    if (!readSet.has(alertId)) {
      readSet.add(alertId)
      localStorage.setItem(READ_ALERTS_KEY, JSON.stringify(Array.from(readSet)))
      broadcastAlertsUpdated()
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Mark all given alert IDs as read and broadcast change
 */
export function markAllAlertsAsRead(alertIds = []) {
  try {
    const readSet = getReadAlertIds()
    alertIds.forEach((id) => readSet.add(id))
    localStorage.setItem(READ_ALERTS_KEY, JSON.stringify(Array.from(readSet)))
    broadcastAlertsUpdated()
  } catch {
    // Ignore storage errors
  }
}

/**
 * Cache current active alerts (from live telemetry or location)
 */
export function cacheActiveAlerts(alertsList = []) {
  try {
    if (Array.isArray(alertsList)) {
      localStorage.setItem(CACHED_ALERTS_KEY, JSON.stringify(alertsList))
      broadcastAlertsUpdated()
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Broadcast event to notify all listening components
 */
export function broadcastAlertsUpdated() {
  try {
    window.dispatchEvent(new CustomEvent(ALERTS_UPDATED_EVENT))
  } catch {
    // Ignore dispatch error
  }
}

/**
 * Calculate dynamic unread alert count based on current active alerts and read state
 */
export function calculateCurrentUnreadCount() {
  const readSet = getReadAlertIds()

  // 1. Check if cached live alerts exist
  try {
    const rawCache = localStorage.getItem(CACHED_ALERTS_KEY)
    if (rawCache) {
      const cached = JSON.parse(rawCache)
      if (Array.isArray(cached) && cached.length > 0) {
        return cached.filter((a) => !readSet.has(a.id)).length
      }
    }
  } catch {
    // Fall back to location-based alerts
  }

  // 2. Check active location from preferences
  let locationId = 'visakhapatnam'
  try {
    const rawPrefs = localStorage.getItem(PREFERENCES_KEY)
    if (rawPrefs) {
      const prefs = JSON.parse(rawPrefs)
      if (prefs.locationId) locationId = prefs.locationId
    }
  } catch {
    locationId = 'visakhapatnam'
  }

  const activeAlerts = getAlertsByLocation(locationId)
  return activeAlerts.filter((a) => !readSet.has(a.id)).length
}
