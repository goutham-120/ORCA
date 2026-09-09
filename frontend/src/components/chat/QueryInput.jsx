import { useEffect, useRef, useState } from 'react'

const speechApi = () => window.SpeechRecognition || window.webkitSpeechRecognition

export default function QueryInput({ value, onChange, onSend, loading, language }) {
  const [voiceState, setVoiceState] = useState('idle') // 'idle' | 'listening' | 'processing' | 'error'
  const [voiceError, setVoiceError] = useState('')
  const recognitionRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(140, textareaRef.current.scrollHeight)}px`
    }
  }, [value])

  const listen = () => {
    const Recognition = speechApi()
    if (!Recognition) {
      setVoiceState('error')
      setVoiceError('Voice input is not supported by this browser.')
      return
    }

    try {
      const instance = new Recognition()
      recognitionRef.current = instance
      instance.lang = language === 'hi' ? 'hi-IN' : 'en-IN'
      instance.interimResults = true
      instance.continuous = false

      instance.onstart = () => {
        setVoiceError('')
        setVoiceState('listening')
      }

      instance.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join(' ')
          .trim()
        onChange(transcript)
        setVoiceState('processing')
      }

      instance.onerror = (event) => {
        setVoiceState('error')
        setVoiceError(
          event.error === 'not-allowed'
            ? 'Microphone permission was denied.'
            : `Voice input failed: ${event.error}.`
        )
      }

      instance.onend = () => {
        setVoiceState((state) => (state === 'listening' || state === 'processing' ? 'idle' : state))
      }

      instance.start()
    } catch (error) {
      setVoiceState('error')
      setVoiceError(`Voice input could not start: ${error.message || 'unknown error'}.`)
    }
  }

  const toggleVoice = () => {
    if (voiceState === 'listening') {
      recognitionRef.current?.stop()
    } else {
      listen()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !loading) {
        onSend()
      }
    }
  }

  return (
    <div className="query-input-composer-wrap no-print font-inter">
      {voiceError && (
        <div className="voice-error-banner font-inter" role="status">
          ⚠️ {voiceError}
        </div>
      )}

      <div className="composer-row">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask ORCA anything — general questions or marine intelligence..."
          rows={1}
          disabled={loading}
          className="composer-textarea font-inter"
          aria-label="Ask ORCA question input"
        />

        <div className="composer-actions-group font-inter">
          <button
            type="button"
            className={`voice-mic-btn font-inter ${voiceState}`}
            onClick={toggleVoice}
            disabled={loading}
            title={voiceState === 'listening' ? 'Stop listening' : 'Use voice input (Web Speech API)'}
            aria-label="Use voice input"
          >
            {voiceState === 'listening' ? (
              <span className="listening-tag font-inter">● Listening</span>
            ) : voiceState === 'processing' ? (
              <span className="processing-tag font-inter">Processing…</span>
            ) : (
              <span className="mic-icon">🎤</span>
            )}
          </button>

          <button
            type="button"
            className="send-query-btn font-inter glow"
            onClick={() => onSend()}
            disabled={loading || !value.trim()}
          >
            <span>{loading ? 'Analyzing…' : 'Send'}</span>
            <i aria-hidden="true">→</i>
          </button>
        </div>
      </div>

      <div className="composer-footer-hint font-inter">
        <span>
          {voiceState === 'listening'
            ? 'Speak now into microphone. Transcript remains editable before sending.'
            : 'Press Enter to send, Shift+Enter for new line • Evidence-Grounded AI'}
        </span>
      </div>
    </div>
  )
}
