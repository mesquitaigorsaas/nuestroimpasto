"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { requestVerificationAction, type VerificationActionState } from "@/actions/verification";
import { Field, FormError, SubmitButton, TextArea } from "@/components/forms";
import { Icon, type IconName } from "@/components/icons";
import { VERIFICATION_FIELDS, type VerificationType } from "@/lib/constants";
import { extOf, uploadFile } from "@/lib/upload-client";

const TYPES: { v: VerificationType; t: string; d: string; icon: IconName; tone: string }[] = [
  { v: "professional", t: "Pizzaiolo / profissional", d: "Trabalho com pizza, massas, panificação ou fermentação.", icon: "chef", tone: "basil" },
  { v: "student", t: "Estudante", d: "Estudo gastronomia, panificação ou área relacionada.", icon: "school", tone: "tomato" },
  { v: "related", t: "Profissional de área relacionada", d: "Moinho, fornos, equipamentos, ingredientes, consultoria…", icon: "flame", tone: "gold" },
];

type Props = { initialType?: VerificationType; defaultName: string; previous?: Record<string, string>; instagramOfficial: boolean };

export function VerificationForm({ initialType, defaultName, previous, instagramOfficial }: Props) {
  const [state, action] = useActionState<VerificationActionState, FormData>(requestVerificationAction, {});
  const [type, setType] = useState<VerificationType | undefined>(initialType);
  const [docKey, setDocKey] = useState("");
  const [docName, setDocName] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState("");
  const fe = state.fieldErrors ?? {};

  if (state.ok) return <Result state={state} />;

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploadError("");
    setProgress(0);
    try {
      setDocKey(await uploadFile(file, "document", extOf(file), setProgress).promise);
      setDocName(file.name);
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setProgress(null);
    }
  }

  const fields = type ? VERIFICATION_FIELDS[type] : [];
  const main = fields.filter((f) => f.evidence !== "online" && f.key !== "adicionais");
  const online = fields.filter((f) => f.evidence === "online" && f.key !== "instagram");
  const extra = fields.filter((f) => f.key === "adicionais");
  const value = (key: string) => previous?.[key] ?? (key === "nome" ? defaultName : undefined);

  return (
    <div className="card p-5 sm:p-7">
      <h2 className="title-tricolore text-xl font-bold">Vamos verificar seu perfil</h2>
      <p className="mt-3 text-sm text-ink-2">
        Para manter o Nuestro Impasto como uma comunidade de profissionais e estudantes, precisamos confirmar sua relação com o universo de massas, pizza,
        fermentação, panificação ou áreas relacionadas.
      </p>

      <p className="mt-5 text-sm font-semibold">Qual destas opções descreve você?</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {TYPES.map((o) => {
          const on = type === o.v;
          const tone = { basil: "border-basil bg-basil/5", tomato: "border-tomato bg-tomato/5", gold: "border-gold bg-gold-soft/50" }[o.tone];
          const icon = { basil: "bg-basil/10 text-basil", tomato: "bg-tomato/10 text-tomato", gold: "bg-gold-soft text-gold-dark" }[o.tone];
          return (
            <button key={o.v} type="button" onClick={() => setType(o.v)} className={`flex flex-col gap-2 rounded-2xl border-2 p-4 text-left transition ${on ? tone : "border-line hover:border-cream-3"}`}>
              <span className={`flex size-10 items-center justify-center rounded-full ${icon}`}>
                <Icon name={o.icon} size={20} />
              </span>
              <span className="font-semibold leading-tight">{o.t}</span>
              <span className="text-xs text-muted">{o.d}</span>
            </button>
          );
        })}
      </div>

      {type && (
        <form action={action} className="mt-7 flex flex-col gap-6">
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="document_key" value={docKey} />
          <FormError message={state.error} />

          <section className="grid gap-4 sm:grid-cols-2">
            {main.map((f) =>
              f.long ? (
                <div key={`${type}-${f.key}`} className="sm:col-span-2">
                  <TextArea label={`${f.label}${f.required ? " *" : ""}`} name={f.key} defaultValue={value(f.key)} placeholder={f.placeholder} error={fe[f.key]} />
                </div>
              ) : (
                <Field
                  key={`${type}-${f.key}`}
                  label={`${f.label}${f.required ? " *" : ""}`}
                  name={f.key}
                  defaultValue={value(f.key)}
                  placeholder={f.placeholder}
                  error={fe[f.key]}
                />
              ),
            )}
          </section>

          {/* Instagram: conexão oficial só aparece quando a integração está configurada. */}
          <section className="rounded-2xl border border-line p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white">
                <Icon name="instagram" size={20} />
              </span>
              <div className="flex-1">
                {instagramOfficial ? (
                  <>
                    <p className="font-semibold">Conecte seu Instagram</p>
                    <p className="mt-1 text-sm text-muted">
                      Se quiser, conecte seu Instagram profissional. Podemos analisar informações disponíveis para ajudar a confirmar sua atuação.
                    </p>
                    {/* Rota criada junto com a implementação do InstagramOfficialClient (lib/verification/providers.ts). */}
                    <a href="/api/verification/instagram/connect" className="btn btn-outline mt-3">Conectar Instagram</a>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">Informe seu perfil do Instagram</p>
                    <p className="mt-1 text-sm text-muted">Opcional. Se tiver um perfil profissional ou público relacionado ao seu trabalho, informe o @.</p>
                    <div className="mt-3">
                      <Field label="Instagram" name="instagram" defaultValue={value("instagram")} placeholder="@seuperfil" error={fe.instagram} />
                    </div>
                  </>
                )}
                <ul className="mt-3 flex flex-col gap-1 text-xs text-muted">
                  <li>• É opcional: você pode comprovar de outras formas.</li>
                  <li>• Não publicamos nada no seu Instagram e não acessamos mensagens privadas.</li>
                  <li>• Número de seguidores não é critério: perfil pequeno, novo ou privado não impede a verificação.</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 font-semibold">Outras evidências (opcional)</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {online.map((f) => (
                <Field key={`${type}-${f.key}`} label={f.label} name={f.key} defaultValue={value(f.key)} placeholder={f.placeholder} error={fe[f.key]} />
              ))}
            </div>
            <div className="mt-4">
              <span className="label">Comprovante (opcional)</span>
              <label className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-4 text-sm ${fe.document ? "border-tomato" : "border-line hover:border-basil"}`}>
                <Icon name={docKey ? "check" : "upload"} className={docKey ? "text-basil" : "text-muted"} />
                <span className="flex-1">
                  {progress !== null
                    ? `Enviando… ${progress}%`
                    : docKey
                      ? docName
                      : type === "student"
                        ? "Declaração de matrícula, carteirinha ou histórico (foto ou PDF)"
                        : "Crachá, contrato, CNPJ, declaração ou certificado (foto ou PDF)"}
                </span>
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
              <p className="mt-1 text-xs text-muted">Só pedimos documentos quando as outras informações não bastam. Se já tiver um em mãos, pode enviar agora e agilizar.</p>
              {(uploadError || fe.document) && <p className="mt-1 text-xs text-tomato">{uploadError || fe.document}</p>}
            </div>
          </section>

          {extra.map((f) => (
            <TextArea key={`${type}-${f.key}`} label={f.label} name={f.key} defaultValue={value(f.key)} placeholder="Algo mais que ajude a entender sua atuação." />
          ))}

          <label className="flex items-start gap-3 rounded-xl bg-cream p-3 text-sm">
            <input type="checkbox" name="consent" className="mt-1 accent-basil" />
            <span className={fe.consent ? "text-tomato" : "text-ink-2"}>
              Autorizo o Nuestro Impasto a usar estas informações — incluindo uma análise automatizada assistida por IA e a revisão pela equipe — exclusivamente
              para verificar meu perfil, conforme a{" "}
              <Link href="/privacy" target="_blank" className="underline">
                Política de Privacidade
              </Link>{" "}
              (LGPD). Posso pedir a exclusão dos meus dados a qualquer momento.
            </span>
          </label>

          <SubmitButton className="btn-green" pendingText="Analisando suas informações…" disabled={progress !== null}>
            Enviar para verificação
          </SubmitButton>
        </form>
      )}
    </div>
  );
}

function Result({ state }: { state: VerificationActionState }) {
  const approved = state.autoApproved;
  const needsInfo = state.status === "needs_info";
  return (
    <div className="card p-7 text-center">
      <span
        className={`mx-auto flex size-16 items-center justify-center rounded-full ${approved ? "bg-basil/10 text-basil" : needsInfo ? "bg-gold-soft text-gold-dark" : "bg-cream-2 text-ink"}`}
      >
        <Icon name={approved ? "check" : needsInfo ? "info" : "clock"} size={30} />
      </span>
      <h2 className="mt-4 text-xl font-bold">{approved ? "Você está verificado!" : needsInfo ? "Falta pouco" : "Recebemos sua solicitação"}</h2>
      <p className="mt-2 text-sm text-ink-2">{state.message}</p>
      <div className="mt-6 flex justify-center gap-3">
        {approved ? (
          <Link href="/studio/upload" className="btn btn-green h-11 px-6">Publicar meu primeiro vídeo</Link>
        ) : needsInfo ? (
          <button onClick={() => window.location.reload()} className="btn btn-primary h-11 px-6">Ver o que falta</button>
        ) : (
          <Link href="/" className="btn btn-outline h-11 px-6">Voltar ao início</Link>
        )}
      </div>
    </div>
  );
}
