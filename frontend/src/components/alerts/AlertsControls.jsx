import { dashboardLocations } from '../../data/dashboardData'

export default function AlertsControls({
  selectedLocationId,
  onSelectLocation,
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  sortBy,
  onSortChange,
  unreadCount,
  onMarkAllRead
}) {
  return (
    <div className="alerts-controls-panel panel">
      {/* Top Controls Row */}
      <div className="controls-top-row">
        <div className="controls-left">
          <label className="location-select-wrap">
            <span>LOCATION FILTER</span>
            <select
              value={selectedLocationId}
              onChange={(e) => onSelectLocation(e.target.value)}
              aria-label="Filter alerts by location"
            >
              <option value="all">📍 All Locations</option>
              {dashboardLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  📍 {loc.name} ({loc.region})
                </option>
              ))}
            </select>
          </label>

          <div className="alerts-search-box">
            <span className="search-icon" aria-hidden="true">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search alerts by title, hazard, or area..."
              aria-label="Search alerts"
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-btn"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="controls-right">
          <label className="sort-select-wrap">
            <span>SORT BY</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              aria-label="Sort alerts"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="severity">Highest Severity</option>
            </select>
          </label>

          {unreadCount > 0 && (
            <button
              type="button"
              className="mark-all-read-btn"
              onClick={onMarkAllRead}
              title="Mark all current alerts as read"
            >
              ✓ Mark all as read ({unreadCount})
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs Row */}
      <div className="severity-tabs-row">
        <span className="tabs-label">SEVERITY:</span>
        <div className="tabs-list">
          {['all', 'high', 'moderate', 'advisory', 'info'].map((cat) => {
            const isSelected = activeFilter === cat
            const labels = { all: 'All Alerts', high: '🔴 High', moderate: '🟠 Moderate', advisory: '🟡 Advisory', info: '🔵 Info' }
            return (
              <button
                key={cat}
                type="button"
                className={`tab-btn ${isSelected ? 'is-active' : ''}`}
                onClick={() => onFilterChange(cat)}
              >
                {labels[cat]}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
