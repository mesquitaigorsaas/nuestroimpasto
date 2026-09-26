"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORIES } from "@/lib/constants";
import { Avatar } from "../Avatar";
import { Icon, type IconName } from "../icons";
import type { ShellUser } from "./Header";

export type SidebarChannel = { id: string; name: string; handle: string; avatar_key: string | null; has_new: number };

type Props = { user: ShellUser | null; following: SidebarChannel[]; variant: "full" | "mini" };

const MAIN: { href: string; icon: IconName; label: string }[] = [
  { href: "/", icon: "home", label: "Início" },
  { href: "/discover", icon: "compass", label: "Descobrir" },
  { href: "/feed/trending", icon: "flame", label: "Em alta" },
  { href: "/feed/following", icon: "following", label: "Seguindo" },
];

const YOU: { href: string; icon: IconName; label: string }[] = [
  { href: "/@me", icon: "user", label: "Seu canal" },
  { href: "/feed/history", icon: "history", label: "Histórico" },
  { href: "/feed/saved", icon: "bookmark", label: "Salvos" },
  { href: "/feed/liked", icon: "like", label: "Vídeos curtidos" },
  { href: "/studio", icon: "film", label: "Seus vídeos" },
];

export function Sidebar({ user, following, variant }: Props) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  if (variant === "mini") {
    return (
      <nav className="flex h-full flex-col gap-1 px-1 pt-1">
        {[...MAIN, { href: user ? "/you" : "/login", icon: "user" as IconName, label: "Você" }].map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`flex flex-col items-center gap-1.5 rounded-xl py-4 text-[10px] hover:bg-cream-2 ${isActive(it.href) ? "bg-basil/10 font-semibold text-basil" : ""}`}
          >
            <Icon name={it.icon} size={22} strokeWidth={isActive(it.href) ? 2.3 : 1.8} />
            {it.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="scroll-thin flex h-full flex-col overflow-y-auto px-3 pb-6">
      <Section>
        {MAIN.map((it) => (
          <Item key={it.href} {...it} active={isActive(it.href)} />
        ))}
      </Section>

      <Section title={user ? "Você" : undefined}>
        {user ? (
          YOU.map((it) => (
            <Item key={it.href} {...it} href={it.href === "/@me" ? `/@${user.handle}` : it.href} active={isActive(it.href === "/@me" ? `/@${user.handle}` : it.href)} />
          ))
        ) : (
          <div className="px-3 py-2 text-sm text-ink-2">
            Entre para seguir profissionais, curtir, comentar e salvar vídeos.
            <Link href="/login" className="btn btn-outline mt-3 border-basil/50 text-basil hover:bg-basil/10">
              <Icon name="user" size={18} /> Entrar
            </Link>
          </div>
        )}
      </Section>

      {user && following.length > 0 && (
        <Section title="Seguindo">
          {following.slice(0, 12).map((c) => (
            <Link
              key={c.id}
              href={`/@${c.handle}`}
              className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm hover:bg-cream-2 ${isActive(`/@${c.handle}`) ? "bg-cream-2 font-medium" : ""}`}
            >
              <Avatar name={c.name} src={c.avatar_key} size={24} />
              <span className="flex-1 truncate">{c.name}</span>
              {!!c.has_new && <span className="size-2 rounded-full bg-tomato" title="Vídeo novo" />}
            </Link>
          ))}
          {following.length > 12 && <Item href="/feed/following" icon="chevronDown" label="Mostrar todos" active={false} />}
        </Section>
      )}

      <Section title="Especialidades">
        {CATEGORIES.filter((c) => c.slug !== "outros").map((c, i) => (
          <Link
            key={c.slug}
            href={`/?cat=${c.slug}`}
            className="flex h-9 items-center gap-3 rounded-lg px-3 text-sm hover:bg-cream-2"
          >
            <span className={`size-2 rounded-full ${["bg-basil", "bg-cream-3 ring-1 ring-line", "bg-tomato"][i % 3]}`} />
            {c.name}
          </Link>
        ))}
      </Section>

      {user && (user.role === "admin" || user.verification_status !== "verified") && (
        <Section>
          {user.verification_status !== "verified" && <Item href="/verification" icon="shield" label="Verificação" active={isActive("/verification")} />}
          {user.role === "admin" && <Item href="/admin" icon="settings" label="Administração" active={isActive("/admin")} />}
        </Section>
      )}

      <div className="mt-auto px-3 pt-6 text-xs leading-relaxed text-muted">
        <div className="tricolore-soft mb-3 h-[3px] w-16 rounded-full" />
        <p>La comunidad de los que hacen masa.</p>
        <p className="mt-2">
          <Link href="/about" className="hover:text-ink">Sobre</Link> · <Link href="/guidelines" className="hover:text-ink">Diretrizes</Link> ·{" "}
          <Link href="/privacy" className="hover:text-ink">Privacidade</Link>
        </p>
        <p className="mt-3">© {new Date().getFullYear()} Nuestro Impasto</p>
        <p className="mt-1">
          Desenvolvido por{" "}
          <a href="https://mesquitasaas.online/" target="_blank" rel="noopener" className="font-semibold text-ink underline-offset-2 hover:underline">
            Mesquita SaaS
          </a>
        </p>
      </div>
    </nav>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-line py-3 last:border-0">
      {title && (
        <h3 className="flex items-center gap-2 px-3 pb-1 text-[15px] font-semibold">
          <span className="tricolore-soft h-3 w-1 rounded-full" style={{ background: "linear-gradient(180deg,#148448 0 50%,#D91328 50% 100%)" }} />
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

function Item({ href, icon, label, active }: { href: string; icon: IconName; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex h-10 items-center gap-5 rounded-lg px-3 text-sm hover:bg-cream-2 ${active ? "nav-active bg-basil/10 font-semibold text-basil" : ""}`}
    >
      <Icon name={icon} size={22} strokeWidth={active ? 2.3 : 1.8} className={icon === "flame" ? "text-tomato" : ""} />
      {label}
    </Link>
  );
}
