import { getCurrentUser } from "@/lib/auth";
import { get, run } from "@/lib/db";

/** Máximo de segundos aceitos por envio (o player envia a cada ~15 s de reprodução). */
const MAX_DELTA = 30;

/**
 * Tempo assistido: o player envia, via sendBeacon, os segundos reproduzidos desde o último envio.
 * Alimenta a retenção (quanto do vídeo as pessoas assistem) — o sinal que mais pesa na recomendação.
 * body: { id, seconds, position, first }
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { id?: unknown; seconds?: unknown; position?: unknown; first?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id.slice(0, 32) : "";
  const seconds = Math.min(MAX_DELTA, Math.max(0, Math.round(Number(body?.seconds) || 0)));
  if (!id || !seconds) return new Response(null, { status: 204 });

  const video = await get<{ duration: number }>("SELECT duration FROM videos WHERE id = ? AND status = 'published'", id);
  if (!video) return new Response(null, { status: 204 });

  await run(
    "UPDATE videos SET watch_seconds = watch_seconds + ?, watch_sessions = watch_sessions + ? WHERE id = ?",
    seconds,
    body?.first === true ? 1 : 0,
    id,
  );

  const user = await getCurrentUser();
  if (user) {
    const progress = video.duration > 0 ? Math.min(1, Math.max(0, Number(body?.position) || 0) / video.duration) : 0;
    await run(
      `INSERT INTO history (user_id, video_id, seconds_watched, progress) VALUES (?, ?, ?, ?)
       ON CONFLICT (user_id, video_id) DO UPDATE SET seconds_watched = history.seconds_watched + excluded.seconds_watched,
         progress = GREATEST(history.progress, excluded.progress), watched_at = now_iso()`,
      user.id,
      id,
      seconds,
      progress,
    );
  }
  return new Response(null, { status: 204 });
}
