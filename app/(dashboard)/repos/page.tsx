/**
 * app/(dashboard)/repos/page.tsx
 * Repository management page: list, add, delete repos.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyJWT, TOKEN_COOKIE_NAME } from "@/lib/auth";
import { query } from "@/lib/db";
import RepoUploaderWrapper from "./_components/RepoUploaderWrapper";
import RepoList from "./_components/RepoList";

export const metadata = {
  title: "Repositories",
};

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

async function getRepos(userId: number): Promise<Repo[]> {
  return query<Repo>(
    `SELECT id, github_url, repo_name, owner, status, indexed_at,
            file_count, chunk_count, language_stats, error_message, created_at
     FROM repos
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
}

export default async function ReposPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
  if (!token) redirect("/login");

  const payload = await verifyJWT(token);
  if (!payload) redirect("/login");

  const repos = await getRepos(payload.id);

  return (
    <div className="repos-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Repositories</h1>
          <p className="page-subtitle">
            Index GitHub repositories to start chatting with your code
          </p>
        </div>
        <div className="page-header-stats">
          <div className="stat-pill">
            <span className="stat-pill-value">{repos.length}</span>
            <span className="stat-pill-label">repos</span>
          </div>
          <div className="stat-pill">
            <span className="stat-pill-value">
              {repos.reduce((a, r) => a + (r.chunk_count ?? 0), 0).toLocaleString()}
            </span>
            <span className="stat-pill-label">chunks</span>
          </div>
        </div>
      </div>

      {/* Uploader — client component wrapper */}
      <RepoUploaderWrapper />

      {/* Repo list — client component for delete interactions */}
      <RepoList initialRepos={repos} />

      <style>{`
        .repos-page {
          padding: 2rem;
          max-width: 860px;
          margin: 0 auto;
        }
        .page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 2rem;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .page-title {
          font-size: 1.75rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }
        .page-subtitle { font-size: 0.9375rem; color: var(--text-secondary); }
        .page-header-stats { display: flex; gap: 0.75rem; align-items: center; flex-shrink: 0; }
        .stat-pill {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: var(--bg-glass);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 0.625rem 1rem;
          min-width: 70px;
        }
        .stat-pill-value { font-size: 1.25rem; font-weight: 700; color: var(--accent-primary); }
        .stat-pill-label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
      `}</style>
    </div>
  );
}
