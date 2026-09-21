import { useState, useEffect, useRef } from 'react'
import orcaLogo from '../../assets/orcalogo.png'

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English (EN)' },
  { value: 'hi', label: 'हिन्दी (HI)' },
  { value: 'te', label: 'తెలుగు (TE)' },
  { value: 'ta', label: 'தமிழ் (TA)' },
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
  onOpenSimulator
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

  // Close dropdown on click outside or Escape
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

        {/* Clean & Natural Custom Language Dropdown (10 Indic & Regional Languages) */}
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

        {/* Scenario Simulator Button */}
        {onOpenSimulator && (
          <button
            type="button"
            className="header-action-btn simulator-trigger-btn font-inter"
            onClick={onOpenSimulator}
            title="Launch What-If Marine Scenario Simulator"
          >
            <span className="icon">🧪</span>
            <span className="btn-label">Scenario Simulator</span>
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
