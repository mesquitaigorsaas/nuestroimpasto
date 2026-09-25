import Link from "next/link";
import { getCurrentUser, canPublish } from "@/lib/auth";
import { CATEGORIES, categoryName } from "@/lib/constants";
import { all } from "@/lib/db";
import { activeDiscussions, followingVideos, forYou, newCreators, trendingVideos } from "@/lib/queries";
import { ChannelCard, EmptyState, PageContainer, Shelf } from "@/components/ui";
import { VideoCard, VideoGrid } from "@/components/video/VideoCard";
import { Icon } from "@/components/icons";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat } = await searchParams;
  const category = CATEGORIES.some((c) => c.slug === cat) ? cat : undefined;
  const user = await getCurrentUser();

  const chips = (
    <div className="no-scrollbar sticky top-14 z-20 -mx-4 mb-4 flex gap-3 overflow-x-auto bg-cream/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <Link href="/" className={`chip ${!category ? "chip-on" : "chip-off"}`}>
        Tudo
      </Link>
      {CATEGORIES.map((c) => (
        <Link key={c.slug} href={`/?cat=${c.slug}`} className={`chip ${category === c.slug ? "chip-on" : "chip-off"}`}>
          {c.name}
        </Link>
      ))}
    </div>
  );

  if (category) {
    const videos = forYou(user?.id ?? null, 48, category);
    return (
      <PageContainer className="pt-0">
        {chips}
        {videos.length ? (
          <VideoGrid videos={videos} />
        ) : (
          <EmptyState title={`Ainda não há vídeos de ${categoryName(category)}`} text="Seja um dos primeiros a publicar nesta especialidade." />
        )}
      </PageContainer>
    );
  }

  const feed = forYou(user?.id ?? null, 36);
  const following = user ? followingVideos(user.id, 8) : [];
  const trending = trendingVideos(8);
  const discussions = activeDiscussions(4);
  const creators = newCreators(5, user?.id);
  const followedIds = new Set(
    user ? all<{ following_id: string }>("SELECT following_id FROM follows WHERE follower_id = ?", user.id).map((r) => r.following_id) : [],
  );

  if (feed.length === 0) {
    return (
      <PageContainer className="pt-0">
        {chips}
        <Welcome canPost={canPublish(user)} loggedIn={!!user} />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="pt-0">
      {chips}
      <VideoGrid videos={feed.slice(0, 8)} />

      {following.length > 0 && (
        <Shelf title="Seguindo" icon="following" href="/feed/following">
          <VideoGrid videos={following.slice(0, 4)} />
        </Shelf>
      )}

      {creators.length > 0 && (
        <Shelf title="Novos profissionais" icon="sparkles" href="/discover?sort=new">
          <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-5">
            {creators.map((c) => (
              <div key={c.id} className="w-56 shrink-0 sm:w-auto">
                <ChannelCard channel={c} following={followedIds.has(c.id)} viewerId={user?.id} />
              </div>
            ))}
          </div>
        </Shelf>
      )}

      {discussions.length > 0 && (
        <Shelf title="Discussões ativas" icon="message" href="/results?q=&kind=discussions">
          <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {discussions.map((v) => (
              <div key={v.id}>
                <VideoCard video={v} />
                <p className="mt-2 flex items-center gap-1.5 pl-12 text-xs font-medium text-gold-dark sm:pl-12">
                  <Icon name="message" size={14} />
                  {v.comments_count} comentários{v.responses_count ? ` · ${v.responses_count} respostas em vídeo` : ""}
                </p>
              </div>
            ))}
          </div>
        </Shelf>
      )}

      <Shelf title="Em alta" icon="flame" href="/feed/trending">
        <VideoGrid videos={trending.slice(0, 4)} />
      </Shelf>

      {feed.length > 8 && (
        <Shelf title="Mais para você" icon="sparkles">
          <VideoGrid videos={feed.slice(8)} />
        </Shelf>
      )}
    </PageContainer>
  );
}

function Welcome({ canPost, loggedIn }: { canPost: boolean; loggedIn: boolean }) {
  return (
    <div className="mx-auto max-w-2xl py-16 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/mark.png" alt="" className="mx-auto size-20" />
      <h1 className="mt-6 text-3xl font-bold tracking-tight">La comunidad de los que hacen masa</h1>
      <p className="mt-3 text-ink-2">
        Pizzaiolos, padeiros e profissionais de massas mostrando o que fazem: o forno, a massa do dia, os testes de hidratação,
        a receita da família. Qualquer pessoa assiste. Membros verificados publicam.
      </p>
      <div className="tricolore mx-auto mt-6 h-1 w-24 rounded-full" />
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {canPost ? (
          <Link href="/studio/upload" className="btn btn-primary h-11 px-6">
            <Icon name="upload" size={20} /> Publicar o primeiro vídeo
          </Link>
        ) : loggedIn ? (
          <Link href="/verification" className="btn btn-primary h-11 px-6">
            <Icon name="shield" size={20} /> Solicitar verificação para publicar
          </Link>
        ) : (
          <>
            <Link href="/signup" className="btn btn-primary h-11 px-6">
              Criar conta
            </Link>
            <Link href="/login" className="btn btn-outline h-11 px-6">
              Entrar
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
