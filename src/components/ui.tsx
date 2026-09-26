import Link from "next/link";
import { followersLabel, mediaUrl } from "@/lib/format";
import { MEMBER_TYPES } from "@/lib/constants";
import type { ChannelCardData } from "@/lib/types";
import { Avatar } from "./Avatar";
import { Icon, VerifiedBadge, type IconName } from "./icons";
import { FollowButton } from "./social/FollowButton";

export function PageContainer({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1760px] px-4 py-4 sm:px-6 ${className}`}>{children}</div>;
}

export function PageTitle({ icon, title, subtitle, actions }: { icon?: IconName; title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-center gap-3">
        {icon && (
          <span className="flex size-11 items-center justify-center rounded-full bg-tomato/10 text-tomato">
            <Icon name={icon} />
          </span>
        )}
        <div>
          <h1 className="title-tricolore text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h1>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
}

export function EmptyState({ icon = "film", title, text, action }: { icon?: IconName; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <span className="mb-4 flex size-16 items-center justify-center rounded-full bg-cream-2 text-ink-2">
        <Icon name={icon} size={30} />
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      {text && <p className="mt-1.5 text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Shelf({ title, icon, href, children }: { title: string; icon?: IconName; href?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-6 first:border-0 first:pt-2">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          {icon && (
            <span className="flex size-8 items-center justify-center rounded-full bg-basil/10 text-basil">
              <Icon name={icon} size={18} />
            </span>
          )}
          <span className="title-tricolore">{title}</span>
        </h2>
        {href && (
          <Link href={href} className="btn btn-ghost h-8 text-basil">
            Ver tudo <Icon name="chevronRight" size={16} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export function MemberTypeTag({ type }: { type: string }) {
  if (type !== "student" && type !== "professional" && type !== "related") return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        type === "professional" ? "bg-gold-soft text-gold-dark" : type === "related" ? "bg-basil/10 text-basil" : "bg-cream-2 text-ink-2"
      }`}
    >
      <VerifiedBadge type={type} size={12} />
      {MEMBER_TYPES[type]}
    </span>
  );
}

export function ChannelCard({
  channel,
  following,
  showFollow = true,
  viewerId,
}: {
  channel: ChannelCardData;
  following?: boolean;
  showFollow?: boolean;
  viewerId?: string | null;
}) {
  const thumb = mediaUrl(channel.last_video_thumb);
  return (
    // Altura fixa nas partes de texto variável: todos os cards de uma fileira ficam iguais e alinhados.
    <div className="card flex h-full flex-col overflow-hidden">
      <Link href={`/@${channel.handle}`} className="flex flex-col items-center px-4 pt-6 pb-3 text-center">
        <Avatar name={channel.name} src={channel.avatar_key} size={80} />
        <h3 className="mt-3 flex items-center gap-1 font-semibold">
          <span className="line-clamp-1">{channel.name}</span>
          <VerifiedBadge type={channel.member_type} />
        </h3>
        <p className="text-xs text-muted">@{channel.handle}</p>
        <div className="mt-2">
          <MemberTypeTag type={channel.member_type} />
        </div>
        <p className="mt-2 line-clamp-2 h-10 text-sm leading-5 text-ink-2">{channel.specialty}</p>
        <p className="mt-1 text-xs text-muted">
          {followersLabel(channel.followers_count)} · {channel.videos_count} {channel.videos_count === 1 ? "vídeo" : "vídeos"}
        </p>
      </Link>
      {channel.last_video_id ? (
        <Link href={`/watch/${channel.last_video_id}`} className="mx-4 flex h-12 items-center gap-2 rounded-lg bg-cream p-1.5 text-left hover:bg-cream-2">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="aspect-video w-16 shrink-0 rounded object-cover" />
          ) : (
            <span className="aspect-video w-16 shrink-0 rounded bg-ink" />
          )}
          <span className="line-clamp-2 text-xs text-ink-2">{channel.last_video_title}</span>
        </Link>
      ) : (
        <div className="mx-4 h-12" />
      )}
      {showFollow && viewerId !== channel.id && (
        <div className="mt-auto p-4">
          <FollowButton channelId={channel.id} initialFollowing={!!following} loggedIn={!!viewerId} full />
        </div>
      )}
    </div>
  );
}

export function StatusPill({ tone, children }: { tone: "gray" | "gold" | "green" | "red" | "ink"; children: React.ReactNode }) {
  const tones = {
    gray: "bg-cream-2 text-ink-2",
    gold: "bg-gold-soft text-gold-dark",
    green: "bg-basil/10 text-basil",
    red: "bg-tomato/10 text-tomato",
    ink: "bg-ink text-cream",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}
