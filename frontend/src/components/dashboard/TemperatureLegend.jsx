export default function TemperatureLegend({ minTemp = 20, maxTemp = 35 }) {
  const stops = [20, 23, 26, 29, 32, '35+']

  return (
    <div
      className="temperature-legend font-mono"
      style={{
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '8px',
        padding: '8px 12px',
        color: '#e2e8f0',
        fontSize: '10px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justify: 'space-between',
          fontWeight: 600,
          color: '#38bdf8',
          marginBottom: '4px',
        }}
      >
        <span>TEMPERATURE (°C)</span>
        <span>
          {minTemp} - {maxTemp} °C
        </span>
      </div>

      <div
        style={{
          height: '8px',
          borderRadius: '4px',
          background: 'linear-gradient(to right, #1d4ed8, #06b6d4, #10b981, #eab308, #f97316, #ef4444)',
          marginBottom: '4px',
        }}
      />

      <div
        style={{
          display: 'flex',
          justify: 'space-between',
          fontSize: '9px',
          color: '#94a3b8',
        }}
      >
        {stops.map((stop) => (
          <span key={stop}>{stop}</span>
        ))}
      </div>
    </div>
  )
}
