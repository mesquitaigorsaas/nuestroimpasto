"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signupAction } from "@/actions/auth";
import { Field, FormError, SubmitButton } from "@/components/forms";
import { slugifyHandle } from "@/lib/format";

export function SignupForm({ next }: { next: string }) {
  const [state, action] = useActionState(signupAction, {});
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [touchedHandle, setTouchedHandle] = useState(false);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <FormError message={state.error} />
      <Field
        label="Nome completo"
        name="name"
        autoComplete="name"
        required
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (!touchedHandle) setHandle(slugifyHandle(e.target.value));
        }}
        error={fe.name}
      />
      <Field
        label="Seu @ na comunidade"
        name="handle"
        required
        value={handle}
        onChange={(e) => {
          setTouchedHandle(true);
          setHandle(slugifyHandle(e.target.value));
        }}
        error={fe.handle}
        hint={handle ? `Seu canal: nuestroimpasto.com/@${handle}` : "Letras, números, ponto e _"}
      />
      <Field label="E-mail" name="email" type="email" autoComplete="email" required error={fe.email} />
      <Field label="Senha" name="password" type="password" autoComplete="new-password" required minLength={8} error={fe.password} hint="Mínimo de 8 caracteres." />
      <SubmitButton pendingText="Criando conta…">Criar conta</SubmitButton>
      <p className="text-xs leading-relaxed text-muted">
        Qualquer pessoa pode criar conta para assistir, seguir, curtir e comentar. Para publicar vídeos, você solicita a verificação como{" "}
        <b>estudante</b> ou <b>profissional</b> depois do cadastro.
      </p>
      <p className="text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-gold-dark hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
