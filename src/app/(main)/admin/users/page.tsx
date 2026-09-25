import Link from "next/link";
import { MEMBER_TYPES, VERIFICATION_STATUS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { listUsers } from "@/lib/admin-queries";
import { getCurrentUser } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/icons";
import { StatusPill } from "@/components/ui";
import { UserActions } from "./UserActions";

const FILTERS = {
  "": "Todos",
  professional: "Profissionais",
  student: "Estudantes",
  related: "Áreas relacionadas",
  viewer: "Membros",
  suspended: "Suspensos",
  banned: "Banidos",
  admin: "Admins",
} as const;

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; f?: string }> }) {
  const { q = "", f = "" } = await searchParams;
  const me = await getCurrentUser();
  const users = await listUsers(q.trim(), f);

  return (
    <div className="flex flex-col gap-5">
      <form className="flex flex-wrap gap-2" action="/admin/users">
        <input name="q" defaultValue={q} placeholder="Buscar por nome, @ ou e-mail" className="input max-w-sm" />
        {f && <input type="hidden" name="f" value={f} />}
        <button className="btn btn-primary h-auto">Buscar</button>
      </form>
      <nav className="no-scrollbar flex gap-2 overflow-x-auto">
        {Object.entries(FILTERS).map(([k, l]) => (
          <Link key={k} href={`/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), ...(k ? { f: k } : {}) })}`} className={`chip ${f === k ? "chip-on" : "chip-off"}`}>
            {l}
          </Link>
        ))}
      </nav>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-line bg-cream text-xs text-muted uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Usuário</th>
              <th className="px-3 py-3 font-medium">Tipo</th>
              <th className="px-3 py-3 font-medium">Verificação</th>
              <th className="px-3 py-3 font-medium">Conta</th>
              <th className="px-3 py-3 font-medium">Vídeos</th>
              <th className="px-3 py-3 font-medium">Desde</th>
              <th className="px-3 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-cream">
                <td className="px-4 py-3">
                  <Link href={`/@${u.handle}`} className="flex items-center gap-3">
                    <Avatar name={u.name} src={u.avatar_key} size={34} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 font-semibold">
                        {u.name} <VerifiedBadge type={u.member_type} size={12} />
                        {u.role === "admin" && <StatusPill tone="ink">admin</StatusPill>}
                      </span>
                      <span className="block text-xs text-muted">@{u.handle} · {u.email}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-3 text-xs">{MEMBER_TYPES[u.member_type as keyof typeof MEMBER_TYPES]}</td>
                <td className="px-3 py-3 text-xs">{VERIFICATION_STATUS[u.verification_status as keyof typeof VERIFICATION_STATUS]}</td>
                <td className="px-3 py-3">
                  <StatusPill tone={u.status === "active" ? "green" : "red"}>{u.status === "active" ? "Ativa" : u.status === "suspended" ? "Suspensa" : "Banida"}</StatusPill>
                  {u.reports > 0 && <span className="ml-1 text-xs text-tomato">{u.reports} den.</span>}
                </td>
                <td className="px-3 py-3 text-xs">{u.videos}</td>
                <td className="px-3 py-3 text-xs">{formatDate(u.created_at)}</td>
                <td className="px-3 py-3 text-right">
                  {u.id !== me?.id && <UserActions user={{ id: u.id, status: u.status, role: u.role, verified: u.verification_status === "verified" }} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
