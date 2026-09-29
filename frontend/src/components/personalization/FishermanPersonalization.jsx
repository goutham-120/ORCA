import React, { useState, useEffect, useCallback } from 'react'
import { coastalService } from '../../services/coastalService'
import VoiceInputControl from '../common/VoiceInputControl'

const COASTAL_REGIONS = [
  'Visakhapatnam Coast',
  'Chennai Coast',
  'Mumbai Coast',
  'Kochi Coast',
  'Goa Coast',
  'Mangalore Coast',
  'Paradip Coast',
  'Surat / Gujarat Coast',
]

const HARBOR_MANDI_PRICES = [
  { species: 'Indian Mackerel (Kanagurta)', localName: 'Bangda / Kanangeluthi', price: 220, unit: '₹/kg', trend: '+15', trendDir: 'up', demand: 'High Domestic', season: 'Peak Season' },
  { species: 'Oil Sardine (Sardinella)', localName: 'Tarli / Mathi', price: 140, unit: '₹/kg', trend: '-10', trendDir: 'down', demand: 'High Bulk', season: 'Peak Season' },
  { species: 'Yellowfin Tuna (Albacares)', localName: 'Kera / Soorai', price: 420, unit: '₹/kg', trend: '+35', trendDir: 'up', demand: 'Peak Export', season: 'Good (Deep Sea)' },
  { species: 'King Seer Fish / Spanish Mackerel', localName: 'Vanjaram / Surmai', price: 780, unit: '₹/kg', trend: '+50', trendDir: 'up', demand: 'Premium Market', season: 'Moderate' },
  { species: 'Tiger Prawn (Large Grade)', localName: 'Karuvadu Eral / Jhinga', price: 650, unit: '₹/kg', trend: '+40', trendDir: 'up', demand: 'Export Grade', season: 'Peak Season' },
  { species: 'Silver Pomfret', localName: 'Vavval / Paplet', price: 890, unit: '₹/kg', trend: '+60', trendDir: 'up', demand: 'High Demand', season: 'Limited Catch' },
  { species: 'Ribbonfish / Hairtail', localName: 'Savalai / Bala', price: 180, unit: '₹/kg', trend: '0', trendDir: 'steady', demand: 'Stable Export', season: 'Abundant' },
  { species: 'Blue Swimming Crab', localName: 'Nandu / Khekda', price: 380, unit: '₹/kg', trend: '+20', trendDir: 'up', demand: 'High Fresh', season: 'Peak Season' },
  { species: 'Cuttlefish / Squid', localName: 'Oosi Kanava / Maandhi', price: 340, unit: '₹/kg', trend: '+15', trendDir: 'up', demand: 'Export Demand', season: 'Good' },
]

const SPECIES_BIO_MATRIX = [
  { species: 'Indian Mackerel', optSST: '27.0 - 29.5 °C', optChla: '0.8 - 2.5 mg/m³', optSalinity: '32 - 35 PSU', depth: '15 - 50 m', gear: 'Purse Seine / Ring Net', pfzIndicator: 'Coastal thermal fronts & chlorophyll convergence' },
  { species: 'Oil Sardine', optSST: '26.5 - 29.0 °C', optChla: '1.2 - 3.5 mg/m³', optSalinity: '30 - 34.5 PSU', depth: '5 - 35 m', gear: 'Ring Seine / Gillnet', pfzIndicator: 'High chlorophyll bloom edges & upwelling zones' },
  { species: 'Yellowfin Tuna', optSST: '24.0 - 28.5 °C', optChla: '0.2 - 0.9 mg/m³', optSalinity: '34 - 36 PSU', depth: '50 - 250 m', gear: 'Longline / Hook & Line', pfzIndicator: 'Deep thermocline boundary & seamounts/eddies' },
  { species: 'King Seer Fish', optSST: '26.0 - 29.0 °C', optChla: '0.5 - 1.8 mg/m³', optSalinity: '33 - 35.5 PSU', depth: '20 - 80 m', gear: 'Drift Gillnet / Trolling', pfzIndicator: 'Shelf break contours & coastal current confluences' },
  { species: 'Tiger Prawn', optSST: '25.0 - 30.0 °C', optChla: '1.5 - 4.0 mg/m³', optSalinity: '25 - 33 PSU', depth: '10 - 45 m', gear: 'Bottom Trawl (with TED)', pfzIndicator: 'Estuarine plume boundaries & muddy/sandy shelf' },
  { species: 'Silver Pomfret', optSST: '25.5 - 28.5 °C', optChla: '0.7 - 2.0 mg/m³', optSalinity: '32 - 35 PSU', depth: '25 - 90 m', gear: 'Bottom / Mid-water Trawl', pfzIndicator: 'Gentle bathymetric gradients & moderate SST front' },
]

