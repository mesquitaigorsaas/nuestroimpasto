import Link from "next/link";
import { notFound } from "next/navigation";
import { VERIFICATION_FIELDS, VERIFICATION_TYPES } from "@/lib/constants";
import { formatDate, parseJson, timeAgo } from "@/lib/format";
import { getVerification, userVerificationHistory, verificationEvents } from "@/lib/admin-queries";
import type { AnalysisResult, EvidenceItem, FraudSignal } from "@/lib/verification/types";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/icons";
import { AiBadge, EVENT_LABEL, RequestStatusPill, SOURCE_LABEL } from "../shared";
import { DecisionPanel } from "./DecisionPanel";

const STRENGTH = { strong: "Forte", medium: "Média", weak: "Fraca" } as const;
const ACTION = {
  approve_or_fast_review: "Aprovar ou revisão rápida",
  human_review: "Revisão humana",
  request_more_information: "Solicitar mais informações",
  mandatory_review: "Revisão humana obrigatória",
} as const;

export default async function VerificationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getVerification(id);
  if (!r) notFound();
  const data = parseJson<Record<string, string>>(r.data, {});
  const evidence = parseJson<EvidenceItem[]>(r.evidence, []);
  const fraud = parseJson<FraudSignal[]>(r.fraud_signals, []);
  const ai = parseJson<AnalysisResult | null>(r.ai_result, null);
  const events = await verificationEvents(r.id);
  const history = await userVerificationHistory(r.user_id, r.id);
  const evById = new Map(evidence.map((e) => [e.id, e]));
  const fields = VERIFICATION_FIELDS[r.type] ?? [];
  const finalized = r.status === "approved" || r.status === "rejected";

  return (
    <div className="flex flex-col gap-5">
      <Link href="/admin/verifications" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <Icon name="arrowLeft" size={16} /> Verificações
      </Link>

      <div className="card flex flex-wrap items-center gap-4 p-5">
        <Avatar name={r.user_name} src={r.user_avatar} size={56} />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold">{data.nome || r.user_name}</h2>
          <p className="text-sm text-muted">
            <Link href={`/@${r.user_handle}`} className="hover:underline">@{r.user_handle}</Link> · {r.user_email} · conta criada em {formatDate(r.user_created)}
            {r.user_status !== "active" && <b className="ml-1 text-tomato">· conta {r.user_status}</b>}
          </p>
          <p className="mt-1 text-sm">
            <b>{VERIFICATION_TYPES[r.type]}</b> · enviada {timeAgo(r.created_at)} · atualizada {timeAgo(r.updated_at || r.created_at)}
            {r.consent_at && <span className="text-muted"> · consentimento em {formatDate(r.consent_at)}</span>}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <RequestStatusPill status={r.status} />
          {r.ai_status && <AiBadge status={r.ai_status} confidence={r.ai_confidence} />}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-5">
          {/* Dados declarados */}
          <section className="card p-5">
            <h3 className="title-tricolore mb-4 font-bold">Dados declarados</h3>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {fields
                .filter((f) => data[f.key])
                .map((f) => (
                  <div key={f.key} className={f.long ? "sm:col-span-2" : ""}>
                    <dt className="text-xs text-muted">{f.label}</dt>
                    <dd className="font-medium break-words whitespace-pre-line">{data[f.key]}</dd>
                  </div>
                ))}
            </dl>
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-cream p-3 text-sm">
              <Icon name="inbox" className="text-muted" />
              {r.document_key ? (
                <>
                  <span className="flex-1">Comprovante anexado (privado)</span>
                  <a href={`/api/admin/document/${r.id}`} target="_blank" rel="noopener" className="btn btn-outline h-8">
                    Abrir comprovante
                  </a>
                </>
              ) : (
                <span className="text-muted">
                  {finalized && evById.has("ev_documento") ? "Comprovante apagado após a decisão (minimização de dados)." : "Nenhum comprovante enviado."}
                </span>
              )}
            </div>
          </section>

          {/* Evidências */}
          <section className="card p-5">
            <h3 className="title-tricolore mb-4 font-bold">Evidências consideradas</h3>
            <ul className="flex flex-col gap-2 text-sm">
              {evidence.map((e) => (
                <li key={e.id} className="flex items-start gap-3 rounded-xl border border-line p-3">
                  <span className="rounded-md bg-cream-2 px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap">{SOURCE_LABEL[e.source] ?? e.source}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted">
                      {e.label} <code className="ml-1 text-[10px] opacity-60">{e.id}</code>
                    </p>
                    <p className="break-words">{e.value}</p>
                  </div>
                  <span className={`text-[11px] font-medium whitespace-nowrap ${e.confirmed ? "text-basil" : "text-muted"}`}>{e.confirmed ? "confirmado" : "declarado"}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Análise da IA */}
          <section className="card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="title-tricolore font-bold">Análise automática</h3>
              {r.ai_model && (
                <span className="text-xs text-muted">
                  {r.ai_model} · {r.ai_analyzed_at ? timeAgo(r.ai_analyzed_at) : ""}
                </span>
              )}
            </div>
            {ai ? (
              <div className="flex flex-col gap-4 text-sm">
                <div className="rounded-xl bg-cream p-3">
                  <p>
                    <b>Confiança:</b> <AiBadge status={ai.status} confidence={ai.confidence} /> · <b>Recomendação:</b> {ACTION[ai.recommended_action]}
                  </p>
                  {ai.summary && <p className="mt-2 text-ink-2">{ai.summary}</p>}
                </div>
                <div>
                  <p className="mb-2 font-semibold">Sinais encontrados</p>
                  {ai.signals.length ? (
                    <ul className="flex flex-col gap-2">
                      {ai.signals.map((s, i) => (
                        <li key={i} className="rounded-xl border border-line p-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                s.strength === "strong" ? "bg-basil/10 text-basil" : s.strength === "medium" ? "bg-gold-soft text-gold-dark" : "bg-cream-2 text-ink-2"
                              }`}
                            >
                              {STRENGTH[s.strength]}
                            </span>
                            <span className="text-xs text-muted">{s.type}</span>
                          </div>
                          <p className="mt-1">{s.description}</p>
                          <p className="mt-1 text-xs text-muted">
                            Baseado em: {s.evidence_ids.map((eid) => evById.get(eid)?.label ?? eid).join(" · ")}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted">Nenhum sinal com evidência identificável.</p>
                  )}
                </div>
                {ai.inconsistencies.length > 0 && (
                  <div>
                    <p className="mb-2 font-semibold text-tomato">Inconsistências</p>
                    <ul className="list-disc pl-5">
                      {ai.inconsistencies.map((x, i) => (
                        <li key={i}>{x.description}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {ai.missing_information.length > 0 && (
                  <div>
                    <p className="mb-2 font-semibold">Informações ausentes</p>
                    <ul className="list-disc pl-5 text-ink-2">
                      {ai.missing_information.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted">Esta solicitação ainda não foi analisada.</p>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-5">
          <DecisionPanel requestId={r.id} status={r.status} recommended={ai?.recommended_action ?? null} missing={ai?.missing_information ?? []} />

          {fraud.length > 0 && (
            <section className="card border-tomato/30 p-5">
              <h3 className="mb-3 flex items-center gap-2 font-bold text-tomato">
                <Icon name="flag" size={18} /> Sinais de risco
              </h3>
              <ul className="flex flex-col gap-2 text-sm">
                {fraud.map((f, i) => (
                  <li key={i} className="rounded-xl bg-tomato/5 p-3">
                    <span className="text-[11px] font-semibold text-tomato uppercase">{f.severity === "high" ? "alto" : f.severity === "medium" ? "médio" : "baixo"}</span>
                    <p>{f.description}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">Sinais automáticos. Não bloqueiam sozinhos: servem para orientar a revisão.</p>
            </section>
          )}

          <section className="card p-5">
            <h3 className="mb-3 font-bold">Histórico</h3>
            <ol className="relative flex flex-col gap-4 border-l-2 border-line pl-4 text-sm">
              {events.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-basil ring-4 ring-white" />
                  <p className="font-semibold">{EVENT_LABEL[e.event] ?? e.event}</p>
                  <p className="text-xs text-muted">
                    {formatDate(e.created_at)} · {new Date(e.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} ·{" "}
                    {e.actor_name ?? "Sistema"}
                  </p>
                  {e.ai_status && (
                    <p className="mt-1">
                      <AiBadge status={e.ai_status} confidence={e.ai_confidence} />
                      {e.ai_model && <span className="ml-1 text-[11px] text-muted">{e.ai_model}</span>}
                    </p>
                  )}
                  {e.reason && <p className="mt-1 whitespace-pre-line text-ink-2">{e.reason}</p>}
                </li>
              ))}
            </ol>
            {history.length > 0 && (
              <div className="mt-5 border-t border-line pt-4 text-xs">
                <p className="mb-2 font-semibold">Solicitações anteriores deste usuário</p>
                {history.map((h) => (
                  <Link key={h.id} href={`/admin/verifications/${h.id}`} className="flex justify-between py-1 hover:underline">
                    <span>{formatDate(h.created_at)}</span>
                    <RequestStatusPill status={h.status} />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
