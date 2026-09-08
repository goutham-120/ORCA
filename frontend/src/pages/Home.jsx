import './Home.css'

export default function Home({ navigate }) {
  return (
    <main className="home-page">
      <section className="home-content" aria-labelledby="home-title">
        <p className="home-brand">ORCA</p>
        <p className="home-expansion">Ocean Reasoning and Collaborative Agents</p>
        <h1 id="home-title">Marine intelligence for better decisions.</h1>
        <p className="home-description">
          ORCA is a marine intelligence and decision-support platform built to help teams understand and act on ocean information.
        </p>
        <div className="home-actions">
          <button className="home-primary-action" type="button" onClick={() => navigate('/register')}>
            Get Started
          </button>
          <button className="home-secondary-action" type="button" onClick={() => navigate('/login')}>
            Sign In
          </button>
        </div>
      </section>
    </main>
  )
}
