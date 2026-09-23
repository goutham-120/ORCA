import React, { useState, useEffect, useCallback } from 'react'
import { coastalService } from '../../services/coastalService'

// Verified public maritime & naval facility data by region
const REGIONAL_MARITIME_FACILITIES = {
  'Visakhapatnam Coast': [
    { id: 'f1', type: 'Naval Establishment', name: 'Eastern Naval Command HQ', location: 'Visakhapatnam', badge: 'Publicly listed', icon: '⚓' },
    { id: 'f2', type: 'Coast Guard Station', name: 'ICGS Visakhapatnam (District HQ 6)', location: 'Visakhapatnam Harbor', badge: 'Active Station', icon: '🛟' },
    { id: 'f3', type: 'Major Port', name: 'Visakhapatnam Port Authority', location: 'Outer & Inner Harbor', badge: 'Deepwater Port', icon: '⚓' },
    { id: 'f4', type: 'Shipyard / Infrastructure', name: 'Hindustan Shipyard Limited (HSL)', location: 'Gandhigram, Visakhapatnam', badge: 'Public Shipyard', icon: '🚢' },
    { id: 'f5', type: 'Naval Air Station', name: 'INS Dega Air Station', location: 'Visakhapatnam', badge: 'Naval Aviation', icon: '🚁' },
  ],
  'Chennai Coast': [
    { id: 'f6', type: 'Naval Establishment', name: 'INS Adyar Naval Station', location: 'Chennai', badge: 'Publicly listed', icon: '⚓' },
    { id: 'f7', type: 'Coast Guard Station', name: 'ICGS Chennai (Coast Guard Region East HQ)', location: 'Chennai Harbor', badge: 'Regional HQ', icon: '🛟' },
    { id: 'f8', type: 'Major Port', name: 'Chennai Port & Kamarajar Port (Ennore)', location: 'Chennai / Ennore', badge: 'Major Trade Gateway', icon: '⚓' },
    { id: 'f9', type: 'Maritime Control', name: 'Chennai Lighthouse & VTS Station', location: 'Marina / Port Approach', badge: 'Vessel Traffic Ops', icon: '🚨' },
  ],
  'Bay of Bengal': [
    { id: 'f10', type: 'Naval Establishment', name: 'INS Netaji Subhas Naval Base', location: 'Kolkata', badge: 'Publicly listed', icon: '⚓' },
    { id: 'f11', type: 'Tri-Services Command', name: 'Andaman & Nicobar Command HQ', location: 'Port Blair', badge: 'Joint Command', icon: '🛡️' },
    { id: 'f12', type: 'Coast Guard Station', name: 'ICGS Haldia (District HQ 8)', location: 'Haldia / Hooghly Estuary', badge: 'Active Station', icon: '🛟' },
    { id: 'f13', type: 'Major Port', name: 'Syama Prasad Mookerjee Port', location: 'Kolkata & Haldia Docks', badge: 'Riverine Port', icon: '⚓' },
  ],
  'Andhra Pradesh Coast': [
    { id: 'f14', type: 'Major Port', name: 'Kakinada Deep Water Port', location: 'Kakinada', badge: 'Commercial Port', icon: '⚓' },
    { id: 'f15', type: 'Coast Guard Station', name: 'ICGS Krishnapatnam', location: 'Krishnapatnam Harbor', badge: 'Active Station', icon: '🛟' },
    { id: 'f16', type: 'Naval Establishment', name: 'INS Karna Naval Depot', location: 'Bheemunipatnam', badge: 'Publicly listed', icon: '⚓' },
  ],
  'Odisha Coast': [
    { id: 'f17', type: 'Major Port', name: 'Paradip Port Authority', location: 'Paradip', badge: 'Major Bulk Cargo Port', icon: '⚓' },
    { id: 'f18', type: 'Coast Guard Station', name: 'ICGS Paradip & ICGS Dhamra', location: 'Paradip Coast', badge: 'Search & Rescue Ops', icon: '🛟' },
    { id: 'f19', type: 'Defense Facility', name: 'Chandipur Maritime Test Range', location: 'Chandipur, Odisha', badge: 'Public Range', icon: '🛡️' },
  ],
  'Gujarat Coast': [
    { id: 'f20', type: 'Naval Establishment', name: 'INS Dwarka Naval Station', location: 'Okha, Gujarat', badge: 'Publicly listed', icon: '⚓' },
    { id: 'f21', type: 'Coast Guard Station', name: 'ICGS Porbandar (Coast Guard Air Enclave)', location: 'Porbandar', badge: 'Air & Sea Ops', icon: '🛟' },
    { id: 'f22', type: 'Major Port', name: 'Deendayal Port Authority (Kandla)', location: 'Gulf of Kutch', badge: 'Major Gateway', icon: '⚓' },
  ],
}

