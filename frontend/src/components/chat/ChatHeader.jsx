import { useState, useEffect } from 'react'
import orcaLogo from '../../assets/orcologo.jpeg'

export default function ChatHeader({
  language,
  onLanguageChange,
  onClearSession,
  locationLabel,
  onToggleLocation,
  isLocationOpen
}) {
  const [systemOnline, setSystemOnline] = useState(true)

  useEffect(() => {
    const checkStatus = () => {
      setSystemOnline(navigator.onLine)
    }
    window.addEventListener('online', checkStatus)
    window.addEventListener('offline', checkStatus)
    return () => {
      window.removeEventListener('online', checkStatus)
      window.removeEventListener('offline', checkStatus)
    }
  }, [])

  return (
    <header className="ask-orca-header-bar font-inter">
      <div className="header-identity">
        <div className="orca-logo-badge">
          <img src={orcaLogo} alt="ORCA Logo" className="logo-img" />
          <span className="logo-pulse"></span>
        </div>
        <div className="header-titles">
          <div className="title-row">
            <h1 className="font-sora">ASK ORCA</h1>
            <span className="system-status-chip font-inter">
              <span className={`status-dot ${systemOnline ? 'online' : 'offline'}`}></span>
              {systemOnline ? 'ORCA Systems Online' : 'Offline Mode'}
            </span>
          </div>
          <p className="subtitle font-inter">
            Marine Intelligence Assistant • Evidence-Grounded Decision Support
          </p>
        </div>
      </div>

      <div className="header-actions font-inter">
        {/* Location Context Toggle Button */}
        <button
          type="button"
          className={`location-badge-btn font-inter ${isLocationOpen ? 'active' : ''}`}
          onClick={onToggleLocation}
          title="Toggle Location Context Panel"
        >
          <span className="icon">📍</span>
          <span className="label-text">{locationLabel || 'Select Location'}</span>
          <span className="chevron">{isLocationOpen ? '▲' : '▼'}</span>
        </button>

        {/* Language Selector */}
        <label className="language-selector-wrap font-inter" title="Select response language">
          <span className="lang-icon">🌐</span>
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="language-select font-inter"
            aria-label="Select AI language"
          >
            <option value="en">English (EN)</option>
            <option value="hi">हिन्दी (HI MVP)</option>
          </select>
        </label>

        {/* New Session Button */}
        <button
          type="button"
          className="header-action-btn clear-btn font-inter"
          onClick={onClearSession}
          title="Start new analysis session"
        >
          <span className="icon">↻</span>
          <span className="btn-label">New Session</span>
        </button>
      </div>
    </header>
  )
}
