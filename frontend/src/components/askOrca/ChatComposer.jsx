import { useRef, useEffect } from 'react'

export default function ChatComposer({ value, onChange, onSubmit, disabled }) {
  const textareaRef = useRef(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(120, textareaRef.current.scrollHeight)}px`
    }
  }, [value])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !disabled) {
        onSubmit()
      }
    }
  }

  return (
    <form className="chat-composer" onSubmit={(e) => { e.preventDefault(); if (value.trim() && !disabled) onSubmit() }}>
      <div className="composer-input-wrap">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask ORCA about sea conditions, safety, routes, hazards..."
          rows={1}
          disabled={disabled}
          aria-label="Ask ORCA question input"
        />
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          className="send-btn"
          aria-label="Send question to ORCA"
        >
          <span>Send</span>
          <i aria-hidden="true">→</i>
        </button>
      </div>
      <div className="composer-hint">
        <small>Press <b>Enter</b> to send, <b>Shift+Enter</b> for new line • Demo marine intelligence</small>
      </div>
    </form>
  )
}
