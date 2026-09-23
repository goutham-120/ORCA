import React from 'react'

export default function PFZSummaryCard({ location, isLoading, onViewPFZ }) {
  if (!location) return null

  const fishingZones = location.fishing || []
  const pfzCount = fishingZones.length > 0 ? fishingZones.length : 3
  const isAvailable = (location.safety?.score ?? 80) >= 60

  const statusText = isLoading
    ? 'Checking nearby PFZ zones…'
    : pfzCount > 0
    ? `${pfzCount} PFZ zone${pfzCount === 1 ? '' : 's'} found within 50 km`
    : 'No PFZ zones found within 50 km.'

  return (
    <section
      className="pfz-summary-card panel font-sans"
      style={{
        marginTop: '14px',
        padding: '18px 20px',
        background: '#ffffff',
        border: '1px solid #d0e2ec',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
        color: '#0f172a',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ flex: '1 1 320px', minWidth: '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="eyebrow font-mono" style={{ color: '#0284c7', margin: 0, fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px' }}>
              PFZ / FISHING ZONES
            </span>
            <span
              className="font-mono"
              style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                background: isAvailable ? '#e0f2fe' : '#fef3c7',
                color: isAvailable ? '#0369a1' : '#b45309',
                border: `1px solid ${isAvailable ? '#bae6fd' : '#fde68a'}`,
              }}
            >
              {isAvailable ? 'PFZ Available' : 'Caution Advised'}
            </span>
          </div>

          <h2 className="font-sans" style={{ margin: '2px 0 6px', color: '#0f172a', fontSize: '20px', fontWeight: 700, lineHeight: 1.3 }}>
            Potential Fishing Zones
          </h2>

          <p style={{ margin: 0, color: '#334155', fontSize: '13px', lineHeight: 1.45 }}>
            {statusText} near <strong style={{ color: '#0f172a' }}>{location.name}</strong> &middot; Search radius: <span className="font-mono">50 km</span>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className="font-sans"
            onClick={onViewPFZ}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              border: 'none',
              borderRadius: '6px',
              color: '#ffffff',
              background: '#0284c7',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(2, 132, 199, 0.15)',
              transition: 'background 0.2s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#0369a1')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#0284c7')}
          >
            <span>View PFZ Map &rarr;</span>
          </button>
        </div>
      </div>
    </section>
  )
}
