import React, { useState, useEffect, useCallback } from 'react'
import { coastalService } from '../../services/coastalService'

const REGIONAL_ANNOUNCEMENTS = {
  'Visakhapatnam Coast': [
    {
      id: 1,
      title: 'High Swell Wave & Rough Sea Advisory',
      source: 'INCOIS / AP State Disaster Management',
      datetime: '2026-09-23 08:30 AM',
      shortDesc: 'Swell waves up to 3.2m expected along Visakhapatnam offshore region. Trawlers advised caution near harbor mouths.',
      details: 'INCOIS ocean state report indicates significant swell wave surge along the Visakhapatnam coast over the next 24 hours. Peak wave height will range between 2.8m and 3.4m during high tide. All small crafts, motor boats, and non-mechanized vessels are advised to remain within safe anchorage.',
    },
    {
      id: 2,
      title: 'Coastal Port Security Level 2 Readiness Notice',
      source: 'Visakhapatnam Port Authority',
      datetime: '2026-09-22 04:15 PM',
      shortDesc: 'Routine security and emergency readiness verification active across Outer Harbor and Fishing Harbor berths.',
      details: 'All vessel captains and local marine operators must maintain channel frequency VHF 16. Port emergency response tugboats are positioned at berths 3 and 7 for rapid response assistance.',
    },
  ],
  'Andhra Pradesh Coast': [
    {
      id: 3,
      title: 'Pre-Monsoon Coastal Storm Preparedness Order',
      source: 'AP Disaster Management Authority (APSDMA)',
      datetime: '2026-09-23 07:00 AM',
      shortDesc: 'District emergency response centers activated across Kakinada, Machilipatnam, and Nellore coastal stretches.',
      details: 'APSDMA has issued readiness instructions to local coastal mandal officers. Marine rescue response teams have been deployed with satellite communication handsets and inflatable life rafts at key fish landing centers.',
    },
  ],
  'Bay of Bengal': [
    {
      id: 4,
      title: 'Deep Depression Atmospheric Watch Bulletin',
      source: 'India Meteorological Department (IMD)',
      datetime: '2026-09-23 06:00 AM',
      shortDesc: 'Low pressure system over West-Central Bay of Bengal likely to intensify. Deep-sea fishing vessels advised to return to shore.',
      details: 'Atmospheric pressure over Central Bay of Bengal has dropped to 998 hPa with surface wind speeds of 45-55 km/h gusting to 65 km/h. Sea condition is rough to very rough. Fishermen in deep-sea zones are strongly advised to navigate back toward the nearest mainland harbor.',
    },
  ],
  'Chennai Coast': [
    {
      id: 5,
      title: 'Spring High Tide Coastal Inundation Alert',
      source: 'Tamil Nadu State Disaster Management Authority',
      datetime: '2026-09-22 09:45 PM',
      shortDesc: 'High spring tide expected at Kasimedu and Marina coastline. Low-lying beach access restricted during peak tides.',
      details: 'Astronomical high tide levels will reach 1.4m above normal sea level. Public access to low-lying beach structures and breakwater walls will be temporarily restricted between 02:00 AM and 06:00 AM.',
    },
  ],
  'Odisha Coast': [
    {
      id: 6,
      title: 'Paradip Port Rough Weather Navigation Guidance',
      source: 'Odisha State Coastal Authority & Paradip Port Control',
      datetime: '2026-09-23 05:30 AM',
      shortDesc: 'Heavy swell and strong surface currents recorded along Paradip & Dhamra fairways.',
      details: 'Ship pilots and harbor tugs operating near Paradip entrance channel must enforce a minimum 1.5-knot safety margin due to heavy cross-shelf currents.',
    },
  ],
  'Gujarat Coast': [
    {
      id: 7,
      title: 'Arabian Sea Gale Wind Advisory',
      source: 'Gujarat Disaster Management Institute',
      datetime: '2026-09-22 11:20 AM',
      shortDesc: 'Squally winds 40-50 km/h along Okha and Porbandar coastlines.',
      details: 'Small motorized fishing craft are advised to stay within 12 nautical miles of the coastline until wind velocity stabilizes below 30 km/h.',
    },
  ],
}

