import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/mark.png" alt="" className="size-16" />
      <h1 className="mt-6 text-2xl font-bold">Esta página não está disponível</h1>
      <p className="mt-2 text-muted">O link pode estar quebrado ou o conteúdo foi removido.</p>
      <div className="tricolore mt-5 h-1 w-20 rounded-full" />
      <Link href="/" className="btn btn-primary mt-6 h-11 px-6">
        Voltar ao início
      </Link>
    </div>
  );
}
