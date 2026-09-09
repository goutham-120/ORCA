import { useEffect, useMemo, useState } from 'react'
import ChatHeader from '../components/chat/ChatHeader'
import LocationContextPanel from '../components/chat/LocationContextPanel'
import ChatWindow from '../components/chat/ChatWindow'
import QueryInput from '../components/chat/QueryInput'
import { askOrca } from '../services/orcaService'
import './AskOrca.css'

const newId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`

export default function AskOrca({ navigate }) {
  // Parse URL Parameters for query, latitude, longitude, and label
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), [])

  const initialQuery = searchParams.get('query') || ''
  const initialLat = searchParams.get('latitude') || searchParams.get('lat')
  const initialLon = searchParams.get('longitude') || searchParams.get('lon')
  const initialLabel = searchParams.get('label') || ''

  const [query, setQuery] = useState(initialQuery)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [failedQuery, setFailedQuery] = useState('')
  const [language, setLanguage] = useState('en')
  const [conversationId, setConversationId] = useState(newId)
  const [isLocationOpen, setIsLocationOpen] = useState(false)
  const [browserLocation, setBrowserLocation] = useState(null)

  // Active Location state
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
    return null
  })

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

  const send = async (overrideText = '', isRetry = false) => {
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
        language
      })

      const assistantMessage = {
        id: response.query_id || newId(),
        role: 'assistant',
        text: response.answer,
        response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      setError(err.message || 'ORCA could not complete this analysis request.')
      setFailedQuery(text)
    } finally {
      setLoading(false)
    }
  }

  // Auto-send query if passed in URL
  useEffect(() => {
    if (initialQuery && messages.length === 0 && !loading) {
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
    setMessages([])
    setError('')
    setFailedQuery('')
    setConversationId(newId())
  }

  const handleSelectPrompt = (promptQuery) => {
    setQuery(promptQuery)
    send(promptQuery)
  }

  return (
    <section className="ask-orca-command-center font-sans">
      {/* 1. TOP HEADER */}
      <ChatHeader
        language={language}
        onLanguageChange={setLanguage}
        onClearSession={handleClearSession}
        locationLabel={location?.label}
        onToggleLocation={() => setIsLocationOpen((prev) => !prev)}
        isLocationOpen={isLocationOpen}
      />

      {/* 2. LOCATION CONTEXT PANEL */}
      <LocationContextPanel
        location={location}
        onChangeLocation={setLocation}
        onNavigateMap={(path) => navigate && navigate(path)}
        isOpen={isLocationOpen}
        onClose={() => setIsLocationOpen(false)}
      />
      {!location && !browserLocation && <button type="button" className="orca-btn secondary outline" onClick={requestBrowserLocation}>Use current location</button>}

      {/* 3. CHAT VIEWPORT & WELCOME SCREEN */}
      <ChatWindow
        messages={messages}
        loading={loading}
        onSelectPrompt={handleSelectPrompt}
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

      {/* 4. BOTTOM COMPOSER */}
      <QueryInput
        value={query}
        onChange={setQuery}
        onSend={() => send()}
        loading={loading}
        language={language}
      />
    </section>
  )
}
