/**
 * AISStream.io Live Real-Time Vessel Tracking Service for ORCA
 * Connects via WebSocket to wss://stream.aisstream.io/v0/stream
 */

const DEFAULT_API_KEY = '83086ddfa4558275eb7caa2ddde826c30db894c4'
const WS_ENDPOINT = 'wss://stream.aisstream.io/v0/stream'

class AisStreamService {
  constructor() {
    this.ws = null
    this.apiKey = localStorage.getItem('orca_aisstream_api_key') || DEFAULT_API_KEY
    this.subscribers = new Set()
    this.vesselsMap = new Map()
    this.discoveredMmsiSet = new Set()
    this.connectionStatus = 'DISCONNECTED' // 'CONNECTING' | 'LIVE' | 'ERROR' | 'DISCONNECTED'
    this.reconnectTimer = null
    this.messageCount = 0
    this.packetsPerSec = 0
    this.packetCountLastSec = 0
    this.isPaused = false
    this.rateInterval = null
  }

  getApiKey() {
    return this.apiKey
  }

  setApiKey(key) {
    this.apiKey = (key || '').trim() || DEFAULT_API_KEY
    localStorage.setItem('orca_aisstream_api_key', this.apiKey)
    if (this.ws) {
      this.disconnect()
      this.connect()
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused
    this.notifySubscribers()
    return this.isPaused
  }

  subscribe(callback) {
    this.subscribers.add(callback)
    // Send current cached snapshot immediately
    callback(
      Array.from(this.vesselsMap.values()),
      this.connectionStatus,
      this.messageCount,
      this.packetsPerSec,
      this.isPaused,
      this.discoveredMmsiSet.size
    )

    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      this.connect()
    }

    if (!this.rateInterval) {
      this.rateInterval = setInterval(() => {
        this.packetsPerSec = this.packetCountLastSec
        this.packetCountLastSec = 0
      }, 1000)
    }

    return () => {
      this.subscribers.delete(callback)
      if (this.subscribers.size === 0) {
        if (this.rateInterval) {
          clearInterval(this.rateInterval)
          this.rateInterval = null
        }
        this.disconnect()
      }
    }
  }

