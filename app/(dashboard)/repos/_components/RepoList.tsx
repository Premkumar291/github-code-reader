"use client";

/**
 * app/(dashboard)/repos/_components/RepoList.tsx
 * Client component: lists repos with delete, status badges, and language stats.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Repo {
  id: number;
  github_url: string;
  repo_name: string;
  owner: string;
  status: string;
  indexed_at: string | null;
  file_count: number;
  chunk_count: number;
  language_stats: Record<string, number> | null;
  error_message: string | null;
  created_at: string;
}

interface Props {
  initialRepos: Repo[];
}

const STATUS_CONFIG: Record<string, { label: string; class: string; icon: React.ReactNode }> = {
  ready: {
    label: "Ready",
    class: "badge-green",
    icon: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  },
  indexing: {
    label: "Indexing",
    class: "badge-yellow",
    icon: <div className="spinner" style={{ width: 10, height: 10 }} />,
  },
  failed: {
    label: "Failed",
    class: "badge-red",
    icon: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  },
  pending: {
    label: "Pending",
    class: "badge-purple",
    icon: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  },
};

const LANG_COLORS: Record<string, string> = {
  typescript: "#3178c6",
  javascript: "#f7df1e",
  python: "#3572A5",
  go: "#00ADD8",
  rust: "#dea584",
  java: "#b07219",
  csharp: "#178600",
  ruby: "#701516",
  markdown: "#083fa1",
  json: "#888",
};

export default function RepoList({ initialRepos }: Props) {
  const [repos, setRepos] = useState<Repo[]>(initialRepos);
  const [deleting, setDeleting] = useState<number | null>(null);
  const router = useRouter();

  async function deleteRepo(id: number) {
    if (!confirm("Delete this repo and all its indexed vectors?")) return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/repos/delete?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setRepos((prev) => prev.filter((r) => r.id !== id));
        router.refresh();
      } else {
        alert("Failed to delete repo. Please try again.");
      }
    } finally {
      setDeleting(null);
    }
  }

  if (repos.length === 0) {
    return (
      <div className="repos-empty card">
        <div className="repos-empty-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.25">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/>
          </svg>
        </div>
        <h3>No repositories yet</h3>
        <p>Paste a GitHub URL above to get started.</p>
      </div>
    );
  }

  return (
    <div className="repos-list">
      <h3 className="repos-list-title">Your repositories ({repos.length})</h3>
      {repos.map((repo) => {
        const status = STATUS_CONFIG[repo.status] ?? STATUS_CONFIG.pending;
        const langs = repo.language_stats
          ? Object.entries(repo.language_stats)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 4)
          : [];
        const totalFiles = langs.reduce((a, [, v]) => a + v, 0) || 1;

        return (
          <div key={repo.id} className="repo-card card">
            <div className="repo-card-top">
              <div className="repo-card-info">
                <div className="repo-card-name">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.75">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/>
                  </svg>
                  <a href={repo.github_url} target="_blank" rel="noopener noreferrer" className="repo-link">
                    {repo.owner}/{repo.repo_name}
                  </a>
                </div>
                <span className={`badge ${status.class}`} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {status.icon} {status.label}
                </span>
              </div>
              <div className="repo-card-actions">
                {repo.status === "ready" && (
                  <a href="/chat" className="btn btn-secondary btn-sm" id={`chat-repo-${repo.id}`}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                    </svg>
                    Chat
                  </a>
                )}
                <button
                  id={`delete-repo-${repo.id}`}
                  className="btn btn-danger btn-sm btn-icon"
                  onClick={() => deleteRepo(repo.id)}
                  disabled={deleting === repo.id}
                  title="Delete repository"
                >
                  {deleting === repo.id ? (
                    <div className="spinner" style={{ width: 13, height: 13 }} />
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {repo.error_message && (
              <div className="alert alert-error" style={{ marginTop: "0.75rem", fontSize: "0.8125rem" }}>
                {repo.error_message}
              </div>
            )}

            {repo.status === "ready" && (
              <div className="repo-card-meta">
                <span className="repo-meta-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  </svg>
                  {repo.file_count.toLocaleString()} files
                </span>
                <span className="repo-meta-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
                  </svg>
                  {repo.chunk_count.toLocaleString()} chunks
                </span>
                {repo.indexed_at && (
                  <span className="repo-meta-item">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    {new Date(repo.indexed_at).toISOString().split("T")[0]}
                  </span>
                )}
              </div>
            )}

            {langs.length > 0 && (
              <div className="repo-langs">
                <div className="repo-lang-bar">
                  {langs.map(([lang, count]) => (
                    <div
                      key={lang}
                      className="repo-lang-segment"
                      style={{
                        width: `${(count / totalFiles) * 100}%`,
                        background: LANG_COLORS[lang] ?? "#888",
                      }}
                      title={`${lang}: ${count} files`}
                    />
                  ))}
                </div>
                <div className="repo-lang-labels">
                  {langs.map(([lang, count]) => (
                    <span key={lang} className="repo-lang-label">
                      <span className="repo-lang-dot" style={{ background: LANG_COLORS[lang] ?? "#888" }} />
                      {lang} ({count})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <style>{`
        .repos-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 3rem;
          gap: 0.75rem;
        }
        .repos-empty-icon { margin-bottom: 0.5rem; }
        .repos-empty h3 { color: var(--text-primary); }
        .repos-empty p { color: var(--text-secondary); font-size: 0.9rem; }

        .repos-list { display: flex; flex-direction: column; gap: 0.875rem; }
        .repos-list-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.25rem;
        }

        .repo-card { display: flex; flex-direction: column; gap: 0.75rem; }
        .repo-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .repo-card-info { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
        .repo-card-name { display: flex; align-items: center; gap: 0.5rem; }
        .repo-link {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 0.9375rem;
          text-decoration: none;
        }
        .repo-link:hover { color: var(--accent-primary); }
        .repo-card-actions { display: flex; align-items: center; gap: 0.5rem; }

        .repo-card-meta {
          display: flex;
          gap: 1.25rem;
          flex-wrap: wrap;
        }
        .repo-meta-item {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .repo-langs { display: flex; flex-direction: column; gap: 0.5rem; }
        .repo-lang-bar {
          height: 5px;
          border-radius: var(--radius-full);
          overflow: hidden;
          background: var(--border);
          display: flex;
        }
        .repo-lang-segment { height: 100%; transition: width 0.3s ease; }
        .repo-lang-labels { display: flex; flex-wrap: wrap; gap: 0.625rem; }
        .repo-lang-label {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .repo-lang-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
      `}</style>
    </div>
  );
}
