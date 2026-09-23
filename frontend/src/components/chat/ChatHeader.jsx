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

const PERSONAS = [
  { id: 'fisherman', label: 'Fisherman', icon: '🎣', badge: 'PFZ & Safety' },
  { id: 'disaster', label: 'Disaster Authority', icon: '🚨', badge: 'Surge & Alert' },
  { id: 'scientist', label: 'Marine Scientist', icon: '🔬', badge: 'Telemetry & MHW' },
  { id: 'navigator', label: 'Vessel Navigator', icon: '🧭', badge: 'Waypoints & TSS' },
]

export default function ChatHeader({
  language,
  onLanguageChange,
  persona = 'fisherman',
  onPersonaChange,
  onClearSession,
  locationLabel,
  onToggleLocation,
  isLocationOpen,
  onOpenSimulator,
  onOpenSOS
}) {
  const [systemOnline, setSystemOnline] = useState(true)
  const [isLangOpen, setIsLangOpen] = useState(false)
  const [isPersonaOpen, setIsPersonaOpen] = useState(false)
  const langRef = useRef(null)
  const personaRef = useRef(null)

  const currentLang = LANGUAGE_OPTIONS.find((l) => l.value === language) || LANGUAGE_OPTIONS[0]
  const currentPersona = PERSONAS.find((p) => p.id === persona) || PERSONAS[0]

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

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setIsLangOpen(false)
      }
      if (personaRef.current && !personaRef.current.contains(e.target)) {
        setIsPersonaOpen(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsLangOpen(false)
        setIsPersonaOpen(false)
      }
    }

    if (isLangOpen || isPersonaOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isLangOpen, isPersonaOpen])

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
        {/* Stakeholder Persona Switcher */}
        <div className="language-dropdown-container font-inter" ref={personaRef}>
          <button
            type="button"
            className={`language-dropdown-trigger font-inter ${isPersonaOpen ? 'is-open' : ''}`}
            onClick={() => setIsPersonaOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={isPersonaOpen}
            title="Switch Stakeholder Persona"
            style={{ minWidth: '150px' }}
          >
            <span className="lang-icon">{currentPersona.icon}</span>
            <span className="current-lang-text">{currentPersona.label}</span>
            <svg
              className={`dropdown-chevron-svg ${isPersonaOpen ? 'rotated' : ''}`}
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

          {isPersonaOpen && (
            <ul className="custom-dropdown-menu font-inter" role="listbox">
              {PERSONAS.map((p) => {
                const isSelected = p.id === persona
                return (
                  <li key={p.id} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`dropdown-item font-inter ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => {
                        onPersonaChange?.(p.id)
                        setIsPersonaOpen(false)
                      }}
                    >
                      <span className="item-label">
                        {p.icon} {p.label} <small style={{ opacity: 0.65, fontSize: '0.75rem', display: 'block' }}>{p.badge}</small>
                      </span>
                      {isSelected && <span className="dropdown-checkmark">✓</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

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
