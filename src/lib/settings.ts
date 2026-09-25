import { get, run } from "./db";

/** Configurações administrativas (chave/valor). */
export const SETTINGS = {
  /** Aprovar automaticamente solicitações de alta confiança sem sinais de risco. */
  verificationAutoApprove: { key: "verification.auto_approve", default: "false" },
} as const;

export function getSetting(s: (typeof SETTINGS)[keyof typeof SETTINGS]) {
  return get<{ value: string }>("SELECT value FROM settings WHERE key = ?", s.key)?.value ?? s.default;
}

export function setSetting(s: (typeof SETTINGS)[keyof typeof SETTINGS], value: string) {
  run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", s.key, value);
}
