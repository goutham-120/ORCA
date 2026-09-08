export default function AlertTimeline({ alerts }) {
  if (!alerts || alerts.length === 0) return null

  const recent = alerts.slice(0, 5)

  return (
    <div className="alert-timeline-widget panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">RECENT CHRONOLOGY</p>
          <h2>Alert Timeline</h2>
        </div>
      </div>

      <div className="timeline-list">
        {recent.map((item) => (
          <div key={item.id} className="timeline-item">
            <span className={`timeline-dot ${item.severity}`} />
            <div className="timeline-content">
              <time>{item.time}</time>
              <strong>{item.title}</strong>
              <small>{item.locationName} • {item.affectedArea}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
