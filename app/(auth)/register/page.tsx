"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Registration failed");
        return;
      }

      router.push("/repos");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card animate-fade-in">
      {/* Logo */}
      <div className="auth-logo">
        <div className="auth-logo-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="url(#gr)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <defs>
              <linearGradient id="gr" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6c63ff"/>
                <stop offset="1" stopColor="#9333ea"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <span className="auth-logo-text">Codebase Assistant</span>
      </div>

      <h1 className="auth-title">Create your account</h1>
      <p className="auth-subtitle">Start asking questions about your code for free</p>

      {error && (
        <div className="alert alert-error" role="alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink: 0, marginTop: '2px'}}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="reg-email">Email address</label>
          <input
            id="reg-email"
            type="email"
            className="input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
          />
        </div>

        <div className="form-group">
          <label htmlFor="reg-password">Password</label>
          <input
            id="reg-password"
            type="password"
            className="input"
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        <div className="form-group">
          <label htmlFor="reg-confirm-password">Confirm password</label>
          <input
            id="reg-confirm-password"
            type="password"
            className="input"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        <button
          id="register-submit"
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ width: "100%", marginTop: "0.5rem" }}
        >
          {loading ? (
            <><div className="spinner" style={{width:'16px',height:'16px',borderTopColor:'#fff'}} /> Creating account...</>
          ) : (
            "Create account"
          )}
        </button>
      </form>

      <div className="auth-perks">
        {["Free forever — no credit card", "Groq + HF free tiers", "Up to 1M vectors on Pinecone"].map((perk) => (
          <span key={perk} className="auth-perk">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-success)" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {perk}
          </span>
        ))}
      </div>

      <p className="auth-footer">
        Already have an account?{" "}
        <Link href="/login">Sign in</Link>
      </p>

      <style>{`
        .auth-card {
          background: rgba(17, 17, 24, 0.8);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          padding: 2.5rem;
          backdrop-filter: blur(20px);
          box-shadow: var(--shadow-lg), var(--shadow-glow);
        }
        .auth-logo {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          margin-bottom: 2rem;
        }
        .auth-logo-icon {
          width: 40px; height: 40px;
          background: var(--gradient-brand);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px var(--accent-glow);
        }
        .auth-logo-text { font-size: 1rem; font-weight: 600; color: var(--text-primary); }
        .auth-title { font-size: 1.625rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 0.375rem; }
        .auth-subtitle { font-size: 0.9375rem; color: var(--text-secondary); margin-bottom: 1.75rem; }
        .auth-form { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.25rem; }
        .auth-perks {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
          padding: 0.875rem 1rem;
          background: rgba(34, 197, 94, 0.05);
          border: 1px solid rgba(34, 197, 94, 0.12);
          border-radius: var(--radius-md);
          margin-bottom: 1.5rem;
        }
        .auth-perk {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8125rem;
          color: var(--text-secondary);
        }
        .auth-footer { text-align: center; font-size: 0.875rem; color: var(--text-secondary); }
        .alert { margin-bottom: 1.25rem; }
      `}</style>
    </div>
  );
}
