import { COASTAL_LOCATIONS } from './coastalLocations'

const detailedPresets = {
  visakhapatnam: {
    id: 'visakhapatnam', name: 'Visakhapatnam', region: 'Andhra Pradesh, India', latitude: 17.6868, longitude: 83.2185, coordinates: '17.6868 N · 83.2185 E', mapPosition: { x: 47, y: 43 },
    wave: { value: '1.8', unit: 'm', status: 'Moderate', trend: 'Up 0.2 m', tone: 'amber' }, wind: { value: '18', unit: 'km/h', status: 'NE direction', trend: 'Down 3 km/h', tone: 'mint' }, temperature: { value: '28.4', unit: 'C', status: 'Surface reading', trend: 'Up 0.4 C', tone: 'blue' }, visibility: 'Good, 8 km',
    currents: { speed: '1.4 knots', direction: 'SW', status: 'Moderate coastal drift' },
    safety: { score: 72, label: 'Moderate', note: 'Conditions are manageable near shore. Review wave activity before offshore travel.', wave: 76, wind: 58, visibility: 89 },
    brief: 'Current conditions near Visakhapatnam are moderate. Wave activity has increased slightly over the last six hours while wind conditions remain manageable.',
    findings: [{ tone: 'good', text: 'Wind conditions remain manageable' }, { tone: 'good', text: 'Visibility is good for local operations' }, { tone: 'warning', text: 'Wave height may increase later today' }],
    alertsList: [
      { id: 'viz-wave', severity: 'high', category: 'wave', title: 'High wave advisory', detail: 'Offshore wave height may reach 2.4 m.', guidance: 'Small vessels should avoid exposed offshore routes until conditions ease.', affectedArea: 'Visakhapatnam coast', time: 'Today · 06:15 AM', expectedTime: '6:00 AM – 6:00 PM', recommendation: 'Delay non-essential offshore transit.', mapPosition: { x: 60, y: 47 } },
      { id: 'viz-wind', severity: 'moderate', category: 'wind', title: 'Northeast wind advisory', detail: 'Gusts are expected through late evening.', guidance: 'Secure loose gear and monitor local harbor notices.', affectedArea: 'Northern coastal waters', time: 'Today · 08:30 AM', expectedTime: 'Through 11:00 PM', recommendation: 'Check mooring lines and secure cargo.', mapPosition: { x: 58, y: 45 } },
      { id: 'viz-craft', severity: 'advisory', category: 'craft', title: 'Small craft watch', detail: 'Exercise caution beyond coastal waters.', guidance: 'Plan short coastal passages and carry current communications.', affectedArea: 'Bay of Bengal approaches', time: 'Today · 10:00 AM', expectedTime: '24 Hours', recommendation: 'Keep VHF Channel 16 operational.', mapPosition: { x: 62, y: 49 } },
    ],
    traffic: [
      { id: 'v1', name: 'MV Vizag Star', type: 'Cargo Ship', status: 'In Transit (14 knots)', mapPosition: { x: 59, y: 46 } },
      { id: 'v2', name: 'Ocean Tug Alpha', type: 'Support Vessel', status: 'Anchored', mapPosition: { x: 61, y: 48 } }
    ],
    fishing: [
      { id: 'f1', zone: 'North Coastal Sector', activeVessels: 12, activity: 'Moderate activity', depth: '35m shelf', mapPosition: { x: 60, y: 46 } }
    ],
    trends: { waves: { label: 'Wave height (m)', values: [1.1, 1.2, 1.3, 1.25, 1.4, 1.5, 1.42, 1.55, 1.6, 1.72, 1.7, 1.8], current: '1.8 m', direction: 'Rising' }, wind: { label: 'Wind speed (km/h)', values: [12, 13, 14, 16, 14, 15, 17, 19, 17, 20, 19, 18], current: '18 km/h', direction: 'Easing' }, temperature: { label: 'Surface temperature (C)', values: [27.8, 27.9, 28, 28, 28.1, 28.15, 28.2, 28.15, 28.3, 28.35, 28.3, 28.4], current: '28.4 C', direction: 'Warming' } },
  },
  chennai: {
    id: 'chennai', name: 'Chennai / Kasimedu', region: 'Tamil Nadu, India', latitude: 13.0827, longitude: 80.2707, coordinates: '13.0827 N · 80.2707 E', mapPosition: { x: 38, y: 57 },
    wave: { value: '1.1', unit: 'm', status: 'Stable', trend: 'Down 0.1 m', tone: 'mint' }, wind: { value: '12', unit: 'km/h', status: 'ESE direction', trend: 'Up 2 km/h', tone: 'blue' }, temperature: { value: '29.1', unit: 'C', status: 'Surface reading', trend: 'Up 0.2 C', tone: 'blue' }, visibility: 'Excellent, 11 km',
    currents: { speed: '0.8 knots', direction: 'S', status: 'Gentle southerly drift' },
    safety: { score: 86, label: 'Favorable', note: 'Stable near-coast conditions support routine activity. Continue monitoring evening winds.', wave: 88, wind: 78, visibility: 92 },
    brief: 'Conditions near Chennai & Kasimedu are favorable for routine coastal activity. Low wave heights and clear visibility support a stable operating window.',
    findings: [{ tone: 'good', text: 'Sea state is stable near the coast' }, { tone: 'good', text: 'Visibility remains excellent' }, { tone: 'warning', text: 'Monitor wind increase after sunset' }],
    alertsList: [
      { id: 'che-wind', severity: 'advisory', category: 'wind', title: 'Evening wind watch', detail: 'Localized gusts may develop after sunset.', guidance: 'Reassess light-vessel departures after local sunset.', affectedArea: 'Chennai coastal waters', time: 'Today · 02:15 PM', expectedTime: '6:00 PM – Midnight', recommendation: 'Monitor local coastal weather updates.', mapPosition: { x: 55, y: 59 } },
      { id: 'che-info', severity: 'info', category: 'traffic', title: 'Port navigation notice', detail: 'Routine harbor maintenance dredging in progress near south channel.', guidance: 'Maintain safe clearance from buoy markers.', affectedArea: 'Chennai harbor approach', time: 'Today · 04:00 PM', expectedTime: 'Ongoing until 8:00 PM', recommendation: 'Follow pilotage advisories.', mapPosition: { x: 54, y: 58 } }
    ],
    traffic: [
      { id: 'c1', name: 'Coromandel Express', type: 'Container Vessel', status: 'Approaching Port (11 knots)', mapPosition: { x: 54, y: 57 } }
    ],
    fishing: [
      { id: 'f2', zone: 'Kasimedu Shelf Zone', activeVessels: 18, activity: 'Active trawling', depth: '22m shelf', mapPosition: { x: 56, y: 59 } }
    ],
    trends: { waves: { label: 'Wave height (m)', values: [1.35, 1.3, 1.25, 1.2, 1.18, 1.15, 1.12, 1.1, 1.05, 1.1, 1.08, 1.1], current: '1.1 m', direction: 'Settling' }, wind: { label: 'Wind speed (km/h)', values: [8, 9, 10, 9, 10, 11, 11, 12, 10, 11, 12, 12], current: '12 km/h', direction: 'Building' }, temperature: { label: 'Surface temperature (C)', values: [28.3, 28.4, 28.5, 28.6, 28.7, 28.8, 28.8, 28.9, 29, 29, 29, 29.1], current: '29.1 C', direction: 'Warming' } },
  },
  mumbai: {
    id: 'mumbai', name: 'Mumbai / Sassoon Dock', region: 'Maharashtra, India', latitude: 19.0760, longitude: 72.8777, coordinates: '19.0760 N · 72.8777 E', mapPosition: { x: 61, y: 34 },
    wave: { value: '2.4', unit: 'm', status: 'Elevated', trend: 'Up 0.4 m', tone: 'coral' }, wind: { value: '25', unit: 'km/h', status: 'WSW direction', trend: 'Up 5 km/h', tone: 'amber' }, temperature: { value: '27.6', unit: 'C', status: 'Surface reading', trend: 'Down 0.3 C', tone: 'blue' }, visibility: 'Moderate, 6 km',
    currents: { speed: '2.1 knots', direction: 'NW', status: 'Strong tidal currents' },
    safety: { score: 54, label: 'Caution', note: 'Rising wave and wind activity reduce the operating margin for smaller vessels.', wave: 48, wind: 52, visibility: 76 },
    brief: 'Conditions near Mumbai and Sassoon Dock require caution. Wave and wind activity are both rising, creating a less favorable window for small-vessel operations.',
    findings: [{ tone: 'warning', text: 'Wave activity is increasing offshore' }, { tone: 'warning', text: 'Wind speeds are above routine levels' }, { tone: 'good', text: 'Visibility remains acceptable near shore' }],
    alertsList: [
      { id: 'mum-sea', severity: 'high', category: 'wave', title: 'Rough sea warning', detail: 'Avoid exposed offshore routes where possible.', guidance: 'Delay small-vessel departures until the sea state improves.', affectedArea: 'Mumbai offshore approaches', time: 'Today · 05:45 AM', expectedTime: 'Immediate – 18 Hours', recommendation: 'Stay within sheltered harbor waters.', mapPosition: { x: 44, y: 45 } },
      { id: 'mum-wind', severity: 'high', category: 'wind', title: 'Strong wind advisory', detail: 'Sustained winds have increased west of the harbor.', guidance: 'Use sheltered route alternatives where operationally appropriate.', affectedArea: 'West harbor approaches', time: 'Today · 07:15 AM', expectedTime: 'Through midnight', recommendation: 'Double check anchorage lines.', mapPosition: { x: 43, y: 43 } },
      { id: 'mum-visibility', severity: 'moderate', category: 'visibility', title: 'Reduced visibility notice', detail: 'Visibility may vary near the outer harbor.', guidance: 'Maintain watchkeeping and verify navigation lighting.', affectedArea: 'Outer harbor', time: 'Today · 09:10 AM', expectedTime: 'Until 4:00 PM', recommendation: 'Use fog horn signals if required.', mapPosition: { x: 46, y: 45 } },
      { id: 'mum-current', severity: 'advisory', category: 'current', title: 'Current variability watch', detail: 'Nearshore current patterns may shift through the evening.', guidance: 'Confirm local conditions before departure.', affectedArea: 'Mumbai coastline', time: 'Today · 11:30 AM', expectedTime: 'During ebb tide', recommendation: 'Maintain vessel steering margin.', mapPosition: { x: 45, y: 44 } }
    ],
    traffic: [
      { id: 'm1', name: 'Arabian Titan', type: 'Oil Tanker', status: 'Outer Harbor Wait (4 knots)', mapPosition: { x: 44, y: 43 } },
      { id: 'm2', name: 'Sea Patrol 04', type: 'Coast Guard Patrol', status: 'Patrolling (18 knots)', mapPosition: { x: 46, y: 46 } }
    ],
    fishing: [
      { id: 'f3', zone: 'High Seas Fishing Bank', activeVessels: 18, activity: 'High activity', depth: '50m shelf', mapPosition: { x: 44, y: 46 } }
    ],
    trends: { waves: { label: 'Wave height (m)', values: [1.3, 1.45, 1.5, 1.65, 1.7, 1.8, 1.9, 2.05, 2, 2.2, 2.25, 2.4], current: '2.4 m', direction: 'Rising' }, wind: { label: 'Wind speed (km/h)', values: [15, 16, 18, 17, 19, 20, 21, 23, 22, 24, 24, 25], current: '25 km/h', direction: 'Rising' }, temperature: { label: 'Surface temperature (C)', values: [28.4, 28.3, 28.2, 28.1, 28, 27.9, 27.9, 27.8, 27.7, 27.6, 27.6], current: '27.6 C', direction: 'Cooling' } },
  },
  kochi: {
    id: 'kochi', name: 'Kochi', region: 'Kerala, India', latitude: 9.9312, longitude: 76.2673, coordinates: '9.9312 N · 76.2673 E', mapPosition: { x: 42, y: 72 },
    wave: { value: '1.3', unit: 'm', status: 'Moderate', trend: 'Up 0.1 m', tone: 'amber' }, wind: { value: '14', unit: 'km/h', status: 'WNW direction', trend: 'Stable', tone: 'blue' }, temperature: { value: '28.9', unit: 'C', status: 'Surface reading', trend: 'Up 0.1 C', tone: 'blue' }, visibility: 'Good, 9 km',
    currents: { speed: '1.1 knots', direction: 'S', status: 'Moderate coastal drift' },
    safety: { score: 81, label: 'Favorable', note: 'Routine harbor and nearshore navigation window open.', wave: 82, wind: 80, visibility: 90 },
    brief: 'Conditions near Kochi port are stable with minor swell activity. Safe for light craft and commercial shipping.',
    findings: [{ tone: 'good', text: 'Port channel navigation conditions clear' }, { tone: 'good', text: 'Visibility is good for coastal passage' }],
    alertsList: [
      { id: 'koc-wave', severity: 'advisory', category: 'wave', title: 'Southwest swell watch', detail: 'Low long-period swell entering the channel.', guidance: 'Exercise watchfulness near shallow harbor mouth.', affectedArea: 'Kochi harbor channel', time: 'Today · 07:00 AM', expectedTime: 'Next 12 Hours', recommendation: 'Maintain standard channel speed.', mapPosition: { x: 44, y: 70 } }
    ],
    traffic: [{ id: 'k1', name: 'Malabar Queen', type: 'Passenger Ferry', status: 'In Transit (10 knots)', mapPosition: { x: 40, y: 70 } }],
    fishing: [{ id: 'f4', zone: 'Wayanad Shelf Bank', activeVessels: 14, activity: 'Moderate activity', depth: '40m shelf', mapPosition: { x: 45, y: 74 } }],
    trends: { waves: { label: 'Wave height (m)', values: [1.1, 1.15, 1.2, 1.25, 1.3], current: '1.3 m', direction: 'Stable' }, wind: { label: 'Wind speed (km/h)', values: [12, 13, 14, 14], current: '14 km/h', direction: 'Stable' }, temperature: { label: 'Surface temperature (C)', values: [28.7, 28.8, 28.9], current: '28.9 C', direction: 'Stable' } }
  },
  goa: {
    id: 'goa', name: 'Goa (Panaji)', region: 'Goa, India', latitude: 15.4989, longitude: 73.8278, coordinates: '15.4989 N · 73.8278 E', mapPosition: { x: 50, y: 52 },
    wave: { value: '1.0', unit: 'm', status: 'Calm', trend: 'Down 0.2 m', tone: 'mint' }, wind: { value: '11', unit: 'km/h', status: 'NW direction', trend: 'Light breeze', tone: 'mint' }, temperature: { value: '29.3', unit: 'C', status: 'Surface reading', trend: 'Up 0.3 C', tone: 'blue' }, visibility: 'Excellent, 12 km',
    currents: { speed: '0.6 knots', direction: 'NW', status: 'Calm water drift' },
    safety: { score: 92, label: 'Favorable', note: 'Ideal beach, boating, and coastal sightseeing conditions.', wave: 94, wind: 90, visibility: 95 },
    brief: 'Goa coastal waters are calm with low wave activity and clear skies. Excellent window for all maritime activities.',
    findings: [{ tone: 'good', text: 'Sea state is calm and favorable' }, { tone: 'good', text: 'Visibility is excellent' }],
    alertsList: [
      { id: 'goa-info', severity: 'info', category: 'safety', title: 'Favorable coastal operations', detail: 'Low swell and light winds active.', guidance: 'Standard safety precautions apply.', affectedArea: 'Panaji & Mormugao waters', time: 'Today · 06:00 AM', expectedTime: '24 Hours', recommendation: 'Routine monitoring active.', mapPosition: { x: 50, y: 52 } }
    ],
    traffic: [{ id: 'g1', name: 'Mormugao Express', type: 'Iron Ore Carrier', status: 'Anchored (0 knots)', mapPosition: { x: 48, y: 50 } }],
    fishing: [{ id: 'f5', zone: 'Goa Coastal Waters', activeVessels: 8, activity: 'Routine activity', depth: '25m shelf', mapPosition: { x: 52, y: 54 } }],
    trends: { waves: { label: 'Wave height (m)', values: [1.2, 1.1, 1.0], current: '1.0 m', direction: 'Calm' }, wind: { label: 'Wind speed (km/h)', values: [14, 12, 11], current: '11 km/h', direction: 'Light' }, temperature: { label: 'Surface temperature (C)', values: [29.0, 29.2, 29.3], current: '29.3 C', direction: 'Warming' } }
  },
  mangalore: {
    id: 'mangalore', name: 'Mangalore', region: 'Karnataka, India', latitude: 12.9141, longitude: 74.8560, coordinates: '12.9141 N · 74.8560 E', mapPosition: { x: 46, y: 62 },
    wave: { value: '1.4', unit: 'm', status: 'Moderate', trend: 'Up 0.1 m', tone: 'amber' }, wind: { value: '16', unit: 'km/h', status: 'W direction', trend: 'Up 2 km/h', tone: 'blue' }, temperature: { value: '28.6', unit: 'C', status: 'Surface reading', trend: 'Stable', tone: 'blue' }, visibility: 'Good, 9 km',
    currents: { speed: '1.2 knots', direction: 'S', status: 'Moderate drift' },
    safety: { score: 78, label: 'Favorable', note: 'Manageable coastal waters. Review harbor updates prior to departure.', wave: 76, wind: 80, visibility: 88 },
    brief: 'Moderate sea state near New Mangalore Port. Cargo and fishing operations proceeding as planned.',
    findings: [{ tone: 'good', text: 'Visibility remains clear' }, { tone: 'warning', text: 'Moderate afternoon onshore breeze expected' }],
    alertsList: [
      { id: 'mng-wind', severity: 'advisory', category: 'wind', title: 'Onshore breeze advisory', detail: 'Westerly gusts near 18 km/h.', guidance: 'Secure small craft moorings.', affectedArea: 'New Mangalore approach', time: 'Today · 09:15 AM', expectedTime: 'Through 8:00 PM', recommendation: 'Verify deck lashings.', mapPosition: { x: 46, y: 62 } }
    ],
    traffic: [{ id: 'mng1', name: 'Karnataka Cargo 02', type: 'Bulk Carrier', status: 'Docked', mapPosition: { x: 44, y: 60 } }],
    fishing: [{ id: 'f6', zone: 'Karnataka Shelf', activeVessels: 11, activity: 'Moderate activity', depth: '30m shelf', mapPosition: { x: 48, y: 64 } }],
    trends: { waves: { label: 'Wave height (m)', values: [1.2, 1.3, 1.4], current: '1.4 m', direction: 'Moderate' }, wind: { label: 'Wind speed (km/h)', values: [12, 14, 16], current: '16 km/h', direction: 'Building' }, temperature: { label: 'Surface temperature (C)', values: [28.5, 28.6], current: '28.6 C', direction: 'Stable' } }
  },
  paradip: {
    id: 'paradip', name: 'Paradip', region: 'Odisha, India', latitude: 20.3164, longitude: 86.6105, coordinates: '20.3164 N · 86.6105 E', mapPosition: { x: 62, y: 32 },
    wave: { value: '2.1', unit: 'm', status: 'Elevated', trend: 'Up 0.3 m', tone: 'coral' }, wind: { value: '22', unit: 'km/h', status: 'SE direction', trend: 'Up 4 km/h', tone: 'amber' }, temperature: { value: '27.9', unit: 'C', status: 'Surface reading', trend: 'Down 0.2 C', tone: 'blue' }, visibility: 'Moderate, 7 km',
    currents: { speed: '1.8 knots', direction: 'NE', status: 'Strong shelf current' },
    safety: { score: 61, label: 'Caution', note: 'Elevated wave activity in Bay of Bengal approaches.', wave: 56, wind: 60, visibility: 82 },
    brief: 'High wave action near Paradip Port. Small craft advised to exercise caution offshore.',
    findings: [{ tone: 'warning', text: 'High wave activity in Bay of Bengal sector' }, { tone: 'warning', text: 'Fresh southeasterly winds' }],
    alertsList: [
      { id: 'pdp-wave', severity: 'high', category: 'wave', title: 'High wave warning', detail: 'Waves up to 2.3 m near outer anchorage.', guidance: 'Small vessels avoid open Bay of Bengal transit.', affectedArea: 'Paradip outer anchorage', time: 'Today · 05:30 AM', expectedTime: 'Next 18 Hours', recommendation: 'Remain in sheltered waters.', mapPosition: { x: 62, y: 32 } }
    ],
    traffic: [{ id: 'p1', name: 'Odisha Pride', type: 'Coal Freighter', status: 'Anchored Outer Road (3 knots)', mapPosition: { x: 60, y: 30 } }],
    fishing: [{ id: 'f7', zone: 'Paradip Deep Waters', activeVessels: 9, activity: 'Low activity', depth: '45m shelf', mapPosition: { x: 64, y: 34 } }],
    trends: { waves: { label: 'Wave height (m)', values: [1.6, 1.8, 2.1], current: '2.1 m', direction: 'Rising' }, wind: { label: 'Wind speed (km/h)', values: [16, 19, 22], current: '22 km/h', direction: 'Rising' }, temperature: { label: 'Surface temperature (C)', values: [28.1, 27.9], current: '27.9 C', direction: 'Cooling' } }
  },
  kolkata: {
    id: 'kolkata', name: 'Kolkata / Haldia', region: 'West Bengal, India', latitude: 22.0257, longitude: 88.0583, coordinates: '22.0257 N · 88.0583 E', mapPosition: { x: 70, y: 22 },
    wave: { value: '1.2', unit: 'm', status: 'Stable', trend: 'Stable', tone: 'mint' }, wind: { value: '15', unit: 'km/h', status: 'S direction', trend: 'Up 1 km/h', tone: 'blue' }, temperature: { value: '28.2', unit: 'C', status: 'Surface reading', trend: 'Up 0.1 C', tone: 'blue' }, visibility: 'Moderate, 7 km (Estuarine fog)',
    currents: { speed: '2.4 knots', direction: 'S', status: 'Strong river estuarine tidal ebb' },
    safety: { score: 75, label: 'Moderate', note: 'Strong tidal flow in Hooghly river channel. Watch navigation markers.', wave: 85, wind: 78, visibility: 72 },
    brief: 'Estuarine navigation near Haldia & Kolkata river channel proceeding under pilotage advisories.',
    findings: [{ tone: 'good', text: 'Estuary wave heights manageable' }, { tone: 'warning', text: 'Strong tidal ebb currents in river channel' }],
    alertsList: [
      { id: 'kol-current', severity: 'advisory', category: 'current', title: 'Tidal ebb velocity watch', detail: 'River current velocity up to 2.6 knots.', guidance: 'Follow harbor pilot instructions in channel.', affectedArea: 'Hooghly estuary & Haldia channel', time: 'Today · 08:00 AM', expectedTime: 'During ebb tide', recommendation: 'Maintain steering way in channel.', mapPosition: { x: 70, y: 22 } }
    ],
    traffic: [{ id: 'kol1', name: 'Hooghly Pioneer', type: 'River Barge', status: 'Under Pilotage (8 knots)', mapPosition: { x: 68, y: 20 } }],
    fishing: [{ id: 'f8', zone: 'Sunderbans Estuary', activeVessels: 15, activity: 'High traditional activity', depth: '15m estuary', mapPosition: { x: 72, y: 24 } }],
    trends: { waves: { label: 'Wave height (m)', values: [1.1, 1.2, 1.2], current: '1.2 m', direction: 'Stable' }, wind: { label: 'Wind speed (km/h)', values: [12, 14, 15], current: '15 km/h', direction: 'Stable' }, temperature: { label: 'Surface temperature (C)', values: [28.0, 28.2], current: '28.2 C', direction: 'Stable' } }
  },
  portblair: {
    id: 'portblair', name: 'Port Blair', region: 'Andaman & Nicobar, India', latitude: 11.6234, longitude: 92.7265, coordinates: '11.6234 N · 92.7265 E', mapPosition: { x: 80, y: 75 },
    wave: { value: '1.6', unit: 'm', status: 'Moderate', trend: 'Up 0.2 m', tone: 'amber' }, wind: { value: '17', unit: 'km/h', status: 'SW direction', trend: 'Gentle breeze', tone: 'blue' }, temperature: { value: '29.4', unit: 'C', status: 'Surface reading', trend: 'Up 0.2 C', tone: 'blue' }, visibility: 'Excellent, 12 km',
    currents: { speed: '1.3 knots', direction: 'SW', status: 'Island pass drift' },
    safety: { score: 80, label: 'Favorable', note: 'Clear island passage conditions. Routine inter-island ferry and vessel traffic active.', wave: 78, wind: 82, visibility: 94 },
    brief: 'Conditions near Port Blair harbor & Andaman Sea inter-island channels are favorable with clear visibility.',
    findings: [{ tone: 'good', text: 'Visibility excellent for island approaches' }, { tone: 'good', text: 'Inter-island ferry routes operational' }],
    alertsList: [
      { id: 'pb-wind', severity: 'advisory', category: 'wind', title: 'Andaman Channel breeze watch', detail: 'Southwesterly wind gusts near 18 km/h in exposed passages.', guidance: 'Maintain VHF radio watch between island ports.', affectedArea: 'Port Blair & Andaman channel', time: 'Today · 06:45 AM', expectedTime: 'Next 12 Hours', recommendation: 'Monitor inter-island marine advisories.', mapPosition: { x: 80, y: 75 } }
    ],
    traffic: [{ id: 'pb1', name: 'Coral Queen', type: 'Inter-Island Passenger Ferry', status: 'In Transit (12 knots)', mapPosition: { x: 78, y: 72 } }],
    fishing: [{ id: 'f9', zone: 'Andaman Shelf Reef', activeVessels: 7, activity: 'Routine activity', depth: '60m shelf', mapPosition: { x: 82, y: 78 } }],
    trends: { waves: { label: 'Wave height (m)', values: [1.3, 1.4, 1.6], current: '1.6 m', direction: 'Moderate' }, wind: { label: 'Wind speed (km/h)', values: [14, 16, 17], current: '17 km/h', direction: 'Stable' }, temperature: { label: 'Surface temperature (C)', values: [29.1, 29.3, 29.4], current: '29.4 C', direction: 'Warming' } }
  },
  surat: {
    id: 'surat', name: 'Surat (Hazira)', region: 'Gujarat, India', latitude: 21.1702, longitude: 72.8311, coordinates: '21.1702 N · 72.8311 E', mapPosition: { x: 58, y: 38 },
    wave: { value: '1.5', unit: 'm', status: 'Moderate', trend: 'Up 0.1 m', tone: 'amber' }, wind: { value: '19', unit: 'km/h', status: 'SW direction', trend: 'Fresh breeze', tone: 'amber' }, temperature: { value: '28.8', unit: 'C', status: 'Surface reading', trend: 'Up 0.1 C', tone: 'blue' }, visibility: 'Good, 9 km',
    currents: { speed: '2.2 knots', direction: 'SW', status: 'Gulf of Khambhat tidal flow' },
    safety: { score: 76, label: 'Favorable', note: 'Gulf of Khambhat tidal currents active. Exercise caution near Hazira LNG port approaches.', wave: 74, wind: 72, visibility: 88 },
    brief: 'Hazira & Tapi estuarine channel near Surat proceeding under routine port pilotage.',
    findings: [{ tone: 'good', text: 'Hazira industrial channel navigation clear' }, { tone: 'warning', text: 'Strong tidal currents in Gulf of Khambhat' }],
    alertsList: [
      { id: 'sur-current', severity: 'advisory', category: 'current', title: 'Gulf tidal flow advisory', detail: 'Tidal current speeds up to 2.3 knots near Hazira port approach.', guidance: 'Maintain pilotage navigation guidance.', affectedArea: 'Surat Hazira channel & Gulf of Khambhat', time: 'Today · 07:15 AM', expectedTime: 'During flood & ebb tide', recommendation: 'Verify draft & tug assistance.', mapPosition: { x: 58, y: 38 } }
    ],
    traffic: [{ id: 'sur1', name: 'Hazira Trader', type: 'LNG Tanker', status: 'Berthing (3 knots)', mapPosition: { x: 56, y: 36 } }],
    fishing: [{ id: 'f10', zone: 'Khambhat Coastal Bank', activeVessels: 10, activity: 'Moderate activity', depth: '20m gulf', mapPosition: { x: 60, y: 40 } }],
    trends: { waves: { label: 'Wave height (m)', values: [1.2, 1.4, 1.5], current: '1.5 m', direction: 'Moderate' }, wind: { label: 'Wind speed (km/h)', values: [15, 17, 19], current: '19 km/h', direction: 'Building' }, temperature: { label: 'Surface temperature (C)', values: [28.6, 28.7, 28.8], current: '28.8 C', direction: 'Stable' } }
  }
}

