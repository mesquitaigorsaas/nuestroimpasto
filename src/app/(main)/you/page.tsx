import Link from "next/link";
import { canPublish, requireUser } from "@/lib/auth";
import { VERIFICATION_STATUS } from "@/lib/constants";
import { historyVideos, savedVideos } from "@/lib/queries";
import { logoutAction } from "@/actions/auth";
import { Avatar } from "@/components/Avatar";
import { Icon, VerifiedBadge, type IconName } from "@/components/icons";
import { PageContainer } from "@/components/ui";
import { Thumbnail } from "@/components/video/VideoCard";

export const metadata = { title: "Você" };

/** Página "Você" — equivalente à aba de biblioteca do app mobile. */
export default async function YouPage() {
  const user = await requireUser("/you");
  const history = (await historyVideos(user.id)).slice(0, 10);
  const saved = (await savedVideos(user.id)).slice(0, 10);

  const links: { href: string; icon: IconName; label: string }[] = [
    { href: `/@${user.handle}`, icon: "user", label: "Seu canal" },
    { href: "/studio", icon: "film", label: "Estúdio do criador" },
    { href: "/feed/liked", icon: "like", label: "Vídeos curtidos" },
    { href: "/notifications", icon: "bell", label: "Notificações" },
    { href: "/verification", icon: "shield", label: `Verificação · ${VERIFICATION_STATUS[user.verification_status]}` },
    { href: "/studio/settings", icon: "settings", label: "Configurações do canal" },
  ];
  if (user.role === "admin") links.push({ href: "/admin", icon: "shield", label: "Administração" });

  return (
    <PageContainer className="max-w-3xl">
      <div className="flex items-center gap-4">
        <Avatar name={user.name} src={user.avatar_key} size={72} />
        <div className="min-w-0">
          <h1 className="flex items-center gap-1.5 text-2xl font-bold">
            {user.name} <VerifiedBadge type={user.member_type} size={18} />
          </h1>
          <p className="text-sm text-muted">@{user.handle}</p>
          <Link href={`/@${user.handle}`} className="text-sm font-medium text-basil">
            Ver canal ›
          </Link>
        </div>
      </div>

      {!canPublish(user) && (
        <Link href="/verification" className="mt-5 flex items-center gap-3 rounded-2xl border border-basil/30 bg-basil/5 p-4 text-sm">
          <Icon name="shield" className="text-basil" />
          <span className="flex-1">
            <b>Quer publicar?</b> Solicite a verificação como estudante ou profissional.
          </span>
          <Icon name="chevronRight" size={18} />
        </Link>
      )}

      <MiniShelf title="Histórico" href="/feed/history" videos={history} />
      <MiniShelf title="Salvos" href="/feed/saved" videos={saved} />

      <ul className="card mt-6 divide-y divide-line overflow-hidden">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="flex items-center gap-4 px-4 py-3.5 text-sm hover:bg-cream">
              <Icon name={l.icon} size={20} /> {l.label}
            </Link>
          </li>
        ))}
        <li>
          <form action={logoutAction}>
            <button className="flex w-full items-center gap-4 px-4 py-3.5 text-left text-sm text-tomato hover:bg-cream">
              <Icon name="logout" size={20} /> Sair
            </button>
          </form>
        </li>
      </ul>
    </PageContainer>
  );
}

function MiniShelf({ title, href, videos }: { title: string; href: string; videos: Awaited<ReturnType<typeof savedVideos>> }) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="title-tricolore text-lg font-bold">{title}</h2>
        <Link href={href} className="btn btn-outline h-8">Ver tudo</Link>
      </div>
      {videos.length ? (
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
          {videos.map((v) => (
            <Link key={v.id} href={`/watch/${v.id}`} className="w-40 shrink-0">
              <Thumbnail video={v} className="rounded-lg" />
              <p className="mt-1.5 line-clamp-2 text-xs font-semibold">{v.title}</p>
              <p className="text-[11px] text-muted">{v.channel_name}</p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Nada por aqui ainda.</p>
      )}
    </section>
  );
}
