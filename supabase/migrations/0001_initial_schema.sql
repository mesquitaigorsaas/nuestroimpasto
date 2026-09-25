-- Estrutura inicial do banco (Supabase / Postgres). Já aplicada no projeto "Nuestro Impasto".
-- Datas são texto ISO-8601 UTC ("2026-09-25T12:00:00Z"), o mesmo formato usado pelo app.

create extension if not exists unaccent with schema extensions;

create or replace function public.now_iso() returns text
language sql stable set search_path = '' as
$$ select to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') $$;

-- Equivalentes das funções de data do SQLite usadas nas consultas.
create or replace function public.julianday(t text) returns double precision
language sql stable set search_path = '' as
$$ select extract(epoch from (case when t = 'now' then now() else t::timestamptz end)) / 86400.0 + 2440587.5 $$;

create or replace function public.datetime(t text, modifier text) returns text
language sql stable set search_path = '' as
$$ select to_char(((case when t = 'now' then now() else t::timestamptz end) + modifier::interval) at time zone 'UTC',
                  'YYYY-MM-DD"T"HH24:MI:SS"Z"') $$;

create or replace function public.f_unaccent(text) returns text
language sql immutable parallel safe strict set search_path = '' as
$$ select extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;

create table users (
  id                  text primary key,
  email               text not null unique,
  password_hash       text not null,
  name                text not null,
  handle              text not null unique,
  avatar_key          text,
  banner_key          text,
  bio                 text not null default '',
  specialty           text not null default '',
  location            text not null default '',
  website             text not null default '',
  instagram           text not null default '',
  role                text not null default 'user',      -- user | admin
  member_type         text not null default 'viewer',    -- viewer | student | professional | related
  verification_status text not null default 'none',      -- none | pending | under_review | needs_info | verified | rejected
  status              text not null default 'active',    -- active | suspended | banned
  followers_count     integer not null default 0,
  following_count     integer not null default 0,
  created_at          text not null default public.now_iso()
);
create unique index idx_users_handle_lower on users (lower(handle));

create table sessions (
  id         text primary key,
  user_id    text not null references users(id) on delete cascade,
  expires_at text not null
);
create index idx_sessions_user on sessions(user_id);

create table verification_requests (
  id             text primary key,
  user_id        text not null references users(id) on delete cascade,
  type           text not null,                       -- professional | student | related
  data           text not null default '{}',          -- JSON com os campos declarados
  document_key   text,                                -- arquivo no bucket privado
  status         text not null default 'pending_review',
  admin_note     text not null default '',
  reviewed_by    text references users(id),
  reviewed_at    text,
  evidence       text not null default '[]',
  fraud_signals  text not null default '[]',
  ai_status      text,
  ai_confidence  double precision,
  ai_result      text,
  ai_model       text,
  ai_analyzed_at text,
  consent_at     text,                                -- consentimento (LGPD)
  updated_at     text not null default public.now_iso(),
  created_at     text not null default public.now_iso()
);
create index idx_verif_user on verification_requests(user_id, created_at desc);

create table verification_events (
  seq           bigint generated always as identity,  -- ordem de inserção (desempate)
  id            text primary key,
  request_id    text not null references verification_requests(id) on delete cascade,
  actor_id      text references users(id),            -- NULL = sistema
  event         text not null,
  reason        text not null default '',
  ai_status     text,
  ai_confidence double precision,
  ai_model      text,
  evidence_ids  text not null default '[]',
  created_at    text not null default public.now_iso()
);
create index idx_verif_events on verification_events(request_id, created_at);

create table settings (
  key   text primary key,
  value text not null
);

create table videos (
  id              text primary key,
  user_id         text not null references users(id) on delete cascade,
  title           text not null,
  description     text not null default '',
  category        text not null default 'outros',
  tags            text not null default '',
  video_key       text,
  thumb_key       text,
  duration        integer not null default 0,
  tech            text not null default '{}',
  parent_id       text references videos(id) on delete set null, -- resposta em vídeo
  visibility      text not null default 'public',                -- public | unlisted
  status          text not null default 'published',             -- published | hidden | removed
  views           integer not null default 0,
  likes           integer not null default 0,
  comments_count  integer not null default 0,
  responses_count integer not null default 0,
  created_at      text not null default public.now_iso()
);
create index idx_videos_user on videos(user_id, created_at desc);
create index idx_videos_parent on videos(parent_id);
create index idx_videos_feed on videos(status, visibility, created_at desc);

