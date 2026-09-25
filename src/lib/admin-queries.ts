import { all, get } from "./db";

export async function adminMetrics() {
  const metrics = {
    users: "SELECT COUNT(*) FROM users",
    usersWeek: "SELECT COUNT(*) FROM users WHERE created_at > datetime('now','-7 days')",
    publishers: "SELECT COUNT(*) FROM users WHERE member_type IN ('student','professional','related')",
    professionals: "SELECT COUNT(*) FROM users WHERE member_type = 'professional'",
    students: "SELECT COUNT(*) FROM users WHERE member_type = 'student'",
    videos: "SELECT COUNT(*) FROM videos WHERE status = 'published'",
    videosWeek: "SELECT COUNT(*) FROM videos WHERE created_at > datetime('now','-7 days')",
    responses: "SELECT COUNT(*) FROM videos WHERE parent_id IS NOT NULL",
    comments: "SELECT COUNT(*) FROM comments",
    commentsWeek: "SELECT COUNT(*) FROM comments WHERE created_at > datetime('now','-7 days')",
    views: "SELECT COALESCE(SUM(views),0) FROM videos",
    pendingVerifications: "SELECT COUNT(*) FROM verification_requests WHERE status IN ('pending_review','under_review','review_required')",
    openReports: "SELECT COUNT(*) FROM reports WHERE status = 'open'",
  };
  // Uma única ida ao banco com todas as contagens.
  const select = Object.entries(metrics).map(([k, sql]) => `(${sql}) AS "${k}"`).join(", ");
  return (await get<Record<keyof typeof metrics, number>>(`SELECT ${select}`))!;
}

/** Novos usuários e vídeos por dia (últimos 30 dias). */
export async function growthSeries() {
  const users = await all<{ d: string; n: number }>(
    "SELECT left(created_at, 10) AS d, COUNT(*) AS n FROM users WHERE created_at > datetime('now','-30 days') GROUP BY d",
  );
  const videos = await all<{ d: string; n: number }>(
    "SELECT left(created_at, 10) AS d, COUNT(*) AS n FROM videos WHERE created_at > datetime('now','-30 days') GROUP BY d",
  );
  const days: { d: string; users: number; videos: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    days.push({ d, users: users.find((u) => u.d === d)?.n ?? 0, videos: videos.find((v) => v.d === d)?.n ?? 0 });
  }
  return days;
}

export type VerificationRow = {
  id: string;
  user_id: string;
  type: "student" | "professional" | "related";
  data: string;
  document_key: string | null;
  status: string;
  admin_note: string;
  evidence: string;
  fraud_signals: string;
  ai_status: string | null;
  ai_confidence: number | null;
  ai_result: string | null;
  ai_model: string | null;
  ai_analyzed_at: string | null;
  consent_at: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  user_name: string;
  user_handle: string;
  user_email: string;
  user_avatar: string | null;
  user_created: string;
  user_status: string;
  reviewer_name: string | null;
};

const VERIF_SELECT = `SELECT r.*, u.name AS user_name, u.handle AS user_handle, u.email AS user_email, u.avatar_key AS user_avatar,
  u.created_at AS user_created, u.status AS user_status, a.name AS reviewer_name
  FROM verification_requests r JOIN users u ON u.id = r.user_id LEFT JOIN users a ON a.id = r.reviewed_by`;

export const VERIFICATION_FILTERS = {
  queue: { label: "Aguardando análise", where: "r.status IN ('pending_review','under_review','review_required')" },
  high: { label: "Alta confiança", where: "r.ai_status = 'high_confidence' AND r.status NOT IN ('approved','rejected')" },
  medium: { label: "Média confiança", where: "r.ai_status = 'medium_confidence' AND r.status NOT IN ('approved','rejected')" },
  low: { label: "Baixa confiança", where: "r.ai_status = 'low_confidence' AND r.status NOT IN ('approved','rejected')" },
  needs_info: { label: "Precisa de informações", where: "r.status = 'needs_info'" },
  review: { label: "Revisão necessária", where: "(r.status = 'review_required' OR (r.ai_status = 'inconsistent' AND r.status NOT IN ('approved','rejected')))" },
  approved: { label: "Aprovados", where: "r.status = 'approved'" },
  rejected: { label: "Rejeitados", where: "r.status = 'rejected'" },
  all: { label: "Todos", where: "1=1" },
} as const;

export type VerificationFilter = keyof typeof VERIFICATION_FILTERS;

export async function listVerifications(filter: VerificationFilter) {
  const f = VERIFICATION_FILTERS[filter] ?? VERIFICATION_FILTERS.queue;
  const order =
    filter === "queue"
      ? "CASE r.status WHEN 'review_required' THEN 0 WHEN 'under_review' THEN 1 ELSE 2 END, r.created_at ASC"
      : "r.updated_at DESC";
  return await all<VerificationRow>(`${VERIF_SELECT} WHERE ${f.where} ORDER BY ${order} LIMIT 300`);
}

export async function verificationCounts() {
  const out = {} as Record<VerificationFilter, number>;
  for (const [k, f] of Object.entries(VERIFICATION_FILTERS)) {
    out[k as VerificationFilter] = (await get<{ n: number }>(`SELECT COUNT(*) AS n FROM verification_requests r WHERE ${f.where}`))?.n ?? 0;
  }
  return out;
}

export async function getVerification(id: string) {
  return await get<VerificationRow>(`${VERIF_SELECT} WHERE r.id = ?`, id);
}

export type VerificationEventRow = {
  id: string;
  event: string;
  reason: string;
  ai_status: string | null;
  ai_confidence: number | null;
  ai_model: string | null;
  evidence_ids: string;
  created_at: string;
  actor_name: string | null;
};

