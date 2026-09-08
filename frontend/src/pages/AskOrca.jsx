import { useMemo, useState } from 'react'
import ChatWindow from '../components/chat/ChatWindow'
import QueryInput from '../components/chat/QueryInput'
import { askOrca } from '../services/orcaService'

const newId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`

export default function AskOrca() {
  const initial = useMemo(
    () => new URLSearchParams(window.location.search).get('query') || '',
    []
  )

  const [query, setQuery] = useState(initial)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [failedQuery, setFailedQuery] = useState('')
  const [language, setLanguage] = useState('en')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [label, setLabel] = useState('')
  const [conversationId] = useState(newId)

  const lastContext = [...messages]
    .reverse()
    .find((message) => message.response)?.response?.context

  const send = async (retryText = '', retry = false) => {
    const text = (retryText || query).trim()

    if (!text || loading) return

    const hasLatitude = latitude !== ''
    const hasLongitude = longitude !== ''

    if (hasLatitude !== hasLongitude) {
      setError('Provide both latitude and longitude, or leave both blank.')
      return
    }

    const location = hasLatitude
      ? {
          latitude: Number(latitude),
          longitude: Number(longitude),
          ...(label.trim() ? { label: label.trim() } : {}),
        }
      : undefined

    if (
      location &&
      (!Number.isFinite(location.latitude) ||
        !Number.isFinite(location.longitude))
    ) {
      setError('Coordinates must be valid numbers.')
      return
    }

    const userMessage = {
      id: newId(),
      role: 'user',
      text,
    }

    if (!retry) {
      setMessages((items) => [...items, userMessage])
    }

    setQuery('')
    setError('')
    setFailedQuery('')
    setLoading(true)

    try {
      const response = await askOrca({
        query: text,
        location,
        context: lastContext
          ? { conversation_context: lastContext }
          : {},
        conversation_id: conversationId,
        language,
      })

      setMessages((items) => [
        ...items,
        {
          id: response.query_id,
          role: 'assistant',
          text: response.answer,
          response,
        },
      ])
    } catch (requestError) {
      setError(
        requestError.message || 'ORCA could not complete this request.'
      )
      setFailedQuery(text)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="ask-orca">
      <header className="ask-heading">
        <div>
          <p className="eyebrow">CONVERSATIONAL INTELLIGENCE</p>
          <h1>Ask ORCA</h1>
          <p>
            Ask in text or voice. ORCA only reports evidence returned by its
            connected data sources.
          </p>
        </div>

        <label>
          Language
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी (MVP)</option>
          </select>
        </label>
      </header>

      <section className="location-context">
        <b>Map / location context</b>
        <span>
          Optional coordinates are required for live Ocean, Weather, and GIS
          checks.
        </span>

        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Location label"
        />

        <input
          value={latitude}
          onChange={(event) => setLatitude(event.target.value)}
          inputMode="decimal"
          placeholder="Latitude"
        />

        <input
          value={longitude}
          onChange={(event) => setLongitude(event.target.value)}
          inputMode="decimal"
          placeholder="Longitude"
        />
      </section>

      <ChatWindow messages={messages} loading={loading} />

      {error && (
        <div className="ask-error">
          {error}
          <button
            onClick={() => send(failedQuery, true)}
            disabled={!failedQuery || loading}
          >
            Retry
          </button>
        </div>
      )}

      <QueryInput
        value={query}
        onChange={setQuery}
        onSend={send}
        loading={loading}
        language={language}
      />
    </section>
  )
}