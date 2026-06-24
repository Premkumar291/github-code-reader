import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Codebase Assistant — AI-Powered Code Q&A",
  description:
    "Upload any GitHub repository and ask questions about your codebase using AI. Get instant, accurate answers with file citations powered by Groq and Pinecone.",
};

export default function LandingPage() {
  return (
    <div className="landing">
      {/* Nav */}
      <nav className="landing-nav">
        <div className="landing-nav-logo">
          <div className="landing-logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="url(#lG)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="lG" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6c63ff"/><stop offset="1" stopColor="#9333ea"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span>Codebase Assistant</span>
        </div>
        <div className="landing-nav-links">
          <Link href="/login" className="btn btn-ghost btn-sm" id="nav-login">Sign in</Link>
          <Link href="/register" className="btn btn-primary btn-sm" id="nav-register">Get started free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          100% Free & Open Source Codebase Intelligence
        </div>
        <h1 className="hero-title">
          Ask questions about <br/>
          <span className="gradient-text">any codebase</span>
        </h1>
        <p className="hero-subtitle">
          Index your GitHub repos and get AI-powered answers with exact file citations.
          No more digging through hundreds of files — just ask.
        </p>
        <div className="hero-cta">
          <Link href="/register" className="btn btn-primary btn-lg" id="hero-cta-register">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/>
            </svg>
            Start for free
          </Link>
          <Link href="/login" className="btn btn-secondary btn-lg" id="hero-cta-login">
            Sign in
          </Link>
        </div>

        {/* Demo window */}
        <div className="hero-demo animate-glow">
          <div className="demo-titlebar">
            <div className="demo-dots">
              <span /><span /><span />
            </div>
            <span className="demo-title">Codebase Assistant</span>
          </div>
          <div className="demo-body">
            <div className="demo-message demo-message-user">
              How does JWT authentication work in this codebase?
            </div>
            <div className="demo-message demo-message-ai">
              <div className="demo-ai-thinking">
                <div className="demo-ai-dot" />
                <span>Searching codebase...</span>
              </div>
              <p>The JWT authentication is implemented across several files:</p>
              <div className="demo-code-ref">
                <span className="demo-code-file">📄 lib/auth.ts</span>
                <span className="demo-code-lines">L12–45</span>
              </div>
              <p style={{marginTop:'0.5rem'}}>The <code>createJWT()</code> function signs tokens using <strong>HS256</strong> with a 7-day expiry. Tokens are stored in <strong>HttpOnly cookies</strong> for XSS protection...</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <h2 className="features-title">Everything you need</h2>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature-card card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Use Cases */}
      <section className="stack-section">
        <h2 className="features-title">Accelerate Your Engineering Workflow</h2>
        <div className="stack-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          {USE_CASES.map((u) => (
            <div key={u.title} className="stack-item" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.5rem" }}>{u.icon}</span>
              <div>
                <span className="stack-name" style={{ fontSize: "1rem" }}>{u.title}</span>
                <span className="stack-desc" style={{ marginTop: "0.25rem", color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: "1.5" }}>{u.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <h2>Ready to understand your codebase?</h2>
        <p>Free forever. No credit card required. Powered by open-source AI.</p>
        <Link href="/register" className="btn btn-primary btn-lg" id="bottom-cta">
          Get started — it&apos;s free
        </Link>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <span>© 2025 Codebase Assistant</span>
        <span>Built for developers, by developers.</span>
      </footer>

      <style>{`
        .landing {
          min-height: 100vh;
          background: var(--bg-base);
          overflow-x: hidden;
        }

        /* Nav */
        .landing-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 2rem;
          border-bottom: 1px solid var(--border);
          background: rgba(10,10,15,0.8);
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .landing-nav-logo {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          font-weight: 700;
          font-size: 1rem;
          color: var(--text-primary);
        }
        .landing-logo-icon {
          width: 34px; height: 34px;
          background: var(--gradient-brand);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 12px var(--accent-glow);
        }
        .landing-nav-links { display: flex; align-items: center; gap: 0.625rem; }

        /* Hero */
        .hero {
          text-align: center;
          padding: 5rem 1.5rem 4rem;
          max-width: 900px;
          margin: 0 auto;
          background: var(--gradient-hero);
        }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 1rem;
          background: var(--accent-muted);
          border: 1px solid rgba(108,99,255,0.25);
          border-radius: var(--radius-full);
          font-size: 0.8125rem;
          color: #b4b0ff;
          margin-bottom: 2rem;
        }
        .hero-badge-dot {
          width: 7px; height: 7px;
          background: var(--accent-primary);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        .hero-title {
          font-size: clamp(2.5rem, 7vw, 4.5rem);
          font-weight: 800;
          letter-spacing: -0.04em;
          line-height: 1.1;
          color: var(--text-primary);
          margin-bottom: 1.5rem;
        }
        .hero-subtitle {
          font-size: clamp(1rem, 2vw, 1.25rem);
          color: var(--text-secondary);
          max-width: 600px;
          margin: 0 auto 2.5rem;
          line-height: 1.7;
        }
        .hero-cta {
          display: flex;
          gap: 0.875rem;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 4rem;
        }

        /* Demo window */
        .hero-demo {
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          overflow: hidden;
          max-width: 680px;
          margin: 0 auto;
          background: var(--bg-surface);
          text-align: left;
        }
        .demo-titlebar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1.25rem;
          border-bottom: 1px solid var(--border);
          background: var(--bg-elevated);
        }
        .demo-dots { display: flex; gap: 6px; }
        .demo-dots span {
          width: 10px; height: 10px;
          border-radius: 50%;
          background: var(--border);
        }
        .demo-dots span:nth-child(1) { background: #ff5f57; }
        .demo-dots span:nth-child(2) { background: #febc2e; }
        .demo-dots span:nth-child(3) { background: #28c840; }
        .demo-title { font-size: 0.8125rem; color: var(--text-muted); }
        .demo-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
        .demo-message { padding: 0.875rem 1.125rem; border-radius: var(--radius-lg); font-size: 0.9rem; }
        .demo-message-user {
          background: var(--accent-muted);
          border: 1px solid rgba(108,99,255,0.25);
          color: var(--text-primary);
          align-self: flex-end;
          max-width: 80%;
          margin-left: auto;
        }
        .demo-message-ai {
          background: var(--bg-glass);
          border: 1px solid var(--border);
          color: var(--text-secondary);
        }
        .demo-ai-thinking {
          display: flex; align-items: center; gap: 0.5rem;
          font-size: 0.75rem; color: var(--text-muted);
          margin-bottom: 0.75rem;
        }
        .demo-ai-dot {
          width: 7px; height: 7px;
          background: var(--accent-secondary);
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }
        .demo-code-ref {
          display: flex; align-items: center; gap: 0.75rem;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 0.5rem 0.75rem;
          margin-top: 0.5rem;
        }
        .demo-code-file { font-family: var(--font-mono); font-size: 0.8125rem; color: var(--accent-secondary); }
        .demo-code-lines { font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); }
        .demo-message-ai code {
          background: rgba(108,99,255,0.12); color: #b4b0ff;
          padding: 0.1em 0.35em; border-radius: 3px; font-family: var(--font-mono); font-size: 0.85em;
        }
        .demo-message-ai strong { color: var(--text-primary); font-weight: 600; }

        /* Features */
        .features, .stack-section {
          max-width: 1000px;
          margin: 0 auto;
          padding: 5rem 1.5rem;
        }
        .features-title {
          text-align: center;
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-bottom: 3rem;
          color: var(--text-primary);
        }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.25rem;
        }
        .feature-card {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          transition: transform var(--transition-normal);
        }
        .feature-card:hover { transform: translateY(-3px); }
        .feature-icon {
          width: 44px; height: 44px;
          background: var(--accent-muted);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }
        .feature-card h3 { color: var(--text-primary); font-size: 1rem; }
        .feature-card p { font-size: 0.875rem; color: var(--text-secondary); }

        /* Stack */
        .stack-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 0.875rem;
        }
        .stack-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          background: var(--bg-glass);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          transition: border-color var(--transition-fast);
        }
        .stack-item:hover { border-color: var(--border-strong); }
        .stack-item-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .stack-name { display: block; font-weight: 600; font-size: 0.875rem; color: var(--text-primary); }
        .stack-desc { display: block; font-size: 0.75rem; color: var(--text-muted); }

        /* CTA section */
        .landing-cta {
          text-align: center;
          padding: 6rem 1.5rem;
          background: linear-gradient(180deg, transparent 0%, rgba(108,99,255,0.06) 100%);
          border-top: 1px solid var(--border);
        }
        .landing-cta h2 { color: var(--text-primary); margin-bottom: 0.75rem; }
        .landing-cta p { color: var(--text-secondary); margin-bottom: 2rem; }

        /* Footer */
        .landing-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem 2rem;
          border-top: 1px solid var(--border);
          font-size: 0.8125rem;
          color: var(--text-muted);
          flex-wrap: wrap;
          gap: 0.75rem;
        }
      `}</style>
    </div>
  );
}

const FEATURES = [
  {
    icon: "🔍",
    title: "Semantic Search",
    desc: "Find relevant code using natural language, not just keywords. Locate functionality based on intent.",
  },
  {
    icon: "⚡",
    title: "Blazing Fast",
    desc: "Get responses in seconds, not minutes. Optimised indexing and query pipelines deliver answers instantly.",
  },
  {
    icon: "📎",
    title: "File Citations",
    desc: "Every answer includes exact file paths and line numbers so you can verify instantly.",
  },
  {
    icon: "🔒",
    title: "Secure by Default",
    desc: "JWT in HttpOnly cookies, bcrypt passwords, and zero localStorage secrets.",
  },
  {
    icon: "💸",
    title: "100% Free Tier",
    desc: "Explore and query public repositories with generous free usage limits.",
  },
  {
    icon: "🌐",
    title: "Easy to Run",
    desc: "Standard deployment setup. Connect your source code and start chatting immediately.",
  },
];

const USE_CASES = [
  {
    title: "Developer Onboarding",
    desc: "Get new team members up to speed with unfamiliar codebases in minutes instead of weeks.",
    icon: "🚀"
  },
  {
    title: "Code Reviews & Audits",
    desc: "Quickly locate architectural patterns, authentication checks, and dependency structures.",
    icon: "🛡️"
  },
  {
    title: "Debugging & Exploration",
    desc: "Ask where features are implemented and trace flows directly across multiple code files.",
    icon: "🐛"
  }
];
