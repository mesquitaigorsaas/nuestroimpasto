import Link from "next/link";
import { categoryName } from "@/lib/constants";
import { formatDuration, mediaUrl, timeAgo, viewsLabel } from "@/lib/format";
import type { VideoCardData } from "@/lib/types";
import { Avatar } from "../Avatar";
import { Icon, VerifiedBadge } from "../icons";

export function Thumbnail({ video, className = "" }: { video: Pick<VideoCardData, "thumb_key" | "duration" | "title" | "category">; className?: string }) {
  const url = mediaUrl(video.thumb_key);
  return (
    <div className={`relative aspect-video w-full overflow-hidden rounded-xl bg-cream-3 ${className}`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-ink to-ink-2 text-cream">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mark.png" alt="" className="size-10 opacity-80 invert" />
          <span className="text-xs tracking-widest uppercase opacity-70">{categoryName(video.category)}</span>
        </div>
      )}
      {video.duration > 0 && (
        <span className="absolute right-1.5 bottom-1.5 rounded-md bg-ink/85 px-1.5 py-0.5 text-xs font-medium text-white">
          {formatDuration(video.duration)}
        </span>
      )}
    </div>
  );
}

export function VideoCard({ video, hideChannel = false }: { video: VideoCardData; hideChannel?: boolean }) {
  return (
    <div className="group flex flex-col gap-3" data-impression={video.id}>
      <Link href={`/watch/${video.id}`} className="block" aria-label={video.title}>
        <Thumbnail video={video} />
      </Link>
      <div className="flex gap-3 px-1 sm:px-0">
        {!hideChannel && (
          <Link href={`/@${video.channel_handle}`} className="mt-0.5 shrink-0">
            <Avatar name={video.channel_name} src={video.channel_avatar} size={36} />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <Link href={`/watch/${video.id}`}>
            <h3 className="line-clamp-2 text-[15px] leading-snug font-semibold">{video.title}</h3>
          </Link>
          {!hideChannel && (
            <Link href={`/@${video.channel_handle}`} className="mt-1 flex items-center gap-1 text-sm text-muted hover:text-ink">
              <span className="truncate">{video.channel_name}</span>
              <VerifiedBadge type={video.channel_member_type} size={13} />
            </Link>
          )}
          <p className="text-sm text-muted">
            {viewsLabel(video.views)} · {timeAgo(video.created_at)}
          </p>
          <CardBadges video={video} />
        </div>
      </div>
    </div>
  );
}

function CardBadges({ video }: { video: VideoCardData }) {
  if (!video.parent_id && video.responses_count === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {video.parent_id && (
        <span className="inline-flex items-center gap-1 rounded-md bg-basil/10 px-1.5 py-0.5 text-[11px] font-medium text-basil">
          <Icon name="videoReply" size={13} /> Resposta em vídeo
        </span>
      )}
      {video.responses_count > 0 && (
        <span className="inline-flex items-center gap-1 rounded-md bg-cream-2 px-1.5 py-0.5 text-[11px] font-medium text-ink-2">
          <Icon name="message" size={12} /> {video.responses_count} {video.responses_count === 1 ? "resposta" : "respostas"} em vídeo
        </span>
      )}
    </div>
  );
}

/** Card horizontal (lista lateral de recomendados, busca, histórico). */
export function VideoRow({ video, size = "sm", extra }: { video: VideoCardData & { description?: string }; size?: "sm" | "lg"; extra?: React.ReactNode }) {
  const large = size === "lg";
  return (
    <div className={`group flex gap-3 ${large ? "flex-col sm:flex-row sm:gap-4" : ""}`} data-impression={video.id}>
      <Link href={`/watch/${video.id}`} className={`shrink-0 ${large ? "w-full sm:w-[360px]" : "w-40 sm:w-[168px]"}`}>
        <Thumbnail video={video} className={large ? "" : "rounded-lg"} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/watch/${video.id}`}>
          <h3 className={`line-clamp-2 leading-snug font-semibold ${large ? "text-lg" : "text-sm"}`}>{video.title}</h3>
        </Link>
        {large && (
          <p className="mt-1 text-xs text-muted">
            {viewsLabel(video.views)} · {timeAgo(video.created_at)}
          </p>
        )}
        <Link href={`/@${video.channel_handle}`} className={`flex items-center gap-1.5 text-muted hover:text-ink ${large ? "my-2.5 text-xs" : "mt-1 text-xs"}`}>
          {large && <Avatar name={video.channel_name} src={video.channel_avatar} size={24} />}
          <span className="truncate">{video.channel_name}</span>
          <VerifiedBadge type={video.channel_member_type} size={12} />
        </Link>
        {!large && (
          <p className="text-xs text-muted">
            {viewsLabel(video.views)} · {timeAgo(video.created_at)}
          </p>
        )}
        {large && video.description && <p className="line-clamp-2 text-xs text-muted">{video.description}</p>}
        <CardBadges video={video} />
        {extra}
      </div>
    </div>
  );
}

export function VideoGrid({ videos, hideChannel }: { videos: VideoCardData[]; hideChannel?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {videos.map((v) => (
        <VideoCard key={v.id} video={v} hideChannel={hideChannel} />
      ))}
    </div>
  );
}
