import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import './Home.css'

export default function Home({ navigate }) {
  const { user, guestLogin, logout } = useAuth()
  const [showGuestModal, setShowGuestModal] = useState(false)

  const handleNav = (path) => {
    if (navigate) {
      navigate(path)
    } else {
      window.location.href = path
    }
  }

  const handleGuestSelect = (role) => {
    if (guestLogin) {
      guestLogin(role)
    }
    setShowGuestModal(false)
    handleNav('/dashboard')
  }

  const isRealUser = user && user.email !== 'operator@orca.marine'

  const signals = [
    {
      num: '01',
      title: 'Ocean Intelligence',
      desc: 'Understand marine conditions including wave height, wave period, swell vectors, and sea-surface temperatures.'
    },
    {
      num: '02',
      title: 'Weather Intelligence',
      desc: 'Understand sustained wind velocity, direction, precipitation, atmospheric conditions, and coastal weather advisories.'
    },
    {
      num: '03',
      title: 'Spatial Intelligence',
      desc: 'Understand geographic context, GIS vector layers, marine protected boundaries, and coastal sectors.'
    },
    {
      num: '04',
      title: 'Marine Safety',
      desc: 'Understand hazard zones, operational safety margins, and risk assessments for vessels.'
    },
    {
      num: '05',
      title: 'AI Decision Support',
      desc: 'Ask ORCA questions using natural language or voice speech-to-text to receive evidence-grounded recommendations.'
    }
  ]

  return (
    <div className="orca-home-page">
      {/* 1. MINIMAL NAVIGATION HEADER */}
      <header className="home-header">
        <div className="header-inner">
          <div
            className="header-brand"
            onClick={() => handleNav('/')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleNav('/')}
          >
            <span className="brand-title">ORCA</span>
            <span className="brand-sub">Ocean Resource &amp; Contextual Analysis</span>
          </div>

          <nav className="header-nav">
            <button
              type="button"
              className="nav-btn active"
              onClick={() => handleNav('/')}
            >
              Home
            </button>
            <button
              type="button"
              className="nav-btn"
              onClick={() => handleNav('/ask-orca')}
            >
              Ask ORCA
            </button>
            {!isRealUser ? (
              <>
                <button
                  type="button"
                  className="nav-btn"
                  onClick={() => handleNav('/login')}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className="btn-primary btn-nav"
                  onClick={() => handleNav('/register')}
                >
                  Sign Up
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn-primary btn-nav"
                  onClick={() => handleNav('/dashboard')}
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  className="nav-btn"
                  onClick={logout}
                  title="Sign out of current account"
                >
                  Sign Out
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="home-main">
        {/* 2. HERO SECTION WITH FLOWING WATER VIDEO */}
        <section className="hero-section">
          <div className="hero-video-wrapper">
            <video
              className="hero-video"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            >
              <source src="/videos/oceanflow.mp4" type="video/mp4" />
            </video>
            <div className="hero-video-overlay" aria-hidden="true" />
          </div>

          <div className="hero-content">
            <blockquote className="hero-quote">
              &ldquo;The sea, once it casts its spell, holds one in its net of wonder forever.&rdquo;
            </blockquote>
            <cite className="quote-attribution">&mdash; Jacques-Yves Cousteau</cite>

            <div className="hero-actions">
              <button
                type="button"
                className="btn-primary btn-large"
                onClick={() => handleNav('/login')}
              >
                Sign In
              </button>
              <button
                type="button"
                className="btn-secondary btn-large"
                onClick={() => handleNav('/register')}
              >
                Sign Up
              </button>
              <button
                type="button"
                className="btn-guest btn-large"
                onClick={() => setShowGuestModal(true)}
              >
                <span className="guest-anchor-icon">⚓</span> Sign In as Guest
              </button>
            </div>

            {isRealUser && (
              <div className="hero-logged-in-bar">
                <span className="logged-in-label">Active session: <strong>{user.display_name || user.email}</strong></span>
                <button
                  type="button"
                  className="logged-in-dash-btn"
                  onClick={() => handleNav('/dashboard')}
                >
                  Go to Dashboard &rarr;
                </button>
              </div>
            )}
          </div>
        </section>

        {/* 3. CONTINUOUS MARINE INFORMATION SECTION */}
        <section className="signals-section">
          <div className="signals-inner">
            <div className="signals-header">
              <p className="signals-eyebrow">MULTI-SIGNAL TELEMETRY</p>
              <h2 className="signals-title">ONE PLATFORM. MULTIPLE MARINE SIGNALS.</h2>
              <p className="signals-subtitle">
                Integrated physical parameters, atmospheric forecasts, and spatial boundaries synthesized into clear operational guidance.
              </p>
            </div>

            <div className="signals-grid">
              {signals.map((item) => (
                <div key={item.num} className="signal-item">
                  <span className="signal-num">{item.num}</span>
                  <h3 className="signal-item-title">{item.title}</h3>
                  <p className="signal-item-desc">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* 4. MINIMAL FOOTER */}
      <footer className="home-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="footer-title">ORCA</span>
            <span className="footer-desc">&bull; Ocean Resource &amp; Contextual Analysis</span>
          </div>
          <div className="footer-copyright">
            &copy; {new Date().getFullYear()} ORCA
          </div>
        </div>
      </footer>

      {/* GUEST PERSONA SELECTION MODAL */}
      {showGuestModal && (
        <div className="guest-modal-backdrop" onClick={() => setShowGuestModal(false)}>
          <div
            className="guest-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="guest-modal-title"
          >
            <button
              type="button"
              className="guest-modal-close"
              onClick={() => setShowGuestModal(false)}
              aria-label="Close modal"
            >
              &times;
            </button>

            <div className="guest-modal-header">
              <span className="guest-modal-badge">GUEST ACCESS</span>
              <h2 id="guest-modal-title" className="guest-modal-title">Choose Your Maritime Role</h2>
              <p className="guest-modal-sub">
                Select your persona to experience ORCA with role-tailored maps, forecasts, and AI capabilities without creating an account.
              </p>
            </div>

            <div className="guest-persona-grid">
              {/* PERSONA 1: FISHERMAN */}
              <div
                className="guest-persona-card"
                onClick={() => handleGuestSelect('fisherman')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGuestSelect('fisherman')
                }}
              >
                <div className="persona-icon-circle persona-fisher">
                  🎣
                </div>
                <div className="persona-details">
                  <h3 className="persona-name">Fisherman / Mariner</h3>
                  <span className="persona-pill pill-fisher">Coastal &amp; Oceanic Operations</span>
                  <p className="persona-desc">
                    Access high-yield Potential Fishing Zones (PFZ), collision-avoidant route navigation, coastal wave &amp; wind alerts, and voice-assisted advisories.
                  </p>
                  <ul className="persona-features">
                    <li>✓ High-Yield PFZ target corridors</li>
                    <li>✓ Automated hazard bypass navigation</li>
                    <li>✓ Vernacular voice &amp; audio briefings</li>
                  </ul>
                </div>
                <button
                  type="button"
                  className="btn-persona-select btn-persona-fisher"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleGuestSelect('fisherman')
                  }}
                >
                  Continue as Fisherman &rarr;
                </button>
              </div>

              {/* PERSONA 2: RESEARCHER */}
              <div
                className="guest-persona-card"
                onClick={() => handleGuestSelect('researcher')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGuestSelect('researcher')
                }}
              >
                <div className="persona-icon-circle persona-researcher">
                  🔬
                </div>
                <div className="persona-details">
                  <h3 className="persona-name">Marine Researcher</h3>
                  <span className="persona-pill pill-researcher">Oceanographic &amp; Spatial Science</span>
                  <p className="persona-desc">
                    Explore multi-sensor satellite imagery (SST &amp; Chlorophyll gradients), thermal cloud IR telemetry, Marine Safety Index analytics, and ocean spatial datasets.
                  </p>
                  <ul className="persona-features">
                    <li>✓ Satellite Thermal IR cloud telemetry</li>
                    <li>✓ Sea Surface Temperature (SST) analysis</li>
                    <li>✓ Deep ecosystem diagnostics &amp; anomalies</li>
                  </ul>
                </div>
                <button
                  type="button"
                  className="btn-persona-select btn-persona-researcher"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleGuestSelect('researcher')
                  }}
                >
                  Continue as Researcher &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
