import Link from "next/link";
import { AI_STATUS, VERIFICATION_TYPES } from "@/lib/constants";
import { formatDate, parseJson, timeAgo } from "@/lib/format";
import { listVerifications, verificationCounts, VERIFICATION_FILTERS, type VerificationFilter } from "@/lib/admin-queries";
import { getSetting, SETTINGS } from "@/lib/settings";
import { analyzePending } from "@/lib/verification";
import { aiEnabled } from "@/lib/verification/analysis";
import type { EvidenceItem, FraudSignal } from "@/lib/verification/types";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/icons";
import { EmptyState } from "@/components/ui";
import { AutoApproveToggle } from "./AutoApproveToggle";
import { AiBadge, RequestStatusPill, SOURCE_LABEL } from "./shared";

export default async function AdminVerifications({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f } = await searchParams;
  const filter: VerificationFilter = f && f in VERIFICATION_FILTERS ? (f as VerificationFilter) : "queue";
  await analyzePending();
  const rows = await listVerifications(filter);
  const counts = await verificationCounts();
  const auto = await getSetting(SETTINGS.verificationAutoApprove) === "true";
  const ai = aiEnabled();

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="card flex items-start gap-3 p-4 text-sm">
          <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${ai ? "bg-basil/10 text-basil" : "bg-cream-2 text-ink-2"}`}>
            <Icon name="sparkles" size={18} />
          </span>
          <div>
            <p className="font-semibold">Analisador: {ai ? "IA (Claude) com fallback por regras" : "regras locais (IA não configurada)"}</p>
            <p className="mt-0.5 text-xs text-muted">
              {ai
                ? "Cada solicitação é analisada pela IA como analista de evidências. Casos com dúvida vão para a fila."
                : "Defina ANTHROPIC_API_KEY no servidor para ativar a análise por IA. Até lá, um analisador por regras organiza as evidências."}
            </p>
          </div>
        </div>
        <AutoApproveToggle enabled={auto} />
      </div>

      <nav className="no-scrollbar flex gap-2 overflow-x-auto">
        {(Object.keys(VERIFICATION_FILTERS) as VerificationFilter[]).map((k) => (
          <Link key={k} href={`/admin/verifications${k === "queue" ? "" : `?f=${k}`}`} className={`chip ${filter === k ? "chip-on" : "chip-off"}`}>
            {VERIFICATION_FILTERS[k].label}
            <span className={`ml-1.5 text-xs ${filter === k ? "opacity-80" : "text-muted"}`}>{counts[k]}</span>
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <EmptyState icon="shield" title="Nada por aqui" text="Nenhuma solicitação neste filtro." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-line bg-cream text-xs text-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Candidato</th>
                <th className="px-3 py-3 font-medium">Tipo · atuação</th>
                <th className="px-3 py-3 font-medium">Cidade</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Confiança da IA</th>
                <th className="px-3 py-3 font-medium">Evidências</th>
                <th className="px-3 py-3 font-medium">Datas</th>
                <th className="px-3 py-3 font-medium">Responsável</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => {
                const data = parseJson<Record<string, string>>(r.data, {});
                const evidence = parseJson<EvidenceItem[]>(r.evidence, []);
                const fraud = parseJson<FraudSignal[]>(r.fraud_signals, []);
                const sources = [...new Set(evidence.map((e) => e.source).filter((s) => s !== "user_provided" && s !== "account"))];
                return (
                  <tr key={r.id} className="hover:bg-cream">
                    <td className="px-4 py-3">
                      <Link href={`/admin/verifications/${r.id}`} className="flex items-center gap-3">
                        <Avatar name={r.user_name} src={r.user_avatar} size={36} />
                        <span className="min-w-0">
                          <span className="block font-semibold hover:underline">{data.nome || r.user_name}</span>
                          <span className="block text-xs text-muted">@{r.user_handle}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <span className="block font-medium">{VERIFICATION_TYPES[r.type]}</span>
                      <span className="line-clamp-1 text-xs text-muted">{data.profissao || data.curso || "—"}</span>
                    </td>
                    <td className="px-3 py-3 text-xs">{data.cidade || "—"}</td>
                    <td className="px-3 py-3">
                      <RequestStatusPill status={r.status} />
                      {fraud.some((x) => x.severity !== "low") && (
                        <span className="mt-1 flex items-center gap-1 text-xs text-tomato">
                          <Icon name="flag" size={12} /> sinais de risco
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {r.ai_status ? <AiBadge status={r.ai_status} confidence={r.ai_confidence} /> : <span className="text-xs text-muted">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {sources.length ? (
                          sources.map((s) => (
                            <span key={s} className="rounded-md bg-cream-2 px-1.5 py-0.5 text-[11px]">
                              {SOURCE_LABEL[s] ?? s}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted">só declarações</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted">
                      <span className="block" title={formatDate(r.created_at)}>Enviada {timeAgo(r.created_at)}</span>
                      <span className="block">Atualizada {timeAgo(r.updated_at || r.created_at)}</span>
                    </td>
                    <td className="px-3 py-3 text-xs">{r.reviewer_name ?? (r.status === "approved" ? "Automática" : "—")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted">Legenda de confiança: {Object.values(AI_STATUS).join(" · ")}. A IA recomenda; a decisão final em casos de dúvida é sempre humana.</p>
    </div>
  );
}
