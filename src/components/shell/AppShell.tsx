"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "../icons";
import { Header, type ShellUser } from "./Header";
import { Sidebar, type SidebarChannel } from "./Sidebar";

type Props = {
  user: ShellUser | null;
  unread: number;
  following: SidebarChannel[];
  children: ReactNode;
};

/** Páginas em que o menu lateral vira gaveta (igual à página de vídeo do YouTube). */
function isDrawerOnly(pathname: string) {
  return pathname.startsWith("/watch") || pathname.startsWith("/studio/upload");
}

export function AppShell({ user, unread, following, children }: Props) {
  const pathname = usePathname();
  const drawerOnly = isDrawerOnly(pathname);
  const [expanded, setExpanded] = useState(true); // desktop: menu completo x mini
  const [drawer, setDrawer] = useState(false); // mobile / página de vídeo
  const [showTop, setShowTop] = useState(false);

  useEffect(() => setDrawer(false), [pathname]);

  useEffect(() => {
    let frame = 0;
    let last = false;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const next = window.scrollY > 900;
        if (next !== last) {
          last = next;
          setShowTop(next);
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  function toggleMenu() {
    if (drawerOnly || window.innerWidth < 1280) setDrawer((d) => !d);
    else setExpanded((e) => !e);
  }

  const railWidth = drawerOnly ? "" : expanded ? "xl:pl-60 md:pl-[76px]" : "md:pl-[76px]";

  return (
    <div className="min-h-dvh">
      <Header user={user} unread={unread} onMenu={toggleMenu} />

      {/* Menu fixo (desktop) */}
      {!drawerOnly && (
        <aside className="fixed top-16 bottom-0 left-0 z-30 hidden md:block">
          <div className={`h-full ${expanded ? "xl:w-60" : ""} w-[76px]`}>
            <div className={`hidden h-full ${expanded ? "xl:block" : ""}`}>
              <Sidebar user={user} following={following} variant="full" />
            </div>
            <div className={`h-full ${expanded ? "xl:hidden" : ""}`}>
              <Sidebar user={user} following={following} variant="mini" />
            </div>
          </div>
        </aside>
      )}

      {/* Gaveta */}
      <div className={`fixed inset-0 z-50 ${drawer ? "" : "pointer-events-none"}`} aria-hidden={!drawer}>
        <div
          onClick={() => setDrawer(false)}
          className={`absolute inset-0 bg-ink/40 transition-opacity ${drawer ? "opacity-100" : "opacity-0"}`}
        />
        <div
          className={`absolute top-0 bottom-0 left-0 w-64 bg-cream shadow-xl transition-transform duration-200 ${
            drawer ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-16 items-center gap-3 px-4">
            <button className="icon-btn" onClick={() => setDrawer(false)} aria-label="Fechar menu">
              <Icon name="menu" />
            </button>
            <Logo />
          </div>
          <div className="h-[calc(100%-4rem)]">
            <Sidebar user={user} following={following} variant="full" />
          </div>
        </div>
      </div>

      <main className={`pt-16 pb-20 md:pb-8 ${railWidth}`}>{children}</main>

      <MobileNav user={user} />

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Voltar ao topo"
        className={`fixed right-4 bottom-20 z-40 flex size-11 items-center justify-center rounded-full bg-ink text-cream shadow-lg transition md:bottom-6 ${
          showTop ? "opacity-100" : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        <Icon name="chevronDown" className="rotate-180" />
      </button>
    </div>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Nuestro Impasto — início">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {compact ? (
        <img src="/mark.png" alt="Nuestro Impasto" className="size-9" />
      ) : (
        <span className="flex flex-col items-start leading-none">
          <img src="/logo.png" alt="Nuestro Impasto" className="h-9 w-auto" />
          <span className="mt-1 text-[11px] font-semibold tracking-[0.01em] whitespace-nowrap text-basil">
            La comunidad de los que hacen masa
          </span>
        </span>
      )}
    </Link>
  );
}

function MobileNav({ user }: { user: ShellUser | null }) {
  const pathname = usePathname();
  const items = [
    { href: "/", icon: "home" as const, label: "Início" },
    { href: "/discover", icon: "compass" as const, label: "Descobrir" },
    { href: "/studio/upload", icon: "plus" as const, label: "", create: true },
    { href: "/feed/following", icon: "following" as const, label: "Seguindo" },
    { href: user ? "/you" : "/login", icon: "user" as const, label: "Você" },
  ];
  return (
    <nav className="fixed right-0 bottom-0 left-0 z-40 flex h-16 items-stretch bg-cream/95 backdrop-blur md:hidden">
      <span className="tricolore absolute top-0 right-0 left-0 h-[2px]" aria-hidden="true" />
      {items.map((it) => {
        const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
        if (it.create)
          return (
            <Link key={it.href} href={it.href} className="flex flex-1 items-center justify-center" aria-label="Publicar vídeo">
              <span className="tricolore flex size-11 items-center justify-center rounded-full p-[2.5px]">
                <span className="flex size-full items-center justify-center rounded-full bg-cream">
                  <Icon name="plus" size={22} strokeWidth={2.4} />
                </span>
              </span>
            </Link>
          );
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] ${active ? "font-semibold text-basil" : "text-muted"}`}
          >
            <Icon name={it.icon} size={22} strokeWidth={active ? 2.3 : 1.8} />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
