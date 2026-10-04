import { useEffect, useRef, useState } from 'react'
import { stopSpeech } from '../../utils/speech'

const speechApi = () => window.SpeechRecognition || window.webkitSpeechRecognition

export function getSpeechLocale(language) {
  const langCode = (language || 'en').toLowerCase().replace('_', '-')
  if (langCode.startsWith('hi')) return 'hi-IN'
  if (langCode.startsWith('te')) return 'te-IN'
  if (langCode.startsWith('ta')) return 'ta-IN'
  if (langCode.startsWith('ml')) return 'ml-IN'
  if (langCode.startsWith('kn')) return 'kn-IN'
  if (langCode.startsWith('or')) return 'or-IN'
  if (langCode.startsWith('bn')) return 'bn-IN'
  if (langCode.startsWith('kok')) return 'kok-IN'
  if (langCode.startsWith('tcy') || langCode.startsWith('tulu')) return 'tcy-IN'
  if (langCode.startsWith('gu')) return 'gu-IN'
  if (langCode.startsWith('mr')) return 'mr-IN'
  return 'en-IN'
}

export default function QueryInput({ value, onChange, onSend, loading, language }) {
  const [voiceState, setVoiceState] = useState('idle') // 'idle' | 'listening' | 'processing' | 'error'
  const [voiceError, setVoiceError] = useState('')
  const [isVoiceInput, setIsVoiceInput] = useState(false)
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
    stopSpeech()
    const Recognition = speechApi()
    if (!Recognition) {
      setVoiceState('error')
      setVoiceError('Voice input is not supported by this browser.')
      return
    }

    try {
      const instance = new Recognition()
      recognitionRef.current = instance
      instance.lang = getSpeechLocale(language)
      instance.interimResults = true
      instance.continuous = false

      instance.onstart = () => {
        setVoiceError('')
        setVoiceState('listening')
        setIsVoiceInput(true)
      }

      instance.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join(' ')
          .trim()
        onChange(transcript)
        setIsVoiceInput(true)
        setVoiceState('processing')
      }

      instance.onerror = (event) => {
        setVoiceState('error')
        const currentLocale = getSpeechLocale(language)
        if (event.error === 'language-not-supported') {
          setVoiceError(`Speech recognition for selected language (${currentLocale}) is not supported by your browser.`)
        } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setVoiceError('Microphone permission was denied. Please click the camera/mic lock icon in your browser address bar and allow Microphone access.')
        } else if (event.error === 'network') {
          setVoiceError('Network connection issue. Voice recognition requires an active internet connection.')
        } else if (event.error === 'no-speech') {
          setVoiceError('No speech detected. Please check your microphone and try speaking again.')
        } else if (event.error === 'audio-capture') {
          setVoiceError('No microphone detected. Please plug in or select a valid microphone.')
        } else {
          setVoiceError(`Voice input issue (${event.error}). Ensure microphone permissions are allowed.`)
        }
      }

      instance.onend = () => {
        setVoiceState((state) => (state === 'listening' || state === 'processing' ? 'idle' : state))
      }

      instance.start()
    } catch (error) {
      setVoiceState('error')
      setVoiceError(`Voice input could not start: ${error.message || 'Check browser permissions'}.`)
    }
  }

  const toggleVoice = () => {
    stopSpeech()
    if (voiceState === 'listening') {
      recognitionRef.current?.stop()
    } else {
      listen()
    }
  }

  const handleTextChange = (newVal) => {
    stopSpeech()
    setIsVoiceInput(false)
    onChange(newVal)
  }

  const handleSend = () => {
    if (value.trim() && !loading) {
      const voiceFlag = isVoiceInput
      setIsVoiceInput(false)
      onSend(value, voiceFlag)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="query-input-composer-wrap no-print font-inter">
      {voiceError && (
        <div className="voice-error-banner font-inter" role="status">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{voiceError}</span>
        </div>
      )}

      <div className="composer-row">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            language === 'hi'
              ? 'ORCA से कुछ भी पूछें — समुद्री सुरक्षा, मौसम या मत्स्य क्षेत्र...'
              : language === 'te'
              ? 'ORCA ని ఏదైనా అడగండి — సముద్ర భద్రత, వాతావరణం లేదా చేపల వేట జోన్...'
              : language === 'ta'
              ? 'ORCA விடம் கேட்கலாம் — கடல் பாதுகாப்பு, வானிலை, மீன்பிடி மண்டலம்...'
              : language === 'or'
              ? 'ORCA କୁ କିଛି ବି ପଚାରନ୍ତୁ — ସମୁଦ୍ର ସୁରକ୍ଷା, ପାଣିପାଗ କିମ୍ବା ମତ୍ସ୍ୟ କ୍ଷେତ୍ର...'
              : language === 'bn'
              ? 'ORCA-কে যেকোনো প্রশ্ন করুন — সামুদ্রিক নিরাপত্তা, আবহাওয়া বা মাছ ধরার এলাকা...'
              : language === 'kok'
              ? 'ORCA कडेन कायूय विचारात — दर्याची सुरक्षाय, हवामान वा नुस्तेमारी...'
              : language === 'tcy'
              ? 'ORCA ಡಾ ಕೈತಲ್ ದಾನೆಲಾ ಕೇಡ್ಲೆ — ಕಡಲ ಭದ್ರತೆ, ಮೀನ್‌ದ ಜಾಗ...'
              : language === 'gu'
              ? 'ORCA ને કંઈપણ પૂછો — દરિયાઈ સુરક્ષા, હવામાન અથવા માછીમારી વિસ્તાર...'
              : language === 'mr'
              ? 'ORCA ला काहीही विचारा — सागरी सुरक्षा, हवामान किंवा मासेमारी क्षेत्र...'
              : 'Message ORCA — ask about PFZs, weather, sea conditions, or safe routes...'
          }
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
            title={voiceState === 'listening' ? 'Stop listening' : 'Dictate with Voice (Microphone)'}
            aria-label="Use voice input"
          >
            {voiceState === 'listening' ? (
              <span className="listening-tag font-inter">
                <span className="mic-live-dot" />
                <span>Listening…</span>
              </span>
            ) : voiceState === 'processing' ? (
              <span className="processing-tag font-inter">Processing…</span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            )}
          </button>

          <button
            type="button"
            className={`send-query-btn font-inter ${value.trim() ? 'is-active' : ''}`}
            onClick={handleSend}
            disabled={loading || !value.trim()}
            title="Send query (Enter)"
            aria-label="Send message"
          >
            {loading ? (
              <svg className="composer-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" strokeDasharray="30" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="composer-footer-hint font-inter">
        <span>
          {voiceState === 'listening'
            ? 'Speaking into microphone... Click microphone icon to finish.'
            : 'ORCA AI delivers satellite marine intelligence. Verify critical safety data with official NAVTEX broadcasts.'}
        </span>
      </div>
    </div>
  )
}
// End of QueryInput component
