import { useState, useEffect, useRef, useCallback } from 'react'
import ChatMessage from '../components/askOrca/ChatMessage'
import ChatComposer from '../components/askOrca/ChatComposer'
import SuggestedQuestions from '../components/askOrca/SuggestedQuestions'
import TypingIndicator from '../components/askOrca/TypingIndicator'
import { generateOrcaResponse, getActiveLocation } from '../data/orcaResponses'

const CHAT_HISTORY_KEY = 'orca-chat-history'

function loadChatHistory() {
  try {
    const saved = localStorage.getItem(CHAT_HISTORY_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // Ignore invalid JSON
  }
  return []
}

function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function AskOrca() {
  const [activeLocation, setActiveLocation] = useState(() => getActiveLocation())
  const [messages, setMessages] = useState(() => loadChatHistory())
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef(null)
  const queryProcessedRef = useRef(false)

  const submitUserQuestion = useCallback((text) => {
    if (!text.trim() || isTyping) return

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: formatTime()
    }

    setMessages((prev) => [...prev, userMsg])
    setInputValue('')
    setIsTyping(true)

    const timer = setTimeout(() => {
      const orcaResult = generateOrcaResponse(text, activeLocation)
      const orcaMsg = {
        id: `orca-${Date.now()}`,
        sender: 'orca',
        text: orcaResult.text,
        category: orcaResult.category,
        alternates: orcaResult.alternates || [],
        altIndex: 0,
        questionText: text,
        timestamp: formatTime()
      }

      setMessages((prev) => [...prev, orcaMsg])
      setIsTyping(false)
    }, 750)

    return () => clearTimeout(timer)
  }, [activeLocation, isTyping])

  // Listen to local storage changes for location preference updates
  useEffect(() => {
    const handleStorage = () => setActiveLocation(getActiveLocation())
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  // Auto-scroll when messages or typing state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Persist messages to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages.slice(-30)))
    } catch {
      // Handle storage quota limits gracefully
    }
  }, [messages])

  // URL Query parameter auto-submission handler (?query=... or ?question=...)
  useEffect(() => {
    if (queryProcessedRef.current) return
    queryProcessedRef.current = true

    try {
      const searchParams = new URLSearchParams(window.location.search)
      const queryParam = searchParams.get('query') || searchParams.get('question')
      if (queryParam && queryParam.trim()) {
        const decoded = decodeURIComponent(queryParam).trim()
        setTimeout(() => {
          submitUserQuestion(decoded)
        }, 0)
      }
    } catch {
      // Ignore malformed URL query
    }
  }, [submitUserQuestion])

  const handleRegenerate = (orcaMsgId) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === orcaMsgId && msg.alternates && msg.alternates.length > 0) {
          const nextIndex = (msg.altIndex + 1) % (msg.alternates.length + 1)
          const newText = nextIndex === 0
            ? generateOrcaResponse(msg.questionText, activeLocation).text
            : msg.alternates[nextIndex - 1]

          return {
            ...msg,
            text: newText,
            altIndex: nextIndex,
            timestamp: `${formatTime()} (updated)`
          }
        }
        return msg
      })
    )
  }

  const handleClearChat = () => {
    setMessages([])
    try {
      localStorage.removeItem(CHAT_HISTORY_KEY)
    } catch {
      // Ignore clear errors
    }
  }

  return (
    <div className="ask-orca-page">
      {/* Top Header & Metadata */}
      <section className="ask-orca-header">
        <div>
          <div className="header-title-row">
            <p className="eyebrow">INTELLIGENCE ASSISTANT</p>
            <span className="location-chip" title="Monitoring location linked to Dashboard">
              📍 {activeLocation.name} ({activeLocation.coordinates})
            </span>
          </div>
          <h1>Ask ORCA</h1>
          <p className="subhead">Interactive decision support for ocean, safety, routes, and marine weather.</p>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            className="clear-chat-btn"
            onClick={handleClearChat}
            title="Clear conversation history"
          >
            🗑️ Clear conversation
          </button>
        )}
      </section>

      {/* Main Conversation Workspace */}
      <div className="orca-chat-workspace panel">
        {messages.length === 0 && !isTyping ? (
          <div className="ask-orca-welcome">
            <div className="welcome-hero-orb">
              <span>◒</span>
            </div>
            <h2>Welcome to Ask ORCA</h2>
            <p>
              Your intelligent marine assistant for <strong>{activeLocation.name}</strong> and surrounding waters.
              Ask about current sea conditions, small vessel safety advisories, route hazards, or short-term weather forecasts.
            </p>

            <SuggestedQuestions onSelectQuestion={submitUserQuestion} />
          </div>
        ) : (
          <div className="chat-messages-container">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onRegenerate={msg.sender === 'orca' ? handleRegenerate : null}
              />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Suggested prompts strip when chat is active */}
        {messages.length > 0 && (
          <div className="active-suggestions-strip">
            <SuggestedQuestions onSelectQuestion={submitUserQuestion} />
          </div>
        )}

        {/* Message Input Composer */}
        <ChatComposer
          value={inputValue}
          onChange={setInputValue}
          onSubmit={() => submitUserQuestion(inputValue)}
          disabled={isTyping}
        />
      </div>
    </div>
  )
}
