import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Icon } from "@/components/icons";

export const metadata = { title: "Bem-vindo" };

export default async function WelcomePage() {
  const user = await requireUser("/welcome");
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/mark.png" alt="" className="mx-auto size-16" />
      <h1 className="mt-5 text-3xl font-bold">Bem-vindo, {user.name.split(" ")[0]}!</h1>
      <div className="tricolore mx-auto mt-4 h-1 w-20 rounded-full" />
      <p className="mx-auto mt-5 max-w-xl text-ink-2">
        Você já pode assistir, seguir profissionais, curtir, comentar e salvar vídeos. Como você quer participar da comunidade?
      </p>

      <div className="mt-10 grid gap-4 text-left sm:grid-cols-2">
        <Link href="/verification?type=professional" className="card group p-6 transition hover:border-basil">
          <span className="flex size-12 items-center justify-center rounded-full bg-basil/10 text-basil">
            <Icon name="chef" />
          </span>
          <h2 className="mt-4 text-lg font-bold">Trabalho com massas</h2>
          <p className="mt-1 text-sm text-muted">Pizzaiolo, padeiro, chef, especialista em fermentação… Solicite a verificação de profissional e crie seu canal.</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-basil">Verificar como profissional <Icon name="chevronRight" size={16} /></span>
        </Link>
        <Link href="/verification?type=student" className="card group p-6 transition hover:border-tomato">
          <span className="flex size-12 items-center justify-center rounded-full bg-tomato/10 text-tomato">
            <Icon name="school" />
          </span>
          <h2 className="mt-4 text-lg font-bold">Estudo a área</h2>
          <p className="mt-1 text-sm text-muted">Gastronomia, panificação, tecnologia de alimentos… Solicite a verificação de estudante e mostre sua evolução.</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-tomato">Verificar como estudante <Icon name="chevronRight" size={16} /></span>
        </Link>
      </div>

      <Link href="/" className="btn btn-outline mt-8 h-11 px-6">
        Por enquanto, só quero assistir
      </Link>
      <p className="mt-4 text-xs text-muted">Quem cozinha em casa é muito bem-vindo para assistir, aprender e conversar. A publicação é reservada a estudantes e profissionais verificados.</p>
    </div>
  );
}
