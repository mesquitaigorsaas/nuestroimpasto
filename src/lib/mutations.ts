import { all, get, newId, run } from "./db";
import { parseJson } from "./format";

/* ------------------------------------------------------------------ */
/* Notificações                                                        */
/* ------------------------------------------------------------------ */

type NotifyInput = {
  userId: string;
  actorId?: string | null;
  type: "follow" | "comment" | "reply" | "like" | "video_response" | "new_video" | "mention" | "verification" | "admin";
  videoId?: string | null;
  commentId?: string | null;
  text?: string;
};

export async function notify(n: NotifyInput) {
  if (n.actorId && n.actorId === n.userId) return; // ninguém é notificado das próprias ações
  // Curtidas repetidas no mesmo vídeo não geram notificações duplicadas.
  if (n.type === "like" && n.videoId) {
    const exists = await get(
      "SELECT 1 FROM notifications WHERE user_id = ? AND actor_id = ? AND type = 'like' AND video_id = ?",
      n.userId,
      n.actorId,
      n.videoId,
    );
    if (exists) return;
  }
  await run(
    `INSERT INTO notifications (id, user_id, actor_id, type, video_id, comment_id, text) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    newId(),
    n.userId,
    n.actorId ?? null,
    n.type,
    n.videoId ?? null,
    n.commentId ?? null,
    n.text ?? "",
  );
}

/** Notifica usuários mencionados com @handle em um texto. */
export async function notifyMentions(body: string, actorId: string, videoId: string, commentId: string) {
  const handles = [...new Set([...body.matchAll(/@([a-z0-9._]{3,30})/gi)].map((m) => m[1].toLowerCase()))].slice(0, 10);
  for (const handle of handles) {
    const user = await get<{ id: string }>("SELECT id FROM users WHERE lower(handle) = lower(?)", handle);
    if (user) await notify({ userId: user.id, actorId, type: "mention", videoId, commentId });
  }
}

/* ------------------------------------------------------------------ */
/* Índice de busca (FTS5)                                              */
/* ------------------------------------------------------------------ */

export async function indexVideo(videoId: string) {
  const v = await get<{ id: string; title: string; description: string; tags: string; tech: string; channel: string }>(
    `SELECT v.id, v.title, v.description, v.tags, v.tech, u.name || ' ' || u.handle AS channel
     FROM videos v JOIN users u ON u.id = v.user_id WHERE v.id = ?`,
    videoId,
  );
  await run("DELETE FROM videos_fts WHERE id = ?", videoId);
  if (!v) return;
  const tech = Object.values(parseJson<Record<string, string>>(v.tech, {})).join(" ");
  await run(
    "INSERT INTO videos_fts (id, title, description, tags, tech, channel) VALUES (?, ?, ?, ?, ?, ?)",
    v.id,
    v.title,
    v.description,
    v.tags.replace(/,/g, " "),
    tech,
    v.channel,
  );
}

export async function reindexChannel(userId: string) {
  for (const { id } of await all<{ id: string }>("SELECT id FROM videos WHERE user_id = ?", userId)) await indexVideo(id);
}

/* ------------------------------------------------------------------ */
/* Auditoria administrativa                                            */
/* ------------------------------------------------------------------ */

export async function logAdminAction(adminId: string, action: string, targetType: string, targetId: string, note = "") {
  await run(
    "INSERT INTO admin_actions (id, admin_id, action, target_type, target_id, note) VALUES (?, ?, ?, ?, ?, ?)",
    newId(),
    adminId,
    action,
    targetType,
    targetId,
    note,
  );
}