export const dashboardLocations = (COASTAL_LOCATIONS && COASTAL_LOCATIONS.length > 0)
  ? COASTAL_LOCATIONS.map((loc) => {
      if (detailedPresets[loc.id]) {
        return {
          ...detailedPresets[loc.id],
          name: loc.name,
          state: loc.state,
          coast: loc.coast,
          type: loc.type,
          region: `${loc.state}, India`,
          latitude: loc.lat || detailedPresets[loc.id].latitude,
          longitude: loc.lng || detailedPresets[loc.id].longitude,
          coordinates: loc.coordinatesStr,
          mapPosition: loc.mapPosition || detailedPresets[loc.id].mapPosition
        }
      }

      return {
        id: loc.id,
        name: loc.name,
        state: loc.state,
        coast: loc.coast,
        type: loc.type,
        region: `${loc.state}, India`,
        latitude: loc.lat || 17.6868,
        longitude: loc.lng || 83.2185,
        coordinates: loc.coordinatesStr,
        mapPosition: loc.mapPosition || { x: 50, y: 50 },
        wave: { value: '1.3', unit: 'm', status: 'Moderate', trend: 'Steady', tone: 'amber' },
        wind: { value: '15', unit: 'km/h', status: 'Coastal breeze', trend: 'Steady', tone: 'mint' },
        temperature: { value: '28.2', unit: 'C', status: 'Surface reading', trend: 'Stable', tone: 'blue' },
        visibility: 'Good, 9 km',
        currents: { speed: '1.1 knots', direction: 'SW', status: 'Moderate drift' },
        safety: { score: 78, label: 'Manageable', note: `Nearshore operating conditions at ${loc.name} are favorable. Verify local harbor notices before offshore transit.`, wave: 80, wind: 74, visibility: 88 },
        brief: `Current maritime conditions near ${loc.name} (${loc.state}) are within operational parameters. Sea state and wind profiles support routine fishing and coastal navigation.`,
        findings: [
          { tone: 'good', text: 'Wind conditions remain manageable for coastal craft' },
          { tone: 'good', text: `Visibility is good for ${loc.name} operations` },
          { tone: 'warning', text: 'Check local swell updates before crossing outer bar' }
        ],
        alertsList: [
          {
            id: `${loc.id}-coastal-watch`,
            severity: 'advisory',
            category: 'craft',
            title: `${loc.name} Coastal Marine Advisory`,
            detail: `Routine coastal monitoring active for ${loc.name} harbor and landing approach.`,
            guidance: 'Maintain standard radio watch on VHF Channel 16.',
            affectedArea: `${loc.name} coastal waters`,
            time: 'Today · 06:00 AM',
            expectedTime: '24 Hours',
            recommendation: 'Check bar conditions during low tide before departure.',
            mapPosition: loc.mapPosition || { x: 50, y: 50 }
          }
        ],
        traffic: [
          { id: `${loc.id}-v1`, name: `${loc.name} Patrol Alpha`, type: 'Patrol Vessel', status: 'On Station (10 knots)', mapPosition: { x: (loc.mapPosition?.x || 50) - 2, y: (loc.mapPosition?.y || 50) - 1 } },
          { id: `${loc.id}-v2`, name: 'Coastal Trawler Star', type: 'Fishing Vessel', status: 'In Transit', mapPosition: { x: (loc.mapPosition?.x || 50) + 2, y: (loc.mapPosition?.y || 50) + 2 } }
        ],
        fishing: [
          { id: `${loc.id}-f1`, zone: `${loc.name} Shelf Sector`, activeVessels: 14, activity: 'Moderate activity', depth: '30m shelf', mapPosition: { x: (loc.mapPosition?.x || 50) + 1, y: (loc.mapPosition?.y || 50) - 1 } }
        ],
        trends: {
          waves: { label: 'Wave height (m)', values: [1.1, 1.15, 1.2, 1.2, 1.25, 1.3, 1.28, 1.32, 1.3, 1.35, 1.3, 1.3], current: '1.3 m', direction: 'Steady' },
          wind: { label: 'Wind speed (km/h)', values: [12, 13, 13, 14, 15, 15, 16, 15, 14, 15, 15, 15], current: '15 km/h', direction: 'Steady' },
          temperature: { label: 'Surface temperature (C)', values: [28.0, 28.1, 28.1, 28.2, 28.2, 28.3, 28.2, 28.2, 28.3, 28.2, 28.2, 28.2], current: '28.2 C', direction: 'Stable' }
        }
      }
    })
  : Object.values(detailedPresets)

