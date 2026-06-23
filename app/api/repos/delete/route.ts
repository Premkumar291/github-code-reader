/**
 * app/api/repos/delete/route.ts
 * DELETE /api/repos/delete
 * Removes a repo from Neon and deletes its vectors from Pinecone.
 */
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyJWT, TOKEN_COOKIE_NAME } from "@/lib/auth";
import { query } from "@/lib/db";
import { deleteVectorsByRepoId } from "@/lib/pinecone";

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const repoId = parseInt(searchParams.get("id") ?? "");
    if (!repoId || isNaN(repoId)) {
      return Response.json({ error: "repo id is required" }, { status: 400 });
    }

    // Verify ownership
    const repos = await query<{ id: number }>(
      "SELECT id FROM repos WHERE id = $1 AND user_id = $2",
      [repoId, payload.id]
    );

    if (repos.length === 0) {
      return Response.json({ error: "Repo not found" }, { status: 404 });
    }

    // Delete from Pinecone (fire and forget errors — best effort)
    try {
      await deleteVectorsByRepoId(repoId);
    } catch (err) {
      console.error("Pinecone delete error (non-fatal):", err);
    }

    // Delete from Neon (cascades to chat_sessions and chat_messages)
    await query("DELETE FROM repos WHERE id = $1 AND user_id = $2", [
      repoId,
      payload.id,
    ]);

    return Response.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/repos/delete]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
