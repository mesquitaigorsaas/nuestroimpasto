/** Funções puras de formatação — podem rodar no servidor e no navegador. */

/** URL pública de um arquivo armazenado (ou null). */
export function mediaUrl(key: string | null | undefined) {
  if (!key) return null;
  if (key.startsWith("http") || key.startsWith("/")) return key;
  if (key.startsWith("private/")) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${key}`;
}

export function compactNumber(n: number) {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${trim(n / 1000)} mil`;
  if (n < 1_000_000_000) return `${trim(n / 1_000_000)} mi`;
  return `${trim(n / 1_000_000_000)} bi`;
}

function trim(v: number) {
  const s = v >= 10 ? Math.floor(v).toString() : (Math.floor(v * 10) / 10).toString();
  return s.replace(".", ",");
}

export function viewsLabel(n: number) {
  if (n === 0) return "Nenhuma visualização";
  if (n === 1) return "1 visualização";
  return `${compactNumber(n)} visualizações`;
}

export function followersLabel(n: number) {
  return `${compactNumber(n)} ${n === 1 ? "seguidor" : "seguidores"}`;
}

export function timeAgo(iso: string) {
  const diff = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  const units: [number, string, string][] = [
    [31536000, "ano", "anos"],
    [2592000, "mês", "meses"],
    [604800, "semana", "semanas"],
    [86400, "dia", "dias"],
    [3600, "hora", "horas"],
    [60, "minuto", "minutos"],
  ];
  for (const [secs, one, many] of units) {
    const v = Math.floor(diff / secs);
    if (v >= 1) return `há ${v} ${v === 1 ? one : many}`;
  }
  return "agora mesmo";
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDuration(total: number) {
  const s = Math.max(0, Math.round(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Cor estável por nome, dentro da paleta da marca (para avatares sem foto). */
export function avatarColor(seed: string) {
  const palette = ["#1E262C", "#C79563", "#3A4A55", "#8A6A48", "#148448", "#5B4636", "#2F5D62", "#A0522D"];
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
}

export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function slugifyHandle(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, "")
    .slice(0, 30);
}

/** Transforma URLs e quebras de linha do texto em partes renderizáveis (sem HTML bruto). */
export function linkify(text: string) {
  const parts: { type: "text" | "link"; value: string }[] = [];
  const re = /(https?:\/\/[^\s]+)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) parts.push({ type: "text", value: text.slice(last, m.index) });
    parts.push({ type: "link", value: m[0] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}