export function getAllAlerts() {
  const all = []
  dashboardLocations.forEach((loc) => {
    loc.alertsList.forEach((alert) => {
      all.push({
        ...alert,
        locationId: loc.id,
        locationName: loc.name,
        region: loc.region,
        coordinates: loc.coordinates
      })
    })
  })
  return all
}

export function getAlertsByLocation(locationId) {
  if (!locationId || locationId === 'all') {
    return getAllAlerts()
  }
  const loc = dashboardLocations.find((item) => item.id === locationId)
  if (!loc) return []
  return loc.alertsList.map((alert) => ({
    ...alert,
    locationId: loc.id,
    locationName: loc.name,
    region: loc.region,
    coordinates: loc.coordinates
  }))
}

export const standardReportTemplates = [
  {
    id: 'daily',
    title: 'Daily Marine Report',
    icon: '📄',
    description: 'Comprehensive daily overview of sea state, weather, safety index, and advisories.',
    defaultSections: ['summary', 'conditions', 'weather', 'safety', 'alerts', 'recommendations']
  },
  {
    id: 'weather',
    title: 'Weather Analysis',
    icon: '🌤️',
    description: 'Detailed analysis of wind vectors, sea surface temperature, and visibility trends.',
    defaultSections: ['summary', 'weather', 'wind', 'temperature', 'recommendations']
  },
  {
    id: 'route',
    title: 'Route Safety Analysis',
    icon: '⚓',
    description: 'Marine route safety assessment, coastal passages, and offshore clearance levels.',
    defaultSections: ['summary', 'conditions', 'safety', 'alerts', 'recommendations']
  },
  {
    id: 'hazard',
    title: 'Hazard Assessment',
    icon: '🔴',
    description: 'Evaluation of active weather warnings, rough seas, and vessel operating advisories.',
    defaultSections: ['summary', 'alerts', 'safety', 'recommendations']
  },
  {
    id: 'fishing',
    title: 'Fishing Activity Report',
    icon: '🎣',
    description: 'Overview of commercial fishing activity zones, shelf depths, and vessel density.',
    defaultSections: ['summary', 'conditions', 'activity', 'recommendations']
  },
  {
    id: 'conditions',
    title: 'Marine Conditions Report',
    icon: '🌊',
    description: 'In-depth wave height analysis, swell directions, and coastal drift currents.',
    defaultSections: ['summary', 'conditions', 'waves', 'safety', 'recommendations']
  }
]

