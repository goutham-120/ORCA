import { useState } from 'react'
import { standardReportTemplates, generateReportData } from '../data/dashboardData'
import { ReportCard } from '../components/reports/ReportCard'
import { ReportConfigurator } from '../components/reports/ReportConfigurator'
import { GeneratedReport } from '../components/reports/GeneratedReport'
import { SavedReports } from '../components/reports/SavedReports'

export function Reports({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('templates') // 'templates' | 'custom' | 'saved'
  const [selectedTemplateId, setSelectedTemplateId] = useState('daily')
  const [activeReport, setActiveReport] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState('')
  const [savedReports, setSavedReports] = useState(() => {
    try {
      const stored = localStorage.getItem('orca-saved-reports')
      return stored ? JSON.parse(stored) : []
    } catch (e) {
      console.error('Failed to load saved reports from localStorage:', e)
      return []
    }
  })

  // Persist saved reports to localStorage
  const saveReportToStorage = (newReport) => {
    const updated = [newReport, ...savedReports.filter(r => r.id !== newReport.id)]
    setSavedReports(updated)
    try {
      localStorage.setItem('orca-saved-reports', JSON.stringify(updated))
    } catch (e) {
      console.error('Failed to save report to localStorage:', e)
    }
  }

  const deleteReportFromStorage = (reportId) => {
    const updated = savedReports.filter(r => r.id !== reportId)
    setSavedReports(updated)
    try {
      localStorage.setItem('orca-saved-reports', JSON.stringify(updated))
    } catch (e) {
      console.error('Failed to update localStorage:', e)
    }
  }

  const clearAllSavedReports = () => {
    if (window.confirm('Are you sure you want to clear all saved marine reports?')) {
      setSavedReports([])
      try {
        localStorage.removeItem('orca-saved-reports')
      } catch (e) {
        console.error('Failed to clear localStorage:', e)
      }
    }
  }

  const handleStartGeneration = ({ typeId = 'daily', locationId = 'visakhapatnam', timePeriod = 'Last 24 hours', customSections = null }) => {
    setIsGenerating(true)
    setGenerationStep('Synthesizing coastal oceanographic telemetry...')

    setTimeout(() => {
      setGenerationStep('Computing safety indices & wave vector models...')
    }, 400)

    setTimeout(() => {
      setGenerationStep('Formatting executive advisories & visual trend graphs...')
    }, 800)

    setTimeout(() => {
      const data = generateReportData(typeId, locationId, timePeriod, customSections)
      setActiveReport(data)
      setIsGenerating(false)
      setActiveTab('view')
    }, 1200)
  }

  const handleSelectTemplate = (templateId) => {
    setSelectedTemplateId(templateId)
    handleStartGeneration({ typeId: templateId, locationId: 'visakhapatnam', timePeriod: 'Last 24 hours' })
  }

  return (
    <div className="reports-page-wrapper page-container">
      {/* Top Banner */}
      <div className="page-header-bar">
        <div className="header-left">
          <h1 className="page-title font-sans">📄 Marine Reports & Analysis Workspace</h1>
          <p className="page-subtitle font-sans">
            Generate, customize, export, and persist comprehensive coastal safety & meteorological report documents.
          </p>
        </div>
        <div className="header-stats-row">
          <div className="header-stat-pill">
            <span className="stat-num">6</span>
            <span className="stat-lbl">Templates</span>
          </div>
          <div className="header-stat-pill">
            <span className="stat-num">{savedReports.length}</span>
            <span className="stat-lbl">Saved</span>
          </div>
          {activeReport && (
            <button
              type="button"
              className="orca-btn secondary outline text-sm"
              onClick={() => setActiveTab('view')}
            >
              📄 Return to Current Document
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="reports-tab-nav no-print">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          📋 Standard Templates
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'custom' ? 'active' : ''}`}
          onClick={() => setActiveTab('custom')}
        >
          ⚙️ Custom Report Builder
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
          onClick={() => setActiveTab('saved')}
        >
          📁 Saved Reports Workspace ({savedReports.length})
        </button>
        {activeReport && (
          <button
            type="button"
            className={`tab-btn ${activeTab === 'view' ? 'active' : ''}`}
            onClick={() => setActiveTab('view')}
          >
            📊 Active Document: {activeReport.typeTitle}
          </button>
        )}
      </div>

      {/* Progress Overlay when generating */}
      {isGenerating && (
        <div className="generating-overlay">
          <div className="generating-card">
            <div className="orca-spinner"></div>
            <h3>Generating Marine Intelligence Report</h3>
            <p className="step-text">{generationStep}</p>
            <div className="generation-progress-bar">
              <div className="bar-fill"></div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Contents */}
      {!isGenerating && (
        <div className="reports-tab-content font-sans">
          {/* TAB 1: Standard Templates */}
          {activeTab === 'templates' && (
            <div className="templates-tab-pane">
              <div className="pane-intro font-sans">
                <h3>Select a Standard Marine Template</h3>
                <p>Choose an automated report workflow optimized for daily harbor briefings, route clearance, or hazard warnings.</p>
              </div>

              <div className="report-templates-grid">
                {standardReportTemplates.map((template) => (
                  <ReportCard
                    key={template.id}
                    template={template}
                    onSelect={handleSelectTemplate}
                  />
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Custom Builder */}
          {activeTab === 'custom' && (
            <div className="custom-tab-pane">
              <ReportConfigurator
                initialTemplateId={selectedTemplateId}
                onGenerate={handleStartGeneration}
              />
            </div>
          )}

          {/* TAB 3: Saved Reports */}
          {activeTab === 'saved' && (
            <div className="saved-tab-pane">
              <SavedReports
                savedReports={savedReports}
                onViewReport={(rep) => {
                  setActiveReport(rep)
                  setActiveTab('view')
                }}
                onDeleteReport={deleteReportFromStorage}
                onClearAll={clearAllSavedReports}
              />
            </div>
          )}

          {/* TAB 4: Active Generated Document View */}
          {activeTab === 'view' && activeReport && (
            <div className="view-tab-pane">
              <GeneratedReport
                report={activeReport}
                onSave={saveReportToStorage}
                onNavigate={onNavigate}
                isSaved={savedReports.some((r) => r.id === activeReport.id)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
