import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { createSession } from "@/lib/auth";
import { RESERVED_HANDLES } from "@/lib/constants";
import { get, newId, run } from "@/lib/db";
import { slugifyHandle } from "@/lib/format";
import { googleProfile, isGooglePicture } from "@/lib/google";

type Existing = { id: string; status: string; avatar_key: string | null; google_sub: string | null };

/** @ livre a partir do nome (ou do e-mail): renilton.ferreira, renilton.ferreira2… */
async function freeHandle(name: string, email: string) {
  let base = slugifyHandle(name) || slugifyHandle(email.split("@")[0]);
  if (base.length < 3) base = `${base}membro`.slice(0, 20);
  base = base.slice(0, 26);
  for (let i = 0; i < 50; i++) {
    const handle = i === 0 ? base : `${base}${i + 1}`;
    if (RESERVED_HANDLES.has(handle)) continue;
    if (!(await get("SELECT 1 FROM users WHERE lower(handle) = lower(?)", handle))) return handle;
  }
  return `${base.slice(0, 20)}${randomBytes(3).toString("hex")}`;
}

/** Retorno do Google: entra na conta existente (pelo Google ou pelo mesmo e-mail) ou cria uma nova. */
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const fail = (motivo = "google") => {
    const res = NextResponse.redirect(`${origin}/login?erro=${motivo}`);
    res.cookies.delete("g_oauth");
    return res;
  };

  let saved: { state?: string; next?: string } = {};
  try {
    saved = JSON.parse(req.cookies.get("g_oauth")?.value ?? "{}");
  } catch {
    /* cookie inválido */
  }
  const code = req.nextUrl.searchParams.get("code");
  if (!code || !saved.state || saved.state !== req.nextUrl.searchParams.get("state")) return fail();

  let profile;
  try {
    profile = await googleProfile(origin, code);
  } catch (err) {
    console.error("[google] falha no login", err);
    return fail();
  }
  if (!profile.emailVerified) return fail();

  let user =
    (await get<Existing>("SELECT id, status, avatar_key, google_sub FROM users WHERE google_sub = ?", profile.sub)) ??
    (await get<Existing>("SELECT id, status, avatar_key, google_sub FROM users WHERE email = ?", profile.email));
  let isNew = false;

  if (user) {
    if (user.status === "banned") return fail("banido");
    // Liga a conta ao Google e usa a foto do Google enquanto a pessoa não tiver enviado a própria.
    const photo = !user.avatar_key || isGooglePicture(user.avatar_key) ? profile.picture : user.avatar_key;
    await run("UPDATE users SET google_sub = ?, avatar_key = ? WHERE id = ?", profile.sub, photo, user.id);
  } else {
    isNew = true;
    const id = newId();
    await run(
      `INSERT INTO users (id, email, password_hash, name, handle, avatar_key, google_sub) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id,
      profile.email,
      // Conta sem senha: o formato não é "scrypt$…", então o login por senha nunca aceita.
      `google$${randomBytes(16).toString("hex")}`,
      profile.name,
      await freeHandle(profile.name, profile.email),
      profile.picture,
      profile.sub,
    );
    user = { id, status: "active", avatar_key: profile.picture, google_sub: profile.sub };
  }

  await createSession(user.id);
  const next = saved.next && saved.next !== "/" ? saved.next : isNew ? "/welcome" : "/";
  const res = NextResponse.redirect(`${origin}${next}`);
  res.cookies.delete("g_oauth");
  return res;
}
