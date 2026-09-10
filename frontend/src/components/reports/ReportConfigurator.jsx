import { useState } from 'react'
import { dashboardLocations, standardReportTemplates } from '../../data/dashboardData'

const ZapIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)

export function ReportConfigurator({ initialTemplateId = 'daily', onGenerate, onClose }) {
  const [selectedTemplate, setSelectedTemplate] = useState(initialTemplateId)
  const [locationId, setLocationId] = useState('visakhapatnam')
  const [timePeriod, setTimePeriod] = useState('Last 24 hours')
  
  const allSections = [
    { id: 'summary', label: 'Executive Summary', icon: '📝' },
    { id: 'conditions', label: 'Sea State & Wave Dynamics', icon: '🌊' },
    { id: 'weather', label: 'Wind Vectors & SST', icon: '🌤️' },
    { id: 'safety', label: 'Safety Index Breakdown', icon: '🛡️' },
    { id: 'alerts', label: 'Active Marine Advisories', icon: '⚠️' },
    { id: 'trends', label: 'Historical Trend Charts', icon: '📈' },
    { id: 'recommendations', label: 'Operational Guidance', icon: '💡' }
  ]

  const currentTemplate = standardReportTemplates.find(t => t.id === selectedTemplate) || standardReportTemplates[0]

  const [selectedSections, setSelectedSections] = useState(
    currentTemplate.defaultSections || ['summary', 'conditions', 'weather', 'safety', 'alerts', 'recommendations']
  )

  const handleTemplateChange = (templateId) => {
    setSelectedTemplate(templateId)
    const tmpl = standardReportTemplates.find(t => t.id === templateId)
    if (tmpl) {
      setSelectedSections(tmpl.defaultSections)
    }
  }

  const toggleSection = (sectionId) => {
    if (selectedSections.includes(sectionId)) {
      if (selectedSections.length === 1) return // Keep at least one
      setSelectedSections(selectedSections.filter(s => s !== sectionId))
    } else {
      setSelectedSections([...selectedSections, sectionId])
    }
  }

  const handleGenerate = (e) => {
    e.preventDefault()
    onGenerate({
      typeId: selectedTemplate,
      locationId,
      timePeriod,
      customSections: selectedSections
    })
  }

  return (
    <div className="report-configurator-card">
      <div className="configurator-header">
        <div>
          <h3>⚙️ Custom Marine Report Generator</h3>
          <p>Configure spatial parameters, temporal scope, and reporting modules.</p>
        </div>
        {onClose && (
          <button type="button" className="orca-btn icon-only" onClick={onClose} aria-label="Close">
            ✕
          </button>
        )}
      </div>

      <form onSubmit={handleGenerate} className="configurator-form">
        <div className="config-grid">
          {/* Template Select */}
          <div className="config-field">
            <label htmlFor="template-select">Report Type Template</label>
            <select
              id="template-select"
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="orca-select"
            >
              {standardReportTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon} {t.title}
                </option>
              ))}
            </select>
          </div>

          {/* Location Select */}
          <div className="config-field">
            <label htmlFor="location-select">Target Coastal Region</label>
            <select
              id="location-select"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="orca-select"
            >
              {dashboardLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  📍 {loc.name} ({loc.region})
                </option>
              ))}
            </select>
          </div>

          {/* Time Period Select */}
          <div className="config-field">
            <label htmlFor="time-period-select">Analysis Scope</label>
            <select
              id="time-period-select"
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value)}
              className="orca-select"
            >
              <option value="Last 6 hours">Last 6 hours</option>
              <option value="Last 12 hours">Last 12 hours</option>
              <option value="Last 24 hours">Last 24 hours</option>
              <option value="Last 48 hours">Last 48 hours</option>
              <option value="Last 7 days">Last 7 days</option>
            </select>
          </div>
        </div>

        {/* Section Checkboxes */}
        <div className="sections-selection-group">
          <label>Included Report Sections ({selectedSections.length}/{allSections.length})</label>
          <div className="sections-grid">
            {allSections.map((sec) => {
              const isChecked = selectedSections.includes(sec.id)
              return (
                <div
                  key={sec.id}
                  className={`section-checkbox-tile ${isChecked ? 'active' : ''}`}
                  onClick={() => toggleSection(sec.id)}
                >
                  <input
                    type="checkbox"
                    id={`sec-${sec.id}`}
                    checked={isChecked}
                    onChange={() => {}} // Handled by div click
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="sec-tile-icon">{sec.icon}</span>
                  <span className="sec-tile-label">{sec.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="configurator-actions">
          <button type="submit" className="orca-btn primary shadow glow font-inter">
            <ZapIcon />
            <span>Generate Marine Report</span>
          </button>
        </div>
      </form>
    </div>
  )
}
