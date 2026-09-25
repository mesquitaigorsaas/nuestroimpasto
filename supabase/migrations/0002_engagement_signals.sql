-- Sinais de recomendação no estilo do YouTube.
alter table videos
  add column impressions    integer not null default 0,  -- vezes que a miniatura apareceu na tela
  add column clicks         integer not null default 0,  -- cliques vindos de uma miniatura
  add column watch_seconds  bigint  not null default 0,  -- tempo total assistido (todas as pessoas)
  add column watch_sessions integer not null default 0;  -- sessões de reprodução (para a média)

alter table history
  add column seconds_watched integer not null default 0,           -- quanto esta pessoa assistiu
  add column progress        double precision not null default 0;  -- maior ponto alcançado (0 a 1)
