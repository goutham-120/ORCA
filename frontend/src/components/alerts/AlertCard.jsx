import { useState } from 'react'

export default function AlertCard({ alert, isRead, onToggleRead, navigate }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleToggleExpand = () => {
    setIsExpanded((prev) => !prev)
    if (!isRead) {
      onToggleRead(alert.id, true)
    }
  }

  const handleViewOnMap = (e) => {
    e.stopPropagation()
    navigate(`/map-explorer`)
  }

  const handleAskOrca = (e) => {
    e.stopPropagation()
    const q = `Explain the ${alert.title} near ${alert.locationName} and safe operating guidance.`
    navigate(`/ask-orca?query=${encodeURIComponent(q)}`)
  }

  const severityIcons = {
    high: '🔴',
    moderate: '🟠',
    advisory: '🟡',
    info: '🔵',
  }

  return (
    <div className={`alert-card-item severity-${alert.severity} ${isRead ? 'is-read' : 'is-unread'} ${isExpanded ? 'is-expanded' : ''}`}>
      {/* Alert Header Row */}
      <div className="alert-card-header" onClick={handleToggleExpand}>
        <div className="header-left">
          <span className="unread-dot" title={isRead ? 'Read' : 'Unread'} />
          <span className="severity-icon">{severityIcons[alert.severity]}</span>
          <div className="title-block">
            <div className="badge-row">
              <span className={`severity-tag ${alert.severity}`}>{alert.severity.toUpperCase()}</span>
              {alert.category && <span className="category-tag">{alert.category.toUpperCase()}</span>}
            </div>
            <h3 className="alert-title">{alert.title}</h3>
          </div>
        </div>

        <div className="header-right">
          <span className="alert-location-chip">📍 {alert.locationName}</span>
          <time className="alert-time">{alert.time}</time>
          <button
            type="button"
            className="expand-chevron"
            aria-label={isExpanded ? 'Collapse alert details' : 'Expand alert details'}
          >
            {isExpanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Alert Detail Summary Preview */}
      <div className="alert-preview-text" onClick={handleToggleExpand}>
        <p>{alert.detail}</p>
        <span className="affected-area-text">Area: {alert.affectedArea}</span>
      </div>

      {/* Expandable Details Section */}
      {isExpanded && (
        <div className="alert-expanded-panel">
          <div className="details-grid">
            <div className="detail-item">
              <small>AFFECTED AREA</small>
              <strong>{alert.affectedArea}</strong>
            </div>

            <div className="detail-item">
              <small>EXPECTED DURATION</small>
              <strong>{alert.expectedTime || 'Through current operating period'}</strong>
            </div>

            <div className="detail-item full-width">
              <small>SAFETY RECOMMENDATION / GUIDANCE</small>
              <p>{alert.guidance || alert.recommendation}</p>
            </div>

            <div className="detail-item full-width">
              <small>SOURCE ATTRIBUTION</small>
              <span className="source-badge">ORCA Demo Intelligence • Live Advisory Stream</span>
            </div>
          </div>

          <div className="expanded-actions-row">
            <button
              type="button"
              className="action-link-btn map-link"
              onClick={handleViewOnMap}
            >
              <span>View on map</span>
              <i aria-hidden="true">→</i>
            </button>

            <button
              type="button"
              className="action-link-btn ask-link"
              onClick={handleAskOrca}
            >
              <span>Ask ORCA about this</span>
              <i aria-hidden="true">→</i>
            </button>

            <button
              type="button"
              className="toggle-read-btn"
              onClick={(e) => {
                e.stopPropagation()
                onToggleRead(alert.id, !isRead)
              }}
            >
              {isRead ? 'Mark as unread' : 'Mark as read'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
