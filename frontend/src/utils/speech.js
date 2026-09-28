/**
 * Multilingual Text-to-Speech synthesis helper for ORCA.
 * Supports English (en-IN / en-US), Hindi (hi-IN), Telugu (te-IN), and Tamil (ta-IN).
 */

let speechSynth = typeof window !== 'undefined' ? window.speechSynthesis : null
let cachedVoices = []

if (speechSynth) {
  cachedVoices = speechSynth.getVoices()
  if (typeof speechSynth.addEventListener === 'function') {
    speechSynth.addEventListener('voiceschanged', () => {
      cachedVoices = speechSynth.getVoices()
    })
  } else {
    speechSynth.onvoiceschanged = () => {
      cachedVoices = speechSynth.getVoices()
    }
  }
}

export function getVoiceForLanguage(langCode) {
  if (!speechSynth) return null
  const voices = (cachedVoices && cachedVoices.length > 0) ? cachedVoices : speechSynth.getVoices()
  if (!voices || voices.length === 0) return null

  const targetLang = (langCode || 'en').toLowerCase()
  let langPrefix = 'en'
  if (targetLang.startsWith('ml')) langPrefix = 'ml'
  else if (targetLang.startsWith('kn')) langPrefix = 'kn'
  else if (targetLang.startsWith('te')) langPrefix = 'te'
  else if (targetLang.startsWith('ta')) langPrefix = 'ta'
  else if (targetLang.startsWith('hi')) langPrefix = 'hi'
  else if (targetLang.startsWith('or')) langPrefix = 'or'
  else if (targetLang.startsWith('bn')) langPrefix = 'bn'
  else if (targetLang.startsWith('kok')) langPrefix = 'kok'
  else if (targetLang.startsWith('tcy')) langPrefix = 'tcy'
  else if (targetLang.startsWith('gu')) langPrefix = 'gu'
  else if (targetLang.startsWith('mr')) langPrefix = 'mr'

  const exactLocale =
    langPrefix === 'ml'
      ? 'ml-in'
      : langPrefix === 'kn'
      ? 'kn-in'
      : langPrefix === 'te'
      ? 'te-in'
      : langPrefix === 'ta'
      ? 'ta-in'
      : langPrefix === 'hi'
      ? 'hi-in'
      : langPrefix === 'or'
      ? 'or-in'
      : langPrefix === 'bn'
      ? 'bn-in'
      : langPrefix === 'kok'
      ? 'kok-in'
      : langPrefix === 'tcy'
      ? 'tcy-in'
      : langPrefix === 'gu'
      ? 'gu-in'
      : langPrefix === 'mr'
      ? 'mr-in'
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
      ml: ['malayalam'],
      kn: ['kannada'],
      te: ['telugu'],
      ta: ['tamil'],
      hi: ['hindi'],
      or: ['odia', 'oriya'],
      bn: ['bengali', 'bangla'],
      kok: ['konkani', 'kokani'],
      tcy: ['tulu'],
      gu: ['gujarati'],
      mr: ['marathi'],
      en: ['english', 'en_']
    }
    const keywords = nameKeywords[langPrefix] || []
    matched = voices.find((v) => keywords.some((kw) => v.name.toLowerCase().includes(kw)))
  }

  return matched || null
}

let currentSpeakingMessageId = null

export function getCurrentSpeakingId() {
  return currentSpeakingMessageId
}

/**
 * Distills a rich multiline/markdown ORCA answer into a direct, concise,
 * 1-2 sentence spoken response suitable for a fisherman assistant.
 *
 * @param {string} text Full text answer
 * @param {string} language Language code
 * @param {object} [response] Optional structured response object
 * @returns {string} Clean, crisp, direct voice utterance
 */
