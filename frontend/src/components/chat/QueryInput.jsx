import { useEffect, useRef, useState } from 'react'

const speechApi = () => window.SpeechRecognition || window.webkitSpeechRecognition

export default function QueryInput({ value, onChange, onSend, loading, language }) {
  const [voiceState, setVoiceState] = useState('idle')
  const [voiceError, setVoiceError] = useState('')
  const recognition = useRef(null)
  useEffect(() => () => recognition.current?.stop(), [])
  const listen = () => {
    const Recognition = speechApi()
    if (!Recognition) { setVoiceState('error'); setVoiceError('Voice input is not supported by this browser.'); return }
    const instance = new Recognition()
    recognition.current = instance
    instance.lang = language === 'hi' ? 'hi-IN' : 'en-IN'
    instance.interimResults = true
    instance.continuous = false
    instance.onstart = () => { setVoiceError(''); setVoiceState('listening') }
    instance.onresult = (event) => { onChange(Array.from(event.results).map((result) => result[0].transcript).join(' ').trim()); setVoiceState('processing') }
    instance.onerror = (event) => { setVoiceState('error'); setVoiceError(event.error === 'not-allowed' ? 'Microphone permission was denied.' : `Voice input failed: ${event.error}.`) }
    instance.onend = () => setVoiceState((state) => state === 'listening' || state === 'processing' ? 'idle' : state)
    try { instance.start() }
    catch (error) { setVoiceState('error'); setVoiceError(`Voice input could not start: ${error.message || 'unknown error'}.`) }
  }
  const toggleVoice = () => { if (voiceState === 'listening') recognition.current?.stop(); else listen() }
  return <div className="query-input-wrap">
    {voiceError && <p className="voice-error" role="status">{voiceError}</p>}
    <div className="query-input-row"><textarea value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); onSend() } }} placeholder="Ask about marine conditions, weather, hazards, or safety…" rows="2" disabled={loading} />
      <button className={`voice-button ${voiceState}`} type="button" onClick={toggleVoice} disabled={loading} aria-label="Use voice input" title={voiceState === 'listening' ? 'Stop listening' : 'Use voice input'}>{voiceState === 'listening' ? '● Listening' : voiceState === 'processing' ? 'Processing…' : '🎤'}</button>
      <button className="send-button" type="button" onClick={onSend} disabled={loading || !value.trim()}>{loading ? 'Analyzing…' : 'Send'}</button></div>
    <small>{voiceState === 'listening' ? 'Speak now. The transcript stays editable before sending.' : voiceState === 'processing' ? 'Processing transcription…' : 'Press Enter to send; Shift+Enter adds a line.'}</small>
  </div>
}
