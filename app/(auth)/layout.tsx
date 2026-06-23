/**
 * app/(auth)/layout.tsx
 * Minimal centered layout for login and register pages.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-shell">
      {/* Animated background orbs */}
      <div className="auth-bg">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />
      </div>

      <main className="auth-content">{children}</main>

      <style>{`
        .auth-shell {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          background: var(--bg-base);
        }
        .auth-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .auth-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.2;
        }
        .auth-orb-1 {
          width: 600px; height: 600px;
          background: radial-gradient(circle, #6c63ff, transparent 70%);
          top: -200px; left: -200px;
          animation: float 8s ease-in-out infinite;
        }
        .auth-orb-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, #9333ea, transparent 70%);
          bottom: -100px; right: -100px;
          animation: float 6s ease-in-out infinite reverse;
        }
        .auth-orb-3 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, #00d4aa, transparent 70%);
          top: 50%; left: 60%;
          animation: float 10s ease-in-out infinite 2s;
        }
        .auth-content {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          padding: 1.5rem;
        }
      `}</style>
    </div>
  );
}