export async function verificationEvents(requestId: string) {
  return await all<VerificationEventRow>(
    `SELECT e.*, u.name AS actor_name FROM verification_events e LEFT JOIN users u ON u.id = e.actor_id
     WHERE e.request_id = ? ORDER BY e.created_at DESC, e.seq DESC`,
    requestId,
  );
}

export async function userVerificationHistory(userId: string, excludeId: string) {
  return await all<{ id: string; type: string; status: string; created_at: string }>(
    "SELECT id, type, status, created_at FROM verification_requests WHERE user_id = ? AND id <> ? ORDER BY created_at DESC",
    userId,
    excludeId,
  );
}

export type ReportRow = {
  id: string;
  target_type: "video" | "comment" | "user";
  target_id: string;
  reason: string;
  details: string;
  status: string;
  resolution: string;
  created_at: string;
  reporter_name: string;
  reporter_handle: string;
  target_label: string | null;
  target_extra: string | null;
  target_status: string | null;
  target_link: string | null;
  same_target_count: number;
};

export async function listReports(status: string) {
  const where = status === "all" ? "1=1" : "r.status = ?";
  return await all<ReportRow>(
    `SELECT r.id, r.target_type, r.target_id, r.reason, r.details, r.status, r.resolution, r.created_at,
       ru.name AS reporter_name, ru.handle AS reporter_handle,
       CASE r.target_type
         WHEN 'video' THEN (SELECT title FROM videos WHERE id = r.target_id)
         WHEN 'comment' THEN (SELECT body FROM comments WHERE id = r.target_id)
         WHEN 'user' THEN (SELECT name || ' (@' || handle || ')' FROM users WHERE id = r.target_id)
       END AS target_label,
       CASE r.target_type
         WHEN 'video' THEN (SELECT u.name FROM videos v JOIN users u ON u.id = v.user_id WHERE v.id = r.target_id)
         WHEN 'comment' THEN (SELECT '@' || u.handle FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = r.target_id)
         ELSE NULL
       END AS target_extra,
       CASE r.target_type
         WHEN 'video' THEN (SELECT status FROM videos WHERE id = r.target_id)
         WHEN 'comment' THEN (SELECT status FROM comments WHERE id = r.target_id)
         WHEN 'user' THEN (SELECT status FROM users WHERE id = r.target_id)
       END AS target_status,
       CASE r.target_type
         WHEN 'video' THEN '/watch/' || r.target_id
         WHEN 'comment' THEN (SELECT '/watch/' || video_id || '#comentarios' FROM comments WHERE id = r.target_id)
         WHEN 'user' THEN (SELECT '/@' || handle FROM users WHERE id = r.target_id)
       END AS target_link,
       (SELECT COUNT(*) FROM reports x WHERE x.target_type = r.target_type AND x.target_id = r.target_id) AS same_target_count
     FROM reports r JOIN users ru ON ru.id = r.reporter_id
     WHERE ${where} ORDER BY r.created_at DESC LIMIT 200`,
    ...(status === "all" ? [] : [status]),
  );
}

export type AdminUserRow = {
  id: string;
  name: string;
  handle: string;
  email: string;
  avatar_key: string | null;
  role: string;
  member_type: string;
  verification_status: string;
  status: string;
  followers_count: number;
  created_at: string;
  videos: number;
  reports: number;
};

export async function listUsers(q: string, filter: string) {
  const where: string[] = [];
  const params: string[] = [];
  if (q) {
    where.push("(u.name ILIKE ? OR u.handle ILIKE ? OR u.email ILIKE ?)");
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  if (filter === "professional" || filter === "student" || filter === "related" || filter === "viewer") {
    where.push("u.member_type = ?");
    params.push(filter);
  }
  if (filter === "suspended" || filter === "banned") {
    where.push("u.status = ?");
    params.push(filter);
  }
  if (filter === "admin") where.push("u.role = 'admin'");
  return await all<AdminUserRow>(
    `SELECT u.id, u.name, u.handle, u.email, u.avatar_key, u.role, u.member_type, u.verification_status, u.status,
       u.followers_count, u.created_at,
       (SELECT COUNT(*) FROM videos v WHERE v.user_id = u.id) AS videos,
       (SELECT COUNT(*) FROM reports r WHERE r.target_type = 'user' AND r.target_id = u.id) AS reports
     FROM users u ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY u.created_at DESC LIMIT 300`,
    ...params,
  );
}

export async function listAdminActions() {
  return await all<{ id: string; action: string; target_type: string; target_id: string; note: string; created_at: string; admin_name: string; target_label: string | null }>(
    `SELECT a.id, a.action, a.target_type, a.target_id, a.note, a.created_at, u.name AS admin_name,
       CASE a.target_type
         WHEN 'user' THEN (SELECT '@' || handle FROM users WHERE id = a.target_id)
         WHEN 'video' THEN (SELECT title FROM videos WHERE id = a.target_id)
         WHEN 'comment' THEN (SELECT substr(body, 1, 60) FROM comments WHERE id = a.target_id)
         ELSE a.target_id
       END AS target_label
     FROM admin_actions a JOIN users u ON u.id = a.admin_id ORDER BY a.created_at DESC LIMIT 300`,
  );
}

export async function listRecentVideos() {
  return await all<{ id: string; title: string; status: string; created_at: string; views: number; channel: string; handle: string; thumb_key: string | null; duration: number; category: string }>(
    `SELECT v.id, v.title, v.status, v.created_at, v.views, v.thumb_key, v.duration, v.category, u.name AS channel, u.handle
     FROM videos v JOIN users u ON u.id = v.user_id ORDER BY v.created_at DESC LIMIT 100`,
  );
}
