import { all, get } from "./db";
import type { ChannelCardData, CommentData, User, VideoCardData, VideoFull } from "./types";

/* ------------------------------------------------------------------ */
/* Fragmentos SQL reutilizados                                         */
/* ------------------------------------------------------------------ */

export const CARD_COLUMNS = `v.id, v.title, v.thumb_key, v.duration, v.views, v.likes, v.comments_count,
  v.responses_count, v.category, v.created_at, v.parent_id, v.user_id,
  u.name AS channel_name, u.handle AS channel_handle, u.avatar_key AS channel_avatar,
  u.member_type AS channel_member_type`;

/** Vídeos visíveis publicamente em listas (feed, busca, recomendações). */
const LISTABLE = `v.status = 'published' AND v.visibility = 'public' AND u.status <> 'banned'`;

const FROM = `FROM videos v JOIN users u ON u.id = v.user_id`;

/** Pontuação de "em alta": engajamento ponderado com decaimento por idade (horas). */
const TRENDING_SCORE = `((v.views + v.likes * 4 + v.comments_count * 6 + v.responses_count * 8 + 1)
  / pow((julianday('now') - julianday(v.created_at)) * 24 + 2, 1.35))`;

/* ------------------------------------------------------------------ */
/* Feed / Home                                                         */
/* ------------------------------------------------------------------ */

export async function latestVideos(limit = 24, category?: string) {
  return await all<VideoCardData>(
    `SELECT ${CARD_COLUMNS} ${FROM} WHERE ${LISTABLE} ${category ? "AND v.category = ?" : ""}
     ORDER BY v.created_at DESC LIMIT ?`,
    ...(category ? [category, limit] : [limit]),
  );
}

export async function trendingVideos(limit = 24, category?: string) {
  return await all<VideoCardData>(
    `SELECT ${CARD_COLUMNS} ${FROM} WHERE ${LISTABLE} ${category ? "AND v.category = ?" : ""}
     ORDER BY ${TRENDING_SCORE} DESC LIMIT ?`,
    ...(category ? [category, limit] : [limit]),
  );
}

export async function followingVideos(userId: string, limit = 24) {
  return await all<VideoCardData>(
    `SELECT ${CARD_COLUMNS} ${FROM} JOIN follows f ON f.following_id = v.user_id AND f.follower_id = ?
     WHERE ${LISTABLE} ORDER BY v.created_at DESC LIMIT ?`,
    userId,
    limit,
  );
}

/** Vídeos com mais conversa recente (comentários e respostas em vídeo nos últimos 14 dias). */
export async function activeDiscussions(limit = 8) {
  return (await all<VideoCardData & { recent_activity: number }>(
    `SELECT ${CARD_COLUMNS},
       (SELECT COUNT(*) FROM comments c WHERE c.video_id = v.id AND c.created_at > datetime('now','-14 days'))
       + (SELECT COUNT(*) FROM videos r WHERE r.parent_id = v.id AND r.status = 'published') * 3 AS recent_activity
     ${FROM} WHERE ${LISTABLE}
     ORDER BY recent_activity DESC, v.created_at DESC LIMIT ?`,
    limit,
  )).filter((v) => v.recent_activity > 0);
}

/* Médias assumidas para vídeos com poucos dados (evita que 1 clique ou 1 visita decida tudo). */
const PRIOR_CTR = 0.05; // 5% de quem vê a miniatura clica
const PRIOR_CTR_WEIGHT = 100; // equivale a 100 impressões "médias"
const PRIOR_RETENTION = 0.4; // assiste 40% do vídeo, em média
const PRIOR_RETENTION_WEIGHT = 5; // equivale a 5 sessões "médias"

type Signals = Pick<VideoCardData, "duration"> & { impressions: number; clicks: number; watch_seconds: number; watch_sessions: number };

/** Taxa de clique suavizada: de quem viu a miniatura, quantos clicaram. */
export function clickRate(v: Signals) {
  return (v.clicks + PRIOR_CTR * PRIOR_CTR_WEIGHT) / (v.impressions + PRIOR_CTR_WEIGHT);
}

