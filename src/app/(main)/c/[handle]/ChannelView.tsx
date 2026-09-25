import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isPublisherType } from "@/lib/constants";
import { get } from "@/lib/db";
import { formatDate, followersLabel, mediaUrl, viewsLabel } from "@/lib/format";
import { channelVideos, getChannelByHandle, followList } from "@/lib/queries";
import { Avatar } from "@/components/Avatar";
import { Icon, VerifiedBadge } from "@/components/icons";
import { FollowButton } from "@/components/social/FollowButton";
import { ChannelCard, EmptyState, MemberTypeTag } from "@/components/ui";
import { VideoCard, VideoGrid } from "@/components/video/VideoCard";
import { ChannelMenu } from "./ChannelMenu";

export type ChannelTab = "home" | "videos" | "respostas" | "seguidores" | "sobre";

const TABS: { key: ChannelTab; label: string }[] = [
  { key: "home", label: "Início" },
  { key: "videos", label: "Vídeos" },
  { key: "respostas", label: "Respostas em vídeo" },
  { key: "seguidores", label: "Seguidores" },
  { key: "sobre", label: "Sobre" },
];

export async function ChannelView({ handle, tab, sort }: { handle: string; tab: ChannelTab; sort?: string }) {
  const decoded = decodeURIComponent(handle).replace(/^@/, "");
  const channel = getChannelByHandle(decoded);
  if (!channel || channel.status === "banned") notFound();
  const viewer = await getCurrentUser();
  const isMe = viewer?.id === channel.id;
  const following = viewer ? !!get("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?", viewer.id, channel.id) : false;
  const isPublisher = isPublisherType(channel.member_type);
  const banner = mediaUrl(channel.banner_key);
  const base = `/@${channel.handle}`;

  return (
    <div className="mx-auto w-full max-w-[1284px] px-4 pb-10 sm:px-6">
      {/* Banner */}
      <div className="mt-2 overflow-hidden rounded-2xl">
        {banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={banner} alt="" className="aspect-[6/1] w-full object-cover" />
        ) : (
          <div className="relative aspect-[6/1] min-h-24 w-full bg-gradient-to-r from-ink via-ink-2 to-ink">
            <div className="tricolore absolute right-0 bottom-0 left-0 h-1.5" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mark.png" alt="" className="absolute top-1/2 right-8 h-3/5 -translate-y-1/2 opacity-15 invert" />
          </div>
        )}
      </div>

      {/* Cabeçalho do canal */}
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar name={channel.name} src={channel.avatar_key} size={120} className="hidden sm:inline-flex" />
        <div className="flex items-center gap-4 sm:block">
          <Avatar name={channel.name} src={channel.avatar_key} size={72} className="sm:hidden" />
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-[34px]">
              {channel.name} <VerifiedBadge type={channel.member_type} size={22} />
            </h1>
            <p className="mt-1 text-sm text-muted">
              <span className="font-medium text-ink">@{channel.handle}</span> · {followersLabel(channel.followers_count)} ·{" "}
              {channel.videos_count} {channel.videos_count === 1 ? "vídeo" : "vídeos"}
            </p>
            {channel.specialty && <p className="mt-1 line-clamp-1 text-sm text-ink-2">{channel.specialty}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <MemberTypeTag type={channel.member_type} />
              {channel.location && (
                <span className="inline-flex items-center gap-1 text-xs text-muted">
                  <Icon name="mapPin" size={14} /> {channel.location}
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {isMe ? (
                <>
                  <Link href="/studio/settings" className="btn btn-soft">
                    Personalizar canal
                  </Link>
                  <Link href="/studio" className="btn btn-soft">
                    Gerenciar vídeos
                  </Link>
                  {!isPublisher && (
                    <Link href="/verification" className="btn btn-green">
                      <Icon name="shield" size={18} /> Verificar para publicar
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <FollowButton channelId={channel.id} initialFollowing={following} loggedIn={!!viewer} />
                  <ChannelMenu channelId={channel.id} loggedIn={!!viewer} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Abas */}
      <nav className="no-scrollbar sticky top-14 z-20 -mx-4 mt-4 flex gap-1 overflow-x-auto border-b border-line bg-cream/95 px-4 backdrop-blur sm:-mx-6 sm:px-6">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "home" ? base : `${base}/${t.key}`}
            className={`relative shrink-0 px-4 py-3 text-[15px] font-medium ${tab === t.key ? "text-ink" : "text-muted hover:text-ink"}`}
          >
            {t.label}
            {tab === t.key && <span className="tricolore absolute right-2 bottom-0 left-2 h-[3px] rounded-full" />}
          </Link>
        ))}
      </nav>

      <div className="pt-6">
        {tab === "home" && <HomeTab channelId={channel.id} name={channel.name} isMe={isMe} isPublisher={isPublisher} />}
        {tab === "videos" && <VideosTab channelId={channel.id} base={base} sort={sort} isMe={isMe} />}
        {tab === "respostas" && <ResponsesTab channelId={channel.id} />}
        {tab === "seguidores" && <FollowersTab channelId={channel.id} viewerId={viewer?.id} />}
        {tab === "sobre" && (
          <div className="grid gap-8 md:grid-cols-[1fr_320px]">
            <div>
              <h2 className="title-tricolore mb-3 text-lg font-bold">Sobre</h2>
              <p className="whitespace-pre-line text-ink-2">{channel.bio || "Este canal ainda não escreveu uma descrição."}</p>
              {(channel.website || channel.instagram) && (
                <>
                  <h3 className="mt-6 mb-2 font-semibold">Links</h3>
                  <div className="flex flex-col gap-2 text-sm">
                    {channel.website && (
                      <a href={channel.website.startsWith("http") ? channel.website : `https://${channel.website}`} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-2 text-basil hover:underline">
                        <Icon name="globe" size={18} /> {channel.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                    {channel.instagram && (
                      <a href={`https://instagram.com/${channel.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-2 text-basil hover:underline">
                        <Icon name="instagram" size={18} /> @{channel.instagram.replace(/^@/, "")}
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="card h-fit p-5 text-sm">
              <h3 className="mb-3 font-semibold">Estatísticas</h3>
              <ul className="flex flex-col gap-3 text-ink-2">
                <li className="flex items-center gap-2"><Icon name="calendar" size={18} /> Entrou em {formatDate(channel.created_at)}</li>
                <li className="flex items-center gap-2"><Icon name="eye" size={18} /> {viewsLabel(channel.total_views)}</li>
                <li className="flex items-center gap-2"><Icon name="following" size={18} /> {followersLabel(channel.followers_count)}</li>
                {channel.specialty && <li className="flex items-center gap-2"><Icon name="chef" size={18} /> {channel.specialty}</li>}
              </ul>
              <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
                A verificação confirma a identidade e a condição de estudante/profissional. Não é uma garantia sobre o conteúdo publicado.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HomeTab({ channelId, name, isMe, isPublisher }: { channelId: string; name: string; isMe: boolean; isPublisher: boolean }) {
  const recent = channelVideos(channelId, "new");
  if (!recent.length) {
    return (
      <EmptyState
        icon="film"
        title={isMe ? "Seu canal ainda não tem vídeos" : `${name} ainda não publicou vídeos`}
        text={isMe ? (isPublisher ? "Mostre o que você está fazendo hoje: a massa, o forno, um teste." : "Para publicar, solicite a verificação como estudante ou profissional.") : undefined}
        action={isMe ? <Link href={isPublisher ? "/studio/upload" : "/verification"} className="btn btn-green">{isPublisher ? "Publicar vídeo" : "Solicitar verificação"}</Link> : undefined}
      />
    );
  }
  const [featured, ...rest] = recent;
  const popular = channelVideos(channelId, "popular").slice(0, 8);
  return (
    <>
      <div className="grid gap-4 border-b border-line pb-8 md:grid-cols-[minmax(0,420px)_1fr]">
        <VideoCard video={featured} hideChannel />
        <div className="hidden md:block" />
      </div>
      {rest.length > 0 && (
        <section className="py-6">
          <h2 className="title-tricolore mb-4 text-lg font-bold">Vídeos recentes</h2>
          <VideoGrid videos={rest.slice(0, 8)} hideChannel />
        </section>
      )}
      {recent.length > 4 && (
        <section className="border-t border-line py-6">
          <h2 className="title-tricolore mb-4 text-lg font-bold">Populares</h2>
          <VideoGrid videos={popular} hideChannel />
        </section>
      )}
    </>
  );
}

function VideosTab({ channelId, base, sort, isMe }: { channelId: string; base: string; sort?: string; isMe: boolean }) {
  const s = sort === "popular" ? "popular" : sort === "old" ? "old" : "new";
  const videos = channelVideos(channelId, s);
  return (
    <>
      <div className="mb-5 flex gap-2">
        {[
          { k: "new", l: "Mais recentes" },
          { k: "popular", l: "Populares" },
          { k: "old", l: "Mais antigos" },
        ].map((o) => (
          <Link key={o.k} href={`${base}/videos${o.k === "new" ? "" : `?sort=${o.k}`}`} className={`chip ${s === o.k ? "chip-on" : "chip-off"}`}>
            {o.l}
          </Link>
        ))}
      </div>
      {videos.length ? <VideoGrid videos={videos} hideChannel /> : <EmptyState title="Nenhum vídeo" text={isMe ? "Publique seu primeiro vídeo pelo Estúdio." : undefined} />}
    </>
  );
}

function ResponsesTab({ channelId }: { channelId: string }) {
  const videos = channelVideos(channelId, "new", true);
  return videos.length ? (
    <VideoGrid videos={videos} hideChannel />
  ) : (
    <EmptyState icon="videoReply" title="Nenhuma resposta em vídeo" text="Quando este canal responder ao vídeo de outro profissional, aparece aqui." />
  );
}

function FollowersTab({ channelId, viewerId }: { channelId: string; viewerId?: string }) {
  const followers = followList(channelId, "followers");
  const following = followList(channelId, "following");
  const myFollows = new Set(
    viewerId
      ? (get<{ ids: string }>("SELECT group_concat(following_id) AS ids FROM follows WHERE follower_id = ?", viewerId)?.ids ?? "").split(",")
      : [],
  );
  const grid = "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5";
  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="title-tricolore mb-4 text-lg font-bold">Seguidores na comunidade · {followers.length}</h2>
        {followers.length ? (
          <div className={grid}>
            {followers.map((c) => (
              <ChannelCard key={c.id} channel={c} following={myFollows.has(c.id)} viewerId={viewerId} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Ainda sem seguidores.</p>
        )}
      </section>
      <section>
        <h2 className="title-tricolore mb-4 text-lg font-bold">Seguindo · {following.length}</h2>
        {following.length ? (
          <div className={grid}>
            {following.map((c) => (
              <ChannelCard key={c.id} channel={c} following={myFollows.has(c.id)} viewerId={viewerId} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Ainda não segue ninguém.</p>
        )}
      </section>
    </div>
  );
}
