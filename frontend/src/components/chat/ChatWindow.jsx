import { useEffect, useRef } from 'react'
import Message from './Message'
import WelcomeScreen from './WelcomeScreen'
import AnalysisIndicator from './AnalysisIndicator'

export default function ChatWindow({ messages, loading, onSelectPrompt }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  return (
    <section className="chat-window-viewport" aria-live="polite">
      {messages.length === 0 ? (
        <WelcomeScreen onSelectPrompt={onSelectPrompt} />
      ) : (
        <div className="messages-stream font-sans">
          {messages.map((message) => (
            <Message key={message.id} message={message} />
          ))}
          {loading && <AnalysisIndicator />}
          <div ref={bottomRef} />
        </div>
      )}
    </section>
  )
}