-- Índice de busca: sem acentos, com pesos por campo.
create table videos_fts (
  id          text primary key references videos(id) on delete cascade,
  title       text not null default '',
  description text not null default '',
  tags        text not null default '',
  tech        text not null default '',
  channel     text not null default '',
  document    tsvector generated always as (
    setweight(to_tsvector('simple', public.f_unaccent(title)), 'A') ||
    setweight(to_tsvector('simple', public.f_unaccent(tags || ' ' || channel)), 'B') ||
    setweight(to_tsvector('simple', public.f_unaccent(description || ' ' || tech)), 'C')
  ) stored
);
create index idx_videos_fts on videos_fts using gin(document);

create table comments (
  id            text primary key,
  video_id      text not null references videos(id) on delete cascade,
  user_id       text not null references users(id) on delete cascade,
  parent_id     text references comments(id) on delete cascade,
  body          text not null,
  status        text not null default 'visible',
  likes         integer not null default 0,
  replies_count integer not null default 0,
  created_at    text not null default public.now_iso()
);
create index idx_comments_video on comments(video_id, parent_id, created_at);

create table comment_likes (
  user_id    text not null references users(id) on delete cascade,
  comment_id text not null references comments(id) on delete cascade,
  primary key (user_id, comment_id)
);

create table likes (
  user_id    text not null references users(id) on delete cascade,
  video_id   text not null references videos(id) on delete cascade,
  created_at text not null default public.now_iso(),
  primary key (user_id, video_id)
);

create table follows (
  follower_id  text not null references users(id) on delete cascade,
  following_id text not null references users(id) on delete cascade,
  created_at   text not null default public.now_iso(),
  primary key (follower_id, following_id)
);
create index idx_follows_following on follows(following_id);

create table saves (
  user_id    text not null references users(id) on delete cascade,
  video_id   text not null references videos(id) on delete cascade,
  created_at text not null default public.now_iso(),
  primary key (user_id, video_id)
);

create table history (
  user_id    text not null references users(id) on delete cascade,
  video_id   text not null references videos(id) on delete cascade,
  watched_at text not null default public.now_iso(),
  primary key (user_id, video_id)
);

create table notifications (
  id         text primary key,
  user_id    text not null references users(id) on delete cascade,
  actor_id   text references users(id) on delete cascade,
  type       text not null,
  video_id   text references videos(id) on delete cascade,
  comment_id text references comments(id) on delete cascade,
  text       text not null default '',
  read_at    text,
  created_at text not null default public.now_iso()
);
create index idx_notifications_user on notifications(user_id, created_at desc);

create table reports (
  id          text primary key,
  reporter_id text not null references users(id) on delete cascade,
  target_type text not null,  -- video | comment | user
  target_id   text not null,
  reason      text not null,
  details     text not null default '',
  status      text not null default 'open',
  resolution  text not null default '',
  resolved_by text references users(id),
  resolved_at text,
  created_at  text not null default public.now_iso()
);

create table admin_actions (
  id          text primary key,
  admin_id    text not null references users(id),
  action      text not null,
  target_type text not null,
  target_id   text not null,
  note        text not null default '',
  created_at  text not null default public.now_iso()
);

-- O app acessa o banco só pelo servidor (conexão direta). RLS ligado e sem políticas
-- bloqueia qualquer acesso pela API pública do Supabase (chave anon/publishable).
do $$
declare t text;
begin
  foreach t in array array['users','sessions','verification_requests','verification_events','settings','videos',
    'videos_fts','comments','comment_likes','likes','follows','saves','history','notifications','reports','admin_actions']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Arquivos: "media" é público (vídeos, miniaturas, fotos); "private" guarda documentos da verificação.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
 ('media', 'media', true, 52428800, array['video/mp4','video/webm','video/quicktime','image/jpeg','image/png','image/webp']),
 ('private', 'private', false, 20971520, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;
