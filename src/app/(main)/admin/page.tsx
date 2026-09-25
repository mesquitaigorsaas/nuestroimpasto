import Link from "next/link";
import { adminMetrics, growthSeries } from "@/lib/admin-queries";
import { compactNumber } from "@/lib/format";
import { Icon, type IconName } from "@/components/icons";

export default async function AdminOverview() {
  const m = await adminMetrics();
  const series = await growthSeries();
  const max = Math.max(1, ...series.map((d) => Math.max(d.users, d.videos)));

  const cards: { label: string; value: number; sub: string; icon: IconName; tone: string }[] = [
    { label: "Usuários", value: m.users, sub: `+${m.usersWeek} nos últimos 7 dias`, icon: "following", tone: "bg-basil/10 text-basil" },
    { label: "Membros verificados", value: m.publishers, sub: `${m.professionals} profissionais · ${m.students} estudantes`, icon: "shield", tone: "bg-gold-soft text-gold-dark" },
    { label: "Vídeos publicados", value: m.videos, sub: `+${m.videosWeek} nos últimos 7 dias · ${m.responses} respostas em vídeo`, icon: "film", tone: "bg-tomato/10 text-tomato" },
    { label: "Comentários", value: m.comments, sub: `+${m.commentsWeek} nos últimos 7 dias`, icon: "message", tone: "bg-cream-2 text-ink" },
    { label: "Visualizações", value: m.views, sub: "total da plataforma", icon: "eye", tone: "bg-cream-2 text-ink" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {(m.pendingVerifications > 0 || m.openReports > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {m.pendingVerifications > 0 && (
            <Link href="/admin/verifications" className="flex items-center gap-3 rounded-2xl border border-gold/40 bg-gold-soft p-4 text-sm">
              <Icon name="shield" className="text-gold-dark" />
              <span className="flex-1"><b>{m.pendingVerifications}</b> solicitações de verificação aguardando análise</span>
              <Icon name="chevronRight" size={18} />
            </Link>
          )}
          {m.openReports > 0 && (
            <Link href="/admin/reports" className="flex items-center gap-3 rounded-2xl border border-tomato/30 bg-tomato/5 p-4 text-sm">
              <Icon name="flag" className="text-tomato" />
              <span className="flex-1"><b>{m.openReports}</b> denúncias em aberto</span>
              <Icon name="chevronRight" size={18} />
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <span className={`flex size-9 items-center justify-center rounded-full ${c.tone}`}>
              <Icon name={c.icon} size={18} />
            </span>
            <p className="mt-3 text-2xl font-bold">{compactNumber(c.value)}</p>
            <p className="text-sm font-medium">{c.label}</p>
            <p className="mt-0.5 text-xs text-muted">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">Crescimento — últimos 30 dias</h2>
          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-basil" /> Novos usuários</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-tomato" /> Vídeos publicados</span>
          </div>
        </div>
        <div className="flex h-40 items-end gap-[3px]" role="img" aria-label="Gráfico de novos usuários e vídeos por dia">
          {series.map((d) => (
            <div key={d.d} className="group relative flex h-full flex-1 items-end gap-[1px]" title={`${d.d.split("-").reverse().join("/")}: ${d.users} usuários, ${d.videos} vídeos`}>
              <div className="flex-1 rounded-t-sm bg-basil/80" style={{ height: `${(d.users / max) * 100}%`, minHeight: d.users ? 3 : 0 }} />
              <div className="flex-1 rounded-t-sm bg-tomato/80" style={{ height: `${(d.videos / max) * 100}%`, minHeight: d.videos ? 3 : 0 }} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-muted">
          <span>{series[0].d.split("-").reverse().slice(0, 2).join("/")}</span>
          <span>hoje</span>
        </div>
      </div>
    </div>
  );
}
