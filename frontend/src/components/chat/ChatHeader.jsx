import { useState, useEffect, useRef } from 'react'
import orcaLogo from '../../assets/orcalogo.png'

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English (EN)' },
  { value: 'hi', label: 'हिन्दी (HI)' },
  { value: 'te', label: 'తెలుగు (TE)' },
  { value: 'ta', label: 'தமிழ் (TA)' },
  { value: 'ml', label: 'മലയാളം (ML)' },
  { value: 'kn', label: 'ಕನ್ನಡ (KN)' },
  { value: 'or', label: 'ଓଡ଼ିଆ (OR)' },
  { value: 'bn', label: 'বাংলা (BN)' },
  { value: 'kok', label: 'कोंकणी (KOK)' },
  { value: 'tcy', label: 'ತುಳು (TCY)' },
  { value: 'gu', label: 'ગુજરાતી (GU)' },
  { value: 'mr', label: 'मराठी (MR)' },
]

export default function ChatHeader({
  language,
  onLanguageChange,
  onClearSession,
  locationLabel,
  onToggleLocation,
  isLocationOpen,
  onOpenSOS,
  onOpenNavIC,
}) {
  const [systemOnline, setSystemOnline] = useState(true)
  const [isLangOpen, setIsLangOpen] = useState(false)
  const langRef = useRef(null)

  const currentLang = LANGUAGE_OPTIONS.find((l) => l.value === language) || LANGUAGE_OPTIONS[0]

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

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setIsLangOpen(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsLangOpen(false)
      }
    }

    if (isLangOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isLangOpen])

  return (
    <header className="ask-orca-header-bar font-inter">
      <div className="header-identity">
        <div className="orca-logo-badge">
          <img src={orcaLogo} alt="ORCA Logo" className="logo-img" />
        </div>
        <div className="header-titles">
          <div className="title-row">
            <h1 className="font-sora">ASK ORCA</h1>
            {/* Adaptive Systems / NavIC Satellite Connectivity Badge */}
            <button
              type="button"
              className={`system-status-chip font-inter ${systemOnline ? 'is-online' : 'is-offline-navic'}`}
              onClick={onOpenNavIC}
              title={
                systemOnline
                  ? 'Systems Online (Internet / Terrestrial) • Click for ISRO NavIC Satellite Diagnostics'
                  : '⚠️ Offline Mode: ISRO NavIC Satellite Transceiver Active • Click to Inspect'
              }
            >
              <span className={`status-dot ${systemOnline ? 'online' : 'offline-navic-pulse'}`}></span>
              {systemOnline ? (
                <span className="status-text">
                  Systems Online <span className="navic-sat-subtext">🛰️ NavIC</span>
                </span>
              ) : (
                <span className="status-text navic-highlight">
                  🛰️ NavIC Sat Mode (Active)
                </span>
              )}
            </button>
          </div>
          <p className="subtitle font-inter">
            Marine Operations Assistant & Decision Support
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

        {/* Multilingual Dropdown (12 Coastal & Regional Languages) */}
        <div className="language-dropdown-container font-inter" ref={langRef}>
          <button
            type="button"
            className={`language-dropdown-trigger font-inter ${isLangOpen ? 'is-open' : ''}`}
            onClick={() => setIsLangOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={isLangOpen}
            title="Select response language"
          >
            <span className="lang-icon">🌐</span>
            <span className="current-lang-text">{currentLang.label}</span>
            <svg
              className={`dropdown-chevron-svg ${isLangOpen ? 'rotated' : ''}`}
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {isLangOpen && (
            <ul
              className="custom-dropdown-menu font-inter"
              role="listbox"
              aria-label="Select response language"
            >
              {LANGUAGE_OPTIONS.map((option) => {
                const isSelected = option.value === language
                return (
                  <li key={option.value} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`dropdown-item font-inter ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => {
                        onLanguageChange(option.value)
                        setIsLangOpen(false)
                      }}
                    >
                      <span className="item-label">{option.label}</span>
                      {isSelected && (
                        <span className="dropdown-checkmark" aria-hidden="true">
                          ✓
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Emergency SOS Button */}
        {onOpenSOS && (
          <button
            type="button"
            className="header-action-btn sos-trigger-btn font-inter"
            onClick={onOpenSOS}
            title="Emergency SOS Distress Broadcast (VHF Ch 16)"
            style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
              color: '#fff',
              border: 'none',
              fontWeight: 700
            }}
          >
            <span className="icon">🆘</span>
            <span className="btn-label">SOS VHF 16</span>
          </button>
        )}

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
