import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { get, run } from "./db";
import { isPublisherType } from "./constants";
import type { User } from "./types";

const SESSION_COOKIE = "ni_session";
const SESSION_DAYS = 30;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(expected, actual);
}

/** Guardamos só o hash do token no banco: um vazamento do banco não expõe sessões. */
function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await run("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)", tokenHash(token), userId, expires.toISOString());
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await run("DELETE FROM sessions WHERE id = ?", tokenHash(token));
  jar.delete(SESSION_COOKIE);
}

const USER_COLUMNS = `u.id, u.email, u.name, u.handle, u.avatar_key, u.banner_key, u.bio, u.specialty, u.location,
  u.website, u.instagram, u.role, u.member_type, u.verification_status, u.status, u.followers_count,
  u.following_count, u.created_at`;

/** Usuário logado (ou null). Memorizado por requisição. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const user = await get<User & { expires_at: string }>(
    `SELECT ${USER_COLUMNS}, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`,
    tokenHash(token),
  );
  if (!user || new Date(user.expires_at) < new Date() || user.status === "banned") return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { expires_at, ...rest } = user;
  return rest;
});

export async function requireUser(next = "/") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (user.role !== "admin") redirect("/");
  return user;
}

/** Só estudantes/profissionais verificados publicam. */
export function canPublish(user: Pick<User, "verification_status" | "member_type" | "status"> | null) {
  return (
    !!user &&
    user.status === "active" &&
    user.verification_status === "verified" &&
    isPublisherType(user.member_type)
  );
}

export function isVerified(user: Pick<User, "member_type"> | null | undefined) {
  return isPublisherType(user?.member_type);
}
