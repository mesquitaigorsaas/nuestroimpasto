"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { logoutAction } from "@/actions/auth";
import { Avatar } from "../Avatar";
import { Icon, VerifiedBadge } from "../icons";
import { Logo } from "./AppShell";

export type ShellUser = {
  id: string;
  name: string;
  handle: string;
  avatar_key: string | null;
  role: string;
  member_type: string;
  verification_status: string;
};

type Props = { user: ShellUser | null; unread: number; onMenu: () => void };

export function Header({ user, unread, onMenu }: Props) {
  const [mobileSearch, setMobileSearch] = useState(false);

  return (
    <header className="fixed top-0 right-0 left-0 z-40 flex h-14 items-center gap-2 bg-cream/95 px-2 backdrop-blur sm:px-4">
      <span className="tricolore absolute right-0 bottom-0 left-0 h-[3px]" aria-hidden="true" />
      {mobileSearch ? (
        <>
          <button className="icon-btn" onClick={() => setMobileSearch(false)} aria-label="Voltar">
            <Icon name="arrowLeft" />
          </button>
          <Suspense>
            <SearchBar autoFocus onDone={() => setMobileSearch(false)} />
          </Suspense>
        </>
      ) : (
        <>
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <button className="icon-btn hidden md:inline-flex" onClick={onMenu} aria-label="Menu">
              <Icon name="menu" />
            </button>
            <Logo />
          </div>

          <div className="mx-auto hidden w-full max-w-[640px] px-4 sm:block">
            <Suspense>
              <SearchBar />
            </Suspense>
          </div>

          <div className="ml-auto flex items-center gap-1 sm:ml-0">
            <button className="icon-btn sm:hidden" onClick={() => setMobileSearch(true)} aria-label="Pesquisar">
              <Icon name="search" />
            </button>
            {user ? (
              <>
                <Link href="/studio/upload" className="btn btn-soft hidden md:inline-flex" title="Publicar vídeo">
                  <Icon name="plus" size={20} className="text-basil" strokeWidth={2.4} />
                  Criar
                </Link>
                <Link href="/notifications" className="icon-btn relative" aria-label={`Notificações${unread ? ` (${unread} novas)` : ""}`}>
                  <Icon name="bell" />
                  {unread > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-tomato px-1 text-[10px] font-semibold text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Link>
                <UserMenu user={user} />
              </>
            ) : (
              <Link href="/login" className="btn btn-outline ml-1 h-9 border-basil/50 text-basil hover:bg-basil/10">
                <Icon name="user" size={20} />
                Entrar
              </Link>
            )}
          </div>
        </>
      )}
    </header>
  );
}

function SearchBar({ autoFocus, onDone }: { autoFocus?: boolean; onDone?: () => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  useEffect(() => setQ(params.get("q") ?? ""), [params]);

  return (
    <form
      role="search"
      className="flex w-full items-center"
      onSubmit={(e) => {
        e.preventDefault();
        if (!q.trim()) return;
        router.push(`/results?q=${encodeURIComponent(q.trim())}`);
        onDone?.();
      }}
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus={autoFocus}
        placeholder="Pesquisar: biga 48h, napolitana, forno a lenha…"
        aria-label="Pesquisar"
        className="h-10 w-full min-w-0 rounded-l-full border border-line bg-white px-4 text-[15px] outline-none focus:border-gold"
      />
      <button
        type="submit"
        className="flex h-10 w-16 shrink-0 items-center justify-center rounded-r-full border border-l-0 border-line bg-cream-2 hover:bg-cream-3"
        aria-label="Buscar"
      >
        <Icon name="search" size={20} />
      </button>
    </form>
  );
}

function UserMenu({ user }: { user: ShellUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const verified = ["student", "professional", "related"].includes(user.member_type);

  return (
    <div className="relative ml-1" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} aria-label="Menu da conta" className="flex rounded-full">
        <Avatar name={user.name} src={user.avatar_key} size={32} />
      </button>
      {open && (
        <div className="absolute top-11 right-0 w-72 overflow-hidden rounded-xl border border-line bg-white py-2 shadow-xl" onClick={() => setOpen(false)}>
          <div className="flex gap-3 border-b border-line px-4 pt-2 pb-3">
            <Avatar name={user.name} src={user.avatar_key} size={40} />
            <div className="min-w-0">
              <div className="flex items-center gap-1 truncate font-medium">
                {user.name} <VerifiedBadge type={user.member_type} />
              </div>
              <div className="truncate text-sm text-muted">@{user.handle}</div>
              <Link href={`/@${user.handle}`} className="mt-1 inline-block text-sm font-medium text-gold-dark hover:underline">
                Ver seu canal
              </Link>
            </div>
          </div>
          <MenuLink href="/studio" icon="film" label="Estúdio do criador" />
          {!verified && <MenuLink href="/verification" icon="shield" label="Solicitar verificação" highlight />}
          {verified && <MenuLink href="/verification" icon="shield" label="Minha verificação" />}
          <MenuLink href="/studio/settings" icon="settings" label="Configurações do canal" />
          <MenuLink href="/feed/history" icon="history" label="Histórico" />
          {user.role === "admin" && <MenuLink href="/admin" icon="shield" label="Administração" />}
          <div className="my-1 border-t border-line" />
          <form action={logoutAction}>
            <button className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-cream-2">
              <Icon name="logout" size={20} /> Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, icon, label, highlight }: { href: string; icon: Parameters<typeof Icon>[0]["name"]; label: string; highlight?: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-cream-2 ${highlight ? "font-medium text-gold-dark" : ""}`}>
      <Icon name={icon} size={20} /> {label}
    </Link>
  );
}
