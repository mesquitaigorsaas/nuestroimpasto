import { requireUser } from "@/lib/auth";
import { mediaUrl, timeAgo } from "@/lib/format";
import { listNotifications, type NotificationData } from "@/lib/queries";
import { Avatar } from "@/components/Avatar";
import { Icon, type IconName } from "@/components/icons";
import { EmptyState, PageContainer, PageTitle } from "@/components/ui";
import { MarkRead, NotificationLink } from "./MarkRead";

export const metadata = { title: "Notificações" };

function describe(n: NotificationData): { icon: IconName; color: string; text: React.ReactNode; href: string } {
  const who = <b>{n.actor_name ?? "Alguém"}</b>;
  const video = n.video_title ? <>“{n.video_title}”</> : "seu vídeo";
  const watch = n.video_id ? `/watch/${n.video_id}` : "/";
  switch (n.type) {
    case "follow":
      return { icon: "following", color: "text-basil", text: <>{who} começou a seguir você</>, href: `/@${n.actor_handle}` };
    case "comment":
      return { icon: "message", color: "text-ink", text: <>{who} comentou em {video}: “{n.text}”</>, href: `${watch}#comentarios` };
    case "reply":
      return { icon: "reply", color: "text-ink", text: <>{who} respondeu seu comentário: “{n.text}”</>, href: `${watch}#comentarios` };
    case "mention":
      return { icon: "message", color: "text-gold-dark", text: <>{who} mencionou você em um comentário</>, href: `${watch}#comentarios` };
    case "like":
      return { icon: "like", color: "text-basil", text: <>{who} curtiu {video}</>, href: watch };
    case "video_response":
      return { icon: "videoReply", color: "text-tomato", text: <>{who} respondeu ao seu vídeo “{n.text}” com um vídeo</>, href: watch };
    case "new_video":
      return { icon: "film", color: "text-tomato", text: <>{who} publicou: {video}</>, href: watch };
    case "verification":
      return { icon: "shield", color: "text-basil", text: <>{n.text}</>, href: "/verification" };
    default:
      return { icon: "info", color: "text-ink", text: <>{n.text}</>, href: "/" };
  }
}

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  const items = await listNotifications(user.id);
  const hasUnread = items.some((n) => !n.read_at);

  return (
    <PageContainer className="max-w-3xl">
      <PageTitle icon="bell" title="Notificações" />
      {hasUnread && <MarkRead />}
      {items.length === 0 ? (
        <EmptyState icon="bell" title="Nenhuma notificação" text="Quando alguém seguir você, comentar ou responder seus vídeos, aparece aqui." />
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {items.map((n) => {
            const d = describe(n);
            const thumb = mediaUrl(n.video_thumb);
            return (
              <li key={n.id}>
                <NotificationLink href={d.href} unread={!n.read_at}>
                  <div className="relative shrink-0">
                    {n.actor_name ? (
                      <Avatar name={n.actor_name} src={n.actor_avatar} size={44} />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src="/mark.png" alt="" className="size-11 rounded-full bg-cream-2 p-1.5" />
                    )}
                    <span className={`absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full bg-white shadow ${d.color}`}>
                      <Icon name={d.icon} size={14} />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="line-clamp-3">{d.text}</p>
                    <p className="mt-1 text-xs text-muted">{timeAgo(n.created_at)}</p>
                  </div>
                  {thumb && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="aspect-video w-24 shrink-0 rounded-lg object-cover" />
                  )}
                </NotificationLink>
              </li>
            );
          })}
        </ul>
      )}
    </PageContainer>
  );
}
