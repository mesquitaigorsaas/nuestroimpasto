"use server";

import { getCurrentUser } from "@/lib/auth";
import { REPORT_REASONS } from "@/lib/constants";
import { get, newId, run, transaction } from "@/lib/db";
import { notify, notifyMentions } from "@/lib/mutations";
import { commentReplies } from "@/lib/queries";
import type { CommentData } from "@/lib/types";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function addCommentAction(videoId: string, body: string, parentId: string | null): Promise<Result<CommentData>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Entre na sua conta para comentar." };
  if (user.status !== "active") return { ok: false, error: "Sua conta está suspensa." };

  const text = body.trim();
  if (text.length < 1) return { ok: false, error: "Escreva algo antes de enviar." };
  if (text.length > 2000) return { ok: false, error: "Comentários podem ter até 2.000 caracteres." };

  const video = await get<{ id: string; user_id: string }>("SELECT id, user_id FROM videos WHERE id = ? AND status = 'published'", videoId);
  if (!video) return { ok: false, error: "Vídeo indisponível." };

  let parent: { id: string; user_id: string; parent_id: string | null } | undefined;
  if (parentId) {
    parent = await get("SELECT id, user_id, parent_id FROM comments WHERE id = ? AND video_id = ?", parentId, videoId);
    if (!parent) return { ok: false, error: "Comentário original não encontrado." };
  }
  // Respostas ficam em um único nível (como no YouTube): responder uma resposta vai para o mesmo tópico.
  const threadId = parent ? (parent.parent_id ?? parent.id) : null;

  const id = newId();
  await transaction(async () => {
    await run("INSERT INTO comments (id, video_id, user_id, parent_id, body) VALUES (?, ?, ?, ?, ?)", id, videoId, user.id, threadId, text);
    await run("UPDATE videos SET comments_count = comments_count + 1 WHERE id = ?", videoId);
    if (threadId) await run("UPDATE comments SET replies_count = replies_count + 1 WHERE id = ?", threadId);

    if (parent) await notify({ userId: parent.user_id, actorId: user.id, type: "reply", videoId, commentId: id, text: text.slice(0, 140) });
    if (!parent || parent.user_id !== video.user_id)
      await notify({ userId: video.user_id, actorId: user.id, type: "comment", videoId, commentId: id, text: text.slice(0, 140) });
    await notifyMentions(text, user.id, videoId, id);
  });

  return {
    ok: true,
    data: {
      id,
      video_id: videoId,
      user_id: user.id,
      parent_id: threadId,
      body: text,
      status: "visible",
      likes: 0,
      replies_count: 0,
      created_at: new Date().toISOString(),
      author_name: user.name,
      author_handle: user.handle,
      author_avatar: user.avatar_key,
      author_member_type: user.member_type,
      liked_by_me: 0,
    },
  };
}

export async function loadRepliesAction(commentId: string): Promise<CommentData[]> {
  const user = await getCurrentUser();
  return await commentReplies(commentId, user?.id ?? null);
}

export async function deleteCommentAction(commentId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Entre na sua conta." };
  const c = await get<{ id: string; user_id: string; video_id: string; parent_id: string | null; replies_count: number; owner: string }>(
    `SELECT c.id, c.user_id, c.video_id, c.parent_id, c.replies_count, v.user_id AS owner
     FROM comments c JOIN videos v ON v.id = c.video_id WHERE c.id = ?`,
    commentId,
  );
  // Autor do comentário, dono do vídeo ou admin podem remover.
  if (!c || (c.user_id !== user.id && c.owner !== user.id && user.role !== "admin")) return { ok: false, error: "Sem permissão." };
  await transaction(async () => {
    await run("DELETE FROM comments WHERE id = ?", commentId);
    await run("UPDATE videos SET comments_count = GREATEST(0, comments_count - ?) WHERE id = ?", 1 + c.replies_count, c.video_id);
    if (c.parent_id) await run("UPDATE comments SET replies_count = GREATEST(0, replies_count - 1) WHERE id = ?", c.parent_id);
  });
  return { ok: true };
}

export async function reportAction(
  targetType: "video" | "comment" | "user",
  targetId: string,
  reason: string,
  details: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Entre na sua conta para denunciar." };
  if (!(reason in REPORT_REASONS)) return { ok: false, error: "Escolha um motivo." };
  const table = targetType === "video" ? "videos" : targetType === "comment" ? "comments" : "users";
  if (!await get(`SELECT 1 FROM ${table} WHERE id = ?`, targetId)) return { ok: false, error: "Conteúdo não encontrado." };
  if (await get("SELECT 1 FROM reports WHERE reporter_id = ? AND target_type = ? AND target_id = ? AND status = 'open'", user.id, targetType, targetId))
    return { ok: true }; // já denunciado por esta pessoa
  await run(
    "INSERT INTO reports (id, reporter_id, target_type, target_id, reason, details) VALUES (?, ?, ?, ?, ?, ?)",
    newId(),
    user.id,
    targetType,
    targetId,
    reason,
    details.trim().slice(0, 1000),
  );
  return { ok: true };
}
