import Link from "next/link";
import { BackBar } from "@/components/shell/BackBar";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <BackBar className="absolute top-3 left-4 sm:left-6" />
      <Link href="/" className="mb-8 flex flex-col items-center gap-3" aria-label="Nuestro Impasto — início">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Nuestro Impasto" className="h-16 w-auto" />
        <span className="text-xs font-medium tracking-wide text-basil">La comunidad de los que hacen masa</span>
      </Link>
      <div className="w-full max-w-[420px] rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8">{children}</div>
      <p className="mt-8 text-xs text-muted">
        Desenvolvido por{" "}
        <a href="https://mesquitasaas.online/" target="_blank" rel="noopener" className="font-semibold text-ink underline-offset-2 hover:underline">
          Mesquita SaaS
        </a>
      </p>
    </div>
  );
}
