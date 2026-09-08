import { useState } from 'react'

export function SavedReports({ savedReports, onViewReport, onDeleteReport, onClearAll }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('all')

  const filteredReports = savedReports.filter((rep) => {
    const matchesSearch =
      rep.typeTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rep.locationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rep.summary.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLoc = selectedLocation === 'all' || rep.locationId === selectedLocation
    return matchesSearch && matchesLoc
  })

  return (
    <div className="saved-reports-container">
      <div className="saved-reports-header">
        <div>
          <h3>📁 Saved Marine Reports ({savedReports.length})</h3>
          <p>Access previously generated report documents saved to your workspace session.</p>
        </div>
        {savedReports.length > 0 && onClearAll && (
          <button
            type="button"
            className="orca-btn secondary outline text-sm danger-hover"
            onClick={onClearAll}
          >
            🗑️ Clear Saved Reports
          </button>
        )}
      </div>

      {/* Filter and Search controls */}
      <div className="saved-reports-toolbar">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search saved reports by title, location, or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="orca-input"
          />
        </div>

        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="orca-select location-filter"
        >
          <option value="all">All Sector Locations</option>
          <option value="visakhapatnam">Visakhapatnam</option>
          <option value="chennai">Chennai</option>
          <option value="mumbai">Mumbai</option>
        </select>
      </div>

      {/* List of saved reports */}
      {filteredReports.length === 0 ? (
        <div className="saved-reports-empty">
          <div className="empty-icon">📁</div>
          <h4>No Saved Reports Found</h4>
          <p>
            {savedReports.length === 0
              ? 'You have not saved any reports yet. Generate a report and click "Save Report" to persist it here.'
              : 'No reports match your current search and location filter.'}
          </p>
        </div>
      ) : (
        <div className="saved-reports-grid">
          {filteredReports.map((rep) => (
            <div key={rep.id} className="saved-report-card">
              <div className="saved-card-header">
                <span className="saved-type-badge">{rep.typeTitle}</span>
                <span className="saved-date">{rep.generatedDate}</span>
              </div>

              <h4 className="saved-location-name">📍 {rep.locationName} ({rep.timePeriod})</h4>
              <p className="saved-summary-snippet">{rep.summary}</p>

              <div className="saved-card-metrics">
                <span>🌊 Wave: {rep.metrics.wave.value}m</span>
                <span>💨 Wind: {rep.metrics.wind.value}km/h</span>
                <span>🛡️ Safety: {rep.metrics.safety.score}/100</span>
              </div>

              <div className="saved-card-actions">
                <button
                  type="button"
                  className="orca-btn primary text-sm glow"
                  onClick={() => onViewReport(rep)}
                >
                  📄 View Full Report
                </button>
                <button
                  type="button"
                  className="orca-btn secondary icon-only text-sm"
                  onClick={() => onDeleteReport(rep.id)}
                  title="Delete Report"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
