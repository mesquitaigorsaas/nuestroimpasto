import { run } from "@/lib/db";

const ID = /^[\w-]{6,32}$/;

/**
 * Impressões e cliques das miniaturas (taxa de clique, como no YouTube).
 * body: { shown?: string[], click?: string } — enviado pelo navegador via sendBeacon.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { shown?: unknown; click?: unknown } | null;
  const shown = Array.isArray(body?.shown) ? [...new Set(body.shown.filter((x): x is string => typeof x === "string" && ID.test(x)))].slice(0, 60) : [];
  if (shown.length) {
    await run("UPDATE videos SET impressions = impressions + 1 WHERE id = ANY(string_to_array(?, ','))", shown.join(","));
  }
  if (typeof body?.click === "string" && ID.test(body.click)) {
    await run("UPDATE videos SET clicks = clicks + 1 WHERE id = ?", body.click);
  }
  return new Response(null, { status: 204 });
}
