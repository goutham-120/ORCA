import { Component, useEffect, useRef } from 'react'
import Message from './Message'
import WelcomeScreen from './WelcomeScreen'
import AnalysisIndicator from './AnalysisIndicator'

class MessageErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error, info) {
    console.error('[Chat Message Render Notice]:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="chat-bubble-wrap orca-wrap font-sans">
          <div className="chat-message orca-message" style={{ background: '#fff', border: '1px solid #fecaca', padding: '14px', borderRadius: '10px' }}>
            <strong style={{ color: '#dc2626' }}>⚠️ Notice:</strong>
            <p style={{ color: '#1e293b', margin: '4px 0 0' }}>{this.props.fallbackText || 'Response analysis completed. You can query again or view map details.'}</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function ChatWindow({ messages, loading, onSelectPrompt, language }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  return (
    <section className="chat-window-viewport" aria-live="polite">
      {messages.length === 0 ? (
        <WelcomeScreen onSelectPrompt={onSelectPrompt} language={language} />
      ) : (
        <div className="messages-stream font-sans">
          {messages.map((message) => (
            <MessageErrorBoundary key={message.id} fallbackText={message.text}>
              <Message message={message} />
            </MessageErrorBoundary>
          ))}
          {loading && <AnalysisIndicator />}
          <div ref={bottomRef} />
        </div>
      )}
    </section>
  )
}
