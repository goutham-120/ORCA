import { useState, useMemo, useEffect } from 'react'
import SafetyStatusBanner from '../components/alerts/SafetyStatusBanner'
import AlertsSummaryCards from '../components/alerts/AlertsSummaryCards'
import AlertsControls from '../components/alerts/AlertsControls'
import AlertCard from '../components/alerts/AlertCard'
import AlertTimeline from '../components/alerts/AlertTimeline'
import { getAlertsByLocation, dashboardLocations } from '../data/dashboardData'

const READ_KEY = 'orca-alerts-read'
const FILTER_KEY = 'orca-alerts-filter'
const PREFERENCES_KEY = 'orca-dashboard-preferences'

function loadSavedReadIds() {
  try {
    const raw = localStorage.getItem(READ_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return new Set(parsed)
    }
  } catch {
    // Ignore parse error
  }
  return new Set()
}

function loadSavedLocationId() {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.locationId && (parsed.locationId === 'all' || dashboardLocations.some((loc) => loc.id === parsed.locationId))) {
        return parsed.locationId
      }
    }
  } catch {
    // Ignore parse error
  }
  return 'all'
}

function loadSavedFilter() {
  try {
    const raw = localStorage.getItem(FILTER_KEY)
    if (raw && ['all', 'high', 'moderate', 'advisory', 'info', 'unread'].includes(raw)) {
      return raw
    }
  } catch {
    // Ignore parse error
  }
  return 'all'
}

export default function Alerts({ navigate }) {
  const [selectedLocationId, setSelectedLocationId] = useState(() => loadSavedLocationId())
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState(() => loadSavedFilter())
  const [sortBy, setSortBy] = useState('newest')
  const [readAlertIds, setReadAlertIds] = useState(() => loadSavedReadIds())

  // Persist read alert IDs
  useEffect(() => {
    try {
      localStorage.setItem(READ_KEY, JSON.stringify(Array.from(readAlertIds)))
    } catch {
      // Ignore quota errors
    }
  }, [readAlertIds])

  // Persist filter choice
  useEffect(() => {
    try {
      localStorage.setItem(FILTER_KEY, activeFilter)
    } catch {
      // Ignore storage error
    }
  }, [activeFilter])

  // Persist location selection
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFERENCES_KEY)
      const existing = raw ? JSON.parse(raw) : {}
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ ...existing, locationId: selectedLocationId }))
    } catch {
      // Ignore storage error
    }
  }, [selectedLocationId])

  // Retrieve base alerts dataset according to location selection
  const rawLocationAlerts = useMemo(() => getAlertsByLocation(selectedLocationId), [selectedLocationId])

  // Location display title
  const locationName = useMemo(() => {
    if (selectedLocationId === 'all') return 'All Locations'
    const found = dashboardLocations.find((loc) => loc.id === selectedLocationId)
    return found ? found.name : 'All Locations'
  }, [selectedLocationId])

  // Filtered & Searched Alerts
  const filteredAlerts = useMemo(() => {
    return rawLocationAlerts.filter((alert) => {
      // Category / Severity Filter
      if (activeFilter === 'unread') {
        if (readAlertIds.has(alert.id)) return false
      } else if (activeFilter !== 'all') {
        if (alert.severity !== activeFilter) return false
      }

      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const titleMatch = alert.title.toLowerCase().includes(q)
        const detailMatch = alert.detail.toLowerCase().includes(q)
        const locationMatch = alert.locationName.toLowerCase().includes(q)
        const areaMatch = alert.affectedArea.toLowerCase().includes(q)
        if (!titleMatch && !detailMatch && !locationMatch && !areaMatch) return false
      }

      return true
    })
  }, [rawLocationAlerts, activeFilter, searchQuery, readAlertIds])

  // Sorted Alerts
  const sortedAlerts = useMemo(() => {
    const list = [...filteredAlerts]
    const severityOrder = { high: 1, moderate: 2, advisory: 3, info: 4 }

    if (sortBy === 'severity') {
      list.sort((a, b) => (severityOrder[a.severity] || 5) - (severityOrder[b.severity] || 5))
    } else if (sortBy === 'oldest') {
      list.reverse()
    }
    return list
  }, [filteredAlerts, sortBy])

  // Dynamic Unread Count
  const unreadCount = useMemo(
    () => rawLocationAlerts.filter((a) => !readAlertIds.has(a.id)).length,
    [rawLocationAlerts, readAlertIds]
  )

  const handleToggleRead = (id, markRead) => {
    setReadAlertIds((prev) => {
      const next = new Set(prev)
      if (markRead) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  const handleMarkAllRead = () => {
    setReadAlertIds((prev) => {
      const next = new Set(prev)
      rawLocationAlerts.forEach((a) => next.add(a.id))
      return next
    })
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setActiveFilter('all')
    setSelectedLocationId('all')
  }

  return (
    <div className="alerts-page">
      {/* Page Header */}
      <section className="alerts-page-header">
        <div>
          <div className="header-meta-row">
            <p className="eyebrow">SAFETY & ADVISORY CENTER</p>
            <span className="demo-data-chip">● Demo marine data</span>
          </div>
          <h1>Marine Alerts</h1>
          <p className="subhead">Real-time hazard warnings, small craft watches, and oceanographic advisories.</p>
        </div>
      </section>

      {/* Safety Priority Status Banner */}
      <SafetyStatusBanner
        alerts={rawLocationAlerts}
        locationName={locationName}
      />

      {/* Summary Count Statistics Cards */}
      <AlertsSummaryCards
        alerts={rawLocationAlerts}
        unreadCount={unreadCount}
        activeFilter={activeFilter}
        onSelectFilter={setActiveFilter}
      />

      {/* Controls Bar: Search, Filters, Location Selector & Sort */}
      <AlertsControls
        selectedLocationId={selectedLocationId}
        onSelectLocation={setSelectedLocationId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
        unreadCount={unreadCount}
        onMarkAllRead={handleMarkAllRead}
      />

      {/* Main Alerts Grid Workspace */}
      <div className="alerts-workspace-grid">
        <div className="alerts-main-col">
          {sortedAlerts.length > 0 ? (
            <div className="alerts-cards-list">
              {sortedAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  isRead={readAlertIds.has(alert.id)}
                  onToggleRead={handleToggleRead}
                  navigate={navigate}
                />
              ))}
            </div>
          ) : rawLocationAlerts.length === 0 ? (
            <div className="alerts-empty-panel panel">
              <div className="empty-icon-orb green-orb">✓</div>
              <h2>No Active Alerts</h2>
              <p>Conditions near <strong>{locationName}</strong> are currently clear with no active advisories.</p>
            </div>
          ) : (
            <div className="alerts-empty-panel panel">
              <div className="empty-icon-orb">🔍</div>
              <h2>No Matching Alerts</h2>
              <p>No alerts match your current search query or active filter selection.</p>
              <button
                type="button"
                className="clear-filters-btn"
                onClick={handleClearFilters}
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Timeline */}
        <div className="alerts-sidebar-col">
          <AlertTimeline alerts={rawLocationAlerts} />
        </div>
      </div>
    </div>
  )
}
