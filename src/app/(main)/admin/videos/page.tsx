import Link from "next/link";
import { categoryName } from "@/lib/constants";
import { compactNumber, timeAgo } from "@/lib/format";
import { listRecentVideos } from "@/lib/admin-queries";
import { StatusPill } from "@/components/ui";
import { Thumbnail } from "@/components/video/VideoCard";
import { VideoModeration } from "./VideoModeration";

export default async function AdminVideos() {
  const videos = await listRecentVideos();
  return (
    <div className="card divide-y divide-line overflow-hidden">
      {videos.map((v) => (
        <div key={v.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
          <Link href={`/watch/${v.id}`} className="w-full shrink-0 sm:w-36">
            <Thumbnail video={v} className="rounded-lg" />
          </Link>
          <div className="min-w-0 flex-1 text-sm">
            <Link href={`/watch/${v.id}`} className="line-clamp-1 font-semibold hover:underline">{v.title}</Link>
            <p className="text-xs text-muted">
              {v.channel} (@{v.handle}) · {categoryName(v.category)} · {compactNumber(v.views)} visualizações · {timeAgo(v.created_at)}
            </p>
          </div>
          <StatusPill tone={v.status === "published" ? "green" : "red"}>{v.status === "published" ? "Publicado" : "Oculto"}</StatusPill>
          <VideoModeration id={v.id} status={v.status} />
        </div>
      ))}
    </div>
  );
}
