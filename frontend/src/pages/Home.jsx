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

  return (
    <div className="orca-home-page font-sans">
      {/* 1. PUBLIC NAVIGATION BAR */}
      <nav className="public-navbar">
        <div className="nav-container">
          <div className="nav-brand" onClick={() => handleNav('/')}>
            <span className="brand-logo font-mono">🐋 ORCA</span>
            <span className="brand-badge font-mono">v0.1</span>
          </div>

          <div className="nav-links font-sans">
            <button type="button" className="nav-link-btn active" onClick={() => handleNav('/')}>Home</button>
            <button type="button" className="nav-link-btn" onClick={() => handleNav('/ask-orca')}>Ask ORCA</button>
            <button type="button" className="nav-link-btn" onClick={() => handleNav('/map-explorer')}>Map Explorer</button>
            <a href="#capabilities" className="nav-link-anchor">Capabilities</a>
            <a href="#how-it-works" className="nav-link-anchor">How It Works</a>
          </div>

          <div className="nav-auth-actions font-sans">
            {user ? (
              <button
                type="button"
                className="orca-btn primary text-xs glow"
                onClick={() => handleNav('/dashboard')}
              >
                <span>Command Center</span> <i>&rarr;</i>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="orca-btn secondary outline text-xs"
                  onClick={() => handleNav('/login')}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className="orca-btn primary text-xs glow"
                  onClick={() => handleNav('/register')}
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="home-hero-section">
        {/* Animated Background Wave SVG */}
        <div className="hero-wave-backdrop" aria-hidden="true">
          <svg className="wave-svg wave-svg-1" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,0 C150,90 350,-40 500,40 C650,120 900,10 1200,60 L1200,120 L0,120 Z" fill="rgba(56, 189, 248, 0.08)"></path>
          </svg>
          <svg className="wave-svg wave-svg-2" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,30 C200,100 450,0 700,70 C950,140 1100,20 1200,40 L1200,120 L0,120 Z" fill="rgba(20, 184, 166, 0.06)"></path>
          </svg>
          <div className="hero-glow-orb"></div>
        </div>

        <div className="hero-content-container">
          <div className="hero-eyebrow-chip font-mono">
            <span className="live-dot"></span> MULTI-DOMAIN MARINE DECISION SUPPORT
          </div>

          <h1 className="hero-title font-sans">
            MARINE INTELLIGENCE,<br />
            <span className="highlight-text">BUILT FOR BETTER DECISIONS.</span>
          </h1>

          <p className="hero-subhead font-sans">
            ORCA combines ocean, weather, spatial and contextual intelligence to help you understand marine conditions, identify risks and make informed decisions.
          </p>

          <div className="hero-actions-row">
            <button
              type="button"
              className="orca-btn primary text-base glow hero-btn"
              onClick={() => handleNav('/ask-orca')}
            >
              <span>🤖 Ask ORCA</span>
              <i>&rarr;</i>
            </button>

            <button
              type="button"
              className="orca-btn secondary outline text-base hero-btn"
              onClick={() => handleNav('/map-explorer')}
            >
              <span>🗺️ Explore the Map</span>
              <i>&rarr;</i>
            </button>
          </div>
        </div>
      </section>

      {/* 3. SYSTEM STATUS STRIP */}
      <section className="system-status-strip font-mono">
        <div className="strip-container">
          <div className="status-item">
            <span className="pulse-dot"></span>
            <strong>ORCA INTELLIGENCE SYSTEM</strong>
          </div>
          <div className="status-divider">•</div>
          <div className="status-item">
            <span className="icon">🌊</span> Ocean Telemetry
          </div>
          <div className="status-divider">•</div>
          <div className="status-item">
            <span className="icon">🌦️</span> Weather Telemetry
          </div>
          <div className="status-divider">•</div>
          <div className="status-item">
            <span className="icon">🗺️</span> GIS Analytics
          </div>
          <div className="status-divider">•</div>
          <div className="status-item">
            <span className="icon">🤖</span> AI Reasoning Engine
          </div>
        </div>
      </section>

      {/* 4. WHAT ORCA DOES (FEATURE CARDS) */}
      <section id="capabilities" className="capabilities-section">
        <div className="section-container">
          <div className="section-header center">
            <p className="eyebrow font-mono">MULTI-SIGNAL TELEMETRY</p>
            <h2 className="section-title font-sans">ONE PLATFORM. MULTIPLE MARINE SIGNALS.</h2>
            <p className="section-subtitle font-sans">
              Integrated physical parameters, atmospheric forecasts, and spatial boundaries synthesized into clear operational guidance.
            </p>
          </div>

          <div className="capabilities-grid">
            <div className="capability-card">
              <div className="card-icon-wrap">🌊</div>
              <h3 className="card-title font-sans">Ocean Intelligence</h3>
              <p className="card-desc font-sans">
                Understand marine conditions including wave height, wave period, swell vectors, and sea surface temperatures.
              </p>
            </div>

            <div className="capability-card">
              <div className="card-icon-wrap">🌦️</div>
              <h3 className="card-title font-sans">Weather Intelligence</h3>
              <p className="card-desc font-sans">
                Analyze sustained wind velocity, direction, precipitation, atmospheric pressure, and coastal weather advisories.
              </p>
            </div>

            <div className="capability-card">
              <div className="card-icon-wrap">🗺️</div>
              <h3 className="card-title font-sans">Spatial Intelligence</h3>
              <p className="card-desc font-sans">
                Use GIS vector layers, marine protected boundaries, and geographic context to assess coastal sectors.
              </p>
            </div>

            <div className="capability-card">
              <div className="card-icon-wrap">🛡️</div>
              <h3 className="card-title font-sans">Marine Safety</h3>
              <p className="card-desc font-sans">
                Identify hazard zones, compute operational safety margins, and receive risk assessments for vessels.
              </p>
            </div>

            <div className="capability-card">
              <div className="card-icon-wrap">🤖</div>
              <h3 className="card-title font-sans">AI Decision Support</h3>
              <p className="card-desc font-sans">
                Query ORCA in natural text or browser speech-to-text to receive evidence-grounded recommendations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. HOW ORCA WORKS (WORKFLOW) */}
      <section id="how-it-works" className="how-it-works-section">
        <div className="section-container">
          <div className="section-header center">
            <p className="eyebrow font-mono">INTELLIGENCE PIPELINE</p>
            <h2 className="section-title font-sans">HOW ORCA DELIVERS DECISION SUPPORT</h2>
            <p className="section-subtitle font-sans">
              Four simple steps from location selection to evidence-grounded operational recommendations.
            </p>
          </div>

          <div className="workflow-steps-grid font-mono">
            <div className="workflow-step-card">
              <div className="step-number">01</div>
              <h4 className="step-title font-sans">SELECT LOCATION</h4>
              <p className="step-desc font-sans">
                Pick a preset port or input custom latitude & longitude coordinates for your marine area.
              </p>
            </div>

            <div className="step-connector">&rarr;</div>

            <div className="workflow-step-card">
              <div className="step-number">02</div>
              <h4 className="step-title font-sans">ASK ORCA / ANALYZE</h4>
              <p className="step-desc font-sans">
                Ask a natural language query or trigger a spatial hazard & route corridor check.
              </p>
            </div>

            <div className="step-connector">&rarr;</div>

            <div className="workflow-step-card">
              <div className="step-number">03</div>
              <h4 className="step-title font-sans">COMBINE SIGNALS</h4>
              <p className="step-desc font-sans">
                Parallel agents retrieve live Open-Meteo ocean, weather, & GIS telemetry in real time.
              </p>
            </div>

            <div className="step-connector">&rarr;</div>

            <div className="workflow-step-card">
              <div className="step-number">04</div>
              <h4 className="step-title font-sans">RECEIVE INTELLIGENCE</h4>
              <p className="step-desc font-sans">
                Get structured risk assessments, metrics, actionable guidance, and data provenance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. INTERACTIVE PRODUCT PREVIEW */}
      <section className="product-preview-section">
        <div className="section-container">
          <div className="section-header center">
            <p className="eyebrow font-mono">SYSTEM INTERFACE</p>
            <h2 className="section-title font-sans">INTEGRATED MARINE COMMAND CENTER</h2>
            <p className="section-subtitle font-sans">
              A single operational dashboard unifying live telemetry, spatial GIS rendering, and safety score indices.
            </p>
          </div>

          {/* Simulated Interface Preview Composition */}
          <div className="preview-window-frame">
            <div className="window-header-bar">
              <div className="window-dots">
                <span className="dot red"></span>
                <span className="dot yellow"></span>
                <span className="dot green"></span>
              </div>
              <div className="window-title font-mono">ORCA Command Center — Visakhapatnam (17.6868° N, 83.2185° E)</div>
              <span className="window-badge font-mono">SYSTEM PREVIEW</span>
            </div>

            <div className="window-body-grid">
              <div className="preview-map-box">
                <div className="preview-map-overlay font-mono">
                  <span>📍 VISAKHAPATNAM HARBOR</span>
                  <span className="live-tag">LIVE MAPLIBRE GL JS</span>
                </div>
                <div className="preview-map-graphic">
                  <div className="wave-line line-1"></div>
                  <div className="wave-line line-2"></div>
                  <div className="marker-pin font-mono">📍 17.6868, 83.2185</div>
                </div>
              </div>

              <div className="preview-stats-col font-sans">
                <div className="preview-stat-card">
                  <span className="label font-mono">WAVE HEIGHT</span>
                  <strong className="val font-mono">1.8 m</strong>
                  <span className="status green">Normal Swell</span>
                </div>

                <div className="preview-stat-card">
                  <span className="label font-mono">WIND SPEED</span>
                  <strong className="val font-mono">22 km/h</strong>
                  <span className="status amber">Moderate Breeze</span>
                </div>

                <div className="preview-stat-card safety">
                  <span className="label font-mono">SAFETY SCORE</span>
                  <strong className="val font-mono">72 <small>/100</small></strong>
                  <span className="status green">Favorable Operating Window</span>
                </div>
              </div>
            </div>

            <div className="window-footer-bar">
              <button
                type="button"
                className="orca-btn primary text-xs glow"
                onClick={() => handleNav(user ? '/dashboard' : '/login')}
              >
                <span>Launch Interactive Command Center</span> <i>&rarr;</i>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7 & 8. ASK ORCA & MAP EXPLORER FEATURES */}
      <section className="features-dual-section">
        <div className="section-container">
          <div className="dual-grid">
            {/* Feature 1: Ask ORCA */}
            <div className="dual-card ask-card">
              <div className="card-tag font-mono">CONVERSATIONAL AI</div>
              <h3 className="card-title font-sans">ASK THE OCEAN. GET INTELLIGENCE.</h3>
              <p className="card-desc font-sans">
                Ask ORCA about sea conditions, weather forecasts, route safety risks, or fishing conditions using text or browser voice speech-to-text. ORCA only reports evidence returned by connected telemetry sources.
              </p>
              <button
                type="button"
                className="orca-btn primary text-sm glow"
                onClick={() => handleNav('/ask-orca')}
              >
                <span>Try Ask ORCA</span> <i>&rarr;</i>
              </button>
            </div>

            {/* Feature 2: Map Explorer */}
            <div className="dual-card map-card">
              <div className="card-tag font-mono">SPATIAL GIS ENGINE</div>
              <h3 className="card-title font-sans">SEE THE MARINE ENVIRONMENT.</h3>
              <p className="card-desc font-sans">
                Explore coastal monitoring areas and spatial information on an interactive map canvas. Toggle vector overlays for hazard zones, restricted marine areas, and calculate route corridor intersections.
              </p>
              <button
                type="button"
                className="orca-btn secondary outline text-sm"
                onClick={() => handleNav('/map-explorer')}
              >
                <span>Explore Map</span> <i>&rarr;</i>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 9. STRUCTURED DECISION SUPPORT PILLARS */}
      <section className="pillars-section">
        <div className="section-container">
          <div className="section-header center">
            <p className="eyebrow font-mono">OPERATIONAL PURPOSE</p>
            <h2 className="section-title font-sans">STRUCTURED DECISION SUPPORT</h2>
            <p className="section-subtitle font-sans">
              ORCA transforms complex, raw multi-source ocean telemetry into actionable operational awareness.
            </p>
          </div>

          <div className="pillars-grid font-sans">
            <div className="pillar-card">
              <div className="pillar-num font-mono">01</div>
              <h3 className="pillar-title">UNDERSTAND</h3>
              <p className="pillar-desc">
                Know current ocean & weather conditions across coastal sectors in real time.
              </p>
            </div>

            <div className="pillar-card">
              <div className="pillar-num font-mono">02</div>
              <h3 className="pillar-title">ASSESS</h3>
              <p className="pillar-desc">
                Identify hazards, wave margins, and operational safety risk indices.
              </p>
            </div>

            <div className="pillar-card">
              <div className="pillar-num font-mono">03</div>
              <h3 className="pillar-title">DECIDE</h3>
              <p className="pillar-desc">
                Make informed marine decisions backed by verified telemetry evidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 10. USER TYPES / ROLES */}
      <section className="roles-section">
        <div className="section-container">
          <div className="section-header center">
            <p className="eyebrow font-mono">TAILORED WORKFLOWS</p>
            <h2 className="section-title font-sans">BUILT FOR MARINE OPERATORS</h2>
            <p className="section-subtitle font-sans">
              Designed to support diverse maritime operations, scientific research, and coastal governance.
            </p>
          </div>

          <div className="roles-grid font-sans">
            <div className="role-card">
              <div className="role-icon">🚤</div>
              <h4 className="role-name">Fisher & Marine Operator</h4>
              <p className="role-desc">
                Find safe operating windows, wave margins, and potential fishing zone (PFZ) thermal fronts.
              </p>
            </div>

            <div className="role-card">
              <div className="role-icon">🔬</div>
              <h4 className="role-name">Researcher & Scientist</h4>
              <p className="role-desc">
                Track sea surface temperatures, temporal trend charts, and environmental observations.
              </p>
            </div>

            <div className="role-card">
              <div className="role-icon">⚓</div>
              <h4 className="role-name">Coastal Authority</h4>
              <p className="role-desc">
                Monitor maritime advisories, hazard zones, and vessel safety statuses.
              </p>
            </div>

            <div className="role-card">
              <div className="role-icon">🌊</div>
              <h4 className="role-name">General User</h4>
              <p className="role-desc">
                Explore coastal weather, marine forecasts, and interactive ocean map layers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 11. FINAL CTA */}
      <section className="final-cta-section">
        <div className="section-container center">
          <h2 className="cta-title font-sans">READY TO EXPLORE THE OCEAN DIFFERENTLY?</h2>
          <p className="cta-subhead font-sans">
            Start with a location. Ask a question. Let ORCA turn complex marine data into actionable decision support.
          </p>

          <div className="cta-buttons-row">
            <button
              type="button"
              className="orca-btn primary text-base glow"
              onClick={() => handleNav('/ask-orca')}
            >
              <span>🤖 Ask ORCA</span> <i>&rarr;</i>
            </button>

            <button
              type="button"
              className="orca-btn secondary outline text-base"
              onClick={() => handleNav('/map-explorer')}
            >
              <span>🗺️ Explore Map</span> <i>&rarr;</i>
            </button>
          </div>
        </div>
      </section>

      {/* 12. PUBLIC FOOTER */}
      <footer className="public-footer font-sans">
        <div className="footer-container">
          <div className="footer-brand-col">
            <div className="footer-logo font-mono">🐋 ORCA</div>
            <p className="footer-desc">
              ORCA (Ocean Resource & Contextual Analysis) is an integrated decision-support platform providing location-aware marine intelligence.
            </p>
          </div>

          <div className="footer-links-col font-sans">
            <span className="col-title font-mono">NAVIGATION</span>
            <button type="button" onClick={() => handleNav('/')}>Home</button>
            <button type="button" onClick={() => handleNav('/ask-orca')}>Ask ORCA</button>
            <button type="button" onClick={() => handleNav('/dashboard')}>Dashboard</button>
            <button type="button" onClick={() => handleNav('/map-explorer')}>Map Explorer</button>
            <button type="button" onClick={() => handleNav('/alerts')}>Alerts</button>
            <button type="button" onClick={() => handleNav('/reports')}>Reports</button>
          </div>

          <div className="footer-meta-col font-mono">
            <span className="col-title">SYSTEM STATUS</span>
            <p>● Live Telemetry Active</p>
            <p>Open-Meteo Weather & Marine API</p>
            <p>MapLibre GL JS Spatial Canvas</p>
          </div>
        </div>

        <div className="footer-bottom-bar font-mono">
          <span>© {new Date().getFullYear()} ORCA Marine Intelligence • Decision Support Platform</span>
        </div>
      </footer>
    </div>
  )
}
