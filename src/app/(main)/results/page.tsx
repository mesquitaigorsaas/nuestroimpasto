import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { CATEGORIES } from "@/lib/constants";
import { all } from "@/lib/db";
import { activeDiscussions, searchChannels, searchVideos, type SearchFilters } from "@/lib/queries";
import { ChannelCard, EmptyState, PageContainer } from "@/components/ui";
import { VideoRow } from "@/components/video/VideoCard";
import { Icon } from "@/components/icons";

type SP = { q?: string; kind?: string; member?: string; cat?: string; sort?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `${q} — busca` : "Busca" };
}

const SUGGESTIONS = ["Massa napolitana", "65% hidratação", "Biga 48 horas", "Poolish", "Fermentação natural", "Forno a lenha", "Farinha 00"];

export default async function ResultsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const filters: SearchFilters = {
    q,
    kind: (["all", "videos", "channels", "discussions"].includes(sp.kind ?? "") ? sp.kind : "all") as SearchFilters["kind"],
    member: (["student", "professional", "related"].includes(sp.member ?? "") ? sp.member : "all") as SearchFilters["member"],
    category: CATEGORIES.some((c) => c.slug === sp.cat) ? sp.cat : undefined,
    sort: (["new", "views"].includes(sp.sort ?? "") ? sp.sort : "relevance") as SearchFilters["sort"],
  };
  const user = await getCurrentUser();

  const link = (patch: Partial<SP>) => {
    const next = new URLSearchParams();
    const merged = { ...sp, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v && v !== "all" && v !== "relevance") next.set(k, v);
    if (!next.has("q")) next.set("q", q);
    return `/results?${next.toString()}`;
  };

  // Sem termo: página de descoberta da busca (sugestões + discussões ativas)
  if (!q && filters.kind !== "discussions") {
    return (
      <PageContainer className="max-w-4xl">
        <h1 className="title-tricolore text-2xl font-bold">Busca</h1>
        <p className="mt-3 text-sm text-muted">Pesquise por profissionais, técnicas, ingredientes, tipos de massa ou métodos.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <Link key={s} href={`/results?q=${encodeURIComponent(s)}`} className="chip chip-off">
              <Icon name="search" size={14} className="mr-1.5" /> {s}
            </Link>
          ))}
        </div>
      </PageContainer>
    );
  }

  const showVideos = filters.kind !== "channels";
  const showChannels = filters.kind === "all" || filters.kind === "channels";
  const videos = showVideos ? (q ? await searchVideos(filters) : await activeDiscussions(30)) : [];
  const channels = showChannels && q ? await searchChannels(filters, filters.kind === "channels" ? 30 : 4) : [];
  const myFollows = new Set(
    user ? (await all<{ following_id: string }>("SELECT following_id FROM follows WHERE follower_id = ?", user.id)).map((r) => r.following_id) : [],
  );

  return (
    <PageContainer className="max-w-[1100px]">
      {/* Filtros */}
      <div className="mb-6 flex flex-col gap-3">
        <FilterRow
          label="Tipo"
          items={[
            { v: "all", l: "Tudo" },
            { v: "videos", l: "Vídeos" },
            { v: "channels", l: "Canais" },
            { v: "discussions", l: "Discussões" },
          ]}
          active={filters.kind ?? "all"}
          href={(v) => link({ kind: v })}
        />
        <FilterRow
          label="Membro"
          items={[
            { v: "all", l: "Todos" },
            { v: "professional", l: "Profissional verificado" },
            { v: "student", l: "Estudante verificado" },
            { v: "related", l: "Área relacionada" },
          ]}
          active={filters.member ?? "all"}
          href={(v) => link({ member: v })}
        />
        {filters.kind !== "channels" && (
          <>
            <FilterRow
              label="Tema"
              items={[{ v: "", l: "Todos" }, ...CATEGORIES.map((c) => ({ v: c.slug, l: c.name }))]}
              active={filters.category ?? ""}
              href={(v) => link({ cat: v || undefined })}
            />
            <FilterRow
              label="Ordenar"
              items={[
                { v: "relevance", l: "Relevância" },
                { v: "new", l: "Mais recentes" },
                { v: "views", l: "Mais vistos" },
              ]}
              active={filters.sort ?? "relevance"}
              href={(v) => link({ sort: v })}
            />
          </>
        )}
      </div>

      {q && (
        <p className="mb-4 text-sm text-muted">
          Resultados para <b className="text-ink">“{q}”</b>
        </p>
      )}
      {!q && filters.kind === "discussions" && <h1 className="title-tricolore mb-6 text-xl font-bold">Discussões ativas</h1>}

      {channels.length > 0 && (
        <section className="mb-8">
          {filters.kind === "all" && <h2 className="title-tricolore mb-4 font-bold">Canais</h2>}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {channels.map((c) => (
              <ChannelCard key={c.id} channel={c} following={myFollows.has(c.id)} viewerId={user?.id} />
            ))}
          </div>
        </section>
      )}

      {showVideos && (
        <section className="flex flex-col gap-5">
          {filters.kind === "all" && channels.length > 0 && videos.length > 0 && <h2 className="title-tricolore font-bold">Vídeos</h2>}
          {videos.map((v) => (
            <VideoRow
              key={v.id}
              video={v}
              size="lg"
              extra={
                filters.kind === "discussions" ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-basil">
                    <Icon name="message" size={14} /> {v.comments_count} comentários · {v.responses_count} respostas em vídeo
                  </p>
                ) : undefined
              }
            />
          ))}
        </section>
      )}

      {videos.length === 0 && channels.length === 0 && (
        <EmptyState icon="search" title="Nada encontrado" text="Tente outras palavras, menos filtros, ou termos como “biga”, “levain”, “forno a lenha”." />
      )}
    </PageContainer>
  );
}

function FilterRow({ label, items, active, href }: { label: string; items: { v: string; l: string }[]; active: string; href: (v: string) => string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-xs font-semibold tracking-wide text-muted uppercase">{label}</span>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {items.map((it) => (
          <Link key={it.v || "none"} href={href(it.v)} className={`chip h-7 text-[13px] ${active === it.v ? "chip-on" : "chip-off"}`}>
            {it.l}
          </Link>
        ))}
      </div>
    </div>
  );
}
