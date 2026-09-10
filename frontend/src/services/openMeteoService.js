export const LOCATION_COORDINATES = {
  visakhapatnam: { id: 'visakhapatnam', name: 'Visakhapatnam', region: 'Andhra Pradesh, India', lat: 17.6868, lng: 83.2185, coordinatesStr: '17.6868 N · 83.2185 E', mapPosition: { x: 47, y: 43 } },
  chennai: { id: 'chennai', name: 'Chennai', region: 'Tamil Nadu, India', lat: 13.0827, lng: 80.2707, coordinatesStr: '13.0827 N · 80.2707 E', mapPosition: { x: 38, y: 57 } },
  mumbai: { id: 'mumbai', name: 'Mumbai', region: 'Maharashtra, India', lat: 19.0760, lng: 72.8777, coordinatesStr: '19.0760 N · 72.8777 E', mapPosition: { x: 61, y: 34 } }
}

export function getWindCompassDirection(deg) {
  if (deg === undefined || deg === null) return 'N/A'
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const index = Math.round((deg % 360) / 22.5) % 16
  return `${directions[index]} (${Math.round(deg)}°)`
}

export async function fetchLiveLocationData(locationId) {
  const locDef = LOCATION_COORDINATES[locationId] || LOCATION_COORDINATES.visakhapatnam
  const { lat, lng, name, region, coordinatesStr } = locDef

  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&current=wave_height,wave_period,swell_wave_period,sea_surface_temperature&hourly=wave_height,wave_period,swell_wave_period,sea_surface_temperature`
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_direction_10m&hourly=wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh`

  const [marineRes, weatherRes] = await Promise.all([
    fetch(marineUrl),
    fetch(weatherUrl)
  ])

  if (!marineRes.ok || !weatherRes.ok) {
    throw new Error('Failed to fetch live marine telemetry')
  }

  const marineData = await marineRes.json()
  const weatherData = await weatherRes.json()

  // Extract Current or Latest Hourly Metrics
  const mCur = marineData.current || {}
  const mHour = marineData.hourly || {}
  const wCur = weatherData.current || {}
  const wHour = weatherData.hourly || {}

  const waveHeight = Number((mCur.wave_height ?? mHour.wave_height?.[0] ?? 1.2).toFixed(1))
  const wavePeriod = Number((mCur.wave_period ?? mHour.wave_period?.[0] ?? 6.0).toFixed(1))
  const swellPeriod = Number((mCur.swell_wave_period ?? mHour.swell_wave_period?.[0] ?? 7.0).toFixed(1))
  const seaTemp = Number((mCur.sea_surface_temperature ?? mHour.sea_surface_temperature?.[0] ?? 28.0).toFixed(1))
  const windSpeed = Number((wCur.wind_speed_10m ?? wHour.wind_speed_10m?.[0] ?? 15.0).toFixed(1))
  const windDirDeg = Math.round(wCur.wind_direction_10m ?? wHour.wind_direction_10m?.[0] ?? 45)
  const windDirStr = getWindCompassDirection(windDirDeg)

  // Hourly Trends for Charts
  const hourlyWaves = (mHour.wave_height || []).slice(0, 12).map(v => Number(v.toFixed(1)))
  const hourlyWind = (wHour.wind_speed_10m || []).slice(0, 12).map(v => Number(v.toFixed(1)))
  const hourlyTemp = (mHour.sea_surface_temperature || []).slice(0, 12).map(v => Number(v.toFixed(1)))

  // Safety Classification & Alerts Generation
  const alertsList = []
  const isHighWave = waveHeight > 2.0
  const isStrongWind = windSpeed > 20.0
  const isFavorable = waveHeight <= 1.2 && windSpeed <= 15.0

  const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (isHighWave) {
    alertsList.push({
      id: `${locationId}-live-wave`,
      severity: 'high',
      category: 'wave',
      title: 'High Wave Warning',
      detail: `High Wave Warning — Wave height is ${waveHeight} m at ${name}.`,
      guidance: 'Small vessels should avoid exposed offshore routes until sea state improves.',
      affectedArea: `${name} coastal & offshore waters`,
      time: `Live · ${timeNow}`,
      expectedTime: 'Next 12–24 Hours',
      recommendation: 'Delay non-essential offshore transit.',
      mapPosition: { x: 53, y: 46 }
    })
  } else if (waveHeight > 1.2) {
    alertsList.push({
      id: `${locationId}-live-wave-mod`,
      severity: 'moderate',
      category: 'wave',
      title: 'Moderate Sea State Advisory',
      detail: `Moderate sea state active — Wave height is ${waveHeight} m at ${name}.`,
      guidance: 'Exercise watchfulness beyond coastal channels.',
      affectedArea: `${name} coastal zone`,
      time: `Live · ${timeNow}`,
      expectedTime: 'Current observation',
      recommendation: 'Monitor wave updates prior to offshore travel.',
      mapPosition: { x: 50, y: 45 }
    })
  }

  if (isStrongWind) {
    alertsList.push({
      id: `${locationId}-live-wind`,
      severity: 'high',
      category: 'wind',
      title: 'Strong Wind Advisory',
      detail: `Strong Wind Advisory — Wind speed is ${windSpeed} km/h at ${name}.`,
      guidance: 'Secure mooring lines, check deck cargo, and exercise caution in exposed channels.',
      affectedArea: `${name} harbor & coastal sector`,
      time: `Live · ${timeNow}`,
      expectedTime: 'Through late evening',
      recommendation: 'Maintain safe vessel clearance and verify VHF operations.',
      mapPosition: { x: 41, y: 35 }
    })
  } else if (windSpeed > 15.0) {
    alertsList.push({
      id: `${locationId}-live-wind-mod`,
      severity: 'advisory',
      category: 'wind',
      title: 'Breezy Wind Watch',
      detail: `Breezy coastal wind active — Wind speed is ${windSpeed} km/h (${windDirStr}) at ${name}.`,
      guidance: 'Light vessel operators should verify local harbor updates.',
      affectedArea: `${name} approaches`,
      time: `Live · ${timeNow}`,
      expectedTime: 'Next 6 Hours',
      recommendation: 'Secure light equipment on open decks.',
      mapPosition: { x: 43, y: 38 }
    })
  }

  if (isFavorable) {
    alertsList.push({
      id: `${locationId}-live-favorable`,
      severity: 'info',
      category: 'safety',
      title: 'Favorable Conditions',
      detail: `Favorable Conditions — Wave height is ${waveHeight} m and wind speed is ${windSpeed} km/h at ${name}.`,
      guidance: 'Calm seas and moderate winds support routine maritime operations.',
      affectedArea: `${name} coastal sector`,
      time: `Live · ${timeNow}`,
      expectedTime: 'Current observation',
      recommendation: 'Proceed with routine operational safety watch.',
      mapPosition: { x: 47, y: 43 }
    })
  }

  // Calculate Overall Safety Score
  let safetyScore
  let safetyLabel
  let safetyNote

  if (isHighWave && isStrongWind) {
    safetyScore = 48
    safetyLabel = 'High Alert'
    safetyNote = `High wave warning (${waveHeight}m) and strong wind advisory (${windSpeed} km/h) active near ${name}. Delay non-essential transit.`
  } else if (isHighWave) {
    safetyScore = 58
    safetyLabel = 'Caution'
    safetyNote = `Elevated wave height (${waveHeight}m) observed near ${name}. Small vessels should remain near sheltered waters.`
  } else if (isStrongWind) {
    safetyScore = 62
    safetyLabel = 'Advisory'
    safetyNote = `Strong wind speeds (${windSpeed} km/h) active near ${name}. Secure equipment and monitor harbor watch.`
  } else if (isFavorable) {
    safetyScore = 92
    safetyLabel = 'Favorable'
    safetyNote = `Calm sea state (${waveHeight}m waves, ${windSpeed} km/h wind) supports clear navigation near ${name}.`
  } else {
    safetyScore = 75
    safetyLabel = 'Moderate'
    safetyNote = `Manageable nearshore conditions (${waveHeight}m waves, ${windSpeed} km/h wind) near ${name}.`
  }

  return {
    id: locationId,
    name,
    region,
    coordinates: coordinatesStr,
    mapPosition: locDef.mapPosition,
    wave: {
      value: waveHeight.toString(),
      unit: 'm',
      period: wavePeriod.toString(),
      swellPeriod: swellPeriod.toString(),
      status: waveHeight > 2.0 ? 'High' : waveHeight > 1.2 ? 'Moderate' : 'Stable',
      trend: waveHeight > 1.5 ? 'Elevated' : 'Normal',
      tone: waveHeight > 2.0 ? 'coral' : waveHeight > 1.2 ? 'amber' : 'mint'
    },
    wind: {
      value: windSpeed.toString(),
      unit: 'km/h',
      directionDeg: windDirDeg,
      directionStr: windDirStr,
      status: windDirStr,
      trend: windSpeed > 20 ? 'Strong' : 'Moderate',
      tone: windSpeed > 20 ? 'amber' : 'mint'
    },
    temperature: {
      value: seaTemp.toString(),
      unit: 'C',
      status: 'Live surface reading',
      trend: 'Surface SST',
      tone: 'blue'
    },
    visibility: 'Good, 10 km',
    currents: { speed: '1.2 knots', direction: 'SW', status: 'Nearshore coastal drift' },
    safety: {
      score: safetyScore,
      label: safetyLabel,
      note: safetyNote,
      wave: Math.max(20, Math.min(99, Math.round(100 - waveHeight * 25))),
      wind: Math.max(20, Math.min(99, Math.round(100 - windSpeed * 2))),
      visibility: 90
    },
    brief: `Live telemetry near ${name}: Wave height is ${waveHeight} m (period: ${wavePeriod}s, swell: ${swellPeriod}s), wind speed is ${windSpeed} km/h (${windDirStr}), and sea surface temp is ${seaTemp}°C.`,
    findings: [
      { tone: isStrongWind ? 'warning' : 'good', text: `Wind speed: ${windSpeed} km/h (${windDirStr})` },
      { tone: isHighWave ? 'warning' : 'good', text: `Wave height: ${waveHeight} m (swell: ${swellPeriod}s)` },
      { tone: 'good', text: `Sea surface temperature: ${seaTemp}°C` }
    ],
    alertsList,
    traffic: [
      { id: `${locationId}-t1`, name: 'Port Patrol Alpha', type: 'Patrol Vessel', status: 'In Transit', mapPosition: { x: 42, y: 38 } },
      { id: `${locationId}-t2`, name: 'Coastal Tug Star', type: 'Support Tug', status: 'Anchored', mapPosition: { x: 52, y: 49 } }
    ],
    fishing: [
      { id: `${locationId}-f1`, zone: 'Shelf Sector', activeVessels: 10, activity: 'Routine activity', depth: '30m shelf', mapPosition: { x: 55, y: 35 } }
    ],
    trends: {
      waves: { label: 'Wave height (m)', values: hourlyWaves.length ? hourlyWaves : [1.2, 1.3, 1.4, waveHeight], current: `${waveHeight} m`, direction: waveHeight > 1.5 ? 'Rising' : 'Stable' },
      wind: { label: 'Wind speed (km/h)', values: hourlyWind.length ? hourlyWind : [12, 14, 16, windSpeed], current: `${windSpeed} km/h`, direction: windSpeed > 18 ? 'Building' : 'Easing' },
      temperature: { label: 'Surface temp (°C)', values: hourlyTemp.length ? hourlyTemp : [27.5, 28.0, seaTemp], current: `${seaTemp} °C`, direction: 'Stable' }
    }
  }
}
