import { get, run } from "./db";

/** Configurações administrativas (chave/valor). */
export const SETTINGS = {
  /** Aprovar automaticamente solicitações de alta confiança sem sinais de risco. */
  verificationAutoApprove: { key: "verification.auto_approve", default: "false" },
  /** Publicidade da página inicial (faixa 1063 × 139 abaixo dos filtros). */
  homeAdImage: { key: "ads.home.image", default: "" },
  /** Versão para celular (proporção 32:10). Vazia = usa a imagem de computador. */
  homeAdImageMobile: { key: "ads.home.image_mobile", default: "" },
  homeAdLink: { key: "ads.home.link", default: "" },
  homeAdAlt: { key: "ads.home.alt", default: "Patrocinador" },
  homeAdActive: { key: "ads.home.active", default: "false" },
  /** Link do "Anuncie aqui" quando não há anúncio ativo (WhatsApp, e-mail, página…). */
  homeAdContact: { key: "ads.home.contact", default: "" },
} as const;

export async function getSetting(s: (typeof SETTINGS)[keyof typeof SETTINGS]) {
  return (await get<{ value: string }>("SELECT value FROM settings WHERE key = ?", s.key))?.value ?? s.default;
}

export async function setSetting(s: (typeof SETTINGS)[keyof typeof SETTINGS], value: string) {
  await run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", s.key, value);
}

export type HomeAd = { image: string; imageMobile: string; link: string; alt: string; active: boolean; contact: string };

/** Publicidade da página inicial, num só lugar (usada na home e no painel). */
export async function getHomeAd(): Promise<HomeAd> {
  const [image, imageMobile, link, alt, active, contact] = await Promise.all([
    getSetting(SETTINGS.homeAdImage),
    getSetting(SETTINGS.homeAdImageMobile),
    getSetting(SETTINGS.homeAdLink),
    getSetting(SETTINGS.homeAdAlt),
    getSetting(SETTINGS.homeAdActive),
    getSetting(SETTINGS.homeAdContact),
  ]);
  return { image, imageMobile, link, alt, active: active === "true", contact };
}
