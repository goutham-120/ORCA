/**
 * Offline-First Coastal Synchronization Service
 * Caches latest PFZ tracks, tide predictions, and emergency distress templates
 * in localStorage for uninterrupted offshore fishing operations when 4G connectivity drops.
 */

const OFFSHORE_CACHE_KEY = 'orca-offshore-cached-bundle'

export function cacheOffshoreBundle({ location, pfzData, tideData, routeData, msiScore }) {
  try {
    const bundle = {
      timestamp: new Date().toISOString(),
      location: location || { label: 'Selected Coastal Sector' },
      msiScore: msiScore != null ? msiScore : 85,
      pfzData: pfzData || [],
      tideData: tideData || null,
      routeData: routeData || null,
      expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24-hour validity
    }
    localStorage.setItem(OFFSHORE_CACHE_KEY, JSON.stringify(bundle))
    return true
  } catch (err) {
    console.warn('Failed to cache offshore bundle in localStorage:', err)
    return false
  }
}

export function getOffshoreBundle() {
  try {
    const raw = localStorage.getItem(OFFSHORE_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed
  } catch {
    return null
  }
}

export function isOffshoreCacheValid() {
  const bundle = getOffshoreBundle()
  if (!bundle || !bundle.expiry) return false
  return new Date(bundle.expiry) > new Date()
}
