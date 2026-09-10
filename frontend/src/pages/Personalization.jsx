import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'

const ROLE_CATEGORIES = [
  { value: 'fisher_marine_operator', name: 'Fisher / Marine Operator', label: 'Marine Operator', icon: '⚓', sub: 'Safer fishing, PFZs, route guidance' },
  { value: 'researcher_scientist', name: 'Researcher / Scientist', label: 'Researcher', icon: '🔬', sub: 'Marine observation, data study, trends' },
  { value: 'coastal_authority', name: 'Coastal Authority', label: 'Coastal Authority', icon: '🚨', sub: 'Monitoring, risk assessment, incident reports' },
  { value: 'general_user', name: 'General User', label: 'General User', icon: '📍', sub: 'Explore coastal conditions & saved spots' },
]

const ACTIVITY_SUITABILITY_MAP = {
  beach: {
    id: 'beach',
    label: 'Beach Visit',
    icon: '🏖️',
    seaCondition: '1.1 m Wave Height (Calm & Stable)',
    windCondition: '12 km/h (Light Sea Breeze)',
    visibility: 'Excellent, 11 km',
    safetyStatus: 'Favorable (Score 86/100)',
    statusTone: 'good',
  },
  fishing: {
    id: 'fishing',
    label: 'Fishing',
    icon: '🎣',
    seaCondition: '1.1 m Low Swell (Moderate Shelf Drift)',
    windCondition: '12 km/h (ESE direction)',
    visibility: 'Excellent, 11 km',
    safetyStatus: 'Favorable for Nearshore Fishing',
    statusTone: 'good',
  },
  boating: {
    id: 'boating',
    label: 'Boating',
    icon: '🚤',
    seaCondition: '1.1 m Smooth Waters',
    windCondition: '12 km/h Gentle Breeze (Safe Passage)',
    visibility: 'Excellent, 11 km',
    safetyStatus: 'Favorable (Safe for Small Craft)',
    statusTone: 'good',
  },
  swimming: {
    id: 'swimming',
    label: 'Swimming',
    icon: '🏊',
    seaCondition: '1.1 m Waves (Low Swell)',
    windCondition: '12 km/h Light Sea Breeze',
    visibility: 'Excellent, 11 km',
    safetyStatus: 'Favorable with Caution (Observe Lifeguard Flags)',
    statusTone: 'warning',
  },
  sightseeing: {
    id: 'sightseeing',
    label: 'Sightseeing',
    icon: '📸',
    seaCondition: '1.1 m Clear Water Line',
    windCondition: '12 km/h Pleasant Breeze',
    visibility: 'Excellent, 11 km (High Visibility)',
    safetyStatus: 'Highly Favorable (Ideal Sunset & Coastal Views)',
    statusTone: 'good',
  },
}

