import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import orcaLogo from '../assets/orcalogo.png'
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

  const capabilities = [
    {
      num: '01',
      tag: 'EARTH OBSERVATION',
      title: 'Satellite Oceanography',
      desc: 'Real-time Sea Surface Temperature (SST) fronts, Chlorophyll-a concentration, and thermal cloud telemetry from ISRO & global earth observation sensors.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          <line x1="2" y1="12" x2="22" y2="12" />
        </svg>
      )
    },
    {
      num: '02',
      tag: 'FISHERIES INTELLIGENCE',
      title: 'INCOIS PFZ Corridors',
      desc: 'Target Potential Fishing Zones (PFZs), pelagic species biomass estimates, optimal casting depths, and market mandi price forecasts for coastal fishermen.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12c-4 0-6 3-9 3s-5-3-9-3" />
          <path d="M22 6c-4 0-6 3-9 3s-5-3-9-3" />
          <path d="M22 18c-4 0-6 3-9 3s-5-3-9-3" />
        </svg>
      )
    },
    {
      num: '03',
      tag: 'NAVIGATION & HAZARD',
      title: 'A* Waypoint Optimization',
      desc: 'Dynamic collision-avoidant route pathfinding that evades high-swell barriers, gale-force winds, maritime restricted zones, and shallow reefs.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      )
    },
    {
      num: '04',
      tag: 'DECISION SUPPORT',
      title: 'Marine Safety Index (MSI)',
      desc: 'A continuous 0–100 unified safety algorithm synthesizing wave periods, wind gust vectors, tidal currents, and convective storms for all vessel classes.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )
    },
    {
      num: '05',
      tag: 'CONVERSATIONAL AI',
      title: 'Multilingual Voice AI',
      desc: 'Ask complex oceanographic and navigational questions in 12 coastal Indian languages using natural speech dictation and audio synthesis.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="22" />
        </svg>
      )
    },
    {
      num: '06',
      tag: 'SATELLITE SYNC',
      title: 'ISRO NavIC & Offline Mode',
      desc: 'Autonomous offshore telemetry caching and NavIC satellite transceiver synchronization for uninterrupted deep-sea marine resilience.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 11a9 9 0 0 1 9 9" />
          <path d="M4 4a16 16 0 0 1 16 16" />
          <circle cx="5" cy="19" r="1" />
        </svg>
      )
    }
  ]

  return (
    <div className="orca-home-page font-inter">
      {/* 1. TOP NAVIGATION HEADER */}
      <header className="home-header">
        <div className="header-inner">
          <div
            className="header-brand"
            onClick={() => handleNav('/')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleNav('/')}
          >
            <div className="brand-logo-badge">
              <img src={orcaLogo} alt="ORCA Logo" className="brand-logo-img" />
              <span className="brand-logo-pulse" />
            </div>
            <div className="brand-text">
              <span className="brand-title font-sora">ORCA</span>
              <span className="brand-sub font-inter">Ocean Resource &amp; Contextual Analysis</span>
            </div>
          </div>

          <nav className="header-nav">
            <button
              type="button"
              className="nav-btn active"
              onClick={() => handleNav('/')}
            >
              Home
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
                  className="btn-primary btn-nav font-inter"
                  onClick={() => handleNav('/register')}
                >
                  Sign Up
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn-primary btn-nav font-inter"
                  onClick={() => handleNav('/dashboard')}
                >
                  Enter Workspace
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
            <div className="hero-mesh-glow" aria-hidden="true" />
          </div>

          <div className="hero-content">
            <div className="hero-badge-pill">
              <span className="hero-badge-dot" />
              <span>ISRO SATELLITE EARTH OBSERVATION &bull; AGENTIC AI</span>
            </div>

            <h1 className="hero-main-title font-sora">
              Intelligent Oceanographic Intelligence &amp; Maritime Safety
            </h1>

            <p className="hero-main-sub font-inter">
              Empowering fishermen, maritime operators, coastal authorities, and researchers with real-time satellite telemetry, Potential Fishing Zones, collision-free routing, and conversational AI.
            </p>

            <blockquote className="hero-quote font-fraunces">
              &ldquo;The sea, once it casts its spell, holds one in its net of wonder forever.&rdquo;
            </blockquote>
            <cite className="quote-attribution">&mdash; Jacques-Yves Cousteau</cite>

            <div className="hero-actions">
              <button
                type="button"
                className="btn-primary btn-large font-inter"
                onClick={() => handleNav(isRealUser ? '/dashboard' : '/login')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                <span>{isRealUser ? 'Launch Dashboard' : 'Sign In'}</span>
              </button>

              <button
                type="button"
                className="btn-secondary btn-large font-inter"
                onClick={() => handleNav('/register')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
                <span>Create Account</span>
              </button>

              <button
                type="button"
                className="btn-guest btn-large font-inter"
                onClick={() => setShowGuestModal(true)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="5" r="3" />
                  <line x1="12" y1="22" x2="12" y2="8" />
                  <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
                </svg>
                <span>Instant Guest Access</span>
              </button>
            </div>

            {isRealUser && (
              <div className="hero-logged-in-bar">
                <span className="logged-in-label">
                  Active User: <strong>{user.display_name || user.email}</strong> ({user.role || 'Operator'})
                </span>
                <button
                  type="button"
                  className="logged-in-dash-btn font-inter"
                  onClick={() => handleNav('/dashboard')}
                >
                  Enter Operational Dashboard &rarr;
                </button>
              </div>
            )}
          </div>
        </section>

        {/* 3. CAPABILITIES SHOWCASE SECTION */}
        <section className="signals-section">
          <div className="signals-inner">
            <div className="signals-header">
              <p className="signals-eyebrow">MULTI-SIGNAL MARINE INTELLIGENCE</p>
              <h2 className="signals-title font-sora">ONE UNIFIED MARITIME PLATFORM</h2>
              <p className="signals-subtitle">
                Synthesizing satellite earth observation, ocean physical dynamics, and weather models into actionable operational decisions.
              </p>
            </div>

            <div className="signals-grid">
              {capabilities.map((item) => (
                <div key={item.num} className="signal-item">
                  <div className="signal-item-top">
                    <span className="signal-icon-box">{item.icon}</span>
                    <span className="signal-tag-pill font-inter">{item.tag}</span>
                    <span className="signal-num">{item.num}</span>
                  </div>
                  <h3 className="signal-item-title font-sora">{item.title}</h3>
                  <p className="signal-item-desc font-inter">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* 4. FOOTER */}
      <footer className="home-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo-wrap">
              <img src={orcaLogo} alt="ORCA Logo" className="footer-logo-img" />
            </div>
            <div>
              <span className="footer-title font-sora">ORCA</span>
              <span className="footer-desc">&bull; Ocean Resource &amp; Contextual Analysis</span>
            </div>
          </div>
          <div className="footer-links">
            <button type="button" onClick={() => handleNav('/ask-orca')} className="footer-link">Ask ORCA</button>
            <button type="button" onClick={() => handleNav('/dashboard')} className="footer-link">Dashboard</button>
            <button type="button" onClick={() => handleNav('/admin/login')} className="footer-link">Admin Portal</button>
          </div>
          <div className="footer-copyright">
            &copy; {new Date().getFullYear()} ORCA Marine Platform &bull; ISRO Earth Observation Data
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
              <span className="guest-modal-badge">INSTANT DEMO ACCESS</span>
              <h2 id="guest-modal-title" className="guest-modal-title font-sora">Choose Your Maritime Role</h2>
              <p className="guest-modal-sub">
                Experience ORCA with role-tailored dashboards, maps, weather alerts, and AI models without creating an account.
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
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12c-4 0-6 3-9 3s-5-3-9-3" />
                    <path d="M22 6c-4 0-6 3-9 3s-5-3-9-3" />
                    <path d="M22 18c-4 0-6 3-9 3s-5-3-9-3" />
                  </svg>
                </div>
                <div className="persona-details">
                  <h3 className="persona-name font-sora">Fisherman / Mariner</h3>
                  <span className="persona-pill pill-fisher">Coastal &amp; Oceanic Operations</span>
                  <p className="persona-desc">
                    Access high-yield Potential Fishing Zones (PFZ), collision-avoidant route navigation, coastal wave &amp; wind alerts, and voice-assisted advisories.
                  </p>
                  <ul className="persona-features">
                    <li>✓ High-Yield PFZ target corridors</li>
                    <li>✓ Automated hazard bypass navigation</li>
                    <li>✓ Multilingual voice dictation &amp; audio</li>
                  </ul>
                </div>
                <button
                  type="button"
                  className="btn-persona-select btn-persona-fisher font-inter"
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
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div className="persona-details">
                  <h3 className="persona-name font-sora">Marine Researcher</h3>
                  <span className="persona-pill pill-researcher">Oceanographic &amp; Spatial Science</span>
                  <p className="persona-desc">
                    Explore multi-sensor satellite imagery (SST &amp; Chlorophyll gradients), thermal cloud IR telemetry, Marine Safety Index analytics, and ocean spatial datasets.
                  </p>
                  <ul className="persona-features">
                    <li>✓ Satellite Thermal IR cloud telemetry</li>
                    <li>✓ Sea Surface Temperature (SST) fronts</li>
                    <li>✓ Deep ecosystem anomaly diagnostics</li>
                  </ul>
                </div>
                <button
                  type="button"
                  className="btn-persona-select btn-persona-researcher font-inter"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleGuestSelect('researcher')
                  }}
                >
                  Continue as Researcher &rarr;
                </button>
              </div>

              {/* PERSONA 3: MARINE & DISASTER OPERATIONS */}
              <div
                className="guest-persona-card"
                onClick={() => handleGuestSelect('marine_disaster_ops')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGuestSelect('marine_disaster_ops')
                }}
              >
                <div className="persona-icon-circle persona-disaster">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <div className="persona-details">
                  <h3 className="persona-name font-sora">Marine &amp; Disaster Ops</h3>
                  <span className="persona-pill pill-disaster">Emergency Response &amp; Ports</span>
                  <p className="persona-desc">
                    Coordinate rapid maritime hazard advisories, cyclone &amp; tsunami warnings, emergency harbor broadcasts, and port readiness status.
                  </p>
                  <ul className="persona-features">
                    <li>✓ Regional emergency hazard broadcast bulletins</li>
                    <li>✓ Cyclone &amp; extreme storm alert coordination</li>
                    <li>✓ Rapid distress report logging &amp; response</li>
                  </ul>
                </div>
                <button
                  type="button"
                  className="btn-persona-select btn-persona-disaster font-inter"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleGuestSelect('marine_disaster_ops')
                  }}
                >
                  Continue as Disaster Ops &rarr;
                </button>
              </div>

              {/* PERSONA 4: COASTAL AUTHORITY */}
              <div
                className="guest-persona-card"
                onClick={() => handleGuestSelect('coastal_authority')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGuestSelect('coastal_authority')
                }}
              >
                <div className="persona-icon-circle persona-authority">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div className="persona-details">
                  <h3 className="persona-name font-sora">Coastal Authority</h3>
                  <span className="persona-pill pill-authority">Surveillance &amp; Enforcement</span>
                  <p className="persona-desc">
                    Monitor territorial maritime safety, verify citizen incident reports, patrol zone enforcement, and coastal vulnerability metrics.
                  </p>
                  <ul className="persona-features">
                    <li>✓ Real-time coastal incident reports &amp; dispatch</li>
                    <li>✓ Coastal erosion &amp; boundary enforcement</li>
                    <li>✓ Multi-agency coordination desk</li>
                  </ul>
                </div>
                <button
                  type="button"
                  className="btn-persona-select btn-persona-authority font-inter"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleGuestSelect('coastal_authority')
                  }}
                >
                  Continue as Authority &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
