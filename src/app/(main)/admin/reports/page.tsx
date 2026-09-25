import Link from "next/link";
import { REPORT_REASONS } from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import { listReports } from "@/lib/admin-queries";
import { EmptyState, StatusPill } from "@/components/ui";
import { ReportActions } from "./ReportActions";

const FILTERS = { open: "Em aberto", resolved: "Resolvidas", dismissed: "Descartadas", all: "Todas" } as const;
const TARGET = { video: "Vídeo", comment: "Comentário", user: "Usuário" } as const;

export default async function AdminReports({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams;
  const status = s && s in FILTERS ? s : "open";
  const reports = await listReports(status);

  return (
    <div className="flex flex-col gap-5">
      <nav className="flex flex-wrap gap-2">
        {Object.entries(FILTERS).map(([k, l]) => (
          <Link key={k} href={`/admin/reports${k === "open" ? "" : `?s=${k}`}`} className={`chip ${status === k ? "chip-on" : "chip-off"}`}>
            {l}
          </Link>
        ))}
      </nav>
      {reports.length === 0 ? (
        <EmptyState icon="flag" title="Nenhuma denúncia aqui" />
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((r) => (
            <div key={r.id} className="card flex flex-col gap-3 p-4 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone="ink">{TARGET[r.target_type]}</StatusPill>
                  <StatusPill tone="red">{REPORT_REASONS[r.reason as keyof typeof REPORT_REASONS] ?? r.reason}</StatusPill>
                  {r.same_target_count > 1 && <StatusPill tone="gold">{r.same_target_count} denúncias para este conteúdo</StatusPill>}
                  {r.target_status && r.target_status !== "published" && r.target_status !== "visible" && r.target_status !== "active" && (
                    <StatusPill tone="gray">Atualmente: {r.target_status}</StatusPill>
                  )}
                </div>
                <p className="mt-2 line-clamp-3 font-medium">
                  {r.target_link ? (
                    <Link href={r.target_link} target="_blank" className="hover:underline">
                      {r.target_label ?? "(conteúdo removido)"}
                    </Link>
                  ) : (
                    (r.target_label ?? "(conteúdo removido)")
                  )}
                </p>
                {r.target_extra && <p className="text-xs text-muted">Autor: {r.target_extra}</p>}
                {r.details && <p className="mt-2 rounded-lg bg-cream p-2 text-ink-2">“{r.details}”</p>}
                <p className="mt-2 text-xs text-muted">
                  Denunciado por @{r.reporter_handle} {timeAgo(r.created_at)}
                  {r.resolution && ` · Resolução: ${r.resolution}`}
                </p>
              </div>
              {r.status === "open" && <ReportActions report={{ id: r.id, target_type: r.target_type, target_id: r.target_id, target_status: r.target_status }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
