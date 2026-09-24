import { useEffect, useMemo, useRef, useState } from 'react'
import ChatHeader from '../components/chat/ChatHeader'
import LocationContextPanel from '../components/chat/LocationContextPanel'
import ChatWindow from '../components/chat/ChatWindow'
import QueryInput from '../components/chat/QueryInput'
import { askOrca } from '../services/orcaService'
import { LOCATION_COORDINATES } from '../services/openMeteoService'
import { useAuth } from '../hooks/useAuth'
import { speakResponse, stopSpeech } from '../utils/speech'
import { buildSpokenSummary } from '../utils/speechSummary'
import ScenarioSimulatorModal from '../components/chat/ScenarioSimulatorModal'
import EmergencySOSModal from '../components/common/EmergencySOSModal'
import NavICStatusModal from '../components/common/NavICStatusModal'
import ProactiveAlertBanner from '../components/chat/ProactiveAlertBanner'
import { cacheOffshoreBundle } from '../services/offlineSync'
import './AskOrca.css'


const PREFERENCES_KEY = 'orca-dashboard-preferences'
const CHAT_STORAGE_KEY = 'orca-chat-messages'
const CHAT_CONV_KEY = 'orca-chat-conversation-id'
const CHAT_USER_KEY = 'orca-chat-user-id'
const newId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`

function loadSavedLocation() {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const locId = parsed.locationId
      if (locId && LOCATION_COORDINATES[locId]) {
        const item = LOCATION_COORDINATES[locId]
        return {
          id: item.id,
          latitude: item.lat,
          longitude: item.lng,
          label: item.name
        }
      }
    }
  } catch {
    // Ignore parse error
  }
  const defaultLoc = LOCATION_COORDINATES.visakhapatnam
  return {
    id: defaultLoc.id,
    latitude: defaultLoc.lat,
    longitude: defaultLoc.lng,
    label: defaultLoc.name
  }
}

export default function AskOrca({ navigate }) {
  const { user } = useAuth()
  const currentUserId = user?.id ? String(user.id) : (user?.email || '')

  // Parse URL Parameters for query, latitude, longitude, and label
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), [])

  const initialQuery = searchParams.get('query') || ''
  const initialLat = searchParams.get('latitude') || searchParams.get('lat')
  const initialLon = searchParams.get('longitude') || searchParams.get('lon')
  const initialLabel = searchParams.get('label') || ''

  const [query, setQuery] = useState(initialQuery)

  // Initialize messages from localStorage, refreshing if a new user logged in
  const [messages, setMessages] = useState(() => {
    try {
      const savedUserId = localStorage.getItem(CHAT_USER_KEY)
      // Check if a new user logged in
      if (savedUserId && currentUserId && savedUserId !== currentUserId) {
        localStorage.removeItem(CHAT_STORAGE_KEY)
        localStorage.removeItem(CHAT_CONV_KEY)
        localStorage.setItem(CHAT_USER_KEY, currentUserId)
        return []
      }
      if (currentUserId && !savedUserId) {
        localStorage.setItem(CHAT_USER_KEY, currentUserId)
      }
      const raw = localStorage.getItem(CHAT_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed
      }
    } catch {
      // Ignore parse error
    }
    return []
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [failedQuery, setFailedQuery] = useState('')
  const [language, setLanguage] = useState('en')
  const [persona, setPersona] = useState('fisherman')

  // Initialize conversationId from localStorage or generate a fresh one
  const [conversationId, setConversationId] = useState(() => {
    try {
      const savedUserId = localStorage.getItem(CHAT_USER_KEY)
      if (savedUserId && currentUserId && savedUserId === currentUserId) {
        const rawConv = localStorage.getItem(CHAT_CONV_KEY)
        if (rawConv) return rawConv
      }
    } catch {
      // Ignore
    }
    const freshId = newId()
    try {
      localStorage.setItem(CHAT_CONV_KEY, freshId)
    } catch {
      // Ignore
    }
    return freshId
  })

  const [isLocationOpen, setIsLocationOpen] = useState(false)
  const [browserLocation, setBrowserLocation] = useState(null)
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false)
  const [isSOSOpen, setIsSOSOpen] = useState(false)
  const [isNavICOpen, setIsNavICOpen] = useState(false)
  const [activeSpeech, setActiveSpeech] = useState(null)
  const autoSentRef = useRef(false)

  useEffect(() => {
    const handleSpeechStart = (e) => {
      setActiveSpeech(e.detail || { active: true })
    }
    const handleSpeechEnd = () => {
      setActiveSpeech(null)
    }
    window.addEventListener('orca-speech-start', handleSpeechStart)
    window.addEventListener('orca-speech-end', handleSpeechEnd)
    return () => {
      window.removeEventListener('orca-speech-start', handleSpeechStart)
      window.removeEventListener('orca-speech-end', handleSpeechEnd)
    }
  }, [])

  // Active Location state synced with Dashboard preference
  const [location, setLocation] = useState(() => {
    if (initialLat != null && initialLon != null) {
      const lat = Number(initialLat)
      const lon = Number(initialLon)
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        return {
          latitude: lat,
          longitude: lon,
          label: initialLabel || `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`
        }
      }
    }
    return loadSavedLocation()
  })

  // Synchronize location changes with Dashboard preference in localStorage
  useEffect(() => {
    if (!location) return
    const matchedId = location.id || Object.keys(LOCATION_COORDINATES).find(
      (key) => LOCATION_COORDINATES[key].name.toLowerCase() === location.label?.toLowerCase()
    )
    if (matchedId && LOCATION_COORDINATES[matchedId]) {
      try {
        const raw = localStorage.getItem(PREFERENCES_KEY)
        const existing = raw ? JSON.parse(raw) : {}
        localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ ...existing, locationId: matchedId }))
      } catch {
        // Ignore storage error
      }
    }
  }, [location])

  useEffect(() => {
    const handleOpenSimulator = (e) => {
      if (e?.detail?.location) {
        setLocation(e.detail.location)
      }
      setIsSimulatorOpen(true)
    }
    window.addEventListener('orca-open-simulator', handleOpenSimulator)
    return () => window.removeEventListener('orca-open-simulator', handleOpenSimulator)
  }, [])

  const requestBrowserLocation = () => {
    if (!navigator.geolocation) { setError('Browser location is not supported on this device.'); return }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setBrowserLocation({ latitude: coords.latitude, longitude: coords.longitude, source: 'browser', accuracy: coords.accuracy }),
      () => setError('Location permission was denied or unavailable. You can still select a location manually.'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    )
  }

  // Extract last conversation context for follow-up queries
  const lastContext = [...messages]
    .reverse()
    .find((m) => m.response?.context)?.response?.context

  const send = async (overrideText = '', isRetry = false, isVoiceInput = false) => {
    const text = (overrideText || query).trim()

    if (!text || loading) return

    if (location) {
      if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
        setError('Location coordinates must be valid numbers.')
        return
      }
    }

    const userMessage = {
      id: newId(),
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    if (!isRetry) {
      setMessages((prev) => [...prev, userMessage])
    }

    setQuery('')
    setError('')
    setFailedQuery('')
    setLoading(true)
    stopSpeech()

    const historyPayload = messages
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.text }))

    try {
      const response = await askOrca({
        query: text,
        location: location
          ? {
              latitude: Number(location.latitude),
              longitude: Number(location.longitude),
              ...(location.label?.trim() ? { label: location.label.trim() } : {})
            }
          : undefined,
        context: { ...(lastContext ? { conversation_context: lastContext } : {}), ...(browserLocation ? { browser_location: browserLocation } : {}) },
        conversation_id: conversationId,
        language,
        history: historyPayload,
      })


      const assistantMessage = {
        id: response.query_id || newId(),
        role: 'assistant',
        text: response.answer,
        response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Only auto-play voice output if the user queried via Voice Input (Mic)
      if (isVoiceInput) {
        const spokenBriefing = buildSpokenSummary(response, response.answer, response.language || language)
        speakResponse(spokenBriefing, response.language || language, null, null, assistantMessage.id)
      }

      // Auto-cache offshore bundle for low-bandwidth / disconnected field use (5.4)
      try {
        cacheOffshoreBundle(location?.label || 'Current Offshore Zone', {
          evidence: response.evidence,
          waypoints: response.waypoints || [],
          marine_safety_index: response.marine_safety_index,
          tide: response.evidence?.hydrodynamics?.tide_phase || 'Active',
          advisory: response.answer
        })
      } catch (cacheErr) {
        console.warn('Offline cache failed:', cacheErr)
      }
    } catch (err) {
      setError(err.message || 'ORCA could not complete this analysis request.')
      setFailedQuery(text)
    } finally {
      setLoading(false)
    }
  }

  // Persist conversation messages and conversationId for the current user
  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages))
        localStorage.setItem(CHAT_CONV_KEY, conversationId)
        if (currentUserId) {
          localStorage.setItem(CHAT_USER_KEY, currentUserId)
        }
      } else {
        localStorage.removeItem(CHAT_STORAGE_KEY)
      }
    } catch {
      // Ignore storage errors
    }
  }, [messages, conversationId, currentUserId])

  // Refresh chats if a different user logs in while component is mounted
  useEffect(() => {
    if (!currentUserId) return
    const savedUserId = localStorage.getItem(CHAT_USER_KEY)
    if (savedUserId && savedUserId !== currentUserId) {
      localStorage.removeItem(CHAT_STORAGE_KEY)
      localStorage.removeItem(CHAT_CONV_KEY)
      localStorage.setItem(CHAT_USER_KEY, currentUserId)
      setMessages([])
      setConversationId(newId())
    }
  }, [currentUserId])

  // Auto-send query if passed in URL
  useEffect(() => {
    if (initialQuery && !autoSentRef.current && !loading) {
      autoSentRef.current = true
      const timer = setTimeout(() => {
        send(initialQuery)
      }, 50)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery])

  const handleClearSession = () => {
    if (messages.length > 0 && !window.confirm('Start a new session? Conversation history will be cleared.')) {
      return
    }
    stopSpeech()
    const freshConvId = newId()
    setMessages([])
    setError('')
    setFailedQuery('')
    setConversationId(freshConvId)
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY)
      localStorage.setItem(CHAT_CONV_KEY, freshConvId)
    } catch {
      // Ignore storage error
    }
  }
    

  const handleSelectPrompt = (promptQuery) => {
    setQuery(promptQuery)
    send(promptQuery)
  }

  const handleApplyScenarioToChat = (promptText, newLoc) => {
    if (newLoc) {
      setLocation(newLoc)
    }
    setQuery(promptText)
    send(promptText)
  }

  return (
    <section className="ask-orca-command-center font-sans">
      {/* 1. TOP HEADER */}
      <ChatHeader
        language={language}
        onLanguageChange={setLanguage}
        persona={persona}
        onPersonaChange={setPersona}
        onClearSession={handleClearSession}
        locationLabel={location?.label}
        onToggleLocation={() => setIsLocationOpen((prev) => !prev)}
        isLocationOpen={isLocationOpen}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onOpenSOS={() => setIsSOSOpen(true)}
        onOpenNavIC={() => setIsNavICOpen(true)}
      />

      {/* 2. LOCATION CONTEXT PANEL */}
      <LocationContextPanel
        location={location}
        onChangeLocation={setLocation}
        onNavigateMap={(path) => navigate && navigate(path)}
        isOpen={isLocationOpen}
        onClose={() => setIsLocationOpen(false)}
        onRequestBrowserLocation={requestBrowserLocation}
      />

      {/* 2.5 PROACTIVE HAZARD & GEOFENCE MONITORING BANNER */}
      <ProactiveAlertBanner location={location} />

      {/* 3. CHAT VIEWPORT & WELCOME SCREEN */}
      <ChatWindow
        messages={messages}
        loading={loading}
        onSelectPrompt={handleSelectPrompt}
        language={language}
      />


      {/* ERROR / RETRY BANNER */}
      {error && (
        <div className="ask-orca-error-bar no-print font-sans" role="alert">
          <div className="error-text font-sans">
            <span>⚠️ {error}</span>
          </div>
          {failedQuery && (
            <button
              type="button"
              className="orca-btn secondary outline text-xs font-sans"
              onClick={() => send(failedQuery, true)}
              disabled={loading}
            >
              🔄 Retry Analysis
            </button>
          )}
        </div>
      )}

      {/* ACTIVE SPEECH PLAYBACK BAR WITH 1-CLICK MID-SPEECH STOP */}
      {activeSpeech && (
        <div className="active-speech-banner font-inter" role="status">
          <div className="speech-pulse-indicator">
            <span className="speech-wave-icon">🔊</span>
            <span className="speech-live-text">
              ORCA Spoken Advisory Playing…
            </span>
          </div>
          <button
            type="button"
            className="stop-speech-pill-btn font-inter"
            onClick={() => stopSpeech()}
            title="Stop voice audio immediately"
          >
            ⏹️ Stop Voice
          </button>
        </div>
      )}

      {/* 4. BOTTOM COMPOSER */}
      <QueryInput
        value={query}
        onChange={setQuery}
        onSend={(txt, isVoice) => send(txt, false, isVoice)}
        loading={loading}
        language={language}
      />

      {/* 5. WHAT-IF SCENARIO SIMULATOR MODAL */}
      <ScenarioSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        initialLocation={location}
        onApplyScenarioToChat={handleApplyScenarioToChat}
        onNavigateMap={(path) => navigate && navigate(path)}
      />

      {/* 6. EMERGENCY SOS / VHF DISTRESS BROADCAST MODAL */}
      <EmergencySOSModal
        isOpen={isSOSOpen}
        onClose={() => setIsSOSOpen(false)}
        location={location}
      />

      {/* 7. ISRO NAVIC SATELLITE TRANSCEIVER MODAL */}
      <NavICStatusModal
        isOpen={isNavICOpen}
        onClose={() => setIsNavICOpen(false)}
        location={location}
      />
    </section>
  )
}