/** Retenção suavizada: fração média do vídeo que as pessoas assistem (0 a 1). */
export function retention(v: Signals) {
  if (!v.duration) return PRIOR_RETENTION;
  const r =
    (v.watch_seconds + PRIOR_RETENTION * PRIOR_RETENTION_WEIGHT * v.duration) / ((v.watch_sessions + PRIOR_RETENTION_WEIGHT) * v.duration);
  return Math.min(1, r);
}

/**
 * "Para você" — inspirado no que o YouTube divulga sobre a página inicial:
 *  1. Satisfação com o vídeo: retenção (quanto as pessoas assistem) e taxa de clique.
 *  2. Personalização: temas e canais que a pessoa assiste (por tempo assistido), curte e salva; inscrições.
 *  3. Novidade, com um empurrão para criadores novos.
 *  4. Não repetir o que a pessoa já assistiu inteiro; os próprios vídeos não aparecem (ficam no canal/Estúdio).
 * Visualizações brutas pesam pouco. No máximo 2 vídeos por canal no topo.
 */
export async function forYou(viewerId: string | null, limit = 24, category?: string) {
  const candidates = await all<VideoCardData & Signals & { age_hours: number; channel_videos: number; progress: number | null }>(
    `SELECT ${CARD_COLUMNS}, v.impressions, v.clicks, v.watch_seconds, v.watch_sessions,
       (julianday('now') - julianday(v.created_at)) * 24 AS age_hours,
       (SELECT COUNT(*) FROM videos x WHERE x.user_id = v.user_id AND x.status = 'published') AS channel_videos,
       ${viewerId ? "(SELECT h.progress FROM history h WHERE h.user_id = ? AND h.video_id = v.id)" : "NULL"} AS progress
     ${FROM} WHERE ${LISTABLE} ${viewerId ? "AND v.user_id <> ?" : ""} ${category ? "AND v.category = ?" : ""}
     ORDER BY v.created_at DESC LIMIT 400`,
    ...[viewerId, viewerId, category].filter((p): p is string => !!p),
  );

  // Interesses da pessoa: tempo assistido (até 10 min por vídeo), curtidas e salvos, por tema e por canal.
  const topic = new Map<string, number>();
  const channel = new Map<string, number>();
  const subscribed = new Set<string>();
  if (viewerId) {
    const rows = await all<{ category: string; user_id: string; w: number }>(
      `SELECT v.category, v.user_id, SUM(w) AS w FROM (
         SELECT video_id, 1 + LEAST(seconds_watched / 60.0, 10) AS w FROM history WHERE user_id = ?
         UNION ALL SELECT video_id, 3 FROM likes WHERE user_id = ?
         UNION ALL SELECT video_id, 2 FROM saves WHERE user_id = ?
       ) s JOIN videos v ON v.id = s.video_id GROUP BY v.category, v.user_id`,
      viewerId,
      viewerId,
      viewerId,
    );
    for (const r of rows) {
      topic.set(r.category, (topic.get(r.category) ?? 0) + r.w);
      channel.set(r.user_id, (channel.get(r.user_id) ?? 0) + r.w);
    }
    for (const r of await all<{ following_id: string }>("SELECT following_id FROM follows WHERE follower_id = ?", viewerId)) {
      subscribed.add(r.following_id);
    }
  }
  const maxTopic = Math.max(1, ...topic.values());
  const maxChannel = Math.max(1, ...channel.values());

  const scored = candidates
    .map((v) => {
      // 1. Satisfação (média = 1 em cada)
      const retentionScore = retention(v) / PRIOR_RETENTION;
      const ctrScore = Math.min(3, clickRate(v) / PRIOR_CTR);
      const interaction = Math.log10(1 + v.likes + v.comments_count * 2 + v.responses_count * 4);
      const popularity = Math.log10(1 + v.views);
      const quality = retentionScore * 1.6 + ctrScore * 1.0 + interaction * 0.3 + popularity * 0.25;
      // 2. Personalização
      const personal =
        ((topic.get(v.category) ?? 0) / maxTopic) * 1.5 +
        ((channel.get(v.user_id) ?? 0) / maxChannel) * 1.0 +
        (subscribed.has(v.user_id) ? 1.2 : 0);
      // 3. Novidade e criadores novos
      const freshness = 1.5 / Math.pow(1 + v.age_hours / 48, 0.8);
      const newCreator = v.channel_videos <= 3 ? 0.4 : 0;
      // 4. Já assistido: inteiro some do topo; parcial desce um pouco
      const seen = v.progress === null ? 0 : v.progress >= 0.9 ? -3 : -1;
      const jitter = Math.random() * 0.3; // variedade entre visitas
      return { v, score: quality + personal + freshness + newCreator + seen + jitter };
    })
    .sort((a, b) => b.score - a.score);

  // Evita que um único canal domine a página: no máximo 2 vídeos por canal no topo.
  const perChannel = new Map<string, number>();
  const result: VideoCardData[] = [];
  const overflow: VideoCardData[] = [];
  for (const { v } of scored) {
    const n = perChannel.get(v.user_id) ?? 0;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { age_hours, channel_videos, progress, impressions, clicks, watch_seconds, watch_sessions, ...card } = v;
    if (n < 2) {
      result.push(card);
      perChannel.set(v.user_id, n + 1);
    } else overflow.push(card);
    if (result.length >= limit) break;
  }
  return result.concat(overflow).slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Vídeo                                                               */
/* ------------------------------------------------------------------ */

export async function getVideo(id: string) {
  return await get<VideoFull>(
    `SELECT ${CARD_COLUMNS}, v.description, v.tags, v.video_key, v.tech, v.visibility, v.status,
       u.followers_count AS channel_followers, u.specialty AS channel_specialty
     ${FROM} WHERE v.id = ?`,
    id,
  );
}

export async function relatedVideos(video: Pick<VideoFull, "id" | "category" | "user_id">, limit = 16) {
  return await all<VideoCardData>(
    `SELECT ${CARD_COLUMNS} ${FROM} WHERE ${LISTABLE} AND v.id <> ?
     ORDER BY (v.category = ?)::int * 3 + (v.user_id = ?)::int * 2 +${TRENDING_SCORE} * 50 DESC LIMIT ?`,
    video.id,
    video.category,
    video.user_id,
    limit,
  );
}

export async function videoResponses(videoId: string) {
  return await all<VideoCardData>(
    `SELECT ${CARD_COLUMNS} ${FROM} WHERE v.parent_id = ? AND v.status = 'published' AND u.status <> 'banned'
     ORDER BY v.created_at DESC`,
    videoId,
  );
}

export async function viewerVideoState(userId: string | undefined, video: Pick<VideoFull, "id" | "user_id">) {
  if (!userId) return { liked: false, saved: false, following: false };
  const row = await get<{ liked: number; saved: number; following: number }>(
    `SELECT EXISTS(SELECT 1 FROM likes WHERE user_id = ? AND video_id = ?) AS liked,
            EXISTS(SELECT 1 FROM saves WHERE user_id = ? AND video_id = ?) AS saved,
            EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?) AS following`,
    userId,
    video.id,
    userId,
    video.id,
    userId,
    video.user_id,
  );
  return { liked: !!row?.liked, saved: !!row?.saved, following: !!row?.following };
}

/* ------------------------------------------------------------------ */
/* Comentários                                                         */
/* ------------------------------------------------------------------ */

const COMMENT_COLUMNS = (viewerId: string | null) => `c.id, c.video_id, c.user_id, c.parent_id, c.body, c.status,
  c.likes, c.replies_count, c.created_at, u.name AS author_name, u.handle AS author_handle,
  u.avatar_key AS author_avatar, u.member_type AS author_member_type,
  ${viewerId ? "EXISTS(SELECT 1 FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = ?)" : "0"} AS liked_by_me`;

export async function topComments(videoId: string, viewerId: string | null, sort: "top" | "new" = "top") {
  const order = sort === "new" ? "c.created_at DESC" : "(c.likes * 2 + c.replies_count * 3) DESC, c.created_at DESC";
  return await all<CommentData>(
    `SELECT ${COMMENT_COLUMNS(viewerId)} FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.video_id = ? AND c.parent_id IS NULL AND c.status = 'visible' AND u.status <> 'banned'
     ORDER BY ${order} LIMIT 200`,
    ...[viewerId, videoId].filter((p): p is string => !!p),
  );
}

export async function commentReplies(parentId: string, viewerId: string | null) {
  return await all<CommentData>(
    `SELECT ${COMMENT_COLUMNS(viewerId)} FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.parent_id = ? AND c.status = 'visible' AND u.status <> 'banned' ORDER BY c.created_at ASC`,
    ...[viewerId, parentId].filter((p): p is string => !!p),
  );
}

/* ------------------------------------------------------------------ */
/* Canais                                                              */
/* ------------------------------------------------------------------ */

export type Channel = Omit<User, "email"> & { videos_count: number; total_views: number };

export async function getChannelByHandle(handle: string) {
  return await get<Channel>(
    `SELECT u.id, u.name, u.handle, u.avatar_key, u.banner_key, u.bio, u.specialty, u.location, u.website,
       u.instagram, u.role, u.member_type, u.verification_status, u.status, u.followers_count,
       u.following_count, u.created_at,
       (SELECT COUNT(*) FROM videos v WHERE v.user_id = u.id AND v.status = 'published' AND v.visibility = 'public') AS videos_count,
       (SELECT COALESCE(SUM(views),0) FROM videos v WHERE v.user_id = u.id AND v.status = 'published') AS total_views
     FROM users u WHERE lower(u.handle) = lower(?)`,
    handle,
  );
}

export async function channelVideos(userId: string, sort: "new" | "popular" | "old" = "new", onlyResponses = false) {
  const order = sort === "popular" ? "v.views DESC" : sort === "old" ? "v.created_at ASC" : "v.created_at DESC";
  return await all<VideoCardData>(
    `SELECT ${CARD_COLUMNS} ${FROM} WHERE v.user_id = ? AND v.status = 'published' AND v.visibility = 'public'
     ${onlyResponses ? "AND v.parent_id IS NOT NULL" : ""} ORDER BY ${order} LIMIT 200`,
    userId,
  );
}

const CHANNEL_CARD = `u.id, u.name, u.handle, u.avatar_key, u.specialty, u.member_type, u.followers_count,
  (SELECT COUNT(*) FROM videos v WHERE v.user_id = u.id AND v.status = 'published' AND v.visibility = 'public') AS videos_count,
  lv.id AS last_video_id, lv.title AS last_video_title, lv.thumb_key AS last_video_thumb`;

const LAST_VIDEO_JOIN = `LEFT JOIN videos lv ON lv.id = (SELECT id FROM videos x WHERE x.user_id = u.id
  AND x.status = 'published' AND x.visibility = 'public' ORDER BY x.created_at DESC LIMIT 1)`;

const PUBLISHERS = `u.status = 'active' AND u.member_type IN ('student','professional','related')`;

export async function discoverChannels(opts: { type?: string; category?: string; sort?: "new" | "popular"; limit?: number } = {}) {
  const where = [PUBLISHERS];
  const params: string[] = [];
  if (opts.type === "student" || opts.type === "professional" || opts.type === "related") {
    where.push("u.member_type = ?");
    params.push(opts.type);
  }
  if (opts.category) {
    where.push("EXISTS (SELECT 1 FROM videos c WHERE c.user_id = u.id AND c.category = ? AND c.status = 'published')");
    params.push(opts.category);
  }
  const order = opts.sort === "new" ? "u.created_at DESC" : "u.followers_count DESC, u.created_at DESC";
  return await all<ChannelCardData>(
    `SELECT ${CHANNEL_CARD} FROM users u ${LAST_VIDEO_JOIN} WHERE ${where.join(" AND ")} ORDER BY ${order} LIMIT ?`,
    ...params,
    opts.limit ?? 48,
  );
}

/** Profissionais que entraram recentemente — ajuda criadores novos a serem descobertos. */
export async function newCreators(limit = 8, excludeUserId?: string) {
  return await all<ChannelCardData>(
    `SELECT ${CHANNEL_CARD} FROM users u ${LAST_VIDEO_JOIN}
     WHERE ${PUBLISHERS} AND u.id <> ? ORDER BY u.created_at DESC LIMIT ?`,
    excludeUserId ?? "",
    limit,
  );
}

export async function followingChannels(userId: string) {
  return await all<{ id: string; name: string; handle: string; avatar_key: string | null; has_new: number }>(
    `SELECT u.id, u.name, u.handle, u.avatar_key,
       EXISTS(SELECT 1 FROM videos v WHERE v.user_id = u.id AND v.created_at > datetime('now','-3 days') AND v.status='published') AS has_new
     FROM follows f JOIN users u ON u.id = f.following_id WHERE f.follower_id = ? AND u.status <> 'banned'
     ORDER BY has_new DESC, u.name`,
    userId,
  );
}

export async function followList(userId: string, direction: "followers" | "following") {
  const [on, where] =
    direction === "followers"
      ? ["u.id = f.follower_id", "f.following_id = ?"]
      : ["u.id = f.following_id", "f.follower_id = ?"];
  return await all<ChannelCardData>(
    `SELECT ${CHANNEL_CARD} FROM follows f JOIN users u ON ${on} ${LAST_VIDEO_JOIN}
     WHERE ${where} AND u.status <> 'banned' ORDER BY f.created_at DESC`,
    userId,
  );
}

/* ------------------------------------------------------------------ */
/* Biblioteca pessoal                                                  */
/* ------------------------------------------------------------------ */

export async function historyVideos(userId: string) {
  return await all<VideoCardData & { watched_at: string }>(
    `SELECT ${CARD_COLUMNS}, h.watched_at ${FROM} JOIN history h ON h.video_id = v.id AND h.user_id = ?
     WHERE v.status = 'published' ORDER BY h.watched_at DESC LIMIT 200`,
    userId,
  );
}

export async function savedVideos(userId: string) {
  return await all<VideoCardData>(
    `SELECT ${CARD_COLUMNS} ${FROM} JOIN saves s ON s.video_id = v.id AND s.user_id = ?
     WHERE v.status = 'published' ORDER BY s.created_at DESC`,
    userId,
  );
}

export async function likedVideos(userId: string) {
  return await all<VideoCardData>(
    `SELECT ${CARD_COLUMNS} ${FROM} JOIN likes l ON l.video_id = v.id AND l.user_id = ?
     WHERE v.status = 'published' ORDER BY l.created_at DESC`,
    userId,
  );
}

/* ------------------------------------------------------------------ */
/* Busca                                                               */
/* ------------------------------------------------------------------ */

/** Converte o texto digitado numa consulta tsquery segura (todos os termos, com prefixo). */
export function ftsQuery(q: string) {
  const terms = q
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter((t) => t.length > 0)
    .slice(0, 8);
  return terms.map((t) => `${t}:*`).join(" & ");
}

export type SearchFilters = {
  q: string;
  kind?: "all" | "videos" | "channels" | "discussions";
  member?: "all" | "student" | "professional" | "related";
  category?: string;
  sort?: "relevance" | "new" | "views";
};

/** Relevância no estilo do bm25 do SQLite: menor = mais relevante. */
const RANK = "(-ts_rank(fts.document, sq.q) * 10)";

export async function searchVideos(f: SearchFilters, limit = 40) {
  const match = ftsQuery(f.q);
  if (!match) return [];
  const where = [LISTABLE];
  const params: (string | number)[] = [match];
  if (f.member === "student" || f.member === "professional" || f.member === "related") {
    where.push("u.member_type = ?");
    params.push(f.member);
  }
  if (f.category) {
    where.push("v.category = ?");
    params.push(f.category);
  }
  if (f.kind === "discussions") where.push("(v.comments_count + v.responses_count * 3) >= 1");
  const order =
    f.sort === "new"
      ? "v.created_at DESC"
      : f.sort === "views"
        ? "v.views DESC"
        : f.kind === "discussions"
          ? `(v.comments_count + v.responses_count * 3) DESC, ${RANK}`
          : `${RANK} - log(v.views + v.likes * 4 + 10) * 0.3`;
  params.push(limit);
  return await all<VideoCardData & { description: string }>(
    `SELECT ${CARD_COLUMNS}, v.description
     FROM (SELECT to_tsquery('simple', f_unaccent(?)) AS q) sq
     JOIN videos_fts fts ON fts.document @@ sq.q JOIN videos v ON v.id = fts.id JOIN users u ON u.id = v.user_id
     WHERE ${where.join(" AND ")} ORDER BY ${order} LIMIT ?`,
    ...params,
  );
}

export async function searchChannels(f: SearchFilters, limit = 20) {
  const like = `%${f.q.trim().replace(/[%_]/g, "")}%`;
  const params: (string | number)[] = [like, like, like, like];
  let member = "";
  if (f.member === "student" || f.member === "professional" || f.member === "related") {
    member = "AND u.member_type = ?";
    params.push(f.member);
  }
  params.push(limit);
  return await all<ChannelCardData>(
    `SELECT ${CHANNEL_CARD} FROM users u ${LAST_VIDEO_JOIN}
     WHERE ${PUBLISHERS} AND (u.name ILIKE ? OR u.handle ILIKE ? OR u.specialty ILIKE ? OR u.bio ILIKE ?) ${member}
     ORDER BY u.followers_count DESC LIMIT ?`,
    ...params,
  );
}

/* ------------------------------------------------------------------ */
/* Notificações                                                        */
/* ------------------------------------------------------------------ */

export type NotificationData = {
  id: string;
  type: string;
  text: string;
  read_at: string | null;
  created_at: string;
  video_id: string | null;
  comment_id: string | null;
  actor_name: string | null;
  actor_handle: string | null;
  actor_avatar: string | null;
  video_title: string | null;
  video_thumb: string | null;
};

export async function listNotifications(userId: string, limit = 50) {
  return await all<NotificationData>(
    `SELECT n.id, n.type, n.text, n.read_at, n.created_at, n.video_id, n.comment_id,
       a.name AS actor_name, a.handle AS actor_handle, a.avatar_key AS actor_avatar,
       v.title AS video_title, v.thumb_key AS video_thumb
     FROM notifications n LEFT JOIN users a ON a.id = n.actor_id LEFT JOIN videos v ON v.id = n.video_id
     WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT ?`,
    userId,
    limit,
  );
}

export async function unreadCount(userId: string) {
  return (await get<{ n: number }>("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL", userId))?.n ?? 0;
}

/* ------------------------------------------------------------------ */
/* Estúdio do criador                                                  */
/* ------------------------------------------------------------------ */

export async function studioVideos(userId: string) {
  return await all<VideoCardData & { status: string; visibility: string; description: string }>(
    `SELECT ${CARD_COLUMNS}, v.status, v.visibility, v.description ${FROM}
     WHERE v.user_id = ? AND v.status <> 'removed' ORDER BY v.created_at DESC`,
    userId,
  );
}

export async function studioStats(userId: string) {
  return (await get<{ videos: number; views: number; likes: number; comments: number; responses: number }>(
    `SELECT COUNT(*) AS videos, COALESCE(SUM(views),0) AS views, COALESCE(SUM(likes),0) AS likes,
       COALESCE(SUM(comments_count),0) AS comments, COALESCE(SUM(responses_count),0) AS responses
     FROM videos WHERE user_id = ? AND status = 'published'`,
    userId,
  ))!;
}
