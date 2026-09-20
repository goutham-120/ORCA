/**
 * Multilingual Text-to-Speech synthesis helper for ORCA.
 * Supports English (en-IN / en-US), Hindi (hi-IN), Telugu (te-IN), and Tamil (ta-IN).
 */

let speechSynth = typeof window !== 'undefined' ? window.speechSynthesis : null

export function getVoiceForLanguage(langCode) {
  if (!speechSynth) return null
  const voices = speechSynth.getVoices()
  if (!voices || voices.length === 0) return null

  const targetLang = (langCode || 'en').toLowerCase()
  let langPrefix = 'en'
  if (targetLang.startsWith('te')) langPrefix = 'te'
  else if (targetLang.startsWith('ta')) langPrefix = 'ta'
  else if (targetLang.startsWith('hi')) langPrefix = 'hi'

  const exactLocale =
    langPrefix === 'te'
      ? 'te-in'
      : langPrefix === 'ta'
      ? 'ta-in'
      : langPrefix === 'hi'
      ? 'hi-in'
      : 'en-in'

  // 1. Match exact locale (e.g. te-IN)
  let matched = voices.find(
    (v) => v.lang && v.lang.toLowerCase().replace('_', '-') === exactLocale
  )

  // 2. Match language prefix (e.g. te-*)
  if (!matched) {
    matched = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(langPrefix))
  }

  // 3. Match voice name keywords
  if (!matched) {
    const nameKeywords = {
      te: ['telugu'],
      ta: ['tamil'],
      hi: ['hindi'],
      en: ['english', 'en_']
    }
    const keywords = nameKeywords[langPrefix] || []
    matched = voices.find((v) => keywords.some((kw) => v.name.toLowerCase().includes(kw)))
  }

  return matched || null
}

export function speakResponse(text, language = 'en', onEnd = null, onError = null) {
  if (!speechSynth || !text) return false

  stopSpeech()

  // Clean markdown and non-speech symbols
  const cleanText = text
    .replace(/[*#_`~]/g, '')
    .replace(/http\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleanText) return false

  const utterance = new SpeechSynthesisUtterance(cleanText)

  const langCode = (language || 'en').toLowerCase()
  let targetLocale = 'en-IN'
  if (langCode.startsWith('te')) targetLocale = 'te-IN'
  else if (langCode.startsWith('ta')) targetLocale = 'ta-IN'
  else if (langCode.startsWith('hi')) targetLocale = 'hi-IN'

  utterance.lang = targetLocale

  const voice = getVoiceForLanguage(langCode)
  if (voice) {
    utterance.voice = voice
  }

  if (onEnd) utterance.onend = onEnd
  if (onError) utterance.onerror = onError

  speechSynth.speak(utterance)
  return true
}

export function stopSpeech() {
  if (speechSynth) {
    speechSynth.cancel()
  }
}

export function isSpeaking() {
  return Boolean(speechSynth && speechSynth.speaking)
}
