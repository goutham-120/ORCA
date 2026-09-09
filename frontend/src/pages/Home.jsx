import { useAuth } from '../hooks/useAuth'
import './Home.css'

export default function Home({ navigate }) {
  const { user } = useAuth()

  const handleNav = (path) => {
    if (navigate) {
      navigate(path)
    } else {
      window.location.href = path
    }
  }

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
      {/* 1. MINIMAL NAVIGATION HEADER (LOCKED & UNTOUCHED) */}
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
            {!user && (
              <button
                type="button"
                className="nav-btn"
                onClick={() => handleNav('/login')}
              >
                Sign In
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="home-main">
        {/* 2. HERO SECTION WITH FLOWING WATER VIDEO (LOCKED & UNTOUCHED) */}
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
              {user ? (
                <button
                  type="button"
                  className="btn-primary btn-large"
                  onClick={() => handleNav('/ask-orca')}
                >
                  Get Started
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn-primary btn-large"
                    onClick={() => handleNav('/register')}
                  >
                    Get Started
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-large"
                    onClick={() => handleNav('/login')}
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* 3. CONTINUOUS MARINE INFORMATION SECTION (ENHANCED LOWER SECTION) */}
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

      {/* 4. MINIMAL FOOTER (LOCKED & UNTOUCHED) */}
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
    </div>
  )
}
