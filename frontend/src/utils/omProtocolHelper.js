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
export const OM_CLOUDS_URL = 'https://openmeteo.s3.amazonaws.com/data_spatial/dwd_icon/latest.json?variable=total_cloud_cover'

/**
 * Returns dynamic tile URL for Geostationary Clean Thermal Infrared (10.4µm TIR1).
 * Captures real-time cloud structures and cold convective storm cores over the Indian Ocean & Indian Subcontinent.
 */
export function getSatelliteCloudTileUrl() {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const dateStr = `${yyyy}-${mm}-${dd}`
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/Himawari_AHI_Band13_Clean_Infrared/default/${dateStr}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`
}

export function getVisibleCloudTileUrl() {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const dateStr = `${yyyy}-${mm}-${dd}`
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${dateStr}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`
}

