"use client";

/**
 * components/ChatWindow.tsx
 * Full chat interface: message history, SSE streaming, markdown rendering,
 * source citations, and session management.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import SourceCitations from "./SourceCitations";

interface Repo {
  id: number;
  repo_name: string;
  owner: string;
  github_url: string;
  status: string;
}

interface Source {
  file: string;
  lineStart: number;
  lineEnd: number;
  score: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  isStreaming?: boolean;
}

interface Props {
  repos: Repo[];
}

// Very simple markdown-to-HTML renderer (no external deps)
function renderMarkdown(text: string): string {
  return escHtml(text)
    // Code blocks (must be before inline code)
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre class="md-pre"><code class="md-code lang-${lang}">${code.trim()}</code></pre>`)
    // Inline code
    .replace(/`([^`]+)`/g, (_, c) => `<code class="md-inline-code">${c}</code>`)
    // Headers
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Unordered list items
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    .replace(/(?:<li>.*?<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(?!\*)(.+?)\*(?!\*)/g, "<em>$1</em>")
    // Paragraphs (double newline)
    .replace(/\n\n/g, "</p><p>")
    // Single newlines within paragraphs
    .replace(/\n/g, "<br>")
    .replace(/^(.+)$/, "<p>$1</p>");
}

function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export default function ChatWindow({ repos }: Props) {
  const readyRepos = repos.filter((r) => r.status === "ready");
  const [selectedRepoId, setSelectedRepoId] = useState<number>(
    readyRepos[0]?.id ?? 0
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const selectedRepo = repos.find((r) => r.id === selectedRepoId);

  async function sendMessage() {
    if (!input.trim() || streaming || !selectedRepoId) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);
    setStatusMsg("Thinking...");

    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      isStreaming: true,
    };
    setMessages((prev) => [...prev, assistantMsg]);

    abortRef.current = new AbortController();
    let sources: Source[] = [];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_id: selectedRepoId,
          message: userMsg.content,
          session_id: sessionId,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === "session_id") {
              setSessionId(event.session_id);
            }
            if (event.type === "thinking") {
              setStatusMsg(event.message);
            }
            if (event.type === "sources") {
              sources = event.sources;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, sources } : m
                )
              );
            }
            if (event.type === "chunk") {
              setStatusMsg("");
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + event.content }
                    : m
                )
              );
            }
            if (event.type === "error") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: `❌ ${event.message}`, isStreaming: false }
                    : m
                )
              );
            }
            if (event.type === "done") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, isStreaming: false } : m
                )
              );
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "Network error. Please try again.", isStreaming: false }
              : m
          )
        );
      }
    } finally {
      setStreaming(false);
      setStatusMsg("");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, isStreaming: false } : m
        )
      );
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function clearChat() {
    setMessages([]);
    setSessionId(null);
  }

  if (readyRepos.length === 0) {
    return (
      <div className="chat-empty">
        <div className="chat-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.25">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/>
          </svg>
        </div>
        <h3>No repositories indexed yet</h3>
        <p>Go to <a href="/repos">Repositories</a> to index your first codebase.</p>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {/* Toolbar */}
      <div className="chat-toolbar">
        <div className="chat-toolbar-left">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          <span className="chat-toolbar-title">Ask your codebase</span>
        </div>
        <div className="chat-toolbar-right">
          <select
            id="repo-selector"
            className="input chat-repo-select"
            value={selectedRepoId}
            onChange={(e) => {
              setSelectedRepoId(Number(e.target.value));
              clearChat();
            }}
          >
            {readyRepos.map((r) => (
              <option key={r.id} value={r.id}>
                {r.owner}/{r.repo_name}
              </option>
            ))}
          </select>
          {messages.length > 0 && (
            <button
              id="clear-chat-btn"
              className="btn btn-ghost btn-sm"
              onClick={clearChat}
              title="Clear chat"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages" id="chat-messages">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <div className="chat-welcome-icon animate-float">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="url(#chatG)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <defs>
                  <linearGradient id="chatG" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#6c63ff"/><stop offset="1" stopColor="#9333ea"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h3>Ask anything about <span className="gradient-text">{selectedRepo?.owner}/{selectedRepo?.repo_name}</span></h3>
            <p>Try: &ldquo;How does authentication work?&rdquo; or &ldquo;Explain the main data models&rdquo;</p>
            <div className="chat-suggestions">
              {[
                "How does authentication work?",
                "What are the main API endpoints?",
                "Explain the database schema",
                "Where is error handling implemented?",
              ].map((s) => (
                <button
                  key={s}
                  className="chat-suggestion"
                  onClick={() => setInput(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message chat-message-${msg.role}`}>
            <div className="chat-avatar">
              {msg.role === "user" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              )}
            </div>
            <div className="chat-bubble">
              {msg.role === "assistant" ? (
                <>
                  <div
                    className="chat-content prose"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                  />
                  {msg.isStreaming && !msg.content && (
                    <div className="chat-typing">
                      <span /><span /><span />
                    </div>
                  )}
                  {msg.isStreaming && msg.content && (
                    <span className="cursor-blink" />
                  )}
                  {msg.sources && msg.sources.length > 0 && (
                    <SourceCitations
                      sources={msg.sources}
                      repoUrl={selectedRepo?.github_url}
                    />
                  )}
                </>
              ) : (
                <p className="chat-user-text">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {statusMsg && (
          <div className="chat-status">
            <div className="spinner" />
            {statusMsg}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <textarea
            ref={inputRef}
            id="chat-input"
            className="chat-textarea"
            placeholder="Ask a question about your codebase... (Enter to send, Shift+Enter for newline)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={streaming}
          />
          <button
            id="send-message-btn"
            className="btn btn-primary chat-send-btn"
            onClick={sendMessage}
            disabled={!input.trim() || streaming}
          >
            {streaming ? (
              <div className="spinner" style={{ width: 16, height: 16, borderTopColor: "#fff" }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            )}
          </button>
        </div>
        <p className="chat-disclaimer">
          AI can make mistakes. Always verify critical code behaviour yourself.
        </p>
      </div>

      <style>{`
        .chat-window {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: var(--bg-base);
        }

        /* Toolbar */
        .chat-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border);
          background: var(--bg-surface);
          flex-shrink: 0;
        }
        .chat-toolbar-left { display: flex; align-items: center; gap: 0.5rem; }
        .chat-toolbar-title { font-weight: 600; color: var(--text-primary); }
        .chat-toolbar-right { display: flex; align-items: center; gap: 0.75rem; }
        .chat-repo-select { max-width: 220px; font-size: 0.875rem; padding: 0.375rem 2rem 0.375rem 0.75rem; }

        /* Messages */
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* Welcome */
        .chat-empty, .chat-welcome {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          flex: 1;
          gap: 0.875rem;
          padding: 3rem 1rem;
        }
        .chat-empty-icon, .chat-welcome-icon {
          width: 80px; height: 80px;
          background: var(--gradient-brand);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 32px var(--accent-glow);
          margin-bottom: 0.5rem;
        }
        .chat-welcome h3 { font-size: 1.375rem; color: var(--text-primary); }
        .chat-welcome p { color: var(--text-secondary); font-size: 0.9375rem; }
        .chat-suggestions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          justify-content: center;
          margin-top: 0.5rem;
          max-width: 560px;
        }
        .chat-suggestion {
          background: var(--bg-glass);
          border: 1px solid var(--border);
          border-radius: var(--radius-full);
          color: var(--text-secondary);
          font-size: 0.8125rem;
          padding: 0.375rem 0.875rem;
          cursor: pointer;
          transition: all var(--transition-fast);
          font-family: var(--font-sans);
        }
        .chat-suggestion:hover {
          border-color: var(--accent-primary);
          color: var(--accent-primary);
          background: var(--accent-muted);
        }

        /* Message bubbles */
        .chat-message {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
          animation: fadeIn 0.3s ease;
        }
        .chat-message-user { flex-direction: row-reverse; }
        .chat-avatar {
          width: 32px; height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .chat-message-user .chat-avatar {
          background: var(--gradient-brand);
          color: #fff;
        }
        .chat-message-assistant .chat-avatar {
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          color: var(--accent-primary);
        }
        .chat-bubble {
          max-width: min(680px, 85%);
          padding: 0.875rem 1.125rem;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          background: var(--bg-surface);
        }
        .chat-message-user .chat-bubble {
          background: var(--accent-muted);
          border-color: rgba(108, 99, 255, 0.3);
        }
        .chat-user-text {
          color: var(--text-primary) !important;
          font-size: 0.9375rem;
          margin: 0;
        }
        .chat-content { font-size: 0.9375rem; }
        .chat-content .md-pre {
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 0.875rem 1rem;
          overflow-x: auto;
          margin: 0.75rem 0;
        }
        .chat-content .md-code {
          font-family: var(--font-mono);
          font-size: 0.8125rem;
          color: #c9d1d9;
          display: block;
        }
        .chat-content .md-inline-code {
          background: rgba(108,99,255,0.12);
          color: #b4b0ff;
          padding: 0.15em 0.4em;
          border-radius: 4px;
          font-family: var(--font-mono);
          font-size: 0.85em;
        }
        .chat-content h1, .chat-content h2, .chat-content h3 {
          color: var(--text-primary);
          margin: 1em 0 0.5em;
        }
        .chat-content p { color: var(--text-secondary); margin: 0 0 0.5rem; }
        .chat-content ul, .chat-content ol { padding-left: 1.5rem; margin: 0.5rem 0; }
        .chat-content li { color: var(--text-secondary); margin: 0.25rem 0; }
        .chat-content strong { color: var(--text-primary); font-weight: 600; }

        /* Typing indicator */
        .chat-typing {
          display: flex;
          gap: 5px;
          align-items: center;
          height: 20px;
        }
        .chat-typing span {
          width: 7px; height: 7px;
          background: var(--text-muted);
          border-radius: 50%;
          animation: typing-bounce 1.2s ease-in-out infinite;
        }
        .chat-typing span:nth-child(2) { animation-delay: 0.2s; }
        .chat-typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30%            { transform: translateY(-6px); opacity: 1; }
        }

        .chat-status {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          font-size: 0.8125rem;
          color: var(--text-muted);
          padding: 0 0.5rem;
        }

        /* Input */
        .chat-input-area {
          border-top: 1px solid var(--border);
          padding: 1rem 1.5rem;
          background: var(--bg-surface);
          flex-shrink: 0;
        }
        .chat-input-wrapper {
          display: flex;
          gap: 0.75rem;
          align-items: flex-end;
        }
        .chat-textarea {
          flex: 1;
          background: var(--bg-glass);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-family: var(--font-sans);
          font-size: 0.9375rem;
          padding: 0.75rem 1rem;
          resize: none;
          outline: none;
          min-height: 48px;
          max-height: 160px;
          overflow-y: auto;
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
          line-height: 1.5;
        }
        .chat-textarea::placeholder { color: var(--text-muted); }
        .chat-textarea:focus {
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px var(--accent-muted);
        }
        .chat-textarea:disabled { opacity: 0.5; }
        .chat-send-btn {
          flex-shrink: 0;
          width: 48px; height: 48px;
          padding: 0;
          border-radius: var(--radius-md);
        }
        .chat-disclaimer {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-align: center;
          margin-top: 0.5rem;
        }
      `}</style>
    </div>
  );
}