export function generateReportData(typeId = 'daily', locationId = 'visakhapatnam', timePeriod = 'Last 24 hours', customSections = null, liveData = null) {
  const loc = liveData || dashboardLocations.find((item) => item.id === locationId) || dashboardLocations[0]
  const template = standardReportTemplates.find((t) => t.id === typeId) || standardReportTemplates[0]

  const sectionsToInclude = customSections || template.defaultSections

  const generatedDate = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  return {
    id: `report-${Date.now()}`,
    typeId,
    typeTitle: template.title,
    locationId: loc.id,
    locationName: loc.name,
    region: loc.region,
    coordinates: loc.coordinates,
    timePeriod,
    generatedDate,
    isLive: Boolean(liveData),
    dataSource: liveData ? 'Live Marine & Meteorological Telemetry (Open-Meteo API)' : 'ORCA Integrated Coastal Model',
    sections: sectionsToInclude,
    summary: `${loc.brief} Data compiled for ${timePeriod.toLowerCase()} indicates wave action at ${loc.wave.value}m (${loc.wave.status}) with ${loc.wind.status || loc.wind.directionStr || ''} winds at ${loc.wind.value}km/h.`,
    metrics: {
      wave: loc.wave,
      wind: loc.wind,
      temperature: loc.temperature,
      visibility: loc.visibility,
      currents: loc.currents,
      safety: loc.safety,
      activeAlertsCount: loc.alertsList?.length || 0
    },
    alerts: (loc.alertsList || []).map(a => ({ ...a, locationName: loc.name })),
    trends: loc.trends,
    traffic: loc.traffic || [
      { id: 't1', name: 'Coastal Patrol Alpha', type: 'Patrol Vessel', status: 'On Station', mapPosition: { x: 42, y: 38 } },
      { id: 't2', name: 'Port Support 02', type: 'Tug / Pilot', status: 'Anchored', mapPosition: { x: 52, y: 49 } }
    ],
    fishing: loc.fishing || [
      { id: 'f1', zone: `${loc.name} Coastal Sector`, activeVessels: 12, activity: 'Moderate activity', depth: '35m shelf', mapPosition: { x: 55, y: 35 } }
    ],
    recommendations: [
      `Monitor wave height progression before offshore departures (current: ${loc.wave.value}m).`,
      `Wind speeds of ${loc.wind.value}km/h require appropriate deck mooring and cargo securing.`,
      loc.safety.score < 70
        ? `⚠ Caution: Safety index (${loc.safety.score}/100) indicates small craft should delay offshore transit.`
        : `✓ Favorable operating margin for routine coastal navigation near ${loc.name}.`
    ]
  }
}

export const suggestedQueries = [
  { category: 'Safety', query: 'Is it safe to travel tomorrow?', icon: 'SF' }, { category: 'Conditions', query: 'What are the current marine conditions?', icon: 'CD' }, { category: 'Route', query: 'Are there hazards along my route?', icon: 'RT' }, { category: 'Forecast', query: 'Give me the best time to travel this week.', icon: 'FC' }, { category: 'Analysis', query: 'Show suitable areas based on current conditions.', icon: 'AN' },
]

export const recentActivity = [
  { icon: 'SF', title: 'Safety query for Visakhapatnam', category: 'Safety', time: 'Today, 11:20 AM' }, { icon: 'CD', title: 'Marine conditions overview', category: 'Conditions', time: 'Yesterday, 4:15 PM' }, { icon: 'RT', title: 'Route analysis: Vizag to Port Blair', category: 'Route', time: 'Yesterday, 10:30 AM' }, { icon: 'HZ', title: 'Hazard check near fishing zone', category: 'Analysis', time: '4 Sep, 7:42 PM' },
]
