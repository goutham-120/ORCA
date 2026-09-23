import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import FishermanPersonalization from '../components/personalization/FishermanPersonalization'
import ResearcherPersonalization from '../components/personalization/ResearcherPersonalization'
import MarineDisasterPersonalization from '../components/personalization/MarineDisasterPersonalization'
import CoastalAuthorityPersonalization from '../components/personalization/CoastalAuthorityPersonalization'
import { coastalService } from '../services/coastalService'


const ROLE_CATEGORIES = [
  { value: 'fisher_marine_operator', name: 'Fisher / Marine Operator', label: 'Marine Operator', icon: '⚓', sub: 'Safer fishing, PFZs, route guidance' },
  { value: 'researcher_scientist', name: 'Researcher / Scientist', label: 'Researcher', icon: '🔬', sub: 'Marine observation, data study, trends' },
  { value: 'coastal_authority', name: 'Coastal Authority', label: 'Coastal Authority', icon: '🚨', sub: 'Monitoring, risk assessment, incident reports' },
  { value: 'marine_disaster_ops', name: 'Marine & Disaster Operations', label: 'Marine & Disaster Ops', icon: '⚡', sub: 'Rapid hazard communication & emergency alerts' },
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

  const [selectedRole, setSelectedRole] = useState(() => {
    if (user?.role === 'coastal_authority' || user?.user_category === 'coastal_authority') return 'coastal_authority'
    if (user?.role === 'marine_disaster_ops' || user?.user_category === 'marine_disaster_ops') return 'marine_disaster_ops'
    if (user?.role === 'researcher' || user?.user_category === 'researcher_scientist') return 'researcher_scientist'
    return user?.user_category || 'fisher_marine_operator'
  })
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
  const suitabilityInfo = ACTIVITY_SUITABILITY_MAP[selectedActivity] || ACTIVITY_SUITABILITY_MAP.beach
  const [preferredSpot, setPreferredSpot] = useState(() => {
    return localStorage.getItem(`orca_preferred_spot_${userKey}`) || localStorage.getItem('orca_preferred_spot') || 'Chennai, Tamil Nadu'
  })
  const [savedSpots, setSavedSpots] = useState(() => loadUserData('orca_saved_spots', []))
  const [spotInput, setSpotInput] = useState(preferredSpot)
  // 5. FISHERMAN / MARINERS ANNOUNCEMENTS STATE (LIVE FROM BACKEND)
  const [fishermanAnnouncements, setFishermanAnnouncements] = useState([])

  useEffect(() => {
    let isMounted = true
    coastalService.fetchAnnouncements(preferredSpot, 'Fishermen / Mariners').then((res) => {
      if (isMounted) {
        setFishermanAnnouncements(res || [])
      }
    })
    return () => { isMounted = false }
  }, [preferredSpot])

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
        if (user.role === 'coastal_authority' || user.user_category === 'coastal_authority') {
          setSelectedRole('coastal_authority')
        } else if (user.role === 'marine_disaster_ops' || user.user_category === 'marine_disaster_ops') {
          setSelectedRole('marine_disaster_ops')
        } else if (user.role === 'researcher' || user.user_category === 'researcher_scientist') {
          setSelectedRole('researcher_scientist')
        } else if (user.role === 'fisherman' || user.user_category === 'fisher_marine_operator') {
          setSelectedRole('fisher_marine_operator')
        } else if (user.user_category && user.user_category !== selectedRole) {
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
  }, [userKey, user?.user_category, user?.role])


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

  const getRoleIdentity = (role, category) => {
    const r = (role || category || '').toLowerCase()
    if (r.includes('fisherman') || r.includes('fisher')) {
      return { label: 'Fisherman', icon: '🎣' }
    }
    if (r.includes('researcher')) {
      return { label: 'Researcher', icon: '🔬' }
    }
    if (r.includes('coastal_authority') || r.includes('coastal')) {
      return { label: 'Coastal Authority', icon: '🏛️' }
    }
    if (r.includes('marine_disaster_ops') || r.includes('disaster')) {
      return { label: 'Marine & Disaster Operations', icon: '⚓' }
    }
    return { label: 'General User', icon: '📍' }
  }

  const roleIdentity = getRoleIdentity(user?.role, user?.user_category)

  return (
    <div className="font-sans" style={{ maxWidth: 920, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* PAGE HEADER PANEL WITH DYNAMIC ROLE IDENTITY */}
      <div className="panel font-sans" style={{ padding: '20px 24px', background: '#ffffff', border: '1px solid #dce7f0', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--ink)', fontFamily: 'Sora, sans-serif', letterSpacing: 0.5 }}>
              PERSONALIZATION
            </h1>
            <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f0f9ff', border: '1px solid #bae6fd', padding: '6px 14px', borderRadius: 8 }}>
              <span style={{ fontSize: 13, color: '#0369a1', fontWeight: 700 }}>👤 Role:</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#0284c7' }}>
                {roleIdentity.icon} {roleIdentity.label}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="primary-button font-inter"
            style={{
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #1077ca 0%, #0d4163 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              boxShadow: '0 2px 10px rgba(16, 119, 202, 0.25)',
              cursor: 'pointer',
            }}
            onClick={() => navigate('/dashboard')}
          >
            Proceed to Dashboard →
          </button>
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
        <FishermanPersonalization user={user} userKey={userKey} />
      )}

      {/* ======================================================================
          2. RESEARCHER / SCIENTIST WORKSPACE
         ====================================================================== */}
      {selectedRole === 'researcher_scientist' && (
        <ResearcherPersonalization user={user} userKey={userKey} />
      )}

      {/* ======================================================================
          2B. MARINE & DISASTER OPERATIONS WORKSPACE
         ====================================================================== */}
      {selectedRole === 'marine_disaster_ops' && (
        <MarineDisasterPersonalization user={user} userKey={userKey} />
      )}


      {/* ======================================================================
          3. COASTAL AUTHORITY WORKSPACE
         ====================================================================== */}
      {selectedRole === 'coastal_authority' && (
        <CoastalAuthorityPersonalization user={user} userKey={userKey} />
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
                {['Visakhapatnam, AP', 'Chennai / Kasimedu, Tamil Nadu', 'Mumbai / Sassoon Dock, Maharashtra', 'Kochi, Kerala', 'Goa Coast', 'Mangalore, Karnataka', 'Paradip, Odisha', 'Kolkata, WB', 'Port Blair, A&N', 'Surat / Hazira, Gujarat'].map((spot) => {
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

      {/* BOTTOM ENTRY TO DASHBOARD (Omitted for Coastal Authority to ensure single top button) */}
      {selectedRole !== 'coastal_authority' && (
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
      )}

    </div>
  )
}