export default function Personalization({ navigate }) {
  const { user, updateProfile } = useAuth()
  const userKey = user?.email || user?.id || 'default'

  const [selectedRole, setSelectedRole] = useState(() => user?.user_category || 'fisher_marine_operator')
  const [savingRole, setSavingRole] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Helper functions for user-specific persistent storage
  const loadUserData = (key, fallback) => {
    try {
      const val = localStorage.getItem(`${key}_${userKey}`) || localStorage.getItem(key)
      return val ? JSON.parse(val) : fallback
    } catch {
      return fallback
    }
  }

  const saveUserData = (key, value) => {
    try {
      const jsonStr = JSON.stringify(value)
      localStorage.setItem(`${key}_${userKey}`, jsonStr)
      localStorage.setItem(key, jsonStr)
    } catch (e) {
      console.error('Failed to save to localStorage', e)
    }
  }

  // 1. FISHER / MARINE OPERATOR STATE
  const [fieldReport, setFieldReport] = useState({
    category: 'Sea Condition',
    description: '',
    location: '',
    photoName: '',
  })
  const [fieldPhotoPreview, setFieldPhotoPreview] = useState(null)
  const [savedFieldReports, setSavedFieldReports] = useState(() => loadUserData('orca_field_reports', []))

  // 2. RESEARCHER / SCIENTIST STATE
  const [observation, setObservation] = useState({
    title: '',
    parameter: 'SST',
    note: '',
    location: '',
  })
  const [savedObservations, setSavedObservations] = useState(() => loadUserData('orca_research_observations', []))

  // 3. COASTAL AUTHORITY STATE
  const [incident, setIncident] = useState({
    type: 'Coastal Flooding',
    description: '',
    location: '',
    photoName: '',
  })
  const [incidentPhotoPreview, setIncidentPhotoPreview] = useState(null)
  const [savedIncidents, setSavedIncidents] = useState(() => loadUserData('orca_incident_reports', []))

  // 4. GENERAL USER STATE
  const [selectedActivity, setSelectedActivity] = useState(() => {
    return localStorage.getItem(`orca_user_activity_${userKey}`) || localStorage.getItem('orca_user_activity') || 'beach'
  })
  const [preferredSpot, setPreferredSpot] = useState(() => {
    return localStorage.getItem(`orca_preferred_spot_${userKey}`) || localStorage.getItem('orca_preferred_spot') || 'Chennai, Tamil Nadu'
  })
  const [spotInput, setSpotInput] = useState(preferredSpot)
  const [savedSpots, setSavedSpots] = useState(() => loadUserData('orca_saved_spots', ['Chennai, Tamil Nadu', 'Visakhapatnam, AP']))

  const currentTimeStr = new Date().toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  // Synchronize user data whenever user logs in or changes
  useEffect(() => {
    if (user) {
      queueMicrotask(() => {
        if (user.user_category && user.user_category !== selectedRole) {
          setSelectedRole(user.user_category)
        }
        setSavedFieldReports(loadUserData('orca_field_reports', []))
        setSavedObservations(loadUserData('orca_research_observations', []))
        setSavedIncidents(loadUserData('orca_incident_reports', []))
        
        const spot = localStorage.getItem(`orca_preferred_spot_${userKey}`) || localStorage.getItem('orca_preferred_spot') || 'Chennai, Tamil Nadu'
        setPreferredSpot(spot)
        setSpotInput(spot)

        const act = localStorage.getItem(`orca_user_activity_${userKey}`) || localStorage.getItem('orca_user_activity') || 'beach'
        setSelectedActivity(act)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userKey, user?.user_category])

  const changeRoleCategory = async (newRole) => {
    setSelectedRole(newRole)
    setSavingRole(true)
    try {
      if (updateProfile) {
        await updateProfile({ user_category: newRole })
      }
    } catch (err) {
      console.error('Failed to update role category', err)
    } finally {
      setSavingRole(false)
    }
  }

  const handleSelectActivity = (actId) => {
    setSelectedActivity(actId)
    localStorage.setItem(`orca_user_activity_${userKey}`, actId)
    localStorage.setItem('orca_user_activity', actId)
  }

  // Geolocation helper
  const acquireLocation = (setter) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const locString = `${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E`
          setter((prev) => ({ ...prev, location: locString }))
        },
        () => {
          setter((prev) => ({ ...prev, location: 'Coastal Zone (13.0827° N, 80.2707° E)' }))
        }
      )
    } else {
      setter((prev) => ({ ...prev, location: 'Coastal Zone (13.0827° N, 80.2707° E)' }))
    }
  }

  // Photo Handler
  const handlePhotoSelect = (e, setter, setPreview) => {
    const file = e.target.files?.[0]
    if (file) {
      setter((prev) => ({ ...prev, photoName: file.name }))
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // 1. Save Ocean Field Report
  const handleSaveFieldReport = (e) => {
    e.preventDefault()
    const newEntry = {
      ...fieldReport,
      photoPreview: fieldPhotoPreview,
      timestamp: currentTimeStr,
      id: Date.now(),
    }
    const updated = [newEntry, ...savedFieldReports]
    setSavedFieldReports(updated)
    saveUserData('orca_field_reports', updated)
    
    // Reset form
    setFieldReport({ category: 'Sea Condition', description: '', location: '', photoName: '' })
    setFieldPhotoPreview(null)

    setToastMessage('📷 Ocean Field Report submitted & stored in workspace history!')
    setTimeout(() => setToastMessage(''), 4500)
  }

  const handleDeleteFieldReport = (id) => {
    const updated = savedFieldReports.filter((item) => item.id !== id)
    setSavedFieldReports(updated)
    saveUserData('orca_field_reports', updated)
  }

  // 2. Save Research Observation
  const handleSaveObservation = (e) => {
    e.preventDefault()
    if (!observation.title.trim()) return
    const newEntry = {
      ...observation,
      timestamp: currentTimeStr,
      id: Date.now(),
    }
    const updated = [newEntry, ...savedObservations]
    setSavedObservations(updated)
    saveUserData('orca_research_observations', updated)

    // Reset form
    setObservation({ title: '', parameter: 'SST', note: '', location: '' })

    setToastMessage('🔬 Research Observation submitted & saved to observation log!')
    setTimeout(() => setToastMessage(''), 4500)
  }

  const handleDeleteObservation = (id) => {
    const updated = savedObservations.filter((item) => item.id !== id)
    setSavedObservations(updated)
    saveUserData('orca_research_observations', updated)
  }

  // 3. Submit Coastal Incident Report
  const handleSubmitIncident = (e) => {
    e.preventDefault()
    const newEntry = {
      ...incident,
      photoPreview: incidentPhotoPreview,
      timestamp: currentTimeStr,
      id: Date.now(),
    }
    const updated = [newEntry, ...savedIncidents]
    setSavedIncidents(updated)
    saveUserData('orca_incident_reports', updated)

    // Reset form
    setIncident({ type: 'Coastal Flooding', description: '', location: '', photoName: '' })
    setIncidentPhotoPreview(null)

    setToastMessage('🚨 Coastal Incident Report submitted & stored in incident logs!')
    setTimeout(() => setToastMessage(''), 4500)
  }

  const handleDeleteIncident = (id) => {
    const updated = savedIncidents.filter((item) => item.id !== id)
    setSavedIncidents(updated)
    saveUserData('orca_incident_reports', updated)
  }

  // 4. Save Preferred Spot
  const handleSaveSpot = (e) => {
    e.preventDefault()
    if (!spotInput.trim()) return
    const val = spotInput.trim()
    localStorage.setItem(`orca_preferred_spot_${userKey}`, val)
    localStorage.setItem('orca_preferred_spot', val)
    setPreferredSpot(val)

    if (!savedSpots.includes(val)) {
      const updatedSpots = [val, ...savedSpots]
      setSavedSpots(updatedSpots)
      saveUserData('orca_saved_spots', updatedSpots)
    }

    setToastMessage(`📍 Preferred coastal spot saved to "${val}"!`)
    setTimeout(() => setToastMessage(''), 4500)
  }

  const name = user?.display_name || user?.email?.split('@')[0] || 'Explorer'
  const activeRoleObj = ROLE_CATEGORIES.find((r) => r.value === selectedRole) || ROLE_CATEGORIES[0]
  const suitabilityInfo = ACTIVITY_SUITABILITY_MAP[selectedActivity] || ACTIVITY_SUITABILITY_MAP.beach

  return (
    <div className="font-sans" style={{ maxWidth: 920, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* PAGE HEADER PANEL */}
      <div className="panel font-sans" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span className="eyebrow font-mono" style={{ fontSize: 11, letterSpacing: 1 }}>WORKSPACE PERSONALIZATION</span>
          <h1 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700, color: 'var(--ink)', fontFamily: 'Sora, sans-serif' }}>
            Welcome, {name}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
            Configured for <strong>{activeRoleObj.name}</strong> • {activeRoleObj.sub}
          </p>
        </div>

        <button
          type="button"
          className="primary-button font-inter"
          style={{
            width: 'auto',
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #1077ca 0%, #0d4163 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            boxShadow: '0 2px 10px rgba(16, 119, 202, 0.3)',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/dashboard')}
        >
          Proceed to Dashboard →
        </button>
      </div>

      {/* ROLE CATEGORY SWITCHER BAR */}
      <div className="panel font-sans" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, background: '#ffffff', borderRadius: 10, border: '1px solid #dce7f0' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', letterSpacing: 0.8, textTransform: 'uppercase' }}>
          ROLE PROFILE WORKSPACE:
        </span>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {ROLE_CATEGORIES.map((cat) => {
            const isActive = selectedRole === cat.value
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => changeRoleCategory(cat.value)}
                disabled={savingRole}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  border: isActive ? '1px solid #0284c7' : '1px solid #cbd5e1',
                  background: isActive ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : '#f8fafc',
                  color: isActive ? '#ffffff' : '#334155',
                  boxShadow: isActive ? '0 3px 10px rgba(2, 132, 199, 0.3)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>{cat.icon}</span> {cat.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* TOAST SUCCESS BANNER */}
      {toastMessage && (
        <div style={{ padding: '14px 20px', borderRadius: 8, background: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(3, 105, 161, 0.1)' }}>
          <span>{toastMessage}</span>
          <small style={{ fontSize: 11, background: '#0284c7', color: '#ffffff', padding: '3px 10px', borderRadius: 6, fontWeight: 700, letterSpacing: 0.5 }}>SAVED IN WORKSPACE</small>
        </div>
      )}

      {/* ======================================================================
          1. FISHER / MARINE OPERATOR WORKSPACE
         ====================================================================== */}
      {selectedRole === 'fisher_marine_operator' && (
        <div className="panel font-sans" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <span className="eyebrow font-mono" style={{ color: '#0284c7', fontWeight: 700 }}>MARINE & FISHING OPERATIONS</span>
            <h2 style={{ margin: '4px 0 0', fontSize: 20, color: 'var(--ink)', fontFamily: 'Sora, sans-serif' }}>
              Marine Operator Dashboard Workspace
            </h2>
            <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13 }}>
              Log ocean field conditions and access specialized marine operations tools.
            </p>
          </div>

          {/* FORM */}
          <div style={{ background: '#f8fcff', border: '1px solid #d8e9f5', borderRadius: 12, padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 22 }}>📷</span>
              <h3 style={{ margin: 0, fontSize: 16, color: 'var(--ink)', fontFamily: 'Sora, sans-serif' }}>
                Submit Ocean Field Report
              </h3>
            </div>

            <form onSubmit={handleSaveFieldReport} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
                  Report Category
                </label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {['Sea Condition', 'Fishing Activity', 'Pollution', 'Other'].map((cat) => {
                    const isChecked = fieldReport.category === cat
                    return (
                      <label
                        key={cat}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: '8px 14px',
                          background: isChecked ? '#e0f2fe' : '#ffffff',
                          color: isChecked ? '#0369a1' : '#334155',
                          border: isChecked ? '1px solid #0284c7' : '1px solid #cbd5e1',
                          borderRadius: 8,
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <input
                          type="radio"
                          name="field-cat"
                          value={cat}
                          checked={isChecked}
                          onChange={(e) => setFieldReport({ ...fieldReport, category: e.target.value })}
                          style={{ accentColor: '#0284c7' }}
                        />
                        {cat}
                      </label>
                    )
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                  Upload / Take Photo Evidence
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '9px 16px',
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      color: '#ffffff',
                      fontSize: 13,
                      fontWeight: 600,
                      borderRadius: 8,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                    }}
                  >
                    <span>📷 Upload Photo Evidence</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoSelect(e, setFieldReport, setFieldPhotoPreview)}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {fieldReport.photoName && (
                    <span style={{ fontSize: 12, color: '#0369a1', fontWeight: 600 }}>
                      ✓ {fieldReport.photoName}
                    </span>
                  )}
                </div>
                {fieldPhotoPreview && (
                  <div style={{ marginTop: 12, width: 140, height: 100, borderRadius: 8, overflow: 'hidden', border: '2px solid #0284c7', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <img src={fieldPhotoPreview} alt="Field preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                  Short Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe sea conditions, wave activity, or vessel observations..."
                  value={fieldReport.description}
                  onChange={(e) => setFieldReport({ ...fieldReport, description: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'Inter, sans-serif' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, background: '#fff', padding: '12px 16px', borderRadius: 8, border: '1px solid #dce7f0' }}>
                <div>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>TIMESTAMP & LOCATION</span>
                  <span style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 600 }}>{currentTimeStr}</span>
                  {fieldReport.location && <span style={{ display: 'block', fontSize: 11, color: '#0284c7', fontWeight: 700 }}>📍 {fieldReport.location}</span>}
                </div>
                <button
                  type="button"
                  onClick={() => acquireLocation(setFieldReport)}
                  style={{
                    padding: '8px 14px',
                    fontSize: 12,
                    background: '#e0f2fe',
                    border: '1px solid #7dd3fc',
                    color: '#0369a1',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 700,
                    transition: 'all 0.2s ease',
                  }}
                >
                  📍 Use Current GPS Location
                </button>
              </div>

              <button
                type="submit"
                className="primary-button font-inter"
                style={{
                  width: '100%',
                  marginTop: 4,
                  padding: '12px',
                  fontSize: 14,
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  boxShadow: '0 3px 10px rgba(2, 132, 199, 0.3)',
                  cursor: 'pointer',
                }}
              >
                Submit & Save Field Report
              </button>
            </form>
          </div>

          {/* SUBMITTED REPORTS LIST */}
          <div style={{ background: '#fff', border: '1px solid #dce7f0', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--ink)', fontFamily: 'Sora, sans-serif' }}>
                📋 Submitted Ocean Field Reports ({savedFieldReports.length})
              </h3>
              <span style={{ fontSize: 11, color: '#0284c7', fontWeight: 700, background: '#e0f2fe', padding: '3px 8px', borderRadius: 4 }}>STORAGE: local workspace log ({userKey})</span>
            </div>

            {savedFieldReports.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>
                No submitted field reports yet. Fill out the form above to submit your first report.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {savedFieldReports.map((item) => (
                  <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, background: '#f8fafc', display: 'flex', gap: 14, alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 12, flex: 1 }}>
                      {item.photoPreview && (
                        <img src={item.photoPreview} alt="Report proof" style={{ width: 70, height: 70, borderRadius: 6, objectFit: 'cover', border: '1px solid #cbd5e1' }} />
                      )}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: '#e0f2fe', color: '#0369a1' }}>
                            {item.category}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{item.timestamp}</span>
                        </div>
                        {item.description && <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink)' }}>{item.description}</p>}
                        {item.location && <small style={{ display: 'block', margin: '4px 0 0', fontSize: 11, color: '#0284c7', fontWeight: 600 }}>📍 {item.location}</small>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteFieldReport(item.id)}
                      style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                      title="Delete report entry"
                    >
                      ✕ Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================================
          2. RESEARCHER / SCIENTIST WORKSPACE
         ====================================================================== */}
      {selectedRole === 'researcher_scientist' && (
        <div className="panel font-sans" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <span className="eyebrow font-mono" style={{ color: '#0284c7', fontWeight: 700 }}>OBSERVATION & RESEARCH</span>
            <h2 style={{ margin: '4px 0 0', fontSize: 20, color: 'var(--ink)', fontFamily: 'Sora, sans-serif' }}>
              Researcher Observation Workspace
            </h2>
            <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13 }}>
              Record oceanographic observations, telemetric context, and parameters.
            </p>
          </div>

          {/* FORM */}
          <div style={{ background: '#f9fcfe', border: '1px solid #d5e7f2', borderRadius: 12, padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 22 }}>🔬</span>
              <h3 style={{ margin: 0, fontSize: 16, color: 'var(--ink)', fontFamily: 'Sora, sans-serif' }}>
                Log Research Observation
              </h3>
            </div>

            <form onSubmit={handleSaveObservation} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                  Observation Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Sea surface temperature anomaly off coastal shelf"
                  value={observation.title}
                  onChange={(e) => setObservation({ ...observation, title: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'Inter, sans-serif' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                  Target Parameter
                </label>
                <select
                  value={observation.parameter}
                  onChange={(e) => setObservation({ ...observation, parameter: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600, color: 'var(--ink)', background: '#fff' }}
                >
                  <option value="SST">Sea Surface Temperature (SST)</option>
                  <option value="Waves">Wave Height & Swell Period</option>
                  <option value="Currents">Coastal Drift & Currents</option>
                  <option value="Other">Other Oceanographic Parameter</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                  Observation Notes & Context
                </label>
                <textarea
                  rows={3}
                  placeholder="Record notes, sensors used, or physical observations..."
                  value={observation.note}
                  onChange={(e) => setObservation({ ...observation, note: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'Inter, sans-serif' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, background: '#fff', padding: '12px 16px', borderRadius: 8, border: '1px solid #dce7f0' }}>
                <div>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>RECORD TIMESTAMP</span>
                  <span style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 600 }}>{currentTimeStr}</span>
                  {observation.location && <span style={{ display: 'block', fontSize: 11, color: '#0284c7', fontWeight: 700 }}>📍 {observation.location}</span>}
                </div>
                <button
                  type="button"
                  onClick={() => acquireLocation(setObservation)}
                  style={{
                    padding: '8px 14px',
                    fontSize: 12,
                    background: '#e0f2fe',
                    border: '1px solid #7dd3fc',
                    color: '#0369a1',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  📍 Tag GPS Location
                </button>
              </div>

              <button
                type="submit"
                className="primary-button font-inter"
                style={{
                  width: '100%',
                  marginTop: 4,
                  padding: '12px',
                  fontSize: 14,
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  boxShadow: '0 3px 10px rgba(2, 132, 199, 0.3)',
                  cursor: 'pointer',
                }}
              >
                Submit & Log Observation
              </button>
            </form>
          </div>

          {/* SUBMITTED OBSERVATIONS LIST */}
          <div style={{ background: '#fff', border: '1px solid #dce7f0', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--ink)', fontFamily: 'Sora, sans-serif' }}>
                🔬 Saved Research Observations ({savedObservations.length})
              </h3>
              <span style={{ fontSize: 11, color: '#0284c7', fontWeight: 700, background: '#e0f2fe', padding: '3px 8px', borderRadius: 4 }}>STORAGE: local observation log ({userKey})</span>
            </div>

            {savedObservations.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>
                No research observations logged yet. Fill out the form above to submit your first entry.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {savedObservations.map((item) => (
                  <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, background: '#f8fafc', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: '#e0f2fe', color: '#0369a1' }}>
                          PARAMETER: {item.parameter}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{item.timestamp}</span>
                      </div>
                      <h4 style={{ margin: '6px 0 2px', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{item.title}</h4>
                      {item.note && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>{item.note}</p>}
                      {item.location && <small style={{ display: 'block', margin: '4px 0 0', fontSize: 11, color: '#0284c7', fontWeight: 600 }}>📍 {item.location}</small>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteObservation(item.id)}
                      style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                      title="Delete observation entry"
                    >
                      ✕ Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================================
          3. COASTAL AUTHORITY WORKSPACE
         ====================================================================== */}
      {selectedRole === 'coastal_authority' && (
        <div className="panel font-sans" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <span className="eyebrow font-mono" style={{ color: '#dc2626', fontWeight: 700 }}>MONITORING & INCIDENT RESPONSE</span>
            <h2 style={{ margin: '4px 0 0', fontSize: 20, color: 'var(--ink)', fontFamily: 'Sora, sans-serif' }}>
              Coastal Authority Monitoring Workspace
            </h2>
            <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13 }}>
              File coastal incident reports, hazard logs, and emergency notices.
            </p>
          </div>

          {/* FORM */}
          <div style={{ background: '#fffcfb', border: '1px solid #f2dfde', borderRadius: 12, padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 22 }}>🚨</span>
              <h3 style={{ margin: 0, fontSize: 16, color: 'var(--ink)', fontFamily: 'Sora, sans-serif' }}>
                Submit Coastal Incident Report
              </h3>
            </div>

            <form onSubmit={handleSubmitIncident} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                  Incident Type
                </label>
                <select
                  value={incident.type}
                  onChange={(e) => setIncident({ ...incident, type: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600, color: 'var(--ink)', background: '#fff' }}
                >
                  <option value="Coastal Flooding">Coastal Flooding / Storm Surge</option>
                  <option value="Pollution / Oil Spill">Pollution / Marine Oil Spill</option>
                  <option value="Vessel Incident">Vessel Distress / Collision Risk</option>
                  <option value="Infrastructure Damage">Port / Harbor Infrastructure Damage</option>
                  <option value="Dangerous Sea Conditions">Dangerous Rough Sea Conditions</option>
                  <option value="Other">Other Coastal Hazard</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                  Upload Photo Evidence
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '9px 16px',
                      background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                      color: '#ffffff',
                      fontSize: 13,
                      fontWeight: 600,
                      borderRadius: 8,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)',
                    }}
                  >
                    <span>🚨 Select Incident Photo Proof</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoSelect(e, setIncident, setIncidentPhotoPreview)}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {incident.photoName && (
                    <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
                      ✓ {incident.photoName}
                    </span>
                  )}
                </div>
                {incidentPhotoPreview && (
                  <div style={{ marginTop: 12, width: 140, height: 100, borderRadius: 8, overflow: 'hidden', border: '2px solid #dc2626', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <img src={incidentPhotoPreview} alt="Incident evidence preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                  Incident Summary & Action Requirements
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide details on location severity, vessel involvement, or coastal impact..."
                  value={incident.description}
                  onChange={(e) => setIncident({ ...incident, description: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'Inter, sans-serif' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, background: '#fff', padding: '12px 16px', borderRadius: 8, border: '1px solid #dce7f0' }}>
                <div>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>TIME & LOCATION STAMP</span>
                  <span style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 600 }}>{currentTimeStr}</span>
                  {incident.location && <span style={{ display: 'block', fontSize: 11, color: '#dc2626', fontWeight: 700 }}>📍 {incident.location}</span>}
                </div>
                <button
                  type="button"
                  onClick={() => acquireLocation(setIncident)}
                  style={{
                    padding: '8px 14px',
                    fontSize: 12,
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  📍 Attach Incident Coordinates
                </button>
              </div>

              <button
                type="submit"
                className="primary-button font-inter"
                style={{
                  width: '100%',
                  marginTop: 4,
                  padding: '12px',
                  fontSize: 14,
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  boxShadow: '0 3px 10px rgba(220, 38, 38, 0.3)',
                  cursor: 'pointer',
                }}
              >
                Submit & File Incident Report
              </button>
            </form>
          </div>

          {/* SUBMITTED INCIDENTS LIST */}
          <div style={{ background: '#fff', border: '1px solid #dce7f0', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--ink)', fontFamily: 'Sora, sans-serif' }}>
                🚨 Logged Coastal Incident Reports ({savedIncidents.length})
              </h3>
              <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700, background: '#fef2f2', padding: '3px 8px', borderRadius: 4 }}>STORAGE: local incident log ({userKey})</span>
            </div>

            {savedIncidents.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>
                No coastal incident reports filed yet. Use the form above to log an incident.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {savedIncidents.map((item) => (
                  <div key={item.id} style={{ border: '1px solid #fee2e2', borderRadius: 8, padding: 14, background: '#fffcfc', display: 'flex', gap: 14, alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 12, flex: 1 }}>
                      {item.photoPreview && (
                        <img src={item.photoPreview} alt="Incident proof" style={{ width: 70, height: 70, borderRadius: 6, objectFit: 'cover', border: '1px solid #fecaca' }} />
                      )}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: '#fef2f2', color: '#dc2626' }}>
                            {item.type}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{item.timestamp}</span>
                        </div>
                        {item.description && <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink)' }}>{item.description}</p>}
                        {item.location && <small style={{ display: 'block', margin: '4px 0 0', fontSize: 11, color: '#dc2626', fontWeight: 600 }}>📍 {item.location}</small>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteIncident(item.id)}
                      style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                      title="Delete incident report"
                    >
                      ✕ Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================================
          4. GENERAL USER WORKSPACE
         ====================================================================== */}
      {selectedRole === 'general_user' && (
        <div className="panel font-sans" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <span className="eyebrow font-mono" style={{ color: '#0284c7', fontWeight: 700 }}>COASTAL MONITORING & PREFERENCES</span>
            <h2 style={{ margin: '4px 0 0', fontSize: 22, color: 'var(--ink)', fontFamily: 'Sora, sans-serif' }}>
              Welcome to ORCA
            </h2>
            <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 14 }}>
              Get a quick view of conditions for your coastal activities.
            </p>
          </div>

          {/* PLAN MY COASTAL VISIT FEATURE */}
          <div style={{ background: '#f4fafc', border: '1px solid #d4ebf5', borderRadius: 12, padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>🏖️</span>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, color: 'var(--ink)', fontFamily: 'Sora, sans-serif' }}>
                  Plan My Coastal Visit
                </h3>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Select an activity to view customized conditions & safety guidance:</span>
              </div>
            </div>

            {/* ACTIVITY SELECTION BUTTONS */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { id: 'beach', label: 'Beach Visit', icon: '🏖️' },
                { id: 'fishing', label: 'Fishing', icon: '🎣' },
                { id: 'boating', label: 'Boating', icon: '🚤' },
                { id: 'swimming', label: 'Swimming', icon: '🏊' },
                { id: 'sightseeing', label: 'Sightseeing', icon: '📸' },
              ].map((act) => {
                const isSelected = selectedActivity === act.id
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => handleSelectActivity(act.id)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      border: isSelected ? '1px solid #0284c7' : '1px solid #cbd5e1',
                      background: isSelected ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#334155',
                      boxShadow: isSelected ? '0 3px 10px rgba(2, 132, 199, 0.25)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span>{act.icon}</span> {act.label}
                  </button>
                )
              })}
            </div>

            {/* ACTIVITY SUITABILITY CARD */}
            {selectedActivity && suitabilityInfo && (
              <div style={{ background: '#ffffff', border: '1px solid #bae6fd', borderRadius: 10, padding: 18, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 2px 8px rgba(2, 132, 199, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e0f2fe', paddingBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{suitabilityInfo.icon}</span>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0369a1', fontFamily: 'Sora, sans-serif' }}>
                      Activity Suitability: {suitabilityInfo.label}
                    </h4>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 6, background: suitabilityInfo.statusTone === 'good' ? '#e1f7f0' : '#fef3c7', color: suitabilityInfo.statusTone === 'good' ? '#168c75' : '#b45309' }}>
                    {suitabilityInfo.safetyStatus}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 4 }}>
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: 0.5 }}>SELECTED ACTIVITY</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{suitabilityInfo.icon} {suitabilityInfo.label}</span>
                  </div>

                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: 0.5 }}>SEA CONDITION</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{suitabilityInfo.seaCondition}</span>
                  </div>

                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: 0.5 }}>WIND CONDITION</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{suitabilityInfo.windCondition}</span>
                  </div>

                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: 0.5 }}>VISIBILITY</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{suitabilityInfo.visibility}</span>
                  </div>
                </div>

                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="primary-button font-inter"
                    style={{
                      padding: '11px 22px',
                      fontSize: 13,
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 8,
                      boxShadow: '0 3px 10px rgba(2, 132, 199, 0.25)',
                      cursor: 'pointer',
                    }}
                  >
                    View Full Conditions →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* PRIMARY COASTAL LOCATION SETTER */}
          <div style={{ background: '#ffffff', border: '1px solid #dce7f0', borderRadius: 12, padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 20 }}>📍</span>
              <h3 style={{ margin: 0, fontSize: 16, color: 'var(--ink)', fontFamily: 'Sora, sans-serif' }}>
                Primary Coastal Spot
              </h3>
            </div>

            <form onSubmit={handleSaveSpot} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {['Chennai, Tamil Nadu', 'Visakhapatnam, AP', 'Mumbai, Maharashtra', 'Kochi, Kerala', 'Goa Coast'].map((spot) => {
                  const isSelected = spotInput === spot
                  return (
                    <button
                      key={spot}
                      type="button"
                      onClick={() => setSpotInput(spot)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        border: isSelected ? '1px solid #0284c7' : '1px solid #cbd5e1',
                        background: isSelected ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : '#ffffff',
                        color: isSelected ? '#ffffff' : '#334155',
                        cursor: 'pointer',
                      }}
                    >
                      📍 {spot.split(',')[0]}
                    </button>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  required
                  placeholder="Enter custom coastal location..."
                  value={spotInput}
                  onChange={(e) => setSpotInput(e.target.value)}
                  style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'Inter, sans-serif' }}
                />
                <button
                  type="submit"
                  className="primary-button font-inter"
                  style={{
                    padding: '10px 18px',
                    fontSize: 13,
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  Save Spot
                </button>
              </div>
            </form>

            {preferredSpot && (
              <div style={{ marginTop: 14, padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>Active Location: 📍 {preferredSpot}</span>
                <span style={{ padding: '3px 8px', borderRadius: 4, background: '#e0f2fe', color: '#0369a1', fontSize: 11, fontWeight: 700 }}>
                  MONITORING ACTIVE
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOTTOM ENTRY TO DASHBOARD */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0 16px' }}>
        <button
          type="button"
          className="primary-button font-inter"
          style={{
            width: '100%',
            maxWidth: 380,
            padding: '14px 24px',
            fontSize: 15,
            fontWeight: 700,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #1077ca 0%, #0d4163 100%)',
            color: '#ffffff',
            border: 'none',
            boxShadow: '0 4px 14px rgba(16, 119, 202, 0.3)',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/dashboard')}
        >
          Proceed to Dashboard →
        </button>
      </div>

    </div>
  )
}
