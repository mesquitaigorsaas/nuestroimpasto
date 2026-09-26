/**
 * Login com Google (OAuth 2.0 / OpenID Connect), sem bibliotecas extras.
 * Requer GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET (Google Cloud → APIs e serviços → Credenciais).
 * URI de redirecionamento autorizada: <site>/api/auth/google/callback
 */

export type GoogleProfile = { sub: string; email: string; emailVerified: boolean; name: string; picture: string | null };

export function googleEnabled() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export const callbackUrl = (origin: string) => `${origin}/api/auth/google/callback`;

export function googleAuthUrl(origin: string, state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: callbackUrl(origin),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/** Troca o código pelo token e busca o perfil (nome, e-mail, foto). */
export async function googleProfile(origin: string, code: string): Promise<GoogleProfile> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: callbackUrl(origin),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) throw new Error(`Google token: ${tokenRes.status}`);
  const { access_token } = (await tokenRes.json()) as { access_token: string };

  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!infoRes.ok) throw new Error(`Google userinfo: ${infoRes.status}`);
  const info = (await infoRes.json()) as { sub: string; email: string; email_verified: boolean; name?: string; picture?: string };
  return {
    sub: info.sub,
    email: info.email.toLowerCase(),
    emailVerified: !!info.email_verified,
    name: (info.name || info.email.split("@")[0]).slice(0, 60),
    // Foto maior que o padrão (96px) para ficar nítida no canal.
    picture: info.picture ? info.picture.replace(/=s\d+-c$/, "=s256-c") : null,
  };
}

/** Foto que veio do Google (e não um upload do próprio usuário). */
export const isGooglePicture = (key: string | null) => !!key && key.startsWith("https://lh3.googleusercontent.com/");
