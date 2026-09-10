const TemplateIconMap = {
  daily: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22B9F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  ),
  weather: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22B9F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </svg>
  ),
  route: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22B9F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="3" />
      <line x1="12" y1="8" x2="12" y2="21" />
      <line x1="5" y1="12" x2="19" y2="12" />
      <path d="M5 12a7 7 0 0 0 14 0" />
    </svg>
  ),
  hazard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c84550" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  fishing: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22B9F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 12c.94-2.07 3.08-3.5 5.5-3.5 3.59 0 6.5 2.91 6.5 6.5 0 2.42-1.43 4.56-3.5 5.5" />
      <path d="M18 12c.4 0 .8.05 1.2.14A6 6 0 0 1 21 17.5" />
      <path d="M2 16s3-1 5-1 5 1 5 1" />
      <circle cx="15" cy="12" r="1" fill="#22B9F2" />
    </svg>
  ),
  conditions: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22B9F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    </svg>
  )
}

export function ReportCard({ template, onSelect }) {
  const iconSvg = TemplateIconMap[template.id] || TemplateIconMap.daily

  return (
    <div className="report-template-card font-inter" onClick={() => onSelect(template.id)}>
      <div className="template-card-body">
        <div className="template-card-header font-inter">
          <div className="template-icon-badge">{iconSvg}</div>
          <span className="template-badge font-inter">{template.defaultSections.length} SECTIONS</span>
        </div>
        <h3 className="template-title font-sora">{template.title}</h3>
        <p className="template-description font-inter">{template.description}</p>
        <div className="template-sections-preview font-inter">
          {template.defaultSections.map((sec) => (
            <span key={sec} className="section-tag font-inter">
              {sec}
            </span>
          ))}
        </div>
      </div>
      <div className="template-card-footer font-inter">
        <button
          type="button"
          className="generate-report-btn font-inter"
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
