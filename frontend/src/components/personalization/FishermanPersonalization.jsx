import React, { useState, useEffect, useCallback } from 'react'
import { coastalService } from '../../services/coastalService'

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

export default function FishermanPersonalization({ user, userKey }) {
  // 1. REGION SELECTION
  const [selectedRegion, setSelectedRegion] = useState('Visakhapatnam Coast')

  // 2. DATA STATES
  const [notifications, setNotifications] = useState([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const [activeFilter, setActiveFilter] = useState('ALL') // 'ALL' | 'ALERT' | 'ANNOUNCEMENT'
  const [complaints, setComplaints] = useState([])
  const [loadingComplaints, setLoadingComplaints] = useState(false)

  // 3. COMPLAINT / MESSAGE FORM STATE
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

      {/* SECTION 3: 💬 SEND MESSAGE / COMPLAINT TO COASTAL AUTHORITY */}
      <div style={{ background: '#ffffff', border: '1px solid #dce7f0', borderRadius: 12, padding: 22, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
          <span style={{ fontSize: 20 }}>💬</span>
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
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
              Message / Complaint Details *
            </label>
            <textarea
              required
              rows={4}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Describe your concern, emergency issue, harbor obstruction, or sea hazard in detail..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'Inter, sans-serif' }}
            />
          </div>

          {/* ATTACH PHOTO */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
              📷 Attach Hazard Photo (Optional)
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
          <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--ink)', fontFamily: 'Sora, sans-serif' }}>
            📋 Your Submitted Messages & Authority Responses ({complaints.length})
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