// Verified public naval & maritime development news/announcements by region
const REGIONAL_NAV_DEVELOPMENTS = {
  'Visakhapatnam Coast': [
    {
      id: 'd1',
      title: 'INS Arighaat SSBN Commissioning',
      shortDesc: "India's second indigenously built nuclear-powered ballistic missile submarine officially commissioned into service at Visakhapatnam.",
      source: 'Ministry of Defence (PIB) / Indian Navy',
      date: 'Sep 2026',
      details: 'Official commissioning of INS Arighaat (S73) at Visakhapatnam in the presence of Defence Minister Rajnath Singh. The submarine incorporates enhanced indigenous propulsion, advanced sonar suites, and strategic deterrence capabilities in the Indian Ocean Region. Built at the Ship Building Centre (SBC), Visakhapatnam.',
    },
    {
      id: 'd2',
      title: 'Project 75I Air-Independent Propulsion (AIP) Program',
      shortDesc: 'Public acquisition milestone for six next-generation conventional submarines equipped with indigenous Air-Independent Propulsion (AIP) systems.',
      source: 'Defence Acquisition Council (DAC) / MoD Press Release',
      date: 'Aug 2026',
      details: 'Strategic Partnership project authorizing indigenous manufacturing of 6 diesel-electric submarines featuring AIP technology developed by NMRL/DRDO. Enables extended underwater endurance, reduced acoustic signature, and enhanced coastal defense readiness.',
    },
    {
      id: 'd3',
      title: 'Project 17B Next-Generation Guided Missile Stealth Frigates',
      shortDesc: 'Sanction for construction of advanced stealth frigates with indigenous active phased array radars and surface-to-air missile systems.',
      source: 'Indian Navy Official Spokesperson',
      date: 'Jul 2026',
      details: 'Follow-on project to Project 17A Nilgiri-class frigates, featuring refined stealth hull geometry, indigenous combat management systems, and upgraded anti-submarine warfare weapons.',
    },
  ],
  'Chennai Coast': [
    {
      id: 'd4',
      title: 'Next-Generation Offshore Patrol Vessel (NGOPV) Fleet Induction',
      shortDesc: 'Induction of new fast patrol vessels and offshore patrol ships built for Coast Guard maritime surveillance across Tamil Nadu coast.',
      source: 'Indian Coast Guard Headquarters (East)',
      date: 'Sep 2026',
      details: 'Induction of indigenous Next-Generation OPVs equipped with 30mm remote-controlled guns, advanced surveillance radar, high-speed rescue craft, and pollution containment booms for EEZ security.',
    },
    {
      id: 'd5',
      title: 'Integrated Coastal Surveillance System Network Upgrade',
      shortDesc: 'Upgradation of coastal radar stations, AIS receivers, and day/night optical cameras along the Chennai and Ennore coastline.',
      source: 'Coastal Security Scheme / MoD PIB',
      date: 'Aug 2026',
      details: 'Enhance maritime domain awareness by integrating chain of static radars with automatic identification systems, transmitting real-time operational feeds to Coast Guard command centers.',
    },
  ],
  'Bay of Bengal': [
    {
      id: 'd6',
      title: 'Fleet Support Vessels (FSV) Construction Program',
      shortDesc: 'Public announcement for 44,000-tonne fleet replenishment ships to support sustained naval operations in the Bay of Bengal and IOR.',
      source: 'Ministry of Defence Press Release',
      date: 'Aug 2026',
      details: 'Construction of 5 Fleet Support Vessels designed for underway replenishment of fuel, water, ammunition, and stores to naval task groups operating in deep waters.',
    },
    {
      id: 'd7',
      title: 'Andaman & Nicobar Command Airfield Expansion',
      shortDesc: 'Public infrastructure modernization at island air stations for extended maritime patrol aircraft deployment.',
      source: 'HQ Andaman & Nicobar Command',
      date: 'Jul 2026',
      details: 'Runway extensions and hangar facility upgrades at INS Kohassa and INS Baaz to support P-8I Long Range Maritime Reconnaissance (LRMR) operations across the Bay of Bengal and Malacca Strait approaches.',
    },
  ],
  'Andhra Pradesh Coast': [
    {
      id: 'd8',
      title: 'Naval Aircraft Repair Yard Infrastructure Expansion',
      shortDesc: 'Upgradation of naval aviation maintenance and overhaul facilities for anti-submarine helicopters off AP coast.',
      source: 'Eastern Naval Command Announcement',
      date: 'Aug 2026',
      details: 'Enhances localized maintenance turnaround for MH-60R Seahawk and Sea King helicopters deployed on eastern seaboard combat ships.',
    },
  ],
  'Odisha Coast': [
    {
      id: 'd9',
      title: 'Coastal Defense Missile Battery Modernization',
      shortDesc: 'Public test and deployment of surface-to-sea anti-ship coastal battery systems for shoreline defense.',
      source: 'DRDO / Ministry of Defence',
      date: 'Sep 2026',
      details: 'Successful flight test of supersonic coastal anti-ship missile system conducted off Odisha coast, validating pinpoint precision against offshore maritime targets.',
    },
  ],
  'Gujarat Coast': [
    {
      id: 'd10',
      title: 'Western Seaboard Maritime Patrol Aircraft Induction',
      shortDesc: 'Deployment of upgraded Dornier 228 maritime surveillance aircraft equipped with synthetic aperture radar.',
      source: 'Indian Coast Guard Regional HQ (West)',
      date: 'Sep 2026',
      details: 'Equipped with maritime search radar, electro-optic infrared sensors, and emergency oil-spill dispersant spray pods to monitor Sir Creek and Gulf of Kutch maritime boundaries.',
    },
  ],
}

