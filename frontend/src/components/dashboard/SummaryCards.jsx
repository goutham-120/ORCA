const cards = [
  ['◒', 'Sea condition', 'Moderate', 'Wave height 1.2 m', 'blue'], ['≋', 'Wind speed', '12 km/h', 'From NE', 'mint'], ['♨', 'Water temperature', '28.4 °C', 'Surface level', 'amber'], ['▲', 'Active alerts', '3', '2 near your area', 'coral'],
]

export default function SummaryCards() {
  return <section className="summary-cards" aria-label="Current marine summary">{cards.map(([icon, label, value, detail, color]) => <article className={`summary-card ${color}`} key={label}><span className="summary-icon">{icon}</span><div><small>{label}</small><strong>{value}</strong><p>{detail}</p></div><i>›</i></article>)}</section>
}
