import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { CATEGORIES } from "@/lib/constants";
import { followingChannels, followingVideos, historyVideos, likedVideos, savedVideos, trendingVideos } from "@/lib/queries";
import { EmptyState, PageContainer, PageTitle } from "@/components/ui";
import { VideoGrid, VideoRow } from "@/components/video/VideoCard";
import { Avatar } from "@/components/Avatar";
import { HistoryControls, RemoveFromHistory } from "./HistoryControls";

const META = {
  trending: { title: "Em alta", icon: "flame", subtitle: "O que a comunidade está assistindo e comentando agora." },
  following: { title: "Seguindo", icon: "following", subtitle: "Os vídeos mais recentes dos canais que você segue." },
  history: { title: "Histórico", icon: "history", subtitle: "Vídeos que você assistiu." },
  saved: { title: "Salvos", icon: "bookmark", subtitle: "Vídeos que você guardou para ver ou testar depois." },
  liked: { title: "Vídeos curtidos", icon: "like", subtitle: "Tudo que você curtiu." },
} as const;

type Kind = keyof typeof META;

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  return { title: META[kind as Kind]?.title ?? "Feed" };
}

export default async function FeedPage({ params, searchParams }: { params: Promise<{ kind: string }>; searchParams: Promise<{ cat?: string }> }) {
  const { kind } = await params;
  const { cat } = await searchParams;
  if (!(kind in META)) notFound();
  const meta = META[kind as Kind];
  const user = await getCurrentUser();
  if (kind !== "trending" && !user) redirect(`/login?next=/feed/${kind}`);

  if (kind === "trending") {
    const category = CATEGORIES.some((c) => c.slug === cat) ? cat : undefined;
    const videos = await trendingVideos(48, category);
    return (
      <PageContainer>
        <PageTitle icon={meta.icon} title={meta.title} subtitle={meta.subtitle} />
        <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto">
          <Link href="/feed/trending" className={`chip ${!category ? "chip-on" : "chip-off"}`}>Tudo</Link>
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/feed/trending?cat=${c.slug}`} className={`chip ${category === c.slug ? "chip-on" : "chip-off"}`}>
              {c.name}
            </Link>
          ))}
        </div>
        {videos.length ? <VideoGrid videos={videos} /> : <EmptyState icon="flame" title="Nada em alta por aqui ainda" />}
      </PageContainer>
    );
  }

  const u = user!;

  if (kind === "following") {
    const videos = await followingVideos(u.id, 60);
    const channels = await followingChannels(u.id);
    return (
      <PageContainer>
        <PageTitle icon={meta.icon} title={meta.title} subtitle={meta.subtitle} />
        {channels.length > 0 && (
          <div className="no-scrollbar mb-8 flex gap-5 overflow-x-auto pb-2">
            {channels.map((c) => (
              <Link key={c.id} href={`/@${c.handle}`} className="flex w-20 shrink-0 flex-col items-center gap-1.5 text-center text-xs">
                <span className={`rounded-full p-[2.5px] ${c.has_new ? "tricolore" : ""}`}>
                  <Avatar name={c.name} src={c.avatar_key} size={64} className="border-2 border-cream" />
                </span>
                <span className="line-clamp-1 w-full">{c.name.split(" ")[0]}</span>
              </Link>
            ))}
          </div>
        )}
        {videos.length ? (
          <VideoGrid videos={videos} />
        ) : (
          <EmptyState
            icon="following"
            title={channels.length ? "Os canais que você segue ainda não publicaram" : "Você ainda não segue ninguém"}
            text="Descubra profissionais e estudantes e acompanhe a evolução deles."
            action={<Link href="/discover" className="btn btn-green">Descobrir profissionais</Link>}
          />
        )}
      </PageContainer>
    );
  }

  if (kind === "history") {
    const videos = await historyVideos(u.id);
    return (
      <PageContainer className="max-w-5xl">
        <PageTitle icon={meta.icon} title={meta.title} subtitle={meta.subtitle} actions={videos.length ? <HistoryControls /> : undefined} />
        {videos.length ? (
          <div className="flex flex-col gap-5">
            {videos.map((v) => (
              <div key={v.id} className="group relative">
                <VideoRow video={v} size="lg" />
                <RemoveFromHistory videoId={v.id} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="history" title="Seu histórico está vazio" text="Os vídeos que você assistir aparecem aqui." />
        )}
      </PageContainer>
    );
  }

  const videos = kind === "saved" ? await savedVideos(u.id) : await likedVideos(u.id);
  return (
    <PageContainer>
      <PageTitle icon={meta.icon} title={meta.title} subtitle={`${meta.subtitle} · ${videos.length} ${videos.length === 1 ? "vídeo" : "vídeos"}`} />
      {videos.length ? (
        <VideoGrid videos={videos} />
      ) : (
        <EmptyState
          icon={meta.icon}
          title={kind === "saved" ? "Nenhum vídeo salvo" : "Nenhum vídeo curtido"}
          text={kind === "saved" ? "Use o botão Salvar nos vídeos para guardar técnicas e receitas para testar depois." : undefined}
        />
      )}
    </PageContainer>
  );
}
