const activity = [['◈', 'Safety query for Visakhapatnam', '6 Sep 2026, 11:20 AM'], ['◒', 'Marine conditions overview', '5 Sep 2026, 4:15 PM'], ['⌁', 'Route analysis: Vizag to Port Blair', '5 Sep 2026, 10:30 AM'], ['▲', 'Hazard check near fishing zone', '4 Sep 2026, 07:42 PM']]

export default function RecentActivity() {
  return <section className="panel activity"><div className="panel-title"><h2>Recent activity</h2><button>See all →</button></div>{activity.map(([icon, title, time]) => <div className="activity-row" key={title}><span>{icon}</span><b>{title}</b><time>{time}</time></div>)}</section>
}
