export function ReportCard({ template, onSelect }) {
  return (
    <div className="report-template-card" onClick={() => onSelect(template.id)}>
      <div className="template-card-header">
        <div className="template-icon">{template.icon}</div>
        <span className="template-badge">{template.defaultSections.length} Sections</span>
      </div>
      <h3 className="template-title">{template.title}</h3>
      <p className="template-description">{template.description}</p>
      <div className="template-sections-preview">
        {template.defaultSections.map((sec) => (
          <span key={sec} className="section-tag">
            {sec}
          </span>
        ))}
      </div>
      <div className="template-card-footer">
        <button
          type="button"
          className="orca-btn secondary outline text-sm"
          onClick={(e) => {
            e.stopPropagation()
            onSelect(template.id)
          }}
        >
          Generate Report &rarr;
        </button>
      </div>
    </div>
  )
}
