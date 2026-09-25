"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { get, run, transaction } from "@/lib/db";
import { notify } from "@/lib/mutations";

type ToggleResult = { ok: boolean; active: boolean; count?: number; error?: string };

async function activeUser() {
  const user = await getCurrentUser();
  if (!user) return { error: "Entre na sua conta para continuar." } as const;
  if (user.status !== "active") return { error: "Sua conta está suspensa. Interações estão desativadas." } as const;
  return { user } as const;
}

export async function toggleFollowAction(channelId: string): Promise<ToggleResult> {
  const r = await activeUser();
  if ("error" in r) return { ok: false, active: false, error: r.error };
  const me = r.user;
  if (me.id === channelId) return { ok: false, active: false, error: "Você não pode seguir a si mesmo." };
  const target = get<{ id: string }>("SELECT id FROM users WHERE id = ? AND status <> 'banned'", channelId);
  if (!target) return { ok: false, active: false, error: "Canal não encontrado." };

  const active = transaction(() => {
    const exists = get("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?", me.id, channelId);
    if (exists) {
      run("DELETE FROM follows WHERE follower_id = ? AND following_id = ?", me.id, channelId);
      run("UPDATE users SET followers_count = MAX(0, followers_count - 1) WHERE id = ?", channelId);
      run("UPDATE users SET following_count = MAX(0, following_count - 1) WHERE id = ?", me.id);
      return false;
    }
    run("INSERT INTO follows (follower_id, following_id) VALUES (?, ?)", me.id, channelId);
    run("UPDATE users SET followers_count = followers_count + 1 WHERE id = ?", channelId);
    run("UPDATE users SET following_count = following_count + 1 WHERE id = ?", me.id);
    notify({ userId: channelId, actorId: me.id, type: "follow" });
    return true;
  });
  const count = get<{ n: number }>("SELECT followers_count AS n FROM users WHERE id = ?", channelId)?.n ?? 0;
  revalidatePath("/", "layout");
  return { ok: true, active, count };
}

export async function toggleLikeAction(videoId: string): Promise<ToggleResult> {
  const r = await activeUser();
  if ("error" in r) return { ok: false, active: false, error: r.error };
  const me = r.user;
  const video = get<{ id: string; user_id: string }>("SELECT id, user_id FROM videos WHERE id = ? AND status = 'published'", videoId);
  if (!video) return { ok: false, active: false, error: "Vídeo não encontrado." };

  const active = transaction(() => {
    if (get("SELECT 1 FROM likes WHERE user_id = ? AND video_id = ?", me.id, videoId)) {
      run("DELETE FROM likes WHERE user_id = ? AND video_id = ?", me.id, videoId);
      run("UPDATE videos SET likes = MAX(0, likes - 1) WHERE id = ?", videoId);
      return false;
    }
    run("INSERT INTO likes (user_id, video_id) VALUES (?, ?)", me.id, videoId);
    run("UPDATE videos SET likes = likes + 1 WHERE id = ?", videoId);
    notify({ userId: video.user_id, actorId: me.id, type: "like", videoId });
    return true;
  });
  const count = get<{ n: number }>("SELECT likes AS n FROM videos WHERE id = ?", videoId)?.n ?? 0;
  return { ok: true, active, count };
}

export async function toggleSaveAction(videoId: string): Promise<ToggleResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, active: false, error: "Entre na sua conta para salvar vídeos." };
  if (get("SELECT 1 FROM saves WHERE user_id = ? AND video_id = ?", user.id, videoId)) {
    run("DELETE FROM saves WHERE user_id = ? AND video_id = ?", user.id, videoId);
    revalidatePath("/feed/saved");
    return { ok: true, active: false };
  }
  if (!get("SELECT 1 FROM videos WHERE id = ?", videoId)) return { ok: false, active: false, error: "Vídeo não encontrado." };
  run("INSERT INTO saves (user_id, video_id) VALUES (?, ?)", user.id, videoId);
  revalidatePath("/feed/saved");
  return { ok: true, active: true };
}

export async function toggleCommentLikeAction(commentId: string): Promise<ToggleResult> {
  const r = await activeUser();
  if ("error" in r) return { ok: false, active: false, error: r.error };
  const me = r.user;
  const active = transaction(() => {
    if (get("SELECT 1 FROM comment_likes WHERE user_id = ? AND comment_id = ?", me.id, commentId)) {
      run("DELETE FROM comment_likes WHERE user_id = ? AND comment_id = ?", me.id, commentId);
      run("UPDATE comments SET likes = MAX(0, likes - 1) WHERE id = ?", commentId);
      return false;
    }
    run("INSERT INTO comment_likes (user_id, comment_id) VALUES (?, ?)", me.id, commentId);
    run("UPDATE comments SET likes = likes + 1 WHERE id = ?", commentId);
    return true;
  });
  const count = get<{ n: number }>("SELECT likes AS n FROM comments WHERE id = ?", commentId)?.n ?? 0;
  return { ok: true, active, count };
}

export async function clearHistoryAction() {
  const user = await getCurrentUser();
  if (!user) return;
  run("DELETE FROM history WHERE user_id = ?", user.id);
  revalidatePath("/feed/history");
}

export async function removeFromHistoryAction(videoId: string) {
  const user = await getCurrentUser();
  if (!user) return;
  run("DELETE FROM history WHERE user_id = ? AND video_id = ?", user.id, videoId);
  revalidatePath("/feed/history");
}

export async function markNotificationsReadAction() {
  const user = await getCurrentUser();
  if (!user) return;
  run("UPDATE notifications SET read_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE user_id = ? AND read_at IS NULL", user.id);
  revalidatePath("/", "layout");
}
