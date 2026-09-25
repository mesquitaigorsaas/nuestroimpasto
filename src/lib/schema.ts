/**
 * Esquema do banco. SQLite no desenvolvimento/MVP; os tipos e nomes foram
 * escolhidos para migrar direto para Postgres (Supabase) depois.
 */
/**
 * Colunas adicionadas depois da primeira versão. `db.ts` cria as que faltarem
 * em bancos já existentes (migração leve, sem apagar dados).
 */
export const ADDED_COLUMNS: [table: string, column: string, definition: string][] = [
  ["verification_requests", "evidence", "TEXT NOT NULL DEFAULT '[]'"],
  ["verification_requests", "fraud_signals", "TEXT NOT NULL DEFAULT '[]'"],
  ["verification_requests", "ai_status", "TEXT"],
  ["verification_requests", "ai_confidence", "REAL"],
  ["verification_requests", "ai_result", "TEXT"],
  ["verification_requests", "ai_model", "TEXT"],
  ["verification_requests", "ai_analyzed_at", "TEXT"],
  ["verification_requests", "consent_at", "TEXT"],
  ["verification_requests", "updated_at", "TEXT NOT NULL DEFAULT ''"],
];

export const SCHEMA = /* sql */ `
CREATE TABLE IF NOT EXISTS users (
  id                  TEXT PRIMARY KEY,
  email               TEXT NOT NULL UNIQUE,
  password_hash       TEXT NOT NULL,
  name                TEXT NOT NULL,
  handle              TEXT NOT NULL UNIQUE,
  avatar_key          TEXT,
  banner_key          TEXT,
  bio                 TEXT NOT NULL DEFAULT '',
  specialty           TEXT NOT NULL DEFAULT '',
  location            TEXT NOT NULL DEFAULT '',
  website             TEXT NOT NULL DEFAULT '',
  instagram           TEXT NOT NULL DEFAULT '',
  role                TEXT NOT NULL DEFAULT 'user',      -- user | admin
  member_type         TEXT NOT NULL DEFAULT 'viewer',    -- viewer | student | professional | related
  -- none | pending | under_review | needs_info | verified | rejected | review  (SUSPENDED fica em status)
  verification_status TEXT NOT NULL DEFAULT 'none',
  status              TEXT NOT NULL DEFAULT 'active',    -- active | suspended | banned
  followers_count     INTEGER NOT NULL DEFAULT 0,
  following_count     INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_requests (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type           TEXT NOT NULL,                     -- professional | student | related
  data           TEXT NOT NULL DEFAULT '{}',        -- JSON com os campos declarados
  document_key   TEXT,                              -- arquivo privado (não servido publicamente)
  -- pending_review | under_review | needs_info | approved | rejected | review_required
  status         TEXT NOT NULL DEFAULT 'pending_review',
  admin_note     TEXT NOT NULL DEFAULT '',          -- mensagem mostrada ao candidato
  reviewed_by    TEXT REFERENCES users(id),
  reviewed_at    TEXT,
  evidence       TEXT NOT NULL DEFAULT '[]',        -- JSON: evidências com origem identificável
  fraud_signals  TEXT NOT NULL DEFAULT '[]',        -- JSON: sinais de risco (nunca bloqueiam sozinhos)
  ai_status      TEXT,                              -- high_confidence | medium_confidence | low_confidence | inconsistent
  ai_confidence  REAL,
  ai_result      TEXT,                              -- JSON completo da análise
  ai_model       TEXT,                              -- versão do modelo/analisador usado
  ai_analyzed_at TEXT,
  consent_at     TEXT,                              -- registro do consentimento (LGPD)
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_verif_user ON verification_requests(user_id, created_at DESC);

-- Histórico auditável de cada solicitação (envio, análise da IA, decisões humanas).
CREATE TABLE IF NOT EXISTS verification_events (
  id          TEXT PRIMARY KEY,
  request_id  TEXT NOT NULL REFERENCES verification_requests(id) ON DELETE CASCADE,
  actor_id    TEXT REFERENCES users(id),           -- NULL = sistema
  event       TEXT NOT NULL,                        -- submitted | resubmitted | ai_analyzed | auto_approved | under_review | approved | needs_info | rejected | review_required | revoked
  reason      TEXT NOT NULL DEFAULT '',
  ai_status   TEXT,
  ai_confidence REAL,
  ai_model    TEXT,
  evidence_ids TEXT NOT NULL DEFAULT '[]',
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_verif_events ON verification_events(request_id, created_at);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS videos (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  category       TEXT NOT NULL DEFAULT 'outros',
  tags           TEXT NOT NULL DEFAULT '',
  video_key      TEXT,
  thumb_key      TEXT,
  duration       INTEGER NOT NULL DEFAULT 0,
  tech           TEXT NOT NULL DEFAULT '{}',
  parent_id      TEXT REFERENCES videos(id) ON DELETE SET NULL, -- resposta em vídeo
  visibility     TEXT NOT NULL DEFAULT 'public',   -- public | unlisted
  status         TEXT NOT NULL DEFAULT 'published',-- published | hidden | removed
  views          INTEGER NOT NULL DEFAULT 0,
  likes          INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  responses_count INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_videos_user ON videos(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_parent ON videos(parent_id);
CREATE INDEX IF NOT EXISTS idx_videos_feed ON videos(status, visibility, created_at DESC);

CREATE VIRTUAL TABLE IF NOT EXISTS videos_fts USING fts5(
  id UNINDEXED, title, description, tags, tech, channel,
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TABLE IF NOT EXISTS comments (
  id         TEXT PRIMARY KEY,
  video_id   TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id  TEXT REFERENCES comments(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'visible',    -- visible | hidden
  likes      INTEGER NOT NULL DEFAULT 0,
  replies_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_comments_video ON comments(video_id, parent_id, created_at);

CREATE TABLE IF NOT EXISTS comment_likes (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, comment_id)
);

CREATE TABLE IF NOT EXISTS likes (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id   TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  PRIMARY KEY (user_id, video_id)
);

CREATE TABLE IF NOT EXISTS follows (
  follower_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  PRIMARY KEY (follower_id, following_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

CREATE TABLE IF NOT EXISTS saves (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id   TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  PRIMARY KEY (user_id, video_id)
);

CREATE TABLE IF NOT EXISTS history (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id   TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  watched_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  PRIMARY KEY (user_id, video_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id   TEXT REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,  -- follow | comment | reply | like | video_response | new_video | verification | admin
  video_id   TEXT REFERENCES videos(id) ON DELETE CASCADE,
  comment_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
  text       TEXT NOT NULL DEFAULT '',
  read_at    TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reports (
  id          TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,  -- video | comment | user
  target_id   TEXT NOT NULL,
  reason      TEXT NOT NULL,
  details     TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'open', -- open | resolved | dismissed
  resolution  TEXT NOT NULL DEFAULT '',
  resolved_by TEXT REFERENCES users(id),
  resolved_at TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS admin_actions (
  id          TEXT PRIMARY KEY,
  admin_id    TEXT NOT NULL REFERENCES users(id),
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   TEXT NOT NULL,
  note        TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
`;
