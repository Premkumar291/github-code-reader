/**
 * lib/github.ts
 * Fetches repository file contents using the GitHub REST API (Octokit).
 * No git clone required — fully serverless compatible.
 *
 * Strategy:
 * 1. Get the default branch SHA via GET /repos/{owner}/{repo}
 * 2. Walk the full file tree recursively via GET /git/trees/{sha}?recursive=1
 * 3. Filter files by supported extensions and size (skip huge files)
 * 4. Fetch each file's content via GET /git/blobs/{sha} (base64 decoded)
 *
 * Cost controls:
 * - Max 400 files per repo (configurable via MAX_FILES_PER_REPO)
 * - Skip files > 100KB
 * - Only index supported file types
 */
import { Octokit } from "@octokit/rest";

const MAX_FILES_PER_REPO = 400;
const MAX_FILE_SIZE_BYTES = 100_000; // 100KB

const SUPPORTED_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".go", ".rs", ".java", ".cs", ".cpp", ".c", ".h",
  ".rb", ".php", ".swift", ".kt", ".scala",
  ".md", ".mdx",
  ".json", ".yaml", ".yml", ".toml",
]);

const SKIP_DIRECTORIES = new Set([
  "node_modules", ".git", "dist", "build", "out", ".next",
  "vendor", "__pycache__", ".pytest_cache", "coverage",
  ".turbo", ".vercel", "target", "bin", "obj",
]);

export interface RepoFile {
  path: string;
  content: string;
  language: string;
  sizeBytes: number;
}

export interface ParsedGithubUrl {
  owner: string;
  repo: string;
}

/**
 * Parses a GitHub URL into owner and repo.
 * Supports: https://github.com/owner/repo and github.com/owner/repo
 */
export function parseGithubUrl(url: string): ParsedGithubUrl {
  const cleaned = url
    .replace(/^https?:\/\//, "")
    .replace(/^github\.com\//, "")
    .replace(/\.git$/, "")
    .split("?")[0]
    .split("#")[0]
    .trim();

  const parts = cleaned.split("/");
  if (parts.length < 2) {
    throw new Error(
      "Invalid GitHub URL. Expected format: https://github.com/owner/repo"
    );
  }

  return { owner: parts[0], repo: parts[1] };
}

/**
 * Fetches all indexable files from a GitHub repo.
 * Returns up to MAX_FILES_PER_REPO files with their content decoded.
 */
export async function fetchRepoFiles(
  owner: string,
  repo: string,
  onProgress?: (current: number, total: number) => void
): Promise<RepoFile[]> {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
    userAgent: "codebase-assistant/1.0",
  });

  // 1. Get default branch SHA
  const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
  const defaultBranch = repoData.default_branch;

  const { data: branchData } = await octokit.rest.repos.getBranch({
    owner,
    repo,
    branch: defaultBranch,
  });
  const treeSha = branchData.commit.commit.tree.sha;

  // 2. Walk entire tree recursively
  const { data: treeData } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: treeSha,
    recursive: "1",
  });

  // 3. Filter files
  const eligibleFiles = (treeData.tree ?? []).filter((item) => {
    if (item.type !== "blob") return false;
    if (!item.path) return false;
    if (item.size && item.size > MAX_FILE_SIZE_BYTES) return false;

    // Check for skipped directories
    const pathParts = item.path.split("/");
    if (pathParts.some((part) => SKIP_DIRECTORIES.has(part))) return false;

    // Check extension
    const ext = getExtension(item.path);
    return SUPPORTED_EXTENSIONS.has(ext);
  });

  // Sort by size ascending (smaller files first = cheaper to embed)
  const sortedFiles = eligibleFiles
    .sort((a, b) => (a.size ?? 0) - (b.size ?? 0))
    .slice(0, MAX_FILES_PER_REPO);

  // 4. Fetch file contents
  const result: RepoFile[] = [];
  const total = sortedFiles.length;
  let processed = 0;

  const BATCH_SIZE = 10;
  for (let i = 0; i < sortedFiles.length; i += BATCH_SIZE) {
    const batch = sortedFiles.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (file) => {
        if (!file.sha || !file.path) {
          processed++;
          return;
        }

        try {
          const { data: blobData } = await octokit.rest.git.getBlob({
            owner,
            repo,
            file_sha: file.sha,
          });

          const content = Buffer.from(blobData.content, "base64").toString("utf-8");

          if (!isBinaryContent(content)) {
            result.push({
              path: file.path,
              content,
              language: detectLanguage(file.path),
              sizeBytes: file.size ?? content.length,
            });
          }
        } catch {
          // Skip files that can't be fetched
        } finally {
          processed++;
          onProgress?.(processed, total);
        }
      })
    );
  }

  return result;
}

function getExtension(filePath: string): string {
  const dot = filePath.lastIndexOf(".");
  if (dot === -1) return "";
  return filePath.slice(dot).toLowerCase();
}

function detectLanguage(filePath: string): string {
  const ext = getExtension(filePath);
  const MAP: Record<string, string> = {
    ".ts": "typescript", ".tsx": "typescript",
    ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript", ".cjs": "javascript",
    ".py": "python",
    ".go": "go",
    ".rs": "rust",
    ".java": "java",
    ".cs": "csharp",
    ".cpp": "cpp", ".c": "c", ".h": "c",
    ".rb": "ruby",
    ".php": "php",
    ".swift": "swift",
    ".kt": "kotlin",
    ".scala": "scala",
    ".md": "markdown", ".mdx": "markdown",
    ".json": "json",
    ".yaml": "yaml", ".yml": "yaml",
    ".toml": "toml",
  };
  return MAP[ext] ?? "text";
}

function isBinaryContent(content: string): boolean {
  // Check for null bytes (common in binary files)
  if (content.includes("\x00")) return true;
  // Check if too many non-printable chars
  let nonPrintable = 0;
  const sample = content.slice(0, 512);
  for (const char of sample) {
    const code = char.charCodeAt(0);
    if (code < 9 || (code > 13 && code < 32)) nonPrintable++;
  }
  return nonPrintable / sample.length > 0.1;
}
