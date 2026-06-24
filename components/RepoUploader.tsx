"use client";

/**
 * components/RepoUploader.tsx
 * Handles the GitHub repo URL submission and displays SSE indexing progress.
 */
import { useState, useRef } from "react";

interface ProgressEvent {
  type: string;
  message?: string;
  current?: number;
  total?: number;
  step?: string;
  fileCount?: number;
  chunkCount?: number;
  languageStats?: Record<string, number>;
  repoId?: number;
}

interface Props {
  onIndexed?: () => void;
}

export default function RepoUploader({ onIndexed }: Props) {
  const [url, setUrl] = useState("");
  const [indexing, setIndexing] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent[]>([]);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const latestProgress = progress[progress.length - 1];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setIndexing(true);
    setProgress([]);
    setError("");
    setDone(false);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/repos/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ github_url: url.trim() }),
        signal: abortRef.current.signal,
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event: ProgressEvent = JSON.parse(line.slice(6));
            setProgress((prev) => [...prev, event]);

            if (event.type === "done") {
              setDone(true);
              setIndexing(false);
              setTimeout(() => {
                onIndexed?.();
                setUrl("");
                setProgress([]);
                setDone(false);
              }, 3000);
            }
            if (event.type === "error") {
              setError(event.message ?? "Indexing failed");
              setIndexing(false);
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("Connection failed. Please try again.");
      }
    } finally {
      setIndexing(false);
    }
  }

  function cancel() {
    abortRef.current?.abort();
    setIndexing(false);
    setProgress([]);
  }

  // Progress percentage
  const fetchProgress = progress.findLast(
    (p) => p.type === "progress" && p.step === "fetch"
  );
  const embedProgress = progress.findLast(
    (p) => p.type === "progress" && p.step === "embed"
  );
  const activeProgress = embedProgress ?? fetchProgress;
  const pct =
    activeProgress && activeProgress.total
      ? Math.round((activeProgress.current! / activeProgress.total) * 100)
      : 0;

  return (
    <div className="uploader-card card">
      <h2 className="uploader-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/>
        </svg>
        Index a Repository
      </h2>
      <p className="uploader-desc">
        Paste a GitHub URL to index up to 400 files and start asking questions.
      </p>

      <form onSubmit={handleSubmit} className="uploader-form">
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "stretch" }}>
          <input
            id="repo-url-input"
            type="url"
            className="input"
            placeholder="https://github.com/owner/repo"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={indexing}
            required
            style={{ flex: 1 }}
          />
          {indexing ? (
            <button
              type="button"
              className="btn btn-danger"
              onClick={cancel}
              id="cancel-indexing-btn"
            >
              Cancel
            </button>
          ) : (
            <button
              type="submit"
              className="btn btn-primary"
              id="start-indexing-btn"
              disabled={!url.trim()}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
              </svg>
              Index
            </button>
          )}
        </div>
      </form>

      {error && (
        <div className="alert alert-error" style={{ marginTop: "1rem" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {done && (
        <div className="alert alert-success" style={{ marginTop: "1rem" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{flexShrink:0}}>
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {latestProgress?.message ?? "Indexing complete!"}
        </div>
      )}

      {indexing && (
        <div className="uploader-progress">
          <div className="uploader-progress-header">
            <span>{latestProgress?.message ?? "Starting..."}</span>
            {activeProgress && (
              <span className="uploader-progress-pct">{pct}%</span>
            )}
          </div>
          {activeProgress && (
            <div className="uploader-progress-bar">
              <div
                className="uploader-progress-fill"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
          <div className="uploader-log">
            {progress.slice(-5).map((p, i) => (
              <div key={i} className="uploader-log-line">
                <span className="uploader-log-dot" />
                {p.message}
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .uploader-card { margin-bottom: 1.5rem; }
        .uploader-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.375rem;
        }
        .uploader-desc {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-bottom: 1.25rem;
        }
        .uploader-form { display: flex; flex-direction: column; gap: 0.75rem; }
        .uploader-progress {
          margin-top: 1.25rem;
          padding: 1rem;
          background: var(--bg-glass);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
        }
        .uploader-progress-header {
          display: flex;
          justify-content: space-between;
          font-size: 0.8125rem;
          color: var(--text-secondary);
          margin-bottom: 0.625rem;
        }
        .uploader-progress-pct { font-weight: 600; color: var(--accent-primary); }
        .uploader-progress-bar {
          height: 4px;
          background: var(--border);
          border-radius: var(--radius-full);
          overflow: hidden;
          margin-bottom: 0.875rem;
        }
        .uploader-progress-fill {
          height: 100%;
          background: var(--gradient-brand);
          border-radius: var(--radius-full);
          transition: width 0.3s ease;
        }
        .uploader-log { display: flex; flex-direction: column; gap: 0.25rem; }
        .uploader-log-line {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }
        .uploader-log-dot {
          width: 5px; height: 5px;
          background: var(--accent-primary);
          border-radius: 50%;
          flex-shrink: 0;
          animation: pulse 2s infinite;
        }
      `}</style>
    </div>
  );
}
