import { useState } from 'react'

export default function ChatMessage({ message, onRegenerate }) {
  const [copied, setCopied] = useState(false)
  const isUser = message.sender === 'user'

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(message.text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = message.text
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback silent fail
    }
  }

  if (isUser) {
    return (
      <div className="chat-bubble-wrap user-wrap">
        <div className="chat-message user-message">
          <div className="message-header">
            <span className="user-label">YOU</span>
            <time>{message.timestamp}</time>
          </div>
          <div className="message-body">{message.text}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-bubble-wrap orca-wrap">
      <div className="orca-avatar-orb" aria-hidden="true">
        <span>◒</span>
      </div>
      <div className="chat-message orca-message">
        <div className="message-header">
          <div className="orca-identity">
            <strong>ORCA</strong>
            {message.category && <span className="orca-category-badge">{message.category}</span>}
          </div>
          <time>{message.timestamp}</time>
        </div>

        <div className="message-body">{message.text}</div>

        <div className="message-actions">
          <button
            type="button"
            className={`action-btn copy-btn ${copied ? 'is-copied' : ''}`}
            onClick={handleCopy}
            title="Copy response text"
            aria-label="Copy response text"
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
          {onRegenerate && (
            <button
              type="button"
              className="action-btn regenerate-btn"
              onClick={() => onRegenerate(message.id)}
              title="Regenerate response"
              aria-label="Regenerate response"
            >
              🔄 Regenerate
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