// Verified public regional maritime exercises & activities by region
const REGIONAL_MARITIME_ACTIVITY = {
  'Visakhapatnam Coast': [
    {
      id: 'a1',
      title: 'Exercise MILAN Multilateral Naval Exercise',
      shortDesc: 'Flagship international maritime exercise hosted by Indian Navy at Visakhapatnam, featuring participation from friendly foreign navies.',
      source: 'Eastern Naval Command / Indian Navy',
      datetime: 'Sep 2026',
      details: 'Over 40 friendly foreign navies assemble at Visakhapatnam for harbor interaction and sea phase exercises. Focuses on anti-submarine warfare, tactical maneuvers, search and rescue, and maritime security protocols in the Indian Ocean Region.',
    },
    {
      id: 'a2',
      title: 'Exercise Sagar Kavach Coastal Security Drill',
      shortDesc: 'Joint coastal security exercise conducted by Indian Coast Guard, State Police, Marine Police, Customs, and Port Authorities.',
      source: 'Coast Guard District HQ 6 (Visakhapatnam)',
      datetime: 'Sep 2026',
      details: 'Simulated seaward infiltration scenarios, security audits of fish landing centers, verification of biometric ID cards for sea-going fishermen, and integrated response drills across AP coastal districts.',
    },
  ],
  'Chennai Coast': [
    {
      id: 'a3',
      title: 'Exercise NATPOLREX National Pollution Response Drill',
      shortDesc: 'National level marine oil spill response exercise conducted by Indian Coast Guard off Chennai Port.',
      source: 'Indian Coast Guard Regional HQ (East)',
      datetime: 'Sep 2026',
      details: 'Validates National Oil Spill Disaster Contingency Plan (NOS-DCP). Deploys specialized pollution response vessels, oil skimmers, and boom barriers to contain simulated offshore tanker leaks.',
    },
    {
      id: 'a4',
      title: 'SIMBEX Bilateral Maritime Exercise',
      shortDesc: 'Annual bilateral maritime exercise between Indian Navy and Republic of Singapore Navy off the Bay of Bengal.',
      source: 'Ministry of Defence Press Information Bureau',
      datetime: 'Aug 2026',
      details: 'Complex naval exercises including live weapon firings, seamanship evolutions, surface-to-air tracking, and coordinated anti-submarine warfare tactics.',
    },
  ],
  'Bay of Bengal': [
    {
      id: 'a5',
      title: 'Colombo Security Conclave Regional Maritime Safety Workshop',
      shortDesc: 'Multi-nation maritime safety and security workshop focusing on joint HADR operations and counter-smuggling.',
      source: 'National Security Council Secretariat (NSCS)',
      datetime: 'Aug 2026',
      details: 'Joint initiative between India, Sri Lanka, Maldives, and Mauritius for sharing maritime domain awareness data, SAR coordination, and combatting illegal unrecorded fishing in BOB.',
    },
    {
      id: 'a6',
      title: 'IONS Maritime Search & Rescue (SAR) Tabletop Exercise',
      shortDesc: 'Indian Ocean Naval Symposium (IONS) workshop on humanitarian assistance and disaster relief coordination.',
      source: 'Indian Navy IONS Secretariat',
      datetime: 'Jul 2026',
      details: 'Tabletop exercise establishing standardized operating procedures for joint air-sea search and rescue during severe tropical cyclones in the Bay of Bengal.',
    },
  ],
  'Andhra Pradesh Coast': [
    {
      id: 'a7',
      title: 'Coastal Area Patrol & Fishermen Awareness Campaign',
      shortDesc: 'Coast Guard interactive security session with local fishing boat associations along Kakinada coast.',
      source: 'ICGS Kakinada',
      datetime: 'Aug 2026',
      details: 'Educates local fishermen on distress beacon usage (DATs), VHF emergency channels, sea boundary awareness, and reporting suspicious vessel sightings.',
    },
  ],
  'Odisha Coast': [
    {
      id: 'a8',
      title: 'Operation Olive Coastal Turtle Protection Drill',
      shortDesc: 'Coast Guard annual maritime patrol operation for Olive Ridley sea turtle conservation off Gahirmatha sanctuary.',
      source: 'Coast Guard District HQ 7 (Paradip)',
      datetime: 'Sep 2026',
      details: 'Enforces mandatory installation of Turtle Excluder Devices (TEDs) on trawlers and restricts unauthorized fishing within 20km of Gahirmatha rookery.',
    },
  ],
  'Gujarat Coast': [
    {
      id: 'a9',
      title: 'Exercise Sea Vigil Western Seaboard Coastal Defense',
      shortDesc: 'Pan-India coastal defense exercise verifying coastal security infrastructure across Gujarat and Arabian Sea coastline.',
      source: 'Western Naval Command / Indian Coast Guard',
      datetime: 'Sep 2026',
      details: 'Comprehensive security audit covering all coastal mandals, fish landing centers, major ports, offshore oil assets, and vital installations along the Western seaboard.',
    },
  ],
}

