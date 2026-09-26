import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { googleAuthUrl, googleEnabled } from "@/lib/google";

/** Início do login com Google: guarda um "state" anti-falsificação e manda o usuário para o Google. */
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  if (!googleEnabled()) return NextResponse.redirect(`${origin}/login?erro=google`);

  const next = req.nextUrl.searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const state = randomBytes(24).toString("base64url");

  const res = NextResponse.redirect(googleAuthUrl(origin, state));
  res.cookies.set("g_oauth", JSON.stringify({ state, next: safeNext }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}
