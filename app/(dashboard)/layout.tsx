/**
 * app/(dashboard)/layout.tsx
 * Dashboard shell with sidebar navigation.
 * Server component — reads user from cookie.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifyJWT, TOKEN_COOKIE_NAME } from "@/lib/auth";
import LogoutButton from "./_components/LogoutButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;

  if (!token) redirect("/login");

  const payload = await verifyJWT(token);
  if (!payload) redirect("/login");

  const email = payload.email as string;
  const initials = email[0].toUpperCase();

  return (
    <div className="dashboard-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="url(#sidebarG)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="sidebarG" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6c63ff"/>
                  <stop offset="1" stopColor="#9333ea"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="sidebar-logo-text">Codebase AI</span>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <Link href="/repos" className="sidebar-link" id="nav-repos">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Repositories
          </Link>

          <Link href="/chat" className="sidebar-link" id="nav-chat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            Chat
          </Link>
        </nav>

        <div className="sidebar-bottom">
          {/* User badge */}
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-email">{email}</span>
              <span className="sidebar-user-plan">Free tier</span>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Main */}
      <main className="dashboard-main">{children}</main>

      <style>{`
        .dashboard-shell {
          display: flex;
          min-height: 100vh;
          background: var(--bg-base);
        }

        /* ── Sidebar ── */
        .sidebar {
          width: var(--sidebar-width);
          flex-shrink: 0;
          background: var(--bg-surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          padding: 1.25rem 0.75rem;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
        }
        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.25rem 0.5rem 1.5rem;
          border-bottom: 1px solid var(--border);
          margin-bottom: 1rem;
        }
        .sidebar-logo-icon {
          width: 34px; height: 34px;
          background: var(--gradient-brand);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px var(--accent-glow);
          flex-shrink: 0;
        }
        .sidebar-logo-text {
          font-size: 0.9375rem;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          flex-grow: 1;
        }
        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.625rem 0.75rem;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text-secondary);
          text-decoration: none;
          transition: all var(--transition-fast);
        }
        .sidebar-link:hover {
          background: var(--bg-glass);
          color: var(--text-primary);
        }
        .sidebar-link.active {
          background: var(--accent-muted);
          color: var(--accent-primary);
        }

        .sidebar-bottom {
          border-top: 1px solid var(--border);
          padding-top: 0.875rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.5rem 0.5rem;
        }
        .sidebar-avatar {
          width: 32px; height: 32px;
          background: var(--gradient-brand);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8125rem;
          font-weight: 700;
          color: #fff;
          flex-shrink: 0;
        }
        .sidebar-user-info {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          overflow: hidden;
        }
        .sidebar-user-email {
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sidebar-user-plan {
          font-size: 0.7rem;
          color: var(--accent-secondary);
        }

        /* ── Main ── */
        .dashboard-main {
          flex-grow: 1;
          overflow-y: auto;
          min-height: 100vh;
        }
      `}</style>
    </div>
  );
}
