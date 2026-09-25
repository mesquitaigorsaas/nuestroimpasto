"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canPublish, getCurrentUser } from "@/lib/auth";
import { CATEGORIES, TECH_FIELDS, type TechInfo } from "@/lib/constants";
import { all, get, newId, run, transaction } from "@/lib/db";
import { indexVideo, notify } from "@/lib/mutations";
import { storage } from "@/lib/storage";
import type { ActionState } from "@/lib/types";

function readTech(form: FormData): TechInfo {
  const tech: TechInfo = {};
  for (const f of TECH_FIELDS) {
    const v = String(form.get(`tech_${f.key}`) ?? "").trim().slice(0, 300);
    if (v) tech[f.key] = v;
  }
  return tech;
}

function readTags(raw: string) {
  return [...new Set(raw.split(/[,#\n]/).map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 15).join(", ");
}

function validateCommon(form: FormData) {
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const category = String(form.get("category") ?? "");
  const visibility = form.get("visibility") === "unlisted" ? "unlisted" : "public";
  const fieldErrors: Record<string, string> = {};
  if (title.length < 3 || title.length > 100) fieldErrors.title = "O título precisa ter entre 3 e 100 caracteres.";
  if (description.length > 5000) fieldErrors.description = "A descrição pode ter até 5.000 caracteres.";
  if (!CATEGORIES.some((c) => c.slug === category)) fieldErrors.category = "Escolha uma categoria.";
  return { title, description, category, visibility, tags: readTags(String(form.get("tags") ?? "")), tech: readTech(form), fieldErrors };
}

export async function createVideoAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Entre na sua conta." };
  if (!canPublish(user)) return { error: "Somente estudantes e profissionais verificados podem publicar." };

  const { title, description, category, visibility, tags, tech, fieldErrors } = validateCommon(form);
  const videoKey = String(form.get("video_key") ?? "");
  const thumbKey = String(form.get("thumb_key") ?? "") || null;
  const duration = Math.max(0, Math.round(Number(form.get("duration") ?? 0)) || 0);
  const parentId = String(form.get("parent_id") ?? "") || null;

  if (!videoKey.startsWith("videos/") || !(await storage.exists(videoKey))) fieldErrors.video = "Envie o arquivo de vídeo antes de publicar.";
  else if (await get("SELECT 1 FROM videos WHERE video_key = ?", videoKey)) fieldErrors.video = "Este arquivo já foi publicado.";
  if (thumbKey && (!thumbKey.startsWith("thumbs/") || !(await storage.exists(thumbKey)))) fieldErrors.thumb = "Miniatura inválida.";

  let parent: { id: string; user_id: string; title: string } | undefined;
  if (parentId) {
    parent = await get("SELECT id, user_id, title FROM videos WHERE id = ? AND status = 'published'", parentId);
    if (!parent) fieldErrors.parent = "O vídeo original não está mais disponível.";
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors, error: "Revise os campos destacados." };

  const id = newId();
  await transaction(async () => {
    await run(
      `INSERT INTO videos (id, user_id, title, description, category, tags, video_key, thumb_key, duration, tech, parent_id, visibility)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      user.id,
      title,
      description,
      category,
      tags,
      videoKey,
      thumbKey,
      duration,
      JSON.stringify(tech),
      parent?.id ?? null,
      visibility,
    );
    await indexVideo(id);

    if (parent) {
      await run("UPDATE videos SET responses_count = responses_count + 1 WHERE id = ?", parent.id);
      await notify({ userId: parent.user_id, actorId: user.id, type: "video_response", videoId: id, text: parent.title });
    }
    if (visibility === "public") {
      for (const f of await all<{ follower_id: string }>("SELECT follower_id FROM follows WHERE following_id = ?", user.id)) {
        await notify({ userId: f.follower_id, actorId: user.id, type: "new_video", videoId: id });
      }
    }
  });

  revalidatePath("/", "layout");
  redirect(`/watch/${id}?published=1`);
}

async function ownVideo(videoId: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  const video = await get<{ id: string; user_id: string; video_key: string | null; thumb_key: string | null; parent_id: string | null }>(
    "SELECT id, user_id, video_key, thumb_key, parent_id FROM videos WHERE id = ?",
    videoId,
  );
  if (!video || (video.user_id !== user.id && user.role !== "admin")) return null;
  return { user, video };
}

export async function updateVideoAction(_: ActionState, form: FormData): Promise<ActionState> {
  const videoId = String(form.get("id") ?? "");
  const owned = await ownVideo(videoId);
  if (!owned) return { error: "Você não pode editar este vídeo." };

  const { title, description, category, visibility, tags, tech, fieldErrors } = validateCommon(form);
  const thumbKey = String(form.get("thumb_key") ?? "") || null;
  if (thumbKey && thumbKey !== owned.video.thumb_key && (!thumbKey.startsWith("thumbs/") || !(await storage.exists(thumbKey))))
    fieldErrors.thumb = "Miniatura inválida.";
  if (Object.keys(fieldErrors).length) return { fieldErrors, error: "Revise os campos destacados." };

  await run(
    `UPDATE videos SET title = ?, description = ?, category = ?, tags = ?, tech = ?, visibility = ?, thumb_key = COALESCE(?, thumb_key) WHERE id = ?`,
    title,
    description,
    category,
    tags,
    JSON.stringify(tech),
    visibility,
    thumbKey,
    videoId,
  );
  if (thumbKey && owned.video.thumb_key && thumbKey !== owned.video.thumb_key) void storage.remove(owned.video.thumb_key);
  await indexVideo(videoId);
  revalidatePath(`/watch/${videoId}`);
  revalidatePath("/studio");
  return { ok: true, message: "Alterações salvas." };
}

export async function deleteVideoAction(videoId: string) {
  const owned = await ownVideo(videoId);
  if (!owned) return { error: "Você não pode excluir este vídeo." };
  await transaction(async () => {
    if (owned.video.parent_id) await run("UPDATE videos SET responses_count = GREATEST(0, responses_count - 1) WHERE id = ?", owned.video.parent_id);
    await run("DELETE FROM videos_fts WHERE id = ?", videoId);
    await run("DELETE FROM videos WHERE id = ?", videoId);
  });
  if (owned.video.video_key) void storage.remove(owned.video.video_key);
  if (owned.video.thumb_key) void storage.remove(owned.video.thumb_key);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Conta visualização e registra no histórico. O cliente chama uma vez por sessão por vídeo. */
export async function recordViewAction(videoId: string) {
  const video = await get<{ id: string }>("SELECT id FROM videos WHERE id = ? AND status = 'published'", videoId);
  if (!video) return;
  await run("UPDATE videos SET views = views + 1 WHERE id = ?", videoId);
  const user = await getCurrentUser();
  if (user) {
    await run(
      `INSERT INTO history (user_id, video_id) VALUES (?, ?)
       ON CONFLICT (user_id, video_id) DO UPDATE SET watched_at = now_iso()`,
      user.id,
      videoId,
    );
  }
}