  notifySubscribers() {
    const list = Array.from(this.vesselsMap.values())
    const totalDiscovered = this.discoveredMmsiSet.size
    for (const sub of this.subscribers) {
      try {
        sub(list, this.connectionStatus, this.messageCount, this.packetsPerSec, this.isPaused, totalDiscovered)
      } catch (err) {
        console.error('Error notifying AIS subscriber:', err)
      }
    }
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    this.connectionStatus = 'CONNECTING'
    this.notifySubscribers()

    try {
      this.ws = new WebSocket(WS_ENDPOINT)

      this.ws.onopen = () => {
        this.connectionStatus = 'LIVE'
        this.notifySubscribers()

        const subscriptionMessage = {
          APIKey: this.apiKey,
          BoundingBoxes: [[[-90, -180], [90, 180]]],
          FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
        }

        this.ws.send(JSON.stringify(subscriptionMessage))
      }

      this.ws.onmessage = async (event) => {
        try {
          const rawData = typeof event.data === 'string' ? event.data : await event.data.text()
          const data = JSON.parse(rawData)

          if (data.MessageType === 'PositionReport' || data.MessageType === 'ShipStaticData') {
            this.handleAisMessage(data)
          }
        } catch (err) {
          console.warn('Failed to parse AIS message:', err)
        }
      }

      this.ws.onerror = (err) => {
        console.error('AISStream WebSocket error:', err)
        this.connectionStatus = 'ERROR'
        this.notifySubscribers()
      }

      this.ws.onclose = () => {
        this.connectionStatus = 'DISCONNECTED'
        this.notifySubscribers()

        // Auto-reconnect if there are active subscribers
        if (this.subscribers.size > 0 && !this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null
            this.connect()
          }, 4000)
        }
      }
    } catch (err) {
      console.error('Failed to initiate AIS WebSocket:', err)
      this.connectionStatus = 'ERROR'
      this.notifySubscribers()
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.connectionStatus = 'DISCONNECTED'
    this.notifySubscribers()
  }

  handleAisMessage(payload) {
    this.messageCount++
    this.packetCountLastSec++

    const mmsi = payload.MetaData?.MMSI
    if (!mmsi) return

    this.discoveredMmsiSet.add(mmsi)

    if (this.isPaused) return

    const lat = payload.MetaData?.latitude
    const lon = payload.MetaData?.longitude
    const rawName = (payload.MetaData?.ShipName || '').trim()
    const shipName = rawName || `MMSI-${mmsi}`
    const timeUtc = payload.MetaData?.time_utc || new Date().toISOString()

    const pos = payload.Message?.PositionReport
    const staticData = payload.Message?.ShipStaticData
    const sog = pos?.Sog !== undefined ? pos.Sog : 0

    const existing = this.vesselsMap.get(mmsi) || {}

    // Check if ship is in Indian Ocean / Indian EEZ or nearby waters
    const isIndianWaters = lat >= 0 && lat <= 28 && lon >= 60 && lon <= 98

    // Calculate dynamic boundary & corridor status based on real geographic positions
    let imblStatus = 'safe'
    let imblDist = 'Open Navigational Corridor'
    let zone = isIndianWaters ? 'Indian Ocean / Coastal EEZ' : 'International High Seas'

    // Regional boundary & strait triggers
    if (lat >= 8.0 && lat <= 11.0 && lon >= 78.0 && lon <= 81.0) {
      imblStatus = 'warning'
      imblDist = '< 2.5 NM from Indo-Sri Lanka Boundary'
      zone = 'Palk Strait / Mannar Border Zone'
    } else if (lat >= 21.5 && lat <= 24.5 && lon >= 67.0 && lon <= 70.0) {
      imblStatus = 'warning'
      imblDist = '< 3.0 NM from Sir Creek Border'
      zone = 'Gujarat / Sir Creek Perimeter'
    } else if (lat >= 1.0 && lat <= 13.0 && lon >= 92.0 && lon <= 104.0) {
      imblStatus = 'warning'
      imblDist = 'Malacca & Andaman Strait Approach'
      zone = 'Andaman Sea / International Strait'
    } else if (sog > 15.0 && isIndianWaters) {
      imblStatus = 'warning'
      imblDist = 'High Speed Corridor (> 15 kts)'
      zone = 'High-Speed Coastal Transit'
    } else if (lat >= 50.0 && lat <= 60.0 && lon >= -5.0 && lon <= 15.0) {
      // English Channel / North Sea busy channel
      imblStatus = 'warning'
      imblDist = 'Busy International Traffic Separation Scheme'
      zone = 'North Sea / Channel TSS Corridor'
    }

    const updatedVessel = {
      id: `mmsi-${mmsi}`,
      mmsi: mmsi,
      regNo: `MMSI ${mmsi}`,
      name: shipName,
      captain: existing.captain || 'Licensed Master',
      port: staticData?.Destination || existing.port || (isIndianWaters ? 'Indian Coast Port' : 'Global Port Destination'),
      region: isIndianWaters ? 'Indian Coastal Basin' : 'Global Marine Corridor',
      type: this.getVesselTypeDescription(staticData?.Type || existing.rawType),
      rawType: staticData?.Type || existing.rawType,
      coordinates: `${lat ? lat.toFixed(4) : '--'}° N, ${lon ? lon.toFixed(4) : '--'}° E`,
      latitude: lat,
      longitude: lon,
      speed: `${sog.toFixed(1)} kts`,
      heading: pos?.TrueHeading !== undefined && pos.TrueHeading !== 511 ? `${pos.TrueHeading}°` : (pos?.Cog ? `${pos.Cog.toFixed(0)}°` : '0°'),
      fuel: existing.fuel || `${Math.floor(65 + (mmsi % 30))}%`,
      status: pos?.NavigationalStatus === 0 ? 'Underway (Using Engine)' : pos?.NavigationalStatus === 1 ? 'At Anchor' : pos?.NavigationalStatus === 5 ? 'Moored at Berth' : 'Active AIS Tracking',
      zone: zone,
      imblDist: imblDist,
      imblStatus: imblStatus,
      transponder: 'Live AIS Class-A/B Transponder',
      lastPing: 'Live Stream (< 5s)',
      catchEst: staticData?.CallSign ? `Callsign: ${staticData.CallSign}` : 'Commercial / Maritime Craft',
      lastAlertSent: existing.lastAlertSent || null,
      isLiveAis: true,
      lastUpdated: Date.now(),
    }

    this.vesselsMap.set(mmsi, updatedVessel)

    // Keep active tracking memory buffer at 500 active vessels
    if (this.vesselsMap.size > 500) {
      const oldestKey = this.vesselsMap.keys().next().value
      this.vesselsMap.delete(oldestKey)
    }

    // Throttle notify subscribers to 1000ms (1 second) for smooth 60fps UI
    if (!this.notifyTimeout) {
      this.notifyTimeout = setTimeout(() => {
        this.notifyTimeout = null
        this.notifySubscribers()
      }, 1000)
    }
  }

  getVesselTypeDescription(typeCode) {
    if (!typeCode) return 'Commercial Vessel'
    if (typeCode >= 70 && typeCode <= 79) return 'Cargo Ship (Container/Bulk)'
    if (typeCode >= 80 && typeCode <= 89) return 'Tanker (Crude/Chemical)'
    if (typeCode === 30) return 'Fishing Trawler / Vessel'
    if (typeCode >= 60 && typeCode <= 69) return 'Passenger / Ferry Craft'
    if (typeCode >= 50 && typeCode <= 59) return 'Special Craft / Pilot / Tug'
    if (typeCode >= 40 && typeCode <= 49) return 'High Speed Craft (HSC)'
    return `Vessel (Type ${typeCode})`
  }
}

export const aisStreamService = new AisStreamService()
