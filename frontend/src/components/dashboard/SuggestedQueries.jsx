const queries = [
  ['◈', 'Is it safe to travel from Visakhapatnam tomorrow?'], ['◒', 'What are the current marine conditions near my location?'], ['⌁', 'Are there any hazards along this route?'], ['◉', 'Show suitable areas based on current conditions.'], ['⌖', 'Give me the best time to travel this week.'],
]

export default function SuggestedQueries({ onSelect }) {
  return <section className="panel suggested"><div className="panel-title"><h2>Try Asking ORCA</h2><button onClick={() => onSelect('')}>See more →</button></div><div>{queries.map(([icon, query]) => <button className="suggestion" key={query} onClick={() => onSelect(query)}><span>{icon}</span><b>{query}</b><i>›</i></button>)}</div></section>
}
