import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { MEMBER_TYPES, VERIFICATION_STATUS, VERIFICATION_TYPES, type VerificationType } from "@/lib/constants";
import { get } from "@/lib/db";
import { formatDate, parseJson } from "@/lib/format";
import { InstagramProvider } from "@/lib/verification/providers";
import { Icon } from "@/components/icons";
import { PageContainer, PageTitle, StatusPill } from "@/components/ui";
import { VerificationForm } from "./VerificationForm";

export const metadata = { title: "Verificação" };

const TONE = { none: "gray", pending: "gold", under_review: "gold", verified: "green", needs_info: "gold", rejected: "red", review: "red" } as const;

export default async function VerificationPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const user = await requireUser("/verification");
  const { type } = await searchParams;
  const last = get<{ type: VerificationType; status: string; admin_note: string; data: string; created_at: string; updated_at: string; reviewed_at: string | null }>(
    "SELECT type, status, admin_note, data, created_at, updated_at, reviewed_at FROM verification_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
    user.id,
  );
  const status = user.verification_status;
  const canSubmit = !["pending", "under_review", "verified"].includes(status);
  const previous = status === "needs_info" && last ? { type: last.type, fields: parseJson<Record<string, string>>(last.data, {}) } : undefined;
  const initialType = previous?.type ?? (type && type in VERIFICATION_TYPES ? (type as VerificationType) : undefined);

  return (
    <PageContainer className="max-w-3xl">
      <PageTitle icon="shield" title="Verificação" subtitle="Membros verificados criam canal e publicam na comunidade." />

      <div className="card mb-6 flex flex-wrap items-center gap-4 p-5">
        <div className="flex-1">
          <p className="text-sm text-muted">Status atual</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusPill tone={TONE[status]}>{VERIFICATION_STATUS[status]}</StatusPill>
            {status === "verified" && <span className="text-sm font-medium">{MEMBER_TYPES[user.member_type]}</span>}
            {user.status === "suspended" && <StatusPill tone="red">Conta suspensa</StatusPill>}
          </div>
          {last && (
            <p className="mt-2 text-xs text-muted">
              Solicitação como {VERIFICATION_TYPES[last.type]?.toLowerCase()} enviada em {formatDate(last.created_at)} · atualizada em {formatDate(last.updated_at || last.created_at)}
            </p>
          )}
        </div>
        {status === "verified" && (
          <Link href="/studio/upload" className="btn btn-green">
            <Icon name="upload" size={18} /> Publicar vídeo
          </Link>
        )}
      </div>

      {last?.admin_note && ["needs_info", "rejected", "review"].includes(status) && (
        <div className="mb-6 rounded-2xl border border-gold/40 bg-gold-soft p-4 text-sm">
          <p className="font-semibold">{status === "needs_info" ? "O que falta para concluir" : "Mensagem da equipe de verificação"}</p>
          <p className="mt-1 whitespace-pre-line">{last.admin_note}</p>
        </div>
      )}

      {(status === "pending" || status === "under_review") && (
        <div className="card p-6 text-center">
          <Icon name="clock" size={36} className="mx-auto text-gold-dark" />
          <h2 className="mt-3 text-lg font-bold">{status === "under_review" ? "A equipe está analisando sua solicitação" : "Sua solicitação está na fila de análise"}</h2>
          <p className="mt-1 text-sm text-muted">Você será avisado nas notificações assim que houver uma decisão.</p>
        </div>
      )}

      {status === "verified" && (
        <div className="card p-6 text-sm text-ink-2">
          <p>
            Seu canal exibe o selo de <b>{MEMBER_TYPES[user.member_type]}</b>. O selo significa que você passou pelo processo de verificação do Nuestro Impasto —
            ele confirma identidade e vínculo, e não é uma certificação técnica do conteúdo publicado.
          </p>
        </div>
      )}

      {canSubmit && (
        <VerificationForm
          initialType={initialType}
          defaultName={user.name}
          previous={previous?.fields}
          instagramOfficial={InstagramProvider.isOfficialIntegrationConfigured()}
        />
      )}

      <div className="mt-8 grid gap-4 text-sm sm:grid-cols-3">
        {[
          { icon: "shield" as const, t: "O que é verificado", d: "Identidade e vínculo declarado com o universo de pizza, massas, fermentação, panificação ou áreas relacionadas." },
          { icon: "eyeOff" as const, t: "Seus dados", d: "Usados só para a verificação. Documentos ficam em área privada, acessados só pela equipe, e são apagados após a decisão." },
          { icon: "info" as const, t: "Como decidimos", d: "Uma análise automática organiza as evidências; casos com dúvida sempre passam por uma pessoa da equipe." },
        ].map((b) => (
          <div key={b.t} className="rounded-2xl bg-cream-2 p-4">
            <Icon name={b.icon} className="text-basil" />
            <p className="mt-2 font-semibold">{b.t}</p>
            <p className="mt-1 text-muted">{b.d}</p>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
