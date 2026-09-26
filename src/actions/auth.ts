"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { get, newId, run } from "@/lib/db";
import { slugifyHandle } from "@/lib/format";
import type { ActionState } from "@/lib/types";

import { RESERVED_HANDLES as RESERVED } from "@/lib/constants";

function safeNext(next: FormDataEntryValue | null) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/";
}

export async function signupAction(_: ActionState, form: FormData): Promise<ActionState> {
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const handle = slugifyHandle(String(form.get("handle") ?? "") || name);

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2 || name.length > 60) fieldErrors.name = "Informe seu nome (2 a 60 caracteres).";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "E-mail inválido.";
  if (password.length < 8) fieldErrors.password = "A senha precisa ter pelo menos 8 caracteres.";
  if (handle.length < 3) fieldErrors.handle = "O @ precisa ter pelo menos 3 caracteres (letras, números, ponto ou _).";
  else if (RESERVED.has(handle)) fieldErrors.handle = "Esse @ é reservado. Escolha outro.";

  if (!fieldErrors.email && await get("SELECT 1 FROM users WHERE email = ?", email)) fieldErrors.email = "Já existe uma conta com esse e-mail.";
  if (!fieldErrors.handle && await get("SELECT 1 FROM users WHERE lower(handle) = lower(?)", handle))
    fieldErrors.handle = "Esse @ já está em uso.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const id = newId();
  await run(
    "INSERT INTO users (id, email, password_hash, name, handle) VALUES (?, ?, ?, ?, ?)",
    id,
    email,
    hashPassword(password),
    name,
    handle,
  );
  await createSession(id);
  const next = safeNext(form.get("next"));
  redirect(next === "/" ? "/welcome" : next);
}

export async function loginAction(_: ActionState, form: FormData): Promise<ActionState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = await get<{ id: string; password_hash: string; status: string }>(
    "SELECT id, password_hash, status FROM users WHERE email = ?",
    email,
  );
  if (!user || !verifyPassword(password, user.password_hash)) return { error: "E-mail ou senha incorretos." };
  if (user.status === "banned") return { error: "Esta conta foi banida por violar as diretrizes da comunidade." };
  await createSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
