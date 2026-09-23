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
      instance.lang = language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : language === 'ta' ? 'ta-IN' : language === 'or' ? 'or-IN' : language === 'bn' ? 'bn-IN' : language === 'kok' ? 'kok-IN' : language === 'tcy' ? 'tcy-IN' : language === 'gu' ? 'gu-IN' : language === 'mr' ? 'mr-IN' : 'en-IN'
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
        if (event.error === 'language-not-supported') {
          setVoiceError(language === 'mr' ? 'Marathi (mr-IN) speech recognition is not supported by your browser.' : language === 'gu' ? 'Gujarati (gu-IN) speech recognition is not supported by your browser.' : 'Selected language speech recognition is not supported by your browser.')
        } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setVoiceError('Microphone permission was denied. Please click the camera/mic lock icon in your browser address bar and allow Microphone access.')
        } else if (event.error === 'network') {
          setVoiceError('Network connection issue. Voice recognition requires an active internet connection.')
        } else if (event.error === 'no-speech') {
          setVoiceError(language === 'tcy' ? 'No speech detected or Tulu voice input is unsupported on this browser.' : language === 'gu' ? 'No speech detected or Gujarati voice input is unsupported on this browser.' : language === 'mr' ? 'No speech detected or Marathi voice input is unsupported on this browser.' : 'No speech detected. Please check your microphone and try speaking again.')
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
          placeholder={
            language === 'hi'
              ? 'ORCA से कुछ भी पूछें — समुद्री सुरक्षा, मौसम या लहरों की स्थिति...'
              : language === 'te'
              ? 'ORCA ని ఏదైనా అడగండి — సముద్ర భద్రత, వాతావరణం లేదా అలల పరిస్థితి...'
              : language === 'ta'
              ? 'ORCA விடம் எது வேண்டுமானாலும் கேட்கலாம் — கடல் பாதுகாப்பு, வானிலை...'
              : language === 'or'
              ? 'ORCA କୁ କିଛି ବି ପଚାରନ୍ତୁ — ସମୁଦ୍ର ସୁରକ୍ଷା, ପାଣିପାଗ କିମ୍ବା ଲହଡ଼ିର ସ୍ଥିତି...'
              : language === 'bn'
              ? 'ORCA-কে যেকোনো প্রশ্ন জিজ্ঞাসা করুন — সামুদ্রিক নিরাপত্তা, আবহাওয়া বা ঢেউয়ের অবস্থা...'
              : language === 'kok'
              ? 'ORCA कडेन कायूय विचारात — दर्याची सुरक्षाय, हवामान वा ल्हारांची स्थिती...'
              : language === 'tcy'
              ? 'ORCA ಡಾ ಕೈತಲ್ ದಾನೆಲಾ ಕೇಡ್ಲೆ — ಕಡಲ ಭದ್ರತೆ, ವಾತಾವರಣ ಬೊಕ್ಕ ಅಲೆತ ಸ್ಥಿತಿ...'
              : language === 'gu'
              ? 'ORCA ને કંઈપણ પૂછો — દરિયાઈ સુરક્ષા, હવામાન અથવા મોજાની સ્થિતિ...'
              : language === 'mr'
              ? 'ORCA લા काहीही विचारा — समुद्री सुरक्षा, हवामान किंवा लाटांची स्थिती...'
              : 'Ask about marine conditions, PFZs, weather or routes...'
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
            className="send-query-btn font-inter"
            onClick={() => onSend()}
            disabled={loading || !value.trim()}
          >
            <span>{loading ? 'Analyzing…' : 'Send'}</span>
            <i aria-hidden="true">&rarr;</i>
          </button>
        </div>
      </div>

      <div className="composer-footer-hint font-inter">
        <span>
          {voiceState === 'listening'
            ? 'Speak now into microphone. Transcript remains editable before sending.'
            : 'Press Enter to send, Shift+Enter for new line'}
        </span>
      </div>
    </div>
  )
}
