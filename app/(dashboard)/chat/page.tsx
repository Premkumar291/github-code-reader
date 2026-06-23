/**
 * app/(dashboard)/chat/page.tsx
 * Chat page — loads repos from DB and renders the ChatWindow client component.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyJWT, TOKEN_COOKIE_NAME } from "@/lib/auth";
import { query } from "@/lib/db";
import ChatWindow from "@/components/ChatWindow";

export const metadata = {
  title: "Chat",
};

interface Repo {
  id: number;
  repo_name: string;
  owner: string;
  github_url: string;
  status: string;
}

export default async function ChatPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
  if (!token) redirect("/login");

  const payload = await verifyJWT(token);
  if (!payload) redirect("/login");

  const repos = await query<Repo>(
    "SELECT id, repo_name, owner, github_url, status FROM repos WHERE user_id = $1 AND status = 'ready' ORDER BY indexed_at DESC",
    [payload.id]
  );

  return <ChatWindow repos={repos} />;
}
