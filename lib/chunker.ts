/**
 * lib/chunker.ts
 * Smart code chunker that respects function/class boundaries.
 *
 * Strategy (by priority):
 * 1. Language-aware regex splitting: split at function/class/method boundaries
 * 2. Sliding window fallback: overlap-aware line-based splits for anything else
 *
 * This avoids WASM dependencies (tree-sitter) and works in all environments.
 */

export interface CodeChunk {
  text: string;
  lineStart: number;   // 0-indexed
  lineEnd: number;     // 0-indexed, inclusive
  language: string;
}

const CHUNK_MAX_LINES = 80;
const CHUNK_OVERLAP_LINES = 10;
const MIN_CHUNK_LINES = 5;

// ─── Language-aware boundary patterns ─────────────────────────────────────────

const BOUNDARY_PATTERNS: Record<string, RegExp> = {
  typescript: /^(export\s+)?(async\s+)?function\s+\w+|^(export\s+)?class\s+\w+|^(export\s+)?const\s+\w+\s*=\s*(async\s+)?\(/m,
  javascript: /^(export\s+)?(async\s+)?function\s+\w+|^(export\s+)?class\s+\w+|^(export\s+)?const\s+\w+\s*=\s*(async\s+)?\(/m,
  python: /^(async\s+)?def\s+\w+|^class\s+\w+/m,
  go: /^func\s+(\(.*?\)\s+)?\w+/m,
  rust: /^(pub\s+)?(async\s+)?fn\s+\w+|^(pub\s+)?struct\s+\w+|^(pub\s+)?impl\s+\w+/m,
  java: /^(public|private|protected|static|\s)+[\w<>\[\]]+\s+\w+\s*\(/m,
  csharp: /^(public|private|protected|static|async|\s)+[\w<>\[\]]+\s+\w+\s*\(/m,
  ruby: /^(def|class|module)\s+\w+/m,
  php: /^(public|private|protected|static|\s)*(function)\s+\w+/m,
};

/**
 * Chunks a file's content into semantically meaningful pieces.
 */
export function chunkFile(
  content: string,
  language: string
): CodeChunk[] {
  const lines = content.split("\n");

  // Very short files — return as a single chunk
  if (lines.length <= CHUNK_MAX_LINES) {
    return [
      {
        text: content,
        lineStart: 0,
        lineEnd: lines.length - 1,
        language,
      },
    ];
  }

  const pattern = BOUNDARY_PATTERNS[language];

  if (pattern) {
    return chunkByBoundaries(lines, language, pattern);
  }

  return chunkBySlidingWindow(lines, language);
}

/**
 * Splits at language-specific boundaries (functions, classes, etc.)
 * Groups small sections together to avoid too-small chunks.
 */
function chunkByBoundaries(
  lines: string[],
  language: string,
  pattern: RegExp
): CodeChunk[] {
  const boundaries: number[] = [0];

  for (let i = 1; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      boundaries.push(i);
    }
  }
  boundaries.push(lines.length);

  const chunks: CodeChunk[] = [];

  let groupStart = 0;
  let groupLines: string[] = [];

  for (let b = 0; b < boundaries.length - 1; b++) {
    const start = boundaries[b];
    const end = boundaries[b + 1] - 1;
    const section = lines.slice(start, end + 1);

    groupLines = groupLines.concat(section);

    const reachedMax = groupLines.length >= CHUNK_MAX_LINES;
    const isLast = b === boundaries.length - 2;

    if ((reachedMax || isLast) && groupLines.length >= MIN_CHUNK_LINES) {
      chunks.push({
        text: groupLines.join("\n"),
        lineStart: groupStart,
        lineEnd: groupStart + groupLines.length - 1,
        language,
      });
      groupStart = groupStart + groupLines.length;
      groupLines = [];
    }
  }

  if (groupLines.length > 0) {
    if (chunks.length > 0 && groupLines.length < MIN_CHUNK_LINES) {
      const lastChunk = chunks.pop()!;
      const mergedStart = lastChunk.lineStart;
      const mergedEnd = groupStart + groupLines.length - 1;
      const mergedLines = lines.slice(mergedStart, mergedEnd + 1);
      chunks.push({
        text: mergedLines.join("\n"),
        lineStart: mergedStart,
        lineEnd: mergedEnd,
        language,
      });
    } else {
      chunks.push({
        text: groupLines.join("\n"),
        lineStart: groupStart,
        lineEnd: groupStart + groupLines.length - 1,
        language,
      });
    }
  }

  return chunks.length > 0 ? chunks : chunkBySlidingWindow(lines, language);
}

/**
 * Fallback: sliding window with overlap.
 */
function chunkBySlidingWindow(
  lines: string[],
  language: string
): CodeChunk[] {
  const chunks: CodeChunk[] = [];
  let start = 0;

  while (start < lines.length) {
    const end = Math.min(start + CHUNK_MAX_LINES - 1, lines.length - 1);
    const section = lines.slice(start, end + 1);

    if (section.join("").trim().length > 0) {
      chunks.push({
        text: section.join("\n"),
        lineStart: start,
        lineEnd: end,
        language,
      });
    }

    if (end >= lines.length - 1) {
      break;
    }

    start = end + 1 - CHUNK_OVERLAP_LINES;
    if (start <= 0) start = end + 1; // safety guard
  }

  return chunks;
}
