"use client";

/**
 * components/SourceCitations.tsx
 * Displays retrieved code chunks with GitHub links.
 */

interface Source {
  file: string;
  lineStart: number;
  lineEnd: number;
  score: number;
}

interface Props {
  sources: Source[];
  repoUrl?: string;
}

export default function SourceCitations({ sources, repoUrl }: Props) {
  if (!sources || sources.length === 0) return null;

  function buildGithubLink(file: string, lineStart: number, lineEnd: number) {
    if (!repoUrl) return null;
    // Convert to blob URL: https://github.com/owner/repo/blob/main/path#L1-L10
    const base = repoUrl.replace(/\.git$/, "").replace(/\/$/, "");
    return `${base}/blob/main/${file}#L${lineStart + 1}-L${lineEnd + 1}`;
  }

  return (
    <div className="sources">
      <div className="sources-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="2">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
        </svg>
        <span>Sources ({sources.length})</span>
      </div>
      <div className="sources-list">
        {sources.map((src, i) => {
          const link = buildGithubLink(src.file, src.lineStart, src.lineEnd);
          return (
            <div key={i} className="source-item">
              <div className="source-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div className="source-info">
                {link ? (
                  <a href={link} target="_blank" rel="noopener noreferrer" className="source-path">
                    {src.file}
                  </a>
                ) : (
                  <span className="source-path">{src.file}</span>
                )}
                <span className="source-lines">
                  L{src.lineStart + 1}–{src.lineEnd + 1}
                </span>
              </div>
              <div
                className="source-score"
                title={`Relevance: ${Math.round(src.score * 100)}%`}
              >
                {Math.round(src.score * 100)}%
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .sources {
          margin-top: 0.875rem;
          border: 1px solid rgba(0, 212, 170, 0.15);
          border-radius: var(--radius-md);
          overflow: hidden;
          background: rgba(0, 212, 170, 0.04);
        }
        .sources-header {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.875rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--accent-secondary);
          border-bottom: 1px solid rgba(0, 212, 170, 0.12);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .sources-list { display: flex; flex-direction: column; }
        .source-item {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.5rem 0.875rem;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          transition: background var(--transition-fast);
        }
        .source-item:last-child { border-bottom: none; }
        .source-item:hover { background: rgba(0, 212, 170, 0.05); }
        .source-icon { color: var(--text-muted); flex-shrink: 0; }
        .source-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex: 1;
          overflow: hidden;
          flex-wrap: wrap;
        }
        .source-path {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--accent-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 280px;
          text-decoration: none;
        }
        .source-path:hover { text-decoration: underline; }
        a.source-path { cursor: pointer; }
        .source-lines {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--text-muted);
          white-space: nowrap;
        }
        .source-score {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--accent-secondary);
          background: rgba(0,212,170,0.1);
          padding: 0.1rem 0.4rem;
          border-radius: var(--radius-full);
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