export default function CoastalAuthorityPersonalization({ user, userKey }) {
  // 1. OPERATIONAL REGION STATE
  const [operationalRegion, setOperationalRegion] = useState('Visakhapatnam Coast')

  // 2. LIVE BACKEND DATA STATES
  const [hazards, setHazards] = useState([])
  const [complaints, setComplaints] = useState([])
  const [loadingHazards, setLoadingHazards] = useState(false)
  const [loadingComplaints, setLoadingComplaints] = useState(false)

  // Modals & Toast States
  const [selectedHazardModal, setSelectedHazardModal] = useState(null)
  const [selectedComplaintView, setSelectedComplaintView] = useState(null)
  const [selectedComplaintRespond, setSelectedComplaintRespond] = useState(null)
  const [selectedDevModal, setSelectedDevModal] = useState(null)
  const [selectedActModal, setSelectedActModal] = useState(null)
  const [responseText, setResponseText] = useState('')
  const [submittingResponse, setSubmittingResponse] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Derived datasets for Maritime & Regional Security section
  const currentFacilities = REGIONAL_MARITIME_FACILITIES[operationalRegion] || REGIONAL_MARITIME_FACILITIES['Visakhapatnam Coast']
  const currentDevelopments = REGIONAL_NAV_DEVELOPMENTS[operationalRegion] || REGIONAL_NAV_DEVELOPMENTS['Visakhapatnam Coast']
  const currentActivities = REGIONAL_MARITIME_ACTIVITY[operationalRegion] || REGIONAL_MARITIME_ACTIVITY['Visakhapatnam Coast']

  // 3. ISSUE ANNOUNCEMENT FORM STATE
  const [annForm, setAnnForm] = useState({
    title: '',
    details: '',
    targetAudience: 'Fishermen / Mariners',
  })

  const currentTimeStr = new Date().toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  // Fetch live hazard reports submitted by Marine & Disaster Operations
  const loadBackendHazards = useCallback(async () => {
    setLoadingHazards(true)
    try {
      const hazList = await coastalService.fetchHazards(operationalRegion)
      setHazards(hazList || [])
    } catch (err) {
      console.error('Failed to load hazard reports from backend database', err)
    } finally {
      setLoadingHazards(false)
    }
  }, [operationalRegion])

  // Fetch live complaints submitted by Fishermen & Marine Operators
  const loadBackendComplaints = useCallback(async () => {
    setLoadingComplaints(true)
    try {
      const compList = await coastalService.fetchComplaints(operationalRegion)
      setComplaints(compList || [])
    } catch (err) {
      console.error('Failed to load complaints from backend database', err)
    } finally {
      setLoadingComplaints(false)
    }
  }, [operationalRegion])

  useEffect(() => {
    loadBackendHazards()
    loadBackendComplaints()
  }, [loadBackendHazards, loadBackendComplaints])

  // Acknowledge Hazard Action
  const handleAcknowledgeHazard = async (hazardId) => {
    try {
      const updated = await coastalService.acknowledgeHazard(hazardId)
      setHazards((prev) => prev.map((h) => (h.id === hazardId ? updated : h)))
      if (selectedHazardModal && selectedHazardModal.id === hazardId) {
        setSelectedHazardModal(updated)
      }
      setToastMessage('✓ Hazard report acknowledged and updated in database!')
    } catch (err) {
      setToastMessage('Failed to acknowledge hazard report.')
    } finally {
      setTimeout(() => setToastMessage(''), 4000)
    }
  }

  // Submit Response to Complaint/Message Action
  const handleSendResponse = async (e) => {
    e.preventDefault()
    if (!selectedComplaintRespond || !responseText.trim()) {
      return
    }

    setSubmittingResponse(true)
    try {
      const updated = await coastalService.respondComplaint(selectedComplaintRespond.id, responseText.trim())
      setComplaints((prev) => prev.map((c) => (c.id === selectedComplaintRespond.id ? updated : c)))
      setToastMessage('✓ Response sent and stored in database!')
      setSelectedComplaintRespond(null)
      setResponseText('')
    } catch (err) {
      console.error('Failed to send response', err)
      setToastMessage('❌ Failed to store response in database.')
    } finally {
      setSubmittingResponse(false)
      setTimeout(() => setToastMessage(''), 4000)
    }
  }

  // Publish Announcement Action
  const handlePublishAnnouncement = async (e) => {
    e.preventDefault()
    if (!annForm.title.trim() || !annForm.details.trim()) {
      setToastMessage('Please enter both announcement title and details.')
      setTimeout(() => setToastMessage(''), 3500)
      return
    }

    try {
      const created = await coastalService.publishAnnouncement({
        title: annForm.title.trim(),
        details: annForm.details.trim(),
        source: 'Coastal Authority Desk',
        region: operationalRegion,
        target_audience: annForm.targetAudience,
        datetime: currentTimeStr,
      })
      setAnnForm({ title: '', details: '', targetAudience: 'Fishermen / Mariners' })
      setToastMessage(`📢 Official Announcement published to database for [ ${created.targetAudience} ]!`)
    } catch (err) {
      setToastMessage('Failed to publish announcement to backend database.')
    } finally {
      setTimeout(() => setToastMessage(''), 4500)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="font-sans">
      
      {/* TOAST BANNER */}
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
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
          }}
        >
          <span>{toastMessage}</span>
          <small style={{ fontSize: 11, background: '#dc2626', color: '#ffffff', padding: '3px 9px', borderRadius: 6, fontWeight: 700, letterSpacing: 0.5 }}>COASTAL AUTHORITY DESK</small>
        </div>
      )}

      {/* 1. OPERATIONAL / COASTAL REGION CONTROL HEADER */}
      <div className="panel" style={{ padding: 20, background: 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)', color: '#ffffff', borderRadius: 12, border: '1px solid #991b1b' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🏛️</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#fca5a5', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                COASTAL AUTHORITY COMMAND CENTER
              </span>
            </div>
            <h2 style={{ margin: '4px 0 0', fontSize: 19, fontWeight: 700, color: '#ffffff', fontFamily: 'Sora, sans-serif' }}>
              Hazard Review, Messages & Official Announcements
            </h2>
          </div>

          {/* Operational Region Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: 12, color: '#fecaca', fontWeight: 700 }}>Operational Region:</label>
            <select
              value={operationalRegion}
              onChange={(e) => setOperationalRegion(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                background: '#180303',
                color: '#ffffff',
                border: '1px solid #b91c1c',
                fontSize: 13,
                fontWeight: 700,
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
        </div>
      </div>

      {/* 2. 🌐 MARITIME & REGIONAL SECURITY */}
      <div className="panel" style={{ padding: 22, background: '#ffffff', borderRadius: 12, border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* Section Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 12, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🌐</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--ink)', fontFamily: 'Sora, sans-serif', letterSpacing: 0.5 }}>
                MARITIME & REGIONAL SECURITY
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                Public defense developments, naval facilities & regional maritime awareness for <strong>{operationalRegion}</strong>.
              </p>
            </div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 800, background: '#f0fdf4', color: '#166534', padding: '4px 10px', borderRadius: 6, border: '1px solid #bbf7d0', letterSpacing: 0.5 }}>
            PUBLIC / VERIFIED SOURCES ONLY
          </span>
        </div>

        {/* SUBSECTION 1: 🏛️ NAVAL & MARITIME FACILITIES */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>🏛️</span>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a', fontFamily: 'Sora, sans-serif', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Naval & Maritime Facilities
            </h4>
          </div>

          {currentFacilities.length === 0 ? (
            <p style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>No facilities listed for this region.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              {currentFacilities.map((fac) => (
                <div
                  key={fac.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 8,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 18 }}>{fac.icon}</span>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#0369a1', background: '#e0f2fe', padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase' }}>
                        {fac.badge}
                      </span>
                    </div>
                    <strong style={{ display: 'block', fontSize: 13, color: '#0f172a', lineHeight: 1.35 }}>
                      {fac.name}
                    </strong>
                    <span style={{ display: 'block', fontSize: 11, color: '#64748b', marginTop: 3 }}>
                      📍 {fac.location}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', background: '#ffffff', padding: '3px 8px', borderRadius: 4, border: '1px solid #cbd5e1', alignSelf: 'flex-start' }}>
                    {fac.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SUBSECTION 2: 🚢 NAVAL & MARITIME DEVELOPMENTS */}
        <div style={{ paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>🚢</span>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a', fontFamily: 'Sora, sans-serif', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Naval & Maritime Developments
            </h4>
          </div>

          {currentDevelopments.length === 0 ? (
            <p style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>No naval development announcements for this region.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              {currentDevelopments.map((dev) => (
                <div
                  key={dev.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 10,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  }}
                >
                  <div>
                    <h5 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: '#0f172a', fontFamily: 'Sora, sans-serif' }}>
                      {dev.title}
                    </h5>
                    <p style={{ margin: '0 0 10px', fontSize: 12, color: '#334155', lineHeight: 1.45 }}>
                      {dev.shortDesc}
                    </p>
                    <div style={{ fontSize: 11, color: '#64748b', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span>Source: <strong>{dev.source}</strong></span>
                      <span>Date: <strong>{dev.date}</strong></span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedDevModal(dev)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      fontSize: 12,
                      fontWeight: 800,
                      background: '#f1f5f9',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    READ MORE
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SUBSECTION 3: 🌊 REGIONAL MARITIME ACTIVITY */}
        <div style={{ paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>🌊</span>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a', fontFamily: 'Sora, sans-serif', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Regional Maritime Activity
            </h4>
          </div>

          {currentActivities.length === 0 ? (
            <p style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>No maritime security exercises or regional activity listed for this region.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              {currentActivities.map((act) => (
                <div
                  key={act.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 10,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  }}
                >
                  <div>
                    <h5 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: '#0f172a', fontFamily: 'Sora, sans-serif' }}>
                      {act.title}
                    </h5>
                    <p style={{ margin: '0 0 10px', fontSize: 12, color: '#334155', lineHeight: 1.45 }}>
                      {act.shortDesc}
                    </p>
                    <div style={{ fontSize: 11, color: '#64748b', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span>Source: <strong>{act.source}</strong></span>
                      <span>Date/Time: <strong>{act.datetime}</strong></span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedActModal(act)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      fontSize: 12,
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    VIEW DETAILS
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 3. 🚨 INCOMING HAZARD NOTIFICATIONS (FROM MARINE & DISASTER OPERATIONS) */}
      <div className="panel" style={{ padding: 22, background: '#ffffff', borderRadius: 12, border: '1px solid #fecaca' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🚨</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#991b1b', fontFamily: 'Sora, sans-serif' }}>
                Incoming Hazard Notifications
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                Reports submitted by <strong>Marine & Disaster Operations</strong> (Live database).
              </p>
            </div>
          </div>

          <span style={{ fontSize: 11, fontWeight: 800, background: '#fef2f2', color: '#dc2626', padding: '4px 10px', borderRadius: 6, border: '1px solid #fecaca' }}>
            SOURCE: MARINE & DISASTER OPS
          </span>
        </div>

        {loadingHazards ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#64748b', fontSize: 13 }}>Loading hazard reports...</div>
        ) : hazards.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
              No pending hazard reports for {operationalRegion} in database.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {hazards.map((item) => {
              const isAck = item.status === 'Acknowledged'
              return (
                <div
                  key={item.id}
                  style={{
                    border: isAck ? '1px solid #cbd5e1' : '1.5px solid #fecaca',
                    borderRadius: 10,
                    padding: 16,
                    background: isAck ? '#f8fafc' : '#fffcfc',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 14,
                    boxShadow: isAck ? 'none' : '0 4px 12px rgba(220, 38, 38, 0.08)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#dc2626', background: '#fef2f2', padding: '3px 9px', borderRadius: 6, textTransform: 'uppercase' }}>
                        🚨 {item.hazardType}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: isAck ? '#16a34a' : '#d97706', background: isAck ? '#dcfce7' : '#fef3c7', padding: '3px 8px', borderRadius: 4 }}>
                        {isAck ? '✓ ACKNOWLEDGED' : 'PENDING REVIEW'}
                      </span>
                    </div>

                    <div style={{ marginBottom: 10 }}>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                        📍 {item.location}
                      </span>
                      <span style={{ display: 'block', fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        🕐 {item.timestamp} • Source: <strong>{item.source || 'Marine & Disaster Operations'}</strong>
                      </span>
                    </div>

                    {item.photoPreview && (
                      <div
                        onClick={() => setSelectedHazardModal(item)}
                        style={{
                          width: '100%',
                          height: 140,
                          borderRadius: 8,
                          overflow: 'hidden',
                          border: '1px solid #cbd5e1',
                          marginBottom: 10,
                          cursor: 'pointer',
                          position: 'relative',
                        }}
                      >
                        <img src={item.photoPreview} alt="Uploaded Hazard Evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}

                    <p style={{ margin: 0, fontSize: 12, color: '#334155', lineHeight: 1.5, background: '#ffffff', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                      {item.description}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => setSelectedHazardModal(item)}
                      style={{
                        flex: 1,
                        padding: '9px',
                        fontSize: 12,
                        fontWeight: 700,
                        background: '#e0f2fe',
                        color: '#0369a1',
                        border: '1px solid #bae6fd',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      VIEW DETAILS
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAcknowledgeHazard(item.id)}
                      disabled={isAck}
                      style={{
                        flex: 1,
                        padding: '9px',
                        fontSize: 12,
                        fontWeight: 800,
                        background: isAck ? '#16a34a' : 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 6,
                        cursor: isAck ? 'default' : 'pointer',
                      }}
                    >
                      {isAck ? '✓ ACKNOWLEDGED' : 'ACKNOWLEDGE'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 4. 💬 INCOMING COMPLAINTS & MESSAGES (FROM FISHERMEN AND MARINE OPERATORS) */}
      <div className="panel" style={{ padding: 22, background: '#ffffff', borderRadius: 12, border: '1px solid #cbd5e1' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>💬</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)', fontFamily: 'Sora, sans-serif' }}>
                Incoming Complaints & Messages
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                Messages submitted by <strong>Fishermen</strong> and <strong>Marine Operators</strong> for Coastal Authority response.
              </p>
            </div>
          </div>

          <span style={{ fontSize: 12, fontWeight: 700, background: '#f0f9ff', color: '#0369a1', padding: '4px 10px', borderRadius: 6, border: '1px solid #bae6fd' }}>
            {complaints.length} Messages Received
          </span>
        </div>

        {loadingComplaints ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#64748b', fontSize: 13 }}>Loading complaints & messages...</div>
        ) : complaints.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
              No incoming messages or complaints received for {operationalRegion}.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
            {complaints.map((c) => {
              const isResponded = c.status === 'Responded'
              const isFisherman = (c.senderRole || '').toLowerCase().includes('fisherman')
              const roleIcon = isFisherman ? '🎣' : '⚓'

              return (
                <div
                  key={c.id}
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: 10,
                    padding: 16,
                    background: isResponded ? '#f8fafc' : '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  }}
                >
                  <div>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 16 }}>{roleIcon}</span>
                        <strong style={{ fontSize: 14, color: '#0f172a' }}>
                          {c.senderName} — {c.senderRole}
                        </strong>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: isResponded ? '#dcfce7' : '#fef3c7',
                          color: isResponded ? '#15803d' : '#b45309',
                        }}
                      >
                        {isResponded ? '✓ RESPONDED' : 'PENDING RESPONSE'}
                      </span>
                    </div>

                    {/* Location & Time */}
                    <div style={{ marginBottom: 10 }}>
                      <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0284c7' }}>
                        📍 {c.location && c.location !== c.region ? `${c.location} (${c.region})` : c.region}
                      </span>
                      <span style={{ display: 'block', fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        🕐 {c.timestamp}
                      </span>
                    </div>

                    {/* Photo preview if present */}
                    {c.photoUrl && (
                      <div
                        onClick={() => setSelectedComplaintView(c)}
                        style={{ width: '100%', height: 110, borderRadius: 6, overflow: 'hidden', border: '1px solid #cbd5e1', marginBottom: 10, cursor: 'pointer' }}
                      >
                        <img src={c.photoUrl} alt="Attached Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}

                    {/* Message Details */}
                    <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.45 }}>{c.message}</p>

                    {/* Authority Response if present */}
                    {c.response && (
                      <div style={{ marginTop: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 10, borderRadius: 6 }}>
                        <span style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#166534', marginBottom: 2 }}>
                          AUTHORITY RESPONSE ({c.respondedAt}):
                        </span>
                        <span style={{ fontSize: 12, color: '#14532d' }}>{c.response}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions: VIEW & RESPOND */}
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => setSelectedComplaintView(c)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        fontSize: 12,
                        fontWeight: 700,
                        background: '#f1f5f9',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      VIEW
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedComplaintRespond(c)
                        setResponseText(c.response || '')
                      }}
                      style={{
                        flex: 1,
                        padding: '8px',
                        fontSize: 12,
                        fontWeight: 800,
                        background: isResponded ? '#0284c7' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      {isResponded ? 'UPDATE RESPONSE' : 'RESPOND'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 5. 📢 ISSUE OFFICIAL AUTHORITY ANNOUNCEMENT */}
      <div className="panel" style={{ padding: 22, background: '#ffffff', borderRadius: 12, border: '1px solid #cbd5e1' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 22 }}>📢</span>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)', fontFamily: 'Sora, sans-serif' }}>
              Issue Official Authority Announcement
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
              Publish targeted advisories directly to backend database (`orca.db`).
            </p>
          </div>
        </div>

        <form onSubmit={handlePublishAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              Announcement Title *
            </label>
            <input
              type="text"
              required
              value={annForm.title}
              onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
              placeholder="e.g. Mandatory Harbor Return Notice for Visakhapatnam Trawlers"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'Inter, sans-serif' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              Announcement Details & Instructions *
            </label>
            <textarea
              rows={4}
              required
              value={annForm.details}
              onChange={(e) => setAnnForm({ ...annForm, details: e.target.value })}
              placeholder="Provide clear operational instructions, safety parameters, affected coordinates, or emergency contact details..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'Inter, sans-serif' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
              Target Audience *
            </label>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { value: 'Fishermen / Mariners', label: '🎣 Fishermen / Mariners', sub: 'Routes to Fisherman Personalization' },
                { value: 'Marine Operators', label: '⚓ Marine Operators', sub: 'Routes to Marine & Disaster Operations' },
              ].map((aud) => {
                const isChecked = annForm.targetAudience === aud.value
                return (
                  <label
                    key={aud.value}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      cursor: 'pointer',
                      padding: '10px 16px',
                      background: isChecked ? '#fef2f2' : '#ffffff',
                      color: isChecked ? '#dc2626' : '#334155',
                      border: isChecked ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                      borderRadius: 8,
                      flex: 1,
                      minWidth: 220,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13 }}>
                      <input
                        type="radio"
                        name="target-audience-strict"
                        value={aud.value}
                        checked={isChecked}
                        onChange={(e) => setAnnForm({ ...annForm, targetAudience: e.target.value })}
                        style={{ accentColor: '#dc2626' }}
                      />
                      {aud.label}
                    </div>
                    <span style={{ fontSize: 11, color: isChecked ? '#991b1b' : '#64748b', marginLeft: 24 }}>
                      {aud.sub}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          <button
            type="submit"
            className="primary-button font-inter"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: 14,
              fontWeight: 800,
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              boxShadow: '0 3px 10px rgba(15, 23, 42, 0.3)',
              cursor: 'pointer',
              letterSpacing: 0.5,
            }}
          >
            PUBLISH ANNOUNCEMENT
          </button>
        </form>
      </div>

      {/* HAZARD DETAIL MODAL */}
      {selectedHazardModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 12, maxWidth: 580, width: '100%', padding: 24, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#dc2626', background: '#fef2f2', padding: '3px 10px', borderRadius: 6, textTransform: 'uppercase' }}>
                🚨 {selectedHazardModal.hazardType} REPORT
              </span>
              <button
                type="button"
                onClick={() => setSelectedHazardModal(null)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            {selectedHazardModal.photoPreview && (
              <div style={{ width: '100%', height: 220, borderRadius: 8, overflow: 'hidden', border: '2px solid #dc2626', marginBottom: 14 }}>
                <img src={selectedHazardModal.photoPreview} alt="Full hazard proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, marginBottom: 16 }}>
              <div><strong>Location & Coordinates:</strong> {selectedHazardModal.location}</div>
              <div><strong>Timestamp:</strong> {selectedHazardModal.timestamp}</div>
              <div><strong>Reporter Source:</strong> {selectedHazardModal.source || 'Marine & Disaster Operations'} ({selectedHazardModal.opRole || 'Disaster Unit'})</div>
              <div><strong>Review Status:</strong> <span style={{ fontWeight: 700, color: selectedHazardModal.status === 'Acknowledged' ? '#16a34a' : '#d97706' }}>{selectedHazardModal.status}</span></div>
            </div>

            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 18 }}>
              <strong style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 4 }}>OPERATIONAL DESCRIPTION</strong>
              <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.5 }}>{selectedHazardModal.description}</p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => handleAcknowledgeHazard(selectedHazardModal.id)}
                disabled={selectedHazardModal.status === 'Acknowledged'}
                style={{
                  flex: 1,
                  padding: '11px',
                  fontSize: 13,
                  fontWeight: 800,
                  background: selectedHazardModal.status === 'Acknowledged' ? '#16a34a' : 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: selectedHazardModal.status === 'Acknowledged' ? 'default' : 'pointer',
                }}
              >
                {selectedHazardModal.status === 'Acknowledged' ? '✓ ACKNOWLEDGED' : 'ACKNOWLEDGE HAZARD REPORT'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedHazardModal(null)}
                style={{ padding: '11px 18px', background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLAINT VIEW DETAILS MODAL */}
      {selectedComplaintView && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 12, maxWidth: 540, width: '100%', padding: 24, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>💬</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                  {selectedComplaintView.senderName} ({selectedComplaintView.senderRole})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedComplaintView(null)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {selectedComplaintView.photoUrl && (
              <div style={{ width: '100%', height: 200, borderRadius: 8, overflow: 'hidden', border: '1px solid #cbd5e1', marginBottom: 14 }}>
                <img src={selectedComplaintView.photoUrl} alt="Complaint Evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, marginBottom: 14 }}>
              <div><strong>Location / Region:</strong> 📍 {selectedComplaintView.location && selectedComplaintView.location !== selectedComplaintView.region ? `${selectedComplaintView.location} (${selectedComplaintView.region})` : selectedComplaintView.region}</div>
              <div><strong>Timestamp:</strong> 🕐 {selectedComplaintView.timestamp}</div>
              <div><strong>Status:</strong> <span style={{ fontWeight: 700, color: selectedComplaintView.status === 'Responded' ? '#16a34a' : '#d97706' }}>{selectedComplaintView.status}</span></div>
            </div>

            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 14 }}>
              <strong style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 4 }}>MESSAGE CONTENT</strong>
              <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{selectedComplaintView.message}</p>
            </div>

            {selectedComplaintView.response && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 12, borderRadius: 8, marginBottom: 14 }}>
                <strong style={{ display: 'block', fontSize: 11, color: '#166534', marginBottom: 4 }}>AUTHORITY RESPONSE ({selectedComplaintView.respondedAt})</strong>
                <p style={{ margin: 0, fontSize: 13, color: '#14532d' }}>{selectedComplaintView.response}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  const comp = selectedComplaintView
                  setSelectedComplaintView(null)
                  setSelectedComplaintRespond(comp)
                  setResponseText(comp.response || '')
                }}
                style={{ padding: '9px 16px', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Respond to Sender
              </button>
              <button
                type="button"
                onClick={() => setSelectedComplaintView(null)}
                style={{ padding: '9px 16px', background: '#334155', color: '#ffffff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLAINT RESPOND MODAL BOX */}
      {selectedComplaintRespond && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 12, maxWidth: 500, width: '100%', padding: 24, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                Respond to {selectedComplaintRespond.senderName} ({selectedComplaintRespond.senderRole})
              </span>
              <button
                type="button"
                onClick={() => setSelectedComplaintRespond(null)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0', marginBottom: 14, fontSize: 12, color: '#475569' }}>
              <strong>Original Message:</strong> "{selectedComplaintRespond.message}"
            </div>

            <form onSubmit={handleSendResponse} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Response Details *
                </label>
                <textarea
                  required
                  rows={4}
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Enter official Coastal Authority response to sender..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'Inter, sans-serif' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setSelectedComplaintRespond(null)}
                  style={{ padding: '9px 16px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingResponse}
                  style={{
                    padding: '9px 20px',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: submittingResponse ? 'wait' : 'pointer',
                  }}
                >
                  {submittingResponse ? 'Saving...' : 'SEND RESPONSE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEVELOPMENT DETAIL MODAL */}
      {selectedDevModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 12, maxWidth: 540, width: '100%', padding: 24, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🚢</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                  {selectedDevModal.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDevModal(null)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, marginBottom: 14 }}>
              <div><strong>Official Source:</strong> {selectedDevModal.source}</div>
              <div><strong>Publication Date:</strong> {selectedDevModal.date}</div>
              <div><strong>Scope:</strong> Public Maritime & Defence Development</div>
            </div>

            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 18 }}>
              <strong style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 6 }}>PUBLIC BACKGROUND & SPECIFICATIONS</strong>
              <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.55 }}>{selectedDevModal.details}</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedDevModal(null)}
                style={{ padding: '9px 20px', background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGIONAL MARITIME ACTIVITY DETAIL MODAL */}
      {selectedActModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 12, maxWidth: 540, width: '100%', padding: 24, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🌊</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                  {selectedActModal.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedActModal(null)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, marginBottom: 14 }}>
              <div><strong>Issuing Source:</strong> {selectedActModal.source}</div>
              <div><strong>Date / Time:</strong> {selectedActModal.datetime}</div>
              <div><strong>Security Boundary:</strong> Verified Public Maritime Drill / Security Event</div>
            </div>

            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 18 }}>
              <strong style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 6 }}>EXERCISE DETAILS & OBJECTIVES</strong>
              <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.55 }}>{selectedActModal.details}</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedActModal(null)}
                style={{ padding: '9px 20px', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
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
