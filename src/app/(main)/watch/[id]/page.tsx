import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { canPublish, getCurrentUser } from "@/lib/auth";
import { parseJson, followersLabel } from "@/lib/format";
import type { TechInfo } from "@/lib/constants";
import { getVideo, relatedVideos, topComments, videoResponses, viewerVideoState } from "@/lib/queries";
import { Avatar } from "@/components/Avatar";
import { Icon, VerifiedBadge } from "@/components/icons";
import { FollowButton } from "@/components/social/FollowButton";
import { MemberTypeTag } from "@/components/ui";
import { Comments } from "@/components/comments/Comments";
import { DescriptionBox } from "@/components/video/DescriptionBox";
import { VideoActions } from "@/components/video/VideoActions";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { Thumbnail, VideoRow } from "@/components/video/VideoCard";

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ c?: string; published?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const video = await getVideo(id);
  if (!video) return { title: "Vídeo não encontrado" };
  return { title: video.title, description: video.description.slice(0, 160) };
}

export default async function WatchPage({ params, searchParams }: Params) {
  const { id } = await params;
  const { c, published } = await searchParams;
  const user = await getCurrentUser();
  const video = await getVideo(id);

  const isOwner = !!user && video?.user_id === user.id;
  const isAdmin = user?.role === "admin";
  if (!video || video.status === "removed" || (video.status === "hidden" && !isOwner && !isAdmin)) notFound();

  const sort = c === "new" ? "new" : "top";
  const state = await viewerVideoState(user?.id, video);
  const comments = await topComments(video.id, user?.id ?? null, sort);
  const responses = await videoResponses(video.id);
  const parent = video.parent_id ? await getVideo(video.parent_id) : undefined;
  const related = await relatedVideos(video, 18);
  const tech = parseJson<TechInfo>(video.tech, {});

  return (
    <div className="mx-auto flex max-w-[1760px] flex-col gap-6 px-4 pt-4 pb-10 sm:px-6 lg:flex-row">
      <div className="min-w-0 flex-1">
        {published && isOwner && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl bg-basil/10 px-4 py-3 text-sm text-basil">
            <Icon name="check" size={20} />
            <span className="flex-1">Vídeo publicado! Ele já aparece para seus seguidores e na busca.</span>
            <Link href={`/studio/videos/${video.id}`} className="font-semibold hover:underline">
              Editar
            </Link>
          </div>
        )}
        {video.status === "hidden" && (
          <div className="mb-4 rounded-2xl bg-tomato/10 px-4 py-3 text-sm text-tomato">
            Este vídeo foi ocultado pela moderação e só é visível para você{isAdmin ? " e administradores" : ""}.
          </div>
        )}

        <VideoPlayer id={video.id} videoKey={video.video_key} thumbKey={video.thumb_key} />

        {parent && (
          <Link
            href={`/watch/${parent.id}`}
            className="mt-3 flex items-center gap-3 rounded-2xl border border-basil/30 bg-basil/5 p-2 pr-4 hover:bg-basil/10"
          >
            <div className="w-28 shrink-0">
              <Thumbnail video={parent} className="rounded-lg" />
            </div>
            <div className="min-w-0 text-sm">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-basil">
                <Icon name="videoReply" size={15} /> Este vídeo responde a
              </div>
              <div className="line-clamp-1 font-semibold">{parent.title}</div>
              <div className="text-xs text-muted">{parent.channel_name}</div>
            </div>
          </Link>
        )}

        <h1 className="mt-3 text-lg leading-snug font-bold sm:text-xl">{video.title}</h1>

        <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/@${video.channel_handle}`} className="shrink-0">
              <Avatar name={video.channel_name} src={video.channel_avatar} size={42} />
            </Link>
            <div className="min-w-0">
              <Link href={`/@${video.channel_handle}`} className="flex items-center gap-1 font-semibold">
                <span className="truncate">{video.channel_name}</span>
                <VerifiedBadge type={video.channel_member_type} />
              </Link>
              <p className="truncate text-xs text-muted">
                {followersLabel(video.channel_followers)}
                {video.channel_specialty ? ` · ${video.channel_specialty}` : ""}
              </p>
            </div>
            {!isOwner && (
              <div className="ml-2 shrink-0">
                <FollowButton channelId={video.user_id} initialFollowing={state.following} loggedIn={!!user} />
              </div>
            )}
            {isOwner && (
              <Link href={`/studio/videos/${video.id}`} className="btn btn-soft ml-2">
                <Icon name="edit" size={18} /> Editar
              </Link>
            )}
          </div>
          <VideoActions
            videoId={video.id}
            title={video.title}
            likes={video.likes}
            liked={state.liked}
            saved={state.saved}
            loggedIn={!!user}
            canRespond={canPublish(user) && !isOwner}
            isOwner={isOwner}
          />
        </div>

        <div className="mt-2">
          <MemberTypeTag type={video.channel_member_type} />
        </div>

        <DescriptionBox
          views={video.views}
          createdAt={video.created_at}
          description={video.description}
          tags={video.tags}
          category={video.category}
          tech={tech}
        />

        {(responses.length > 0 || canPublish(user)) && (
          <section className="mt-6 rounded-2xl border border-line bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="title-tricolore flex items-center gap-2 font-bold">
                <Icon name="videoReply" size={20} className="text-basil" />
                Respostas em vídeo {responses.length > 0 && <span className="text-muted">· {responses.length}</span>}
              </h2>
              {canPublish(user) && !isOwner && (
                <Link href={`/studio/upload?reply=${video.id}`} className="btn btn-green h-8">
                  <Icon name="videoReply" size={18} /> Responder com vídeo
                </Link>
              )}
            </div>
            {responses.length > 0 ? (
              <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
                {responses.map((r) => (
                  <Link key={r.id} href={`/watch/${r.id}`} className="w-56 shrink-0" data-impression={r.id}>
                    <Thumbnail video={r} className="rounded-lg" />
                    <p className="mt-1.5 line-clamp-2 text-sm font-semibold">{r.title}</p>
                    <p className="flex items-center gap-1 text-xs text-muted">
                      {r.channel_name} <VerifiedBadge type={r.channel_member_type} size={11} />
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Nenhuma resposta em vídeo ainda. Mostre como você faz: responda com seu próprio vídeo.</p>
            )}
          </section>
        )}

        <Comments
          key={sort}
          videoId={video.id}
          videoOwnerId={video.user_id}
          total={video.comments_count}
          initial={comments}
          sort={sort}
          viewer={user ? { id: user.id, name: user.name, avatar_key: user.avatar_key, role: user.role } : null}
        />
      </div>

      <aside className="w-full shrink-0 lg:w-[402px]">
        <h2 className="title-tricolore mb-3 font-bold lg:hidden">A seguir</h2>
        <div className="flex flex-col gap-3">
          {related.map((v) => (
            <VideoRow key={v.id} video={v} />
          ))}
        </div>
      </aside>
    </div>
  );
}
