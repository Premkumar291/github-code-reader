"use client";

/**
 * components/CodeBlock.tsx
 * Syntax-highlighted code block with copy button and file header.
 * Uses CSS classes for basic highlighting (no heavy runtime deps).
 */
import { useState } from "react";

interface Props {
  code: string;
  language?: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
}

export default function CodeBlock({
  code,
  language = "text",
  filePath,
  lineStart,
  lineEnd,
}: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const lineInfo =
    lineStart !== undefined && lineEnd !== undefined
      ? `L${lineStart + 1}–${lineEnd + 1}`
      : null;

  return (
    <div className="codeblock">
      <div className="codeblock-header">
        <div className="codeblock-meta">
          {filePath && (
            <span className="codeblock-path">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              {filePath}
            </span>
          )}
          {lineInfo && <span className="badge badge-purple">{lineInfo}</span>}
          <span className="badge badge-teal">{language}</span>
        </div>
        <button className="codeblock-copy" onClick={copy} id="copy-code-btn" title="Copy code">
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-success)" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
          )}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="codeblock-pre"><code>{code}</code></pre>

      <style>{`
        .codeblock {
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          overflow: hidden;
          margin: 0.75rem 0;
          background: var(--bg-elevated);
        }
        .codeblock-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 0.875rem;
          background: rgba(255,255,255,0.03);
          border-bottom: 1px solid var(--border);
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .codeblock-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .codeblock-path {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--text-secondary);
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .codeblock-copy {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: none;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          font-size: 0.75rem;
          font-family: var(--font-sans);
          padding: 0.25rem 0.5rem;
          cursor: pointer;
          transition: all var(--transition-fast);
          white-space: nowrap;
        }
        .codeblock-copy:hover {
          border-color: var(--border-strong);
          color: var(--text-secondary);
          background: var(--bg-glass);
        }
        .codeblock-pre {
          margin: 0;
          padding: 1rem 1.25rem;
          overflow-x: auto;
          font-family: var(--font-mono);
          font-size: 0.8125rem;
          line-height: 1.7;
          color: #c9d1d9;
        }
      `}</style>
    </div>
  );
}
