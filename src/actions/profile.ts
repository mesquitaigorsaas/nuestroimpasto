"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { run } from "@/lib/db";
import { reindexChannel } from "@/lib/mutations";
import { storage } from "@/lib/storage";
import type { ActionState } from "@/lib/types";

function clean(form: FormData, key: string, max: number) {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

export async function updateProfileAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Entre na sua conta." };

  const name = clean(form, "name", 60);
  const bio = clean(form, "bio", 1000);
  const specialty = clean(form, "specialty", 80);
  const location = clean(form, "location", 80);
  const website = clean(form, "website", 200);
  const instagram = clean(form, "instagram", 60).replace(/^@/, "");
  const avatarKey = String(form.get("avatar_key") ?? "") || null;
  const bannerKey = String(form.get("banner_key") ?? "") || null;

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Informe seu nome.";
  if (website && !/^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(website)) fieldErrors.website = "Site inválido.";
  if (avatarKey && (!avatarKey.startsWith("avatars/") || !(await storage.exists(avatarKey)))) fieldErrors.avatar = "Foto inválida.";
  if (bannerKey && (!bannerKey.startsWith("banners/") || !(await storage.exists(bannerKey)))) fieldErrors.banner = "Capa inválida.";
  if (Object.keys(fieldErrors).length) return { fieldErrors, error: "Revise os campos destacados." };

  await run(
    `UPDATE users SET name = ?, bio = ?, specialty = ?, location = ?, website = ?, instagram = ?,
       avatar_key = COALESCE(?, avatar_key), banner_key = COALESCE(?, banner_key) WHERE id = ?`,
    name,
    bio,
    specialty,
    location,
    website,
    instagram,
    avatarKey,
    bannerKey,
    user.id,
  );
  if (avatarKey && user.avatar_key && user.avatar_key !== avatarKey) void storage.remove(user.avatar_key);
  if (bannerKey && user.banner_key && user.banner_key !== bannerKey) void storage.remove(user.banner_key);
  if (name !== user.name) await reindexChannel(user.id);

  revalidatePath("/", "layout");
  return { ok: true, message: "Canal atualizado." };
}