export default function FishermanPersonalization({ user, userKey }) {
  // 1. REGION SELECTION
  const [selectedRegion, setSelectedRegion] = useState('Visakhapatnam Coast')

  // 2. DATA STATES
  const [notifications, setNotifications] = useState([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const [activeFilter, setActiveFilter] = useState('ALL') // 'ALL' | 'ALERT' | 'ANNOUNCEMENT'
  const [complaints, setComplaints] = useState([])
  const [loadingComplaints, setLoadingComplaints] = useState(false)

  // 3. FISHERIES MARKET & SPECIES INTELLIGENCE STATE
  const [fishSubTab, setFishSubTab] = useState('mandi') // 'mandi' | 'species-bio' | 'ban-tracker' | 'profit-calc'
  const [mandiSearch, setMandiSearch] = useState('')
  
  // Profit Estimator Form
  const [calcInputs, setCalcInputs] = useState({
    dieselLiters: 220,
    dieselRate: 94,
    iceAndProvisions: 4200,
    crewCount: 4,
    crewSharePct: 40,
    expectedHaulKg: 550,
    avgFishRate: 230,
  })

  // 4. COMPLAINT / MESSAGE FORM STATE
  const [messageText, setMessageText] = useState('')
  const [locationText, setLocationText] = useState('Visakhapatnam Outer Harbor')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [submittingMessage, setSubmittingMessage] = useState(false)

  // Modals & Toast State
  const [selectedNotifModal, setSelectedNotifModal] = useState(null)
  const [toastMessage, setToastMessage] = useState('')

  // Sync location text with selected region
  useEffect(() => {
    setLocationText(`${selectedRegion.replace(' Coast', '')} Harbor / Fishing Jetty`)
  }, [selectedRegion])

  // Load ALL Notifications (Alerts + Announcements) live from backend database
  const loadNotifications = useCallback(async () => {
    setLoadingNotifications(true)
    try {
      // Fetch announcements targeted to Fishermen / Mariners & Hazards for selected region
      const [backendAnnouncements, backendHazards] = await Promise.all([
        coastalService.fetchAnnouncements(selectedRegion, 'Fishermen / Mariners'),
        coastalService.fetchHazards(selectedRegion),
      ])

      // Format Announcements from database
      const formattedAnnouncements = (backendAnnouncements || []).map((ann) => ({
        id: `ann-${ann.id}`,
        dbId: ann.id,
        type: 'Announcement',
        icon: '📢',
        title: ann.title,
        details: ann.details,
        shortDesc: ann.shortDesc || ann.details,
        source: ann.source || 'Coastal Authority',
        region: ann.region || selectedRegion,
        targetAudience: ann.targetAudience || 'Fishermen / Mariners',
        datetime: ann.datetime || 'Recent Notice',
        severity: 'ADVISORY',
        actionRequired: null,
      }))

      // Format Coastal Hazards / Alerts from database
      const formattedAlerts = (backendHazards || []).map((haz) => {
        const hType = haz.hazardType || 'Coastal Safety Warning'
        const isDanger =
          hType.toLowerCase().includes('cyclone') ||
          hType.toLowerCase().includes('tsunami') ||
          hType.toLowerCase().includes('storm surge') ||
          hType.toLowerCase().includes('high swell')
        return {
          id: `haz-${haz.id}`,
          dbId: (haz.id || 0) + 10000,
          type: 'Alert',
          icon: isDanger ? '🚨' : '🌊',
          title: `${hType} — ${haz.location || selectedRegion}`,
          details: haz.description,
          shortDesc: haz.description,
          source: haz.source || 'Coastal Authority Safety Desk',
          region: haz.region || selectedRegion,
          targetAudience: 'Fishermen / Mariners',
          datetime: haz.timestamp || 'Active Alert',
          severity: isDanger ? 'DANGER' : 'WARNING',
          actionRequired: `Maintain safety precaution near ${haz.location || 'coastal waters'}. Status: ${haz.status || 'Active Warning'}`,
        }
      })

      // Combine both streams and sort newest first by dbId
      const combined = [...formattedAnnouncements, ...formattedAlerts].sort((a, b) => b.dbId - a.dbId)
      setNotifications(combined)
    } catch (err) {
      console.error('Failed to load notifications for fishermen from backend database', err)
      setNotifications([])
    } finally {
      setLoadingNotifications(false)
    }
  }, [selectedRegion])

  // Load Complaints / Messages live from backend
  const loadComplaints = useCallback(async () => {
    setLoadingComplaints(true)
    try {
      const data = await coastalService.fetchMyComplaints()
      setComplaints(data || [])
    } catch (err) {
      console.error('Failed to load complaints from backend', err)
      setComplaints([])
    } finally {
      setLoadingComplaints(false)
    }
  }, [])

  useEffect(() => {
    loadNotifications()
    loadComplaints()
  }, [loadNotifications, loadComplaints])

  // Handle Photo Attachment
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemovePhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  // Submit Complaint / Message to Coastal Authority
  const handleSubmitMessage = async (e) => {
    e.preventDefault()
    if (!messageText.trim()) {
      setToastMessage('Please enter your message or complaint details.')
      setTimeout(() => setToastMessage(''), 3000)
      return
    }

    setSubmittingMessage(true)
    try {
      const payload = {
        location: locationText.trim() || selectedRegion,
        message: messageText.trim(),
        region: selectedRegion,
        photo_url: photoPreview,
        photo_name: photoFile ? photoFile.name : null,
      }

      await coastalService.submitComplaint(payload)
      await loadComplaints()
      setMessageText('')
      handleRemovePhoto()
      setToastMessage('✓ Message submitted successfully to Coastal Authority database!')
    } catch (err) {
      console.error('Failed to submit message to Coastal Authority', err)
      const errMsg = err?.message || 'Error submitting message. Please check backend connection.'
      setToastMessage(`❌ ${errMsg}`)
    } finally {
      setSubmittingMessage(false)
      setTimeout(() => setToastMessage(''), 4000)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="font-sans">
      
      {/* TOAST NOTIFICATION BANNER */}
      {toastMessage && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 8,
            background: toastMessage.includes('✓') ? '#f0fdf4' : '#fef2f2',
            color: toastMessage.includes('✓') ? '#166534' : '#991b1b',
            border: `1px solid ${toastMessage.includes('✓') ? '#bbf7d0' : '#fecaca'}`,
            fontWeight: 600,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }}
        >
          <span>{toastMessage}</span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: toastMessage.includes('✓') ? '#22c55e' : '#ef4444', color: '#fff' }}>
            FISHERMAN DESK
          </span>
        </div>
      )}

      {/* OPERATIONAL / COASTAL REGION HEADER */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #dce7f0',
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>⚓</span>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)', fontFamily: 'Sora, sans-serif' }}>
              Fisherman & Mariner Safety Portal
            </h3>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              Official announcements, coastal advisories, and direct authority messaging
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
            📍 Operational Region:
          </label>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #0284c7',
              background: '#f0f9ff',
              color: '#0369a1',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              outline: 'none',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {COASTAL_REGIONS.map((reg) => (
              <option key={reg} value={reg}>
                {reg}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* UNIFIED NOTIFICATIONS SECTION: ALERTS & ANNOUNCEMENTS */}
      <div style={{ background: '#ffffff', border: '1px solid #dce7f0', borderRadius: 12, padding: 22, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🔔</span>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--ink)', fontFamily: 'Sora, sans-serif' }}>
                Coastal Authority Notifications & Advisories
              </h2>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                Unified feed of safety alerts, weather warnings, and official mariner advisories for {selectedRegion}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setActiveFilter('ALL')}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                border: '1px solid #0284c7',
                background: activeFilter === 'ALL' ? '#0284c7' : '#f0f9ff',
                color: activeFilter === 'ALL' ? '#ffffff' : '#0369a1',
              }}
            >
              All Notifications ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('ALERT')}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                border: '1px solid #dc2626',
                background: activeFilter === 'ALERT' ? '#dc2626' : '#fef2f2',
                color: activeFilter === 'ALERT' ? '#ffffff' : '#dc2626',
              }}
            >
              🚨 Alerts ({notifications.filter((n) => n.type === 'Alert').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('ANNOUNCEMENT')}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                border: '1px solid #2563eb',
                background: activeFilter === 'ANNOUNCEMENT' ? '#2563eb' : '#eff6ff',
                color: activeFilter === 'ANNOUNCEMENT' ? '#ffffff' : '#2563eb',
              }}
            >
              📢 Announcements ({notifications.filter((n) => n.type === 'Announcement').length})
            </button>
          </div>
        </div>

        {loadingNotifications ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            Loading live notifications from Coastal Authority database...
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: 28, textAlign: 'center', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>
              No notifications or alerts published for <strong>{selectedRegion}</strong> at this time.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
            {notifications
              .filter((notif) => {
                if (activeFilter === 'ALERT') return notif.type === 'Alert'
                if (activeFilter === 'ANNOUNCEMENT') return notif.type === 'Announcement'
                return true
              })
              .map((notif) => {
                const isAlert = notif.type === 'Alert'
                const isDanger = notif.severity === 'DANGER'
                const isWarning = notif.severity === 'WARNING'
                const borderColor = isDanger ? '#fecaca' : isWarning ? '#fde68a' : '#bfdbfe'
                const bgColor = isDanger ? '#fff5f5' : isWarning ? '#fffbeb' : '#f0f9ff'
                const badgeBg = isDanger ? '#dc2626' : isWarning ? '#d97706' : '#0284c7'
                const typeBadgeBg = isAlert ? '#fee2e2' : '#e0f2fe'
                const typeBadgeColor = isAlert ? '#991b1b' : '#0369a1'

                return (
                  <div
                    key={notif.id}
                    style={{
                      border: `1px solid ${borderColor}`,
                      borderRadius: 10,
                      padding: 16,
                      background: bgColor,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: typeBadgeColor, background: typeBadgeBg, padding: '3px 8px', borderRadius: 4, letterSpacing: 0.3 }}>
                          {notif.icon} {notif.type.toUpperCase()}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#ffffff', background: badgeBg, padding: '3px 8px', borderRadius: 4 }}>
                          {notif.severity}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>🕐 {notif.datetime}</span>
                    </div>

                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a', fontFamily: 'Sora, sans-serif' }}>
                      {notif.title}
                    </h3>

                    <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.45, flex: 1 }}>
                      {notif.shortDesc || notif.details}
                    </p>

                    {notif.actionRequired && (
                      <div style={{ background: '#ffffff', border: `1px solid ${borderColor}`, padding: '8px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13 }}>⚠️</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: isDanger ? '#991b1b' : isWarning ? '#92400e' : '#075985' }}>
                          {notif.actionRequired}
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, paddingTop: 8, borderTop: `1px solid ${borderColor}` }}>
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                        Source: <strong>{notif.source}</strong> ({notif.region})
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedNotifModal(notif)}
                        style={{
                          background: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          padding: '4px 12px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* SECTION 2: 🐟 FISHERIES MARKET & SPECIES INTELLIGENCE */}
      <div style={{ background: '#ffffff', border: '1px solid #dce7f0', borderRadius: 12, padding: 22, boxShadow: '0 2px 8px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: 18 }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 14, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🐟</span>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--ink)', fontFamily: 'Sora, sans-serif' }}>
                Fisheries Market & Species Intelligence
              </h2>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                Live harbor mandi wholesale rates, species environmental tolerances & trip fuel profit calculator
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, background: '#f0fdf4', color: '#166534', padding: '4px 10px', borderRadius: 6, border: '1px solid #bbf7d0' }}>
              ● LIVE HARBOR MANDI FEED
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', padding: '4px 10px', borderRadius: 6, border: '1px solid #bfdbfe' }}>
              INCOIS BIO-TOLERANCE LINKED
            </span>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 10, flexWrap: 'wrap' }}>
          {[
            { id: 'mandi', label: '📊 Daily Harbor Wholesale Prices', icon: '💰' },
            { id: 'species-bio', label: '🧬 Species Bio-Tolerance & PFZ Matrix', icon: '🔬' },
            { id: 'ban-tracker', label: '⏳ Monsoon Fishing Ban Countdown', icon: '📅' },
            { id: 'profit-calc', label: '⛽ Trip Fuel vs Catch Profit Estimator', icon: '🧮' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFishSubTab(tab.id)}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                border: fishSubTab === tab.id ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                background: fishSubTab === tab.id ? '#0284c7' : '#ffffff',
                color: fishSubTab === tab.id ? '#ffffff' : '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: DAILY HARBOR WHOLESALE MANDI PRICES */}
        {fishSubTab === 'mandi' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: 13, color: '#334155', fontWeight: 600 }}>
                Wholesale rates at <strong>{selectedRegion}</strong> fish landing center & harbor mandi (Updated 06:00 IST Today)
              </div>
              <input
                type="text"
                placeholder="Search species (e.g. Tuna, Sardine, Vanjaram)..."
                value={mandiSearch}
                onChange={(e) => setMandiSearch(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 12,
                  minWidth: 260,
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {HARBOR_MANDI_PRICES
                .filter(item => 
                  item.species.toLowerCase().includes(mandiSearch.toLowerCase()) || 
                  item.localName.toLowerCase().includes(mandiSearch.toLowerCase())
                )
                .map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 10,
                      padding: 14,
                      background: '#f8fafc',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 10
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <strong style={{ fontSize: 14, color: '#0f172a' }}>{item.species}</strong>
                        <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                          {item.demand}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: '#64748b' }}>Local name: <em>{item.localName}</em></span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
                      <div>
                        <span style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>₹{item.price}</span>
                        <span style={{ fontSize: 11, color: '#64748b', marginLeft: 3 }}>/ kg</span>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: item.trendDir === 'up' ? '#16a34a' : item.trendDir === 'down' ? '#dc2626' : '#64748b' }}>
                        {item.trendDir === 'up' ? `▲ +₹${item.trend}/kg` : item.trendDir === 'down' ? `▼ ${item.trend}/kg` : '● Steady'}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 2: SPECIES BIO-TOLERANCE & PFZ MATRIX */}
        {fishSubTab === 'species-bio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: 12, borderRadius: 8, fontSize: 12, color: '#0369a1', lineHeight: 1.5 }}>
              💡 <strong>How to use this with ORCA:</strong> Cross-reference the live Sea Surface Temperature (SST) and Chlorophyll-a layers on the <strong>Map Explorer</strong> with the optimum ranges below to pinpoint targeted high-yield schools.
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#334155' }}>
                    <th style={{ padding: '10px 12px', borderBottom: '2px solid #cbd5e1' }}>Commercial Species</th>
                    <th style={{ padding: '10px 12px', borderBottom: '2px solid #cbd5e1' }}>Optimum SST</th>
                    <th style={{ padding: '10px 12px', borderBottom: '2px solid #cbd5e1' }}>Chlorophyll-a</th>
                    <th style={{ padding: '10px 12px', borderBottom: '2px solid #cbd5e1' }}>Salinity</th>
                    <th style={{ padding: '10px 12px', borderBottom: '2px solid #cbd5e1' }}>Depth Zone</th>
                    <th style={{ padding: '10px 12px', borderBottom: '2px solid #cbd5e1' }}>Recommended Gear</th>
                    <th style={{ padding: '10px 12px', borderBottom: '2px solid #cbd5e1' }}>PFZ Oceanic Indicator</th>
                  </tr>
                </thead>
                <tbody>
                  {SPECIES_BIO_MATRIX.map((s, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>{s.species}</td>
                      <td style={{ padding: '10px 12px', color: '#0284c7', fontWeight: 600 }}>{s.optSST}</td>
                      <td style={{ padding: '10px 12px', color: '#16a34a', fontWeight: 600 }}>{s.optChla}</td>
                      <td style={{ padding: '10px 12px' }}>{s.optSalinity}</td>
                      <td style={{ padding: '10px 12px' }}>{s.depth}</td>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>{s.gear}</td>
                      <td style={{ padding: '10px 12px', fontSize: 11, color: '#475569' }}>{s.pfzIndicator}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: MONSOON FISHING BAN COUNTDOWN */}
        {fishSubTab === 'ban-tracker' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            <div style={{ background: '#f8fafc', padding: 18, borderRadius: 10, border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🌊</span>
                <div>
                  <strong style={{ fontSize: 14, color: '#0f172a' }}>East Coast of India (Uniform Ban)</strong>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Bay of Bengal & Andhra / TN / Odisha / WB</div>
                </div>
              </div>
              <div style={{ background: '#eff6ff', padding: 12, borderRadius: 8, border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 700 }}>MANDATORY PERIOD (61 DAYS)</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>April 15 to June 14</div>
                <div style={{ fontSize: 11, color: '#16a34a', marginTop: 4, fontWeight: 700 }}>● Active Open Fishing Season Currently</div>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                Applies to all motorized trawlers & mechanized vessels to conserve breeding broodstock during the pre-monsoon spawning season.
              </p>
            </div>

            <div style={{ background: '#f8fafc', padding: 18, borderRadius: 10, border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🌊</span>
                <div>
                  <strong style={{ fontSize: 14, color: '#0f172a' }}>West Coast of India (Uniform Ban)</strong>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Arabian Sea & Kerala / Goa / Maharashtra / Gujarat</div>
                </div>
              </div>
              <div style={{ background: '#eff6ff', padding: 12, borderRadius: 8, border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 700 }}>MANDATORY PERIOD (61 DAYS)</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>June 1 to July 31</div>
                <div style={{ fontSize: 11, color: '#16a34a', marginTop: 4, fontWeight: 700 }}>● Active Open Fishing Season Currently</div>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                Enforced strictly by Coast Guard and State Fisheries departments for sustainable pelagic stock replenishment.
              </p>
            </div>
          </div>
        )}

        {/* TAB 4: TRIP FUEL VS CATCH PROFIT ESTIMATOR */}
        {fishSubTab === 'profit-calc' && (() => {
          const totalFuelCost = calcInputs.dieselLiters * calcInputs.dieselRate
          const totalExpense = totalFuelCost + calcInputs.iceAndProvisions
          const grossRev = calcInputs.expectedHaulKg * calcInputs.avgFishRate
          const netRev = Math.max(0, grossRev - totalExpense)
          const crewShare = (netRev * (calcInputs.crewSharePct / 100))
          const crewPerHead = calcInputs.crewCount > 0 ? (crewShare / calcInputs.crewCount).toFixed(0) : 0
          const boatProfit = netRev - crewShare
          const isProfitable = grossRev >= totalExpense

          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {/* Inputs */}
              <div style={{ background: '#f8fafc', padding: 18, borderRadius: 10, border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>
                  Voyage Parameters
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, color: '#475569', marginBottom: 2 }}>Diesel Fuel (Liters)</label>
                    <input
                      type="number"
                      value={calcInputs.dieselLiters}
                      onChange={(e) => setCalcInputs({ ...calcInputs, dieselLiters: Number(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, color: '#475569', marginBottom: 2 }}>Diesel Rate (₹/L)</label>
                    <input
                      type="number"
                      value={calcInputs.dieselRate}
                      onChange={(e) => setCalcInputs({ ...calcInputs, dieselRate: Number(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, color: '#475569', marginBottom: 2 }}>Ice & Provisions (₹)</label>
                    <input
                      type="number"
                      value={calcInputs.iceAndProvisions}
                      onChange={(e) => setCalcInputs({ ...calcInputs, iceAndProvisions: Number(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, color: '#475569', marginBottom: 2 }}>Crew Count</label>
                    <input
                      type="number"
                      value={calcInputs.crewCount}
                      onChange={(e) => setCalcInputs({ ...calcInputs, crewCount: Number(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, color: '#475569', marginBottom: 2 }}>Target Catch (kg)</label>
                    <input
                      type="number"
                      value={calcInputs.expectedHaulKg}
                      onChange={(e) => setCalcInputs({ ...calcInputs, expectedHaulKg: Number(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, color: '#475569', marginBottom: 2 }}>Avg Price (₹/kg)</label>
                    <input
                      type="number"
                      value={calcInputs.avgFishRate}
                      onChange={(e) => setCalcInputs({ ...calcInputs, avgFishRate: Number(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    />
                  </div>
                </div>
              </div>

              {/* Outputs */}
              <div style={{ background: isProfitable ? '#f0fdf4' : '#fef2f2', padding: 18, borderRadius: 10, border: isProfitable ? '1px solid #bbf7d0' : '1px solid #fecaca', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: isProfitable ? '#166534' : '#991b1b', textTransform: 'uppercase' }}>
                  Projected Net Trip Profitability
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ background: '#ffffff', padding: 10, borderRadius: 6, border: '1px solid #cbd5e1' }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Total Trip Expense</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#dc2626', marginTop: 2 }}>₹{totalExpense.toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>Fuel: ₹{totalFuelCost.toLocaleString()}</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: 10, borderRadius: 6, border: '1px solid #cbd5e1' }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Estimated Gross Sales</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0284c7', marginTop: 2 }}>₹{grossRev.toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>{calcInputs.expectedHaulKg} kg @ ₹{calcInputs.avgFishRate}</div>
                  </div>
                </div>

                <div style={{ background: '#ffffff', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#475569' }}>Boat Owner Net Margin:</span>
                    <strong style={{ fontSize: 14, color: isProfitable ? '#16a34a' : '#dc2626' }}>₹{boatProfit.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#475569' }}>Total Crew Share ({calcInputs.crewSharePct}%):</span>
                    <strong style={{ fontSize: 13, color: '#0f172a' }}>₹{crewShare.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: '#475569' }}>Per Crew Member ({calcInputs.crewCount} hands):</span>
                    <strong style={{ fontSize: 13, color: '#0284c7' }}>₹{crewPerHead}</strong>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      {/* SECTION 3: SEND MESSAGE / COMPLAINT TO COASTAL AUTHORITY */}
      <div style={{ background: '#ffffff', border: '1px solid #dce7f0', borderRadius: 12, padding: 22, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--ink)', fontFamily: 'Sora, sans-serif' }}>
              Send Message / Complaint to Coastal Authority
            </h2>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              Direct line to report harbor issues, oil leaks, net damage, or request assistance
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmitMessage} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                Sender Name & Role
              </label>
              <input
                type="text"
                disabled
                value={`${user?.name || user?.email?.split('@')[0] || 'Fisherman'} (Fisherman / Mariner)`}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: 13, color: '#475569' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                Location / Jetty
              </label>
              <input
                type="text"
                required
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                placeholder="e.g. Kasimedu Fishing Jetty / Outer Breakwater"
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                Message / Complaint Details *
              </label>
              <VoiceInputControl
                onTranscript={(transcript) => setMessageText(transcript)}
                currentValue={messageText}
                defaultRegion={selectedRegion}
                buttonLabel="Speak Message (Mic)"
              />
            </div>
            <textarea
              required
              rows={4}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Describe your concern, emergency issue, harbor obstruction, or sea hazard in detail (or click Speak Message above to talk)..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'Inter, sans-serif' }}
            />
          </div>

          {/* ATTACH PHOTO */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#0284c7' }}>
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span>Attach Hazard Photo (Optional)</span>
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                Choose File
                <input type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: 'none' }} />
              </label>
              {photoFile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#0369a1', fontWeight: 600 }}>{photoFile.name}</span>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {photoPreview && (
              <div style={{ marginTop: 10 }}>
                <img
                  src={photoPreview}
                  alt="Attachment preview"
                  style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid #0284c7' }}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              type="submit"
              disabled={submittingMessage}
              style={{
                padding: '11px 22px',
                fontSize: 13,
                fontWeight: 800,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: 'none',
                cursor: submittingMessage ? 'wait' : 'pointer',
                boxShadow: '0 3px 10px rgba(2, 132, 199, 0.2)',
                letterSpacing: 0.5,
              }}
            >
              {submittingMessage ? 'Submitting to Database...' : 'SEND TO COASTAL AUTHORITY'}
            </button>
          </div>
        </form>

        {/* RECENT SUBMITTED COMPLAINTS & AUTHORITY RESPONSES */}
        <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid #f1f5f9' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--ink)', fontFamily: 'Sora, sans-serif', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#0284c7' }}>
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            </svg>
            <span>Your Submitted Messages & Authority Responses ({complaints.length})</span>
          </h3>

          {loadingComplaints ? (
            <div style={{ padding: 14, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Loading messages from database...
            </div>
          ) : complaints.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>
              No messages submitted yet. Use the form above to send your first message.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {complaints.map((c) => (
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
                        {c.senderName} ({c.senderRole})
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span>{c.region}</span>
                      </span>
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

      {/* NOTIFICATION DETAIL MODAL */}
      {selectedNotifModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setSelectedNotifModal(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              width: '100%',
              maxWidth: 580,
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              border: selectedNotifModal.severity === 'DANGER' ? '1px solid #fecaca' : '1px solid #e2e8f0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>{selectedNotifModal.icon}</span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: selectedNotifModal.type === 'Alert' ? '#dc2626' : '#0369a1',
                    background: selectedNotifModal.type === 'Alert' ? '#fef2f2' : '#e0f2fe',
                    padding: '4px 10px',
                    borderRadius: 6,
                  }}
                >
                  OFFICIAL COASTAL {selectedNotifModal.type.toUpperCase()}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: '#ffffff',
                    background: selectedNotifModal.severity === 'DANGER' ? '#dc2626' : selectedNotifModal.severity === 'WARNING' ? '#d97706' : '#0284c7',
                    padding: '4px 8px',
                    borderRadius: 4,
                  }}
                >
                  {selectedNotifModal.severity}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotifModal(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a', fontFamily: 'Sora, sans-serif' }}>
              {selectedNotifModal.title}
            </h2>

            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Issuing Authority: <strong>{selectedNotifModal.source}</strong></span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Operational Region: <strong>{selectedNotifModal.region}</strong></span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Target Audience: <strong>{selectedNotifModal.targetAudience}</strong></span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Published Timestamp: <strong>{selectedNotifModal.datetime}</strong></span>
            </div>

            <div>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Detailed Information:</span>
              <p style={{ margin: 0, fontSize: 14, color: '#334155', lineHeight: 1.55, whiteSpace: 'pre-line' }}>
                {selectedNotifModal.details}
              </p>
            </div>

            {selectedNotifModal.actionRequired && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 12 }}>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#92400e', marginBottom: 4 }}>
                  ⚠️ Action Required / Mariner Instructions:
                </span>
                <p style={{ margin: 0, fontSize: 13, color: '#78350f', lineHeight: 1.45 }}>
                  {selectedNotifModal.actionRequired}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
              <button
                type="button"
                onClick={() => setSelectedNotifModal(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  background: '#334155',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
