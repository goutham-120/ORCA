import { addProtocol } from 'maplibre-gl'
import { omProtocol } from '@openmeteo/weather-map-layer'

let isRegistered = false

export function registerOmProtocol() {
  if (isRegistered) return
  try {
    addProtocol('om', omProtocol)
    isRegistered = true
  } catch (err) {
    console.warn('OM Protocol registration notice:', err.message)
    isRegistered = true
  }
}

export const OM_TEMPERATURE_URL = 'https://openmeteo.s3.amazonaws.com/data_spatial/dwd_icon/latest.json?variable=temperature_2m'
export const OM_WIND_URL = 'https://openmeteo.s3.amazonaws.com/data_spatial/dwd_icon/latest.json?variable=wind_u_component_10m'
export const OM_CURRENTS_URL = 'https://openmeteo.s3.amazonaws.com/data_spatial/meteofrance_currents/latest.json?variable=ocean_u_current'
