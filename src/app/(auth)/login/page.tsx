import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { googleEnabled } from "@/lib/google";
import { GoogleButton } from "@/components/GoogleButton";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Entrar" };

const ERROS: Record<string, string> = {
  google: "Não foi possível entrar com o Google. Tente de novo ou use e-mail e senha.",
  banido: "Esta conta foi banida por violar as diretrizes da comunidade.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; erro?: string }> }) {
  const { next = "/", erro } = await searchParams;
  if (await getCurrentUser()) redirect(next.startsWith("/") ? next : "/");
  return (
    <>
      <h1 className="text-2xl font-bold">Entrar</h1>
      <p className="mt-1 mb-6 text-sm text-muted">Bem-vindo de volta à comunidade.</p>
      {erro && ERROS[erro] && <p className="mb-4 rounded-xl bg-tomato/10 px-3.5 py-2.5 text-sm text-tomato">{ERROS[erro]}</p>}
      {googleEnabled() && <div className="mb-4 flex flex-col gap-4"><GoogleButton next={next} /></div>}
      <LoginForm next={next} />
    </>
  );
}
