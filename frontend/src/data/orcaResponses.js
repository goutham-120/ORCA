import { dashboardLocations } from './dashboardData'

export function getActiveLocation() {
  try {
    const raw = localStorage.getItem('orca-dashboard-preferences')
    if (raw) {
      const parsed = JSON.parse(raw)
      const found = dashboardLocations.find((loc) => loc.id === parsed.locationId)
      if (found) return found
    }
  } catch {
    // Ignore parse errors and fallback to default
  }
  return dashboardLocations[0]
}

export function generateOrcaResponse(question = '', customLocation = null) {
  const loc = customLocation || getActiveLocation()
  const q = question.toLowerCase().trim()

  const { name, wave, wind, temperature, visibility, safety, brief, findings, alertsList } = loc

  // Safety category
  if (q.includes('safe') || q.includes('travel') || q.includes('vessel') || q.includes('hazard') || q.includes('caution')) {
    const alertNote = alertsList && alertsList.length > 0
      ? `Active advisories: ${alertsList.map(a => a.title).join(', ')}.`
      : 'No high-severity alerts in effect.'

    const primary = `Safety score for ${name} is ${safety.score}/100 (${safety.label}). ${safety.note} ${alertNote}`
    const alt1 = `Based on current observations near ${name}, sea state is ${safety.label.toLowerCase()}. ${brief}`
    const alt2 = `Marine operations notice for ${name}: Safety index stands at ${safety.score}/100. ${findings && findings[0] ? findings[0].text + '.' : ''} Please check local harbor guidance.`

    return {
      text: primary,
      category: 'Safety Analysis',
      alternates: [alt1, alt2]
    }
  }

  // Conditions category
  if (q.includes('condition') || q.includes('wave') || q.includes('wind') || q.includes('temp') || q.includes('visibility') || q.includes('sea')) {
    const primary = `Current marine conditions near ${name}: Wave height is ${wave.value} ${wave.unit} (${wave.status}), winds are ${wind.value} ${wind.unit} (${wind.status}), surface water temperature is ${temperature.value}°${temperature.unit}, and visibility is ${visibility}.`
    const alt1 = `${name} live briefing: ${brief} Key metrics include waves at ${wave.value}m (${wave.trend}) and winds at ${wind.value}km/h.`
    const alt2 = `Observed sea state near ${name}: ${wave.status} wave action (${wave.value}m) with ${wind.status} winds at ${wind.value}km/h. Visibility is ${visibility}.`

    return {
      text: primary,
      category: 'Sea Conditions',
      alternates: [alt1, alt2]
    }
  }

  // Route category
  if (q.includes('route') || q.includes('passage') || q.includes('transit') || q.includes('path') || q.includes('destination')) {
    const primary = `Route Assessment near ${name}: Offshore approach features ${wave.value}m wave activity and ${wind.value}km/h winds. ${safety.score >= 70 ? 'Coastal transit corridors are clear for routine navigation.' : 'Caution advised along exposed offshore corridors due to elevated wave activity.'}`
    const alt1 = `Passage conditions departing ${name}: Coastal channels report ${visibility} visibility. ${alertsList && alertsList[0] ? 'Note: ' + alertsList[0].guidance : 'No coastal passage hazards recorded.'}`
    const alt2 = `Navigational preview near ${name}: Sea state allows stable passage within coastal waters. Offshore sectors register ${wave.value}m swells.`

    return {
      text: primary,
      category: 'Route Assessment',
      alternates: [alt1, alt2]
    }
  }

  // Forecast category
  if (q.includes('forecast') || q.includes('tomorrow') || q.includes('tonight') || q.includes('later') || q.includes('upcoming') || q.includes('trend') || q.includes('time')) {
    const primary = `Forecast trend for ${name}: Wave heights are currently ${wave.trend.toLowerCase()} (${wave.value}m), while winds are ${wind.trend.toLowerCase()} (${wind.value}km/h). Expect conditions to remain ${safety.label.toLowerCase()} over the next 12-24 hours.`
    const alt1 = `12-Hour Projection for ${name}: Wind speeds projected to hover around ${wind.value}km/h. Wave action expected near ${wave.value}m with ${visibility} visibility.`
    const alt2 = `Short-term forecast near ${name}: ${brief} Trend indicates waves ${wave.trend.toLowerCase()} and temperature ${temperature.trend.toLowerCase()}.`

    return {
      text: primary,
      category: 'Marine Forecast',
      alternates: [alt1, alt2]
    }
  }

  // General / Capabilities
  if (q.includes('help') || q.includes('what') || q.includes('can you') || q.includes('orca') || q.includes('capability')) {
    const primary = `I am ORCA, your Marine Intelligence Assistant. I provide real-time location-aware analysis on wave heights, wind direction, surface temperatures, vessel safety indexes, route hazards, and marine alerts near ${name}.`
    const alt1 = `ORCA synthesizes live oceanographic, meteorological, and GIS data to answer your questions on marine safety, route planning, and sea conditions for locations like ${name}.`
    const alt2 = `You can ask me about current sea conditions, small vessel safety advisories, route hazard checks, or weather forecasts for ${name}.`

    return {
      text: primary,
      category: 'ORCA Intelligence Overview',
      alternates: [alt1, alt2]
    }
  }

  // Fallback for general or unrecognized questions
  const fallback = `I can help analyze marine conditions, vessel safety, routes, weather, and hazards near ${name}. Currently near ${name}, waves are ${wave.value}m (${wave.status}), winds are ${wind.value}km/h (${wind.status}), and safety score is ${safety.score}/100.`
  const fallbackAlt1 = `Information for ${name}: ${brief} Ask me specifically about sea conditions, safety advisories, or route forecasts.`
  const fallbackAlt2 = `Location summary for ${name}: Safety index is ${safety.score}/100 (${safety.label}). Waves: ${wave.value}m. Winds: ${wind.value}km/h. Try asking "Is it safe to travel?" or "What are the wave conditions?"`

  return {
    text: fallback,
    category: 'Marine Intelligence',
    alternates: [fallbackAlt1, fallbackAlt2]
  }
}