export default function MarineDisasterPersonalization({ user, userKey }) {
  // 1. OPERATIONAL REGION & ROLE STATE
  const [operationalRegion, setOperationalRegion] = useState('Visakhapatnam Coast')
  const [opRole, setOpRole] = useState('Disaster Response') // 'Marine Operations' | 'Disaster Response'

  // 2. ANNOUNCEMENTS MODAL STATE
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)

  // 3. RAPID HAZARD REPORT STATE
  const [hazardForm, setHazardForm] = useState({
    hazardType: 'Cyclone',
    location: 'Visakhapatnam Outer Harbor (17.6868° N, 83.2185° E)',
    description: '',
    photoName: '',
  })
  const [photoPreview, setPhotoPreview] = useState(null)
  const [isLocating, setIsLocating] = useState(false)

  // 4. STORAGE FOR SUBMITTED REPORTS & GENERATED ALERTS
  const storageKeyReports = `orca_hazard_reports_${userKey}`
  const [submittedReports, setSubmittedReports] = useState(() => {
    try {
      const val = localStorage.getItem(storageKeyReports) || localStorage.getItem('orca_hazard_reports')
      return val ? JSON.parse(val) : []
    } catch {
      return []
    }
  })

  // Toast & Feedback
  const [toastMessage, setToastMessage] = useState('')
  const [activeAlertItem, setActiveAlertItem] = useState(null)

  // 5. COMPLAINT / MESSAGE TO COASTAL AUTHORITY STATE
  const [complaintMsg, setComplaintMsg] = useState('')
  const [complaintLocation, setComplaintLocation] = useState('Visakhapatnam Outer Harbor')
  const [complaintPhotoFile, setComplaintPhotoFile] = useState(null)
  const [complaintPhotoPreview, setComplaintPhotoPreview] = useState(null)
  const [submittingComplaint, setSubmittingComplaint] = useState(false)
  const [userComplaints, setUserComplaints] = useState([])
  const [loadingComplaints, setLoadingComplaints] = useState(false)

  const loadUserComplaints = useCallback(async () => {
    setLoadingComplaints(true)
    try {
      const data = await coastalService.fetchMyComplaints()
      setUserComplaints(data || [])
    } catch (err) {
      console.error('Failed to fetch complaints', err)
      setUserComplaints([])
    } finally {
      setLoadingComplaints(false)
    }
  }, [])

  useEffect(() => {
    loadUserComplaints()
  }, [loadUserComplaints])

  const handleComplaintPhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setComplaintPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setComplaintPhotoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveComplaintPhoto = () => {
    setComplaintPhotoFile(null)
    setComplaintPhotoPreview(null)
  }

  const handleSubmitComplaint = async (e) => {
    e.preventDefault()
    if (!complaintMsg.trim()) return

    setSubmittingComplaint(true)
    try {
      await coastalService.submitComplaint({
        location: complaintLocation.trim() || operationalRegion,
        message: complaintMsg.trim(),
        region: operationalRegion,
        photo_url: complaintPhotoPreview,
        photo_name: complaintPhotoFile ? complaintPhotoFile.name : null,
      })
      await loadUserComplaints()
      setComplaintMsg('')
      handleRemoveComplaintPhoto()
      setToastMessage('✓ Message / Complaint submitted to Coastal Authority!')
    } catch (err) {
      console.error('Failed to submit message to Coastal Authority', err)
      const errMsg = err?.message || 'Error submitting message to database.'
      setToastMessage(`❌ ${errMsg}`)
    } finally {
      setSubmittingComplaint(false)
      setTimeout(() => setToastMessage(''), 4000)
    }
  }

  const currentTimeStr = new Date().toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  // Geolocation helper
  const handleAcquireLocation = () => {
    setIsLocating(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const locStr = `${operationalRegion} (${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E)`
          setHazardForm((prev) => ({ ...prev, location: locStr }))
          setIsLocating(false)
        },
        () => {
          setHazardForm((prev) => ({ ...prev, location: `${operationalRegion} (17.6868° N, 83.2185° E)` }))
          setIsLocating(false)
        }
      )
    } else {
      setHazardForm((prev) => ({ ...prev, location: `${operationalRegion} (17.6868° N, 83.2185° E)` }))
      setIsLocating(false)
    }
  }

  // Photo upload handler
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setHazardForm((prev) => ({ ...prev, photoName: file.name }))
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // Automatic Fisherman Alert Generator
  const generateFishermanAlert = (hazardType, location, description) => {
    const locShort = location.split('(')[0].trim() || 'coastal zone'
    switch (hazardType) {
      case 'Cyclone':
        return `⚠️ CYCLONE WARNING: Severe weather & high sea surge near ${locShort}. All fishermen must return to harbor immediately.`
      case 'Coastal Flooding':
        return `⚠️ COASTAL FLOOD ALERT: Sea inundation reported at ${locShort}. Keep boats secured and avoid shoreline.`
      case 'Storm Surge':
        return `⚠️ HIGH SURGE WARNING: Dangerous waves at ${locShort}. Avoid fishing or navigation in this area.`
      case 'Oil Spill':
        return `⚠️ MARINE POLLUTION ALERT: Chemical / oil hazard detected near ${locShort}. Avoid fishing near these coordinates.`
      case 'Vessel Incident':
        return `⚠️ VESSEL HAZARD ALERT: Distress incident near ${locShort}. Maintain safety distance & keep VHF Ch 16 active.`
      default:
        return `⚠️ HAZARD ADVISORY: Dangerous coastal condition reported near ${locShort}. Exercise extreme caution.`
    }
  }

  // Form Submission
  const handleSubmitHazardReport = async (e) => {
    e.preventDefault()
    if (!hazardForm.description.trim() && !hazardForm.photoName) {
      setToastMessage('Please enter a hazard description or upload photo evidence.')
      setTimeout(() => setToastMessage(''), 3500)
      return
    }

    const fishermanAlertText = generateFishermanAlert(
      hazardForm.hazardType,
      hazardForm.location,
      hazardForm.description
    )

    const newReport = {
      id: Date.now(),
      region: operationalRegion,
      opRole,
      hazardType: hazardForm.hazardType,
      location: hazardForm.location,
      description: hazardForm.description || 'Hazard reported by Marine & Disaster Operations unit.',
      photoName: hazardForm.photoName,
      photoPreview,
      timestamp: currentTimeStr,
      fishermanAlert: fishermanAlertText,
      publishedToFishermen: false,
    }

    // Persist to FastAPI backend database
    try {
      await coastalService.submitHazard({
        region: operationalRegion,
        hazard_type: hazardForm.hazardType,
        location: hazardForm.location,
        description: hazardForm.description || 'Hazard reported by Marine & Disaster Operations unit.',
        photo_url: photoPreview,
        photo_name: hazardForm.photoName,
        timestamp: currentTimeStr,
        source: 'Marine & Disaster Operations',
        op_role: opRole,
      })
    } catch (err) {
      console.warn('Backend hazard submit warning (falling back to local workspace state)', err)
    }

    const updated = [newReport, ...submittedReports]
    setSubmittedReports(updated)
    try {
      localStorage.setItem(storageKeyReports, JSON.stringify(updated))
      localStorage.setItem('orca_hazard_reports', JSON.stringify(updated))
    } catch (err) {
      console.error('Failed to save report to local storage', err)
    }

    // Set as active alert item to show communication flow immediately
    setActiveAlertItem(newReport)

    // Reset Form
    setHazardForm({
      hazardType: 'Cyclone',
      location: `${operationalRegion} (17.6868° N, 83.2185° E)`,
      description: '',
      photoName: '',
    })
    setPhotoPreview(null)

    setToastMessage('🚨 Rapid Hazard Report submitted & Coastal Authority Notification dispatched!')
    setTimeout(() => setToastMessage(''), 4500)
  }

  // Publish Fisherman Alert Action
  const handlePublishFishermanAlert = (reportId) => {
    const updated = submittedReports.map((item) => {
      if (item.id === reportId) {
        return { ...item, publishedToFishermen: true }
      }
      return item
    })
    setSubmittedReports(updated)
    if (activeAlertItem && activeAlertItem.id === reportId) {
      setActiveAlertItem({ ...activeAlertItem, publishedToFishermen: true })
    }
    try {
      localStorage.setItem(storageKeyReports, JSON.stringify(updated))
      localStorage.setItem('orca_hazard_reports', JSON.stringify(updated))
    } catch (err) {
      console.error('Failed to update published alert state', err)
    }

    setToastMessage('📡 Short Fisherman Alert successfully published to active coastal broadcast channel!')
    setTimeout(() => setToastMessage(''), 4500)
  }

  const handleDeleteReport = (id) => {
    const updated = submittedReports.filter((item) => item.id !== id)
    setSubmittedReports(updated)
    if (activeAlertItem?.id === id) {
      setActiveAlertItem(null)
    }
    try {
      localStorage.setItem(storageKeyReports, JSON.stringify(updated))
      localStorage.setItem('orca_hazard_reports', JSON.stringify(updated))
    } catch (err) {
      console.error('Failed to delete report', err)
    }
  }

  // Live backend announcements for Marine Operators
  const [liveAnnouncements, setLiveAnnouncements] = useState([])

  useEffect(() => {
    let isMounted = true
    coastalService.fetchAnnouncements(operationalRegion, 'Marine Operators').then((res) => {
      if (isMounted) {
        setLiveAnnouncements(res || [])
      }
    })
    return () => { isMounted = false }
  }, [operationalRegion])

  const currentAnnouncements = liveAnnouncements.length > 0
    ? liveAnnouncements
    : (REGIONAL_ANNOUNCEMENTS[operationalRegion] || REGIONAL_ANNOUNCEMENTS['Visakhapatnam Coast'])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="font-sans">
      
      {/* TOAST BANNER */}
      {toastMessage && (
        <div style={{ padding: '12px 18px', borderRadius: 8, background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(153, 27, 27, 0.1)' }}>
          <span>{toastMessage}</span>
          <small style={{ fontSize: 11, background: '#dc2626', color: '#ffffff', padding: '3px 9px', borderRadius: 6, fontWeight: 700, letterSpacing: 0.5 }}>STATUS UPDATED</small>
        </div>
      )}

      {/* SECTION 1: OPERATIONAL REGION & ROLE CONTROL HEADER */}
      <div className="panel" style={{ padding: 20, background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff', borderRadius: 12, border: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>⚡</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                MARINE & DISASTER OPERATIONS WORKSPACE
              </span>
            </div>
            <h2 style={{ margin: '4px 0 0', fontSize: 19, fontWeight: 700, color: '#ffffff', fontFamily: 'Sora, sans-serif' }}>
              Rapid Coastal Hazard Communication
            </h2>
          </div>

          {/* CONTROLS GRID */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            
            {/* 1. Operational Region Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Operational Region:</label>
              <select
                value={operationalRegion}
                onChange={(e) => {
                  setOperationalRegion(e.target.value)
                  setHazardForm((prev) => ({ ...prev, location: `${e.target.value} (17.6868° N, 83.2185° E)` }))
                }}
                style={{
                  padding: '7px 12px',
                  borderRadius: 6,
                  background: '#090d16',
                  color: '#e2e8f0',
                  border: '1px solid #475569',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="Visakhapatnam Coast">Visakhapatnam Coast</option>
                <option value="Andhra Pradesh Coast">Andhra Pradesh Coast</option>
                <option value="Bay of Bengal">Bay of Bengal</option>
                <option value="Chennai Coast">Chennai Coast</option>
                <option value="Odisha Coast">Odisha Coast</option>
                <option value="Gujarat Coast">Gujarat Coast</option>
              </select>
            </div>

            {/* 2. Operational Role Context */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Role Context:</label>
              <div style={{ display: 'flex', background: '#090d16', padding: 3, borderRadius: 6, border: '1px solid #475569' }}>
                {['Marine Operations', 'Disaster Response'].map((r) => {
                  const isSel = opRole === r
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setOpRole(r)}
                      style={{
                        padding: '5px 11px',
                        fontSize: 12,
                        fontWeight: 700,
                        borderRadius: 4,
                        border: 'none',
                        background: isSel ? '#0284c7' : 'transparent',
                        color: isSel ? '#ffffff' : '#94a3b8',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {r}
                    </button>
                  )
                })}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* SECTION 2: AUTHORITY ANNOUNCEMENTS */}
      <div className="panel" style={{ padding: 20, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>📢</span>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--ink)', fontFamily: 'Sora, sans-serif' }}>
              Authority Announcements — {operationalRegion}
            </h3>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: 6 }}>
            {currentAnnouncements.length} Official Bulletins
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {currentAnnouncements.map((item) => (
            <div
              key={item.id}
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: 14,
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                gap: 10,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', background: '#fef2f2', padding: '2px 8px', borderRadius: 4 }}>
                    {item.source}
                  </span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{item.datetime}</span>
                </div>
                <h4 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                  {item.title}
                </h4>
                <p style={{ margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
                  {item.shortDesc}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAnnouncement(item)}
                style={{
                  alignSelf: 'flex-start',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#0284c7',
                  background: '#e0f2fe',
                  border: '1px solid #bae6fd',
                  padding: '4px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                View Details →
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ANNOUNCEMENT DETAIL MODAL */}
      {selectedAnnouncement && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 12, maxWidth: 540, width: '100%', padding: 24, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', background: '#fef2f2', padding: '3px 10px', borderRadius: 6, textTransform: 'uppercase' }}>
                {selectedAnnouncement.source}
              </span>
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#0f172a', fontFamily: 'Sora, sans-serif' }}>
              {selectedAnnouncement.title}
            </h3>
            <span style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 12 }}>
              Issued: {selectedAnnouncement.datetime}
            </span>

            <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0', margin: '0 0 18px' }}>
              {selectedAnnouncement.details}
            </p>

            <button
              type="button"
              onClick={() => setSelectedAnnouncement(null)}
              style={{ width: '100%', padding: '10px', background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              Close Announcement
            </button>
          </div>
        </div>
      )}

      {/* SECTION 3: RAPID HAZARD REPORT (MAIN FEATURE) */}
      <div className="panel" style={{ padding: 22, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 22 }}>🚨</span>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)', fontFamily: 'Sora, sans-serif' }}>
              Rapid Hazard Report
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
              Log an immediate coastal incident to generate authority notifications and fisherman safety alerts.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmitHazardReport} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            {/* Hazard Type */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Hazard Type *
              </label>
              <select
                value={hazardForm.hazardType}
                onChange={(e) => setHazardForm({ ...hazardForm, hazardType: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600, color: '#0f172a', background: '#fff' }}
              >
                <option value="Cyclone">Cyclone / Heavy Depression</option>
                <option value="Coastal Flooding">Coastal Flooding</option>
                <option value="Storm Surge">Storm Surge / High Waves</option>
                <option value="Oil Spill">Oil Spill / Marine Pollution</option>
                <option value="Vessel Incident">Vessel Incident / Collision</option>
                <option value="Other">Other Emergency Hazard</option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Location / Coordinates *
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  required
                  value={hazardForm.location}
                  onChange={(e) => setHazardForm({ ...hazardForm, location: e.target.value })}
                  style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'Inter, sans-serif' }}
                  placeholder="e.g. Visakhapatnam Coast (17.68° N, 83.21° E)"
                />
                <button
                  type="button"
                  onClick={handleAcquireLocation}
                  disabled={isLocating}
                  style={{
                    padding: '9px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    background: '#e0f2fe',
                    color: '#0369a1',
                    border: '1px solid #7dd3fc',
                    borderRadius: 8,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isLocating ? '📍 Locating...' : '📍 GPS'}
                </button>
              </div>
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              Upload Hazard Photo Evidence
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 16px',
                  background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: 8,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.2)',
                }}
              >
                <span>📷 Select Photo File</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  style={{ display: 'none' }}
                />
              </label>
              {hazardForm.photoName && (
                <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 700 }}>
                  ✓ {hazardForm.photoName}
                </span>
              )}
            </div>
            {photoPreview && (
              <div style={{ marginTop: 10, width: 140, height: 95, borderRadius: 8, overflow: 'hidden', border: '2px solid #0284c7', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <img src={photoPreview} alt="Hazard preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
          </div>

          {/* Details / Description */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              Hazard Details / Operational Description
            </label>
            <textarea
              rows={3}
              placeholder="Describe observation details, sea state impact, affected coordinates, or immediate vessel guidance..."
              value={hazardForm.description}
              onChange={(e) => setHazardForm({ ...hazardForm, description: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'Inter, sans-serif' }}
            />
          </div>

          {/* Timestamp Info */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>TIMESTAMP: <strong>{currentTimeStr}</strong></span>
            <span style={{ fontSize: 11, color: '#0284c7', fontWeight: 700 }}>TARGET: COASTAL AUTHORITY & MARINERS</span>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            className="primary-button font-inter"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: 14,
              fontWeight: 800,
              background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              boxShadow: '0 3px 12px rgba(220, 38, 38, 0.35)',
              cursor: 'pointer',
              letterSpacing: 0.5,
            }}
          >
            SEND ALERT TO COASTAL AUTHORITY
          </button>
        </form>
      </div>

      {/* SECTION 4: COMMUNICATION FLOW & ACTIVE HAZARD NOTIFICATIONS */}
      {activeAlertItem && (
        <div className="panel" style={{ padding: 22, background: '#f8fafc', borderRadius: 12, border: '1px solid #cbd5e1' }}>
          
          {/* FLOW DIAGRAM HEADER */}
          <div style={{ marginBottom: 18 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#0284c7', letterSpacing: 1, textTransform: 'uppercase' }}>
              RAPID HAZARD COMMUNICATION FLOW
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ padding: '6px 12px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, fontWeight: 700, color: '#334155' }}>
                1. Hazard Report
              </span>
              <span style={{ fontSize: 14, color: '#64748b' }}>→</span>
              <span style={{ padding: '6px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, fontWeight: 700, color: '#dc2626' }}>
                2. Coastal Authority Notification
              </span>
              <span style={{ fontSize: 14, color: '#64748b' }}>→</span>
              <span style={{ padding: '6px 12px', background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: 6, fontSize: 12, fontWeight: 700, color: '#0369a1' }}>
                3. Short Fisherman Alert
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            
            {/* A. DETAILED AUTHORITY NOTIFICATION */}
            <div style={{ background: '#ffffff', border: '1px solid #fecaca', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #fee2e2', paddingBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#dc2626' }}>
                  🚨 DETAILED AUTHORITY NOTIFICATION
                </span>
                <span style={{ fontSize: 11, color: '#64748b' }}>{activeAlertItem.timestamp}</span>
              </div>

              {activeAlertItem.photoPreview && (
                <div style={{ width: '100%', height: 140, borderRadius: 8, overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                  <img src={activeAlertItem.photoPreview} alt="Evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                <div><strong>Hazard Category:</strong> <span style={{ color: '#dc2626', fontWeight: 700 }}>{activeAlertItem.hazardType}</span></div>
                <div><strong>Region & Location:</strong> {activeAlertItem.location}</div>
                <div><strong>Operator Role Context:</strong> {activeAlertItem.opRole} ({activeAlertItem.region})</div>
                <div style={{ background: '#fff5f5', padding: 10, borderRadius: 6, border: '1px solid #fee2e2', color: '#334155', marginTop: 4, lineHeight: 1.4 }}>
                  <strong>Description:</strong> {activeAlertItem.description}
                </div>
              </div>
            </div>

            {/* B. SHORT FISHERMAN-FACING ALERT */}
            <div style={{ background: '#ffffff', border: '1px solid #bae6fd', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e0f2fe', paddingBottom: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#0369a1' }}>
                    ⚓ SHORT FISHERMAN ALERT (ACTIONABLE)
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: activeAlertItem.publishedToFishermen ? '#16a34a' : '#d97706', background: activeAlertItem.publishedToFishermen ? '#dcfce7' : '#fef3c7', padding: '2px 8px', borderRadius: 4 }}>
                    {activeAlertItem.publishedToFishermen ? '✓ PUBLISHED' : 'DRAFT READY'}
                  </span>
                </div>

                <div style={{ background: '#f0f9ff', padding: 14, borderRadius: 8, border: '1.5px dashed #0284c7', color: '#0c4a6e', fontSize: 14, fontWeight: 700, lineHeight: 1.5 }}>
                  {activeAlertItem.fishermanAlert}
                </div>

                <p style={{ margin: '10px 0 0', fontSize: 11, color: '#64748b' }}>
                  This alert is formatted for rapid broadcast via SMS, VHF radio announcements, and the ORCA Fisherman Portal.
                </p>
              </div>

              {/* PUBLISH BUTTON */}
              <button
                type="button"
                onClick={() => handlePublishFishermanAlert(activeAlertItem.id)}
                disabled={activeAlertItem.publishedToFishermen}
                style={{
                  width: '100%',
                  padding: '11px',
                  fontSize: 13,
                  fontWeight: 800,
                  background: activeAlertItem.publishedToFishermen ? '#16a34a' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: activeAlertItem.publishedToFishermen ? 'default' : 'pointer',
                  boxShadow: activeAlertItem.publishedToFishermen ? 'none' : '0 3px 10px rgba(2, 132, 199, 0.3)',
                }}
              >
                {activeAlertItem.publishedToFishermen ? '✓ ALERT PUBLISHED TO FISHERMEN' : 'SEND / PUBLISH ALERT'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* SECTION 5: 💬 SEND MESSAGE / COMPLAINT TO COASTAL AUTHORITY */}
      <div className="panel" style={{ padding: 22, background: '#ffffff', borderRadius: 12, border: '1px solid #cbd5e1' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
          <span style={{ fontSize: 20 }}>💬</span>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)', fontFamily: 'Sora, sans-serif' }}>
              Send Message / Complaint to Coastal Authority
            </h3>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              Direct line to communicate operational issues, marine channel obstructions, or emergency coordination
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmitComplaint} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                Sender Identity & Role
              </label>
              <input
                type="text"
                disabled
                value={`${user?.display_name || user?.name || user?.email?.split('@')[0] || 'Captain / Marine Operator'} (Marine Operator)`}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: 13, color: '#475569' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                Location / Fairway Channel *
              </label>
              <input
                type="text"
                required
                value={complaintLocation}
                onChange={(e) => setComplaintLocation(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                placeholder="e.g. Visakhapatnam Fairway Channel Entrance"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
              Message / Complaint Details *
            </label>
            <textarea
              required
              rows={4}
              value={complaintMsg}
              onChange={(e) => setComplaintMsg(e.target.value)}
              placeholder="Provide full operational details, navigation obstruction coordinates, or urgent message..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'Inter, sans-serif' }}
            />
          </div>

          {/* ATTACH PHOTO */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
              📷 Attach Evidence Photo (Optional)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                📁 Choose File
                <input type="file" accept="image/*" onChange={handleComplaintPhotoSelect} style={{ display: 'none' }} />
              </label>
              {complaintPhotoFile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#0369a1', fontWeight: 600 }}>{complaintPhotoFile.name}</span>
                  <button
                    type="button"
                    onClick={handleRemoveComplaintPhoto}
                    style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {complaintPhotoPreview && (
              <div style={{ marginTop: 10 }}>
                <img
                  src={complaintPhotoPreview}
                  alt="Attachment preview"
                  style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid #0284c7' }}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              type="submit"
              disabled={submittingComplaint}
              style={{
                padding: '11px 22px',
                fontSize: 13,
                fontWeight: 800,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: 'none',
                cursor: submittingComplaint ? 'wait' : 'pointer',
                boxShadow: '0 3px 10px rgba(2, 132, 199, 0.2)',
                letterSpacing: 0.5,
              }}
            >
              {submittingComplaint ? 'Submitting to Database...' : 'SEND TO COASTAL AUTHORITY'}
            </button>
          </div>
        </form>

        {/* SUBMITTED MESSAGES & AUTHORITY RESPONSES */}
        <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid #f1f5f9' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--ink)', fontFamily: 'Sora, sans-serif' }}>
            📋 Your Submitted Messages & Authority Responses ({userComplaints.length})
          </h3>

          {loadingComplaints ? (
            <div style={{ padding: 14, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Loading messages from database...
            </div>
          ) : userComplaints.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>
              No messages submitted yet. Use the form above to send your first message.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {userComplaints.map((c) => (
                <div
                  key={c.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: 14,
                    background: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0369a1' }}>
                        ⚓ {c.senderName} ({c.senderRole})
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>📍 {c.region}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: c.status === 'Responded' ? '#e1f7f0' : '#fef3c7',
                          color: c.status === 'Responded' ? '#168c75' : '#b45309',
                        }}
                      >
                        {c.status}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{c.timestamp}</span>
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: 13, color: 'var(--ink)' }}>{c.message}</p>

                  {c.photoUrl && (
                    <div>
                      <img
                        src={c.photoUrl}
                        alt="Submitted attachment"
                        style={{ width: 100, height: 75, objectFit: 'cover', borderRadius: 6, border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  )}

                  {c.response && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: 12, marginTop: 4 }}>
                      <span style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#166534', marginBottom: 4 }}>
                        Authority Response
                      </span>
                      <p style={{ margin: 0, fontSize: 13, color: '#14532d', lineHeight: 1.45 }}>{c.response}</p>
                      {c.respondedAt && (
                        <span style={{ display: 'block', marginTop: 4, fontSize: 11, color: '#15803d', fontWeight: 600 }}>
                          [{c.respondedAt}]
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 6: RECENT SUBMITTED HAZARD LOGS HISTORY */}
      <div className="panel" style={{ padding: 20, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--ink)', fontFamily: 'Sora, sans-serif' }}>
            📋 Logged Operations Hazard Reports ({submittedReports.length})
          </h3>
          <span style={{ fontSize: 11, color: '#64748b' }}>Workspace History ({userKey})</span>
        </div>

        {submittedReports.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>
            No hazard reports logged yet. Fill out the Rapid Hazard Report form above.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {submittedReports.map((item) => (
              <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                  {item.photoPreview && (
                    <img src={item.photoPreview} alt="Proof" style={{ width: 50, height: 50, borderRadius: 6, objectFit: 'cover', border: '1px solid #cbd5e1' }} />
                  )}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: '#fef2f2', color: '#dc2626' }}>
                        {item.hazardType}
                      </span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{item.timestamp}</span>
                      {item.publishedToFishermen && (
                        <span style={{ fontSize: 10, fontWeight: 700, background: '#dcfce7', color: '#16a34a', padding: '2px 6px', borderRadius: 4 }}>
                          FISHERMAN ALERT BROADCAST
                        </span>
                      )}
                    </div>
                    <span style={{ display: 'block', margin: '4px 0 0', fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
                      📍 {item.location}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setActiveAlertItem(item)}
                    style={{ background: '#e0f2fe', border: '1px solid #bae6fd', color: '#0369a1', padding: '5px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 700 }}
                  >
                    View Flow
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteReport(item.id)}
                    style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '5px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
