import React, { useState, useEffect, useRef } from 'react'

export const SPEECH_LANGUAGES = [
  { code: 'te-IN', label: 'తెలుగు (Telugu)', regionKeywords: ['visakhapatnam', 'andhra', 'kakinada'] },
  { code: 'ta-IN', label: 'தமிழ் (Tamil)', regionKeywords: ['chennai', 'tamil', 'tuticorin', 'nagapattinam'] },
  { code: 'ml-IN', label: 'മലയാളം (Malayalam)', regionKeywords: ['kochi', 'kerala', 'kollam', 'calicut'] },
  { code: 'kn-IN', label: 'ಕನ್ನಡ (Kannada)', regionKeywords: ['mangalore', 'karnataka', 'karwar'] },
  { code: 'mr-IN', label: 'मराठी (Marathi)', regionKeywords: ['mumbai', 'maharashtra', 'ratnagiri'] },
  { code: 'gu-IN', label: 'ગુજરાતી (Gujarati)', regionKeywords: ['surat', 'gujarat', 'veraval', 'porbandar'] },
  { code: 'or-IN', label: 'ଓଡ଼ିଆ (Odia)', regionKeywords: ['paradip', 'odisha', 'puri'] },
  { code: 'bn-IN', label: 'বাংলা (Bengali)', regionKeywords: ['bengal', 'kolkata', 'digha'] },
  { code: 'hi-IN', label: 'हिन्दी (Hindi)', regionKeywords: [] },
  { code: 'en-IN', label: 'English (India)', regionKeywords: [] },
]

export function getRecommendedSpeechLang(regionStr) {
  if (!regionStr) return 'te-IN'
  const lower = regionStr.toLowerCase()
  const matched = SPEECH_LANGUAGES.find((lang) =>
    lang.regionKeywords.some((keyword) => lower.includes(keyword))
  )
  return matched ? matched.code : 'en-IN'
}

export default function VoiceInputControl({
  onTranscript,
  currentValue = '',
  defaultRegion = '',
  buttonLabel = 'Voice Input / Speak',
  className = '',
}) {
  const [isListening, setIsListening] = useState(false)
  const [selectedLang, setSelectedLang] = useState(() => getRecommendedSpeechLang(defaultRegion))
  const [interimText, setInterimText] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const recognitionRef = useRef(null)
  const baseValueRef = useRef('')

  // Sync default speech language when region prop updates
  useEffect(() => {
    if (defaultRegion) {
      setSelectedLang(getRecommendedSpeechLang(defaultRegion))
    }
  }, [defaultRegion])

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // ignore cleanup error
        }
      }
    }
  }, [])

  const startListening = () => {
    setErrorMsg('')
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setErrorMsg('Speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari.')
      return
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }

      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition
      recognition.lang = selectedLang
      recognition.interimResults = true
      recognition.continuous = true
      recognition.maxAlternatives = 1

      baseValueRef.current = currentValue ? currentValue.trim() + ' ' : ''

      recognition.onstart = () => {
        setIsListening(true)
        setErrorMsg('')
        setInterimText('')
      }

      recognition.onresult = (event) => {
        let finalStr = ''
        let interimStr = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const trans = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalStr += trans + ' '
          } else {
            interimStr += trans
          }
        }

        if (finalStr) {
          baseValueRef.current += finalStr
          onTranscript(baseValueRef.current.trim())
          setInterimText('')
        } else if (interimStr) {
          setInterimText(interimStr)
          onTranscript((baseValueRef.current + interimStr).trim())
        }
      }

      recognition.onerror = (event) => {
        setIsListening(false)
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setErrorMsg('Microphone access denied. Please allow microphone permissions in your browser address bar.')
        } else if (event.error === 'no-speech') {
          setErrorMsg('No speech detected. Please speak clearly into your microphone.')
        } else if (event.error === 'network') {
          setErrorMsg('Network error occurred during speech transcription. Please check your connection.')
        } else if (event.error !== 'aborted') {
          setErrorMsg(`Voice error: ${event.error}`)
        }
      }

      recognition.onend = () => {
        setIsListening(false)
        setInterimText('')
      }

      recognition.start()
    } catch (err) {
      setIsListening(false)
      setErrorMsg(`Could not start voice recognition: ${err.message || 'Check permissions'}`)
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
    }
    setIsListening(false)
    setInterimText('')
  }

  return (
    <div className={`voice-dictation-wrapper ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        {/* Toggle Voice / Stop Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!isListening ? (
            <button
              type="button"
              onClick={startListening}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '6px',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                color: '#0284c7',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Click to dictate your message using your microphone"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
              <span>{buttonLabel}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopListening}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 14px',
                borderRadius: '6px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Click to stop microphone dictation"
            >
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#dc2626' }} />
              <span>Listening (Click to Stop)</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          )}

          {/* Language Selector Dropdown */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Language:</span>
            <select
              value={selectedLang}
              onChange={(e) => {
                setSelectedLang(e.target.value)
                if (isListening) {
                  stopListening()
                }
              }}
              disabled={isListening}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              {SPEECH_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isListening && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#0284c7', fontWeight: 600 }}>
            <span style={{ fontStyle: 'italic' }}>Speak into your microphone now...</span>
          </div>
        )}
      </div>

      {/* Real-time Interim Live Preview */}
      {isListening && interimText && (
        <div
          style={{
            fontSize: '11px',
            color: '#0369a1',
            background: '#e0f2fe',
            border: '1px dashed #7dd3fc',
            borderRadius: '4px',
            padding: '4px 8px',
            fontStyle: 'italic',
          }}
        >
          Hearing: "{interimText}"
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div
          style={{
            fontSize: '11px',
            color: '#b91c1c',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '4px',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg('')}
            style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontWeight: 700, marginLeft: '6px' }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
