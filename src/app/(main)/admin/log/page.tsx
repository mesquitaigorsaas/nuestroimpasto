import { formatDate } from "@/lib/format";
import { listAdminActions } from "@/lib/admin-queries";
import { EmptyState } from "@/components/ui";

const LABELS: Record<string, string> = {
  verification_approve: "Aprovou verificação",
  verification_needs_info: "Pediu mais informações",
  verification_reject: "Rejeitou verificação",
  verification_review_required: "Colocou verificação em revisão",
  verification_revoke: "Exigiu nova verificação",
  verification_reanalyze: "Refez análise automática",
  document_view: "Abriu comprovante de verificação",
  auto_approve_on: "Ativou aprovação automática",
  auto_approve_off: "Desativou aprovação automática",
  user_active: "Reativou conta",
  user_suspended: "Suspendeu conta",
  user_banned: "Baniu conta",
  role_admin: "Concedeu acesso admin",
  role_user: "Removeu acesso admin",
  video_hide: "Ocultou vídeo",
  video_restore: "Restaurou vídeo",
  comment_hide: "Ocultou comentário",
  comment_restore: "Restaurou comentário",
  report_resolved: "Resolveu denúncia",
  report_dismissed: "Descartou denúncia",
};

export default async function AdminLog() {
  const actions = await listAdminActions();
  if (!actions.length) return <EmptyState icon="list" title="Nenhuma ação registrada ainda" />;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-line bg-cream text-xs text-muted uppercase">
          <tr>
            <th className="px-4 py-3 font-medium">Quando</th>
            <th className="px-3 py-3 font-medium">Administrador</th>
            <th className="px-3 py-3 font-medium">Ação</th>
            <th className="px-3 py-3 font-medium">Alvo</th>
            <th className="px-3 py-3 font-medium">Motivo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {actions.map((a) => (
            <tr key={a.id}>
              <td className="px-4 py-3 text-xs whitespace-nowrap">
                {formatDate(a.created_at)} {new Date(a.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </td>
              <td className="px-3 py-3">{a.admin_name}</td>
              <td className="px-3 py-3 font-medium">{LABELS[a.action] ?? a.action}</td>
              <td className="px-3 py-3 text-xs">{a.target_label ?? a.target_id}</td>
              <td className="px-3 py-3 text-xs text-ink-2">{a.note || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
