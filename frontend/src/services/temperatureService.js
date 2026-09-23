const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

export const INDIA_TEMPERATURE_BOUNDS = {
  west: 67.2,
  south: 5.0,
  east: 94.8,
  north: 23.8,
}

const COASTAL_SAMPLE_POINTS = [
  [22.6, 68.4], [22.0, 69.5], [21.5, 70.6], [20.8, 71.3], [20.2, 72.0],
  [19.5, 72.2], [18.7, 72.3], [18.0, 72.5], [17.2, 72.8], [16.4, 73.1],
  [15.6, 73.3], [14.8, 73.6], [14.0, 74.0], [13.2, 74.3], [12.4, 74.5],
  [11.6, 74.8], [10.8, 75.0], [10.0, 75.2], [9.2, 75.4], [8.5, 76.0],
  [7.9, 76.7], [7.8, 77.6], [8.2, 78.2], [8.8, 78.8], [9.6, 79.4],
  [10.5, 80.0], [11.4, 80.4], [12.3, 80.8], [13.2, 81.2], [14.2, 81.6],
  [15.1, 82.0], [16.0, 82.6], [16.9, 83.2], [17.8, 83.8], [18.7, 84.5],
  [19.6, 85.2], [20.4, 86.1], [21.0, 87.0], [21.6, 88.0], [22.1, 88.9],
  [8.4, 72.2], [9.4, 72.6], [10.4, 72.9], [11.3, 73.2],
  [13.9, 92.6], [12.9, 92.8], [11.9, 92.9], [10.9, 92.8], [9.9, 92.6],
  [8.9, 92.4], [7.9, 92.0], [7.0, 91.7],
]

function numberList(values) {
  return values.map((value) => Number(value).toFixed(4)).join(',')
}

export async function fetchIndiaCoastalTemperatureField({ signal } = {}) {
  const latitude = numberList(COASTAL_SAMPLE_POINTS.map(([lat]) => lat))
  const longitude = numberList(COASTAL_SAMPLE_POINTS.map(([, lng]) => lng))
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: 'temperature_2m',
    timezone: 'auto',
  })

  const response = await fetch(`${OPEN_METEO_FORECAST_URL}?${params}`, { signal })
  if (!response.ok) {
    throw new Error(`Open-Meteo temperature request failed (${response.status})`)
  }

  const payload = await response.json()
  const rows = Array.isArray(payload) ? payload : [payload]
  const points = rows.map((row, index) => {
    const fallbackCoord = COASTAL_SAMPLE_POINTS[index]
    const latitudeValue = Number(row.latitude ?? fallbackCoord?.[0])
    const longitudeValue = Number(row.longitude ?? fallbackCoord?.[1])
    const temperature = Number(row.current?.temperature_2m)

    if (
      !Number.isFinite(latitudeValue) ||
      !Number.isFinite(longitudeValue) ||
      !Number.isFinite(temperature)
    ) {
      return null
    }

    return {
      latitude: latitudeValue,
      longitude: longitudeValue,
      air_temperature_c: Number(temperature.toFixed(1)),
    }
  }).filter(Boolean)

  if (!points.length) {
    throw new Error('Open-Meteo returned no usable temperature observations')
  }

  const temperatures = points.map((point) => point.air_temperature_c)

  return {
    status: 'ok',
    source: 'Open-Meteo',
    variable: 'temperature_2m',
    endpoint: OPEN_METEO_FORECAST_URL,
    requestCount: 1,
    timestamp: new Date().toISOString(),
    bounds: INDIA_TEMPERATURE_BOUNDS,
    points,
    minTemp: Math.min(...temperatures),
    maxTemp: Math.max(...temperatures),
  }
}