export function distillVoiceResponse(text, language = 'en', response = null) {
  if (!text && !response) return ''

  const raw = String(text || response?.answer || '').trim()
  if (!raw) return ''

  // 1. Strip raw markdown formatting (code blocks, headers, bold, italics, links, blockquotes, list bullets, HTML, URLs)
  let cleaned = raw
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*{1,3}(.*?)\*{1,3}/g, '$1')
    .replace(/_{1,3}(.*?)_{1,3}/g, '$1')
    .replace(/~{2}(.*?)~{2}/g, '$1')
    .replace(/^>\s+/gm, '')
    .replace(/^[\s*\-+•\d.]+\s+/gm, '')
    .replace(/<[^>]+>/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .trim()

  // 2. Natural assistant phrasing & removing non-conversational boilerplate
  cleaned = cleaned
    .replace(/ORCA'?s?\s+combined\s+assessment\s+for\s+([^.]+?)\s+is\s+([a-zA-Z]+)\s+risk\.?/gi, 'Conditions for $1 are $2 risk.')
    .replace(/ORCA'?s?\s+combined\s+assessment\s+is\s+([a-zA-Z]+)\s+risk\.?/gi, 'Conditions are $1 risk.')
    .replace(/ORCA\s+సముద్ర\s+ప్రమాద\s+అంచనా\s*\[([^\]]+)\]:\s*/gi, '$1 వద్ద ')
    .replace(/ORCA\s+का\s+संयुक्त\s+समुद्री\s+जोखिम\s+आकलन\s*\[([^\]]+)\]:\s*/gi, '$1 में ')
    .replace(/ORCA\s+கடல்சார்\s+இடர்\s+மதிப்பீடு:\s*/gi, '')
    .replace(/Decision intelligence:\s*/gi, 'Advisory: ')
    .replace(/Decision limitations:\s*/gi, '')
    .replace(/Domain evidence:\s*/gi, '')
    .replace(/Weather evidence:\s*/gi, 'Weather: ')
    .replace(/Ocean evidence:\s*/gi, 'Ocean: ')
    .replace(/GIS evidence:\s*/gi, '')
    .replace(/Some requested capability domains remain pending:.*$/gim, '')
    .replace(/View the source-backed features in Map Explorer\.?/gi, '')
    .replace(/\(Lat:?\s*[\d.]+,?\s*Lon:?\s*[\d.]+\)/gi, '')
    .replace(/\([\d.]+\s*°\s*[NSEW],?\s*[\d.]+\s*°\s*[NSEW]\)/gi, '')
    .replace(/Confidence:\s*[\d.]+/gi, '')

  // 3. Spoken pronunciation replacements for units
  cleaned = cleaned
    .replace(/(\d+(?:\.\d+)?)\s*m\/s/gi, '$1 meters per second')
    .replace(/(\d+(?:\.\d+)?)\s*kts?/gi, '$1 knots')
    .replace(/(\d+(?:\.\d+)?)\s*°C/gi, '$1 degrees Celsius')
    .replace(/(\d+(?:\.\d+)?)\s*m\b/gi, '$1 meters')
    .replace(/(\d+(?:\.\d+)?)\s*s\b/gi, '$1 seconds')
    .replace(/;\s*/g, ', ')

  // 4. Split into natural sentences (handles English and Indic terminators . ! ? ।)
  const sentenceDelimiters = /([.!?।]+[\s\n]+|\n\n+|\n(?=[A-Z\u0900-\u0DFF]))/g
  const tokens = cleaned.split(sentenceDelimiters)
  const sentences = []

  for (let i = 0; i < tokens.length; i++) {
    const trimmed = tokens[i].trim()
    if (!trimmed) continue
    if (/^[.!?।]+$/.test(trimmed)) {
      if (sentences.length > 0) {
        sentences[sentences.length - 1] += trimmed
      }
    } else if (trimmed.length > 3) {
      sentences.push(trimmed)
    }
  }

  // 5. Filter out purely diagnostic/metadata sentences
  const filtered = sentences.filter((s) => {
    const lower = s.toLowerCase()
    if (lower.startsWith('note:') || lower.startsWith('disclaimer:') || lower.startsWith('source:') || lower.startsWith('data status:')) return false
    if (lower.includes('capability domains remain pending')) return false
    if (lower.includes('view the source-backed features')) return false
    if (lower.includes('data is unavailable: coordinates were not supplied')) return false
    return true
  })

  // 6. Combine all substantive answer sentences cleanly
  let finalVoiceText = filtered.join(' ').replace(/\s+/g, ' ').trim()
  if (!finalVoiceText) {
    finalVoiceText = cleaned.slice(0, 300)
  }

  if (!/[.!?।]$/.test(finalVoiceText)) {
    finalVoiceText += '.'
  }

  return finalVoiceText
}

export function speakResponse(text, language = 'en', onEnd = null, onError = null, messageId = null, response = null) {
  if (!speechSynth || (!text && !response)) return false

  stopSpeech()

  // Distill full chat answer into a direct, concise voice assistant answer
  const cleanVoiceText = distillVoiceResponse(text, language, response)
  if (!cleanVoiceText) return false

  const utterance = new SpeechSynthesisUtterance(cleanVoiceText)

  const langCode = (language || 'en').toLowerCase()
  let targetLocale = 'en-IN'
  if (langCode.startsWith('ml')) targetLocale = 'ml-IN'
  else if (langCode.startsWith('kn')) targetLocale = 'kn-IN'
  else if (langCode.startsWith('te')) targetLocale = 'te-IN'
  else if (langCode.startsWith('ta')) targetLocale = 'ta-IN'
  else if (langCode.startsWith('hi')) targetLocale = 'hi-IN'
  else if (langCode.startsWith('or')) targetLocale = 'or-IN'
  else if (langCode.startsWith('bn')) targetLocale = 'bn-IN'
  else if (langCode.startsWith('kok')) targetLocale = 'kok-IN'
  else if (langCode.startsWith('tcy')) targetLocale = 'tcy-IN'
  else if (langCode.startsWith('gu')) targetLocale = 'gu-IN'
  else if (langCode.startsWith('mr')) targetLocale = 'mr-IN'

  utterance.lang = targetLocale

  const voice = getVoiceForLanguage(langCode)
  if (voice) {
    utterance.voice = voice
  }

  currentSpeakingMessageId = messageId || 'active'
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('orca-speech-start', {
        detail: { messageId: currentSpeakingMessageId, text: cleanVoiceText, language: targetLocale },
      })
    )
  }

  utterance.onend = (e) => {
    currentSpeakingMessageId = null
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('orca-speech-end', { detail: { messageId } }))
    }
    if (onEnd) onEnd(e)
  }

  utterance.onerror = (e) => {
    currentSpeakingMessageId = null
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('orca-speech-end', { detail: { messageId, error: e } }))
    }
    if (onError) onError(e)
  }

  speechSynth.speak(utterance)
  return true
}

export function stopSpeech() {
  if (speechSynth) {
    speechSynth.cancel()
    currentSpeakingMessageId = null
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('orca-speech-end', { detail: {} }))
    }
  }
}

export function isSpeaking() {
  return Boolean(speechSynth && speechSynth.speaking)
}
