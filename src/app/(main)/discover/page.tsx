import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { CATEGORIES } from "@/lib/constants";
import { all } from "@/lib/db";
import { discoverChannels, trendingVideos } from "@/lib/queries";
import { ChannelCard, EmptyState, PageContainer, PageTitle, Shelf } from "@/components/ui";
import { VideoGrid } from "@/components/video/VideoCard";

export const metadata = { title: "Descobrir" };

type SP = { type?: string; cat?: string; sort?: string };

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const type = sp.type === "student" || sp.type === "professional" || sp.type === "related" ? sp.type : undefined;
  const category = CATEGORIES.some((c) => c.slug === sp.cat) ? sp.cat : undefined;
  const sort = sp.sort === "new" ? "new" : "popular";
  const channels = await discoverChannels({ type, category, sort, limit: 30 });
  const categoryShelves = await Promise.all(
    CATEGORIES.filter((c) => c.slug !== "outros").map(async (c) => ({ c, videos: await trendingVideos(4, c.slug) })),
  );
  const myFollows = new Set(
    user ? (await all<{ following_id: string }>("SELECT following_id FROM follows WHERE follower_id = ?", user.id)).map((r) => r.following_id) : [],
  );

  const link = (patch: Partial<SP>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) p.set(k, v);
    const s = p.toString();
    return `/discover${s ? `?${s}` : ""}`;
  };

  return (
    <PageContainer>
      <PageTitle icon="compass" title="Descobrir" subtitle="Profissionais e estudantes verificados da comunidade, e conteúdos por tema." />

      <Shelf title="Descubra profissionais" icon="chef">
        <div className="mb-5 flex flex-wrap gap-2">
          <Link href={link({ type: undefined })} className={`chip ${!type ? "chip-on" : "chip-off"}`}>Todos</Link>
          <Link href={link({ type: "professional" })} className={`chip ${type === "professional" ? "chip-on" : "chip-off"}`}>Profissionais</Link>
          <Link href={link({ type: "student" })} className={`chip ${type === "student" ? "chip-on" : "chip-off"}`}>Estudantes</Link>
          <Link href={link({ type: "related" })} className={`chip ${type === "related" ? "chip-on" : "chip-off"}`}>Áreas relacionadas</Link>
          <span className="mx-1 w-px bg-line" />
          <Link href={link({ sort: undefined })} className={`chip ${sort === "popular" ? "chip-on" : "chip-off"}`}>Mais seguidos</Link>
          <Link href={link({ sort: "new" })} className={`chip ${sort === "new" ? "chip-on" : "chip-off"}`}>Recém-chegados</Link>
          <span className="mx-1 w-px bg-line" />
          <select
            aria-label="Especialidade"
            className="chip chip-off cursor-pointer pr-2"
            defaultValue={category ?? ""}
            // navegação sem JS extra: o formulário abaixo envia ao trocar
            form="cat-form"
            name="cat"
          >
            <option value="">Todas as especialidades</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <form id="cat-form" action="/discover" className="contents">
            {type && <input type="hidden" name="type" value={type} />}
            {sp.sort && <input type="hidden" name="sort" value={sp.sort} />}
            <button className="chip chip-off">Filtrar</button>
          </form>
        </div>
        {channels.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {channels.map((c) => (
              <ChannelCard key={c.id} channel={c} following={myFollows.has(c.id)} viewerId={user?.id} />
            ))}
          </div>
        ) : (
          <EmptyState icon="following" title="Nenhum canal com esses filtros" />
        )}
      </Shelf>

      <Shelf title="Descubra conteúdos" icon="sparkles">
        <p className="-mt-2 mb-2 text-sm text-muted">Os destaques de cada tema.</p>
      </Shelf>
      {categoryShelves.map(({ c, videos }) => {
        if (!videos.length) return null;
        return (
          <section key={c.slug} className="pb-8">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold">{c.name}</h3>
              <Link href={`/?cat=${c.slug}`} className="text-sm font-medium text-basil hover:underline">
                Ver tudo
              </Link>
            </div>
            <VideoGrid videos={videos} />
          </section>
        );
      })}
    </PageContainer>
  );
}
