import { requireAdmin } from "@/lib/auth";
import { adminMetrics } from "@/lib/admin-queries";
import { PageContainer } from "@/components/ui";
import { AdminTabs } from "./AdminTabs";

export const metadata = { title: "Administração" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const m = await adminMetrics();
  return (
    <PageContainer className="max-w-7xl">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-full bg-white ring-1 ring-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mark.png" alt="" className="size-7" />
        </span>
        <div>
          <h1 className="title-tricolore text-2xl font-bold">Administração</h1>
        </div>
      </div>
      <AdminTabs pendingVerifications={m.pendingVerifications} openReports={m.openReports} />
      <div className="pt-6">{children}</div>
    </PageContainer>
  );
}
