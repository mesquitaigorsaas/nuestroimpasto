import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { googleEnabled } from "@/lib/google";
import { GoogleButton } from "@/components/GoogleButton";
import { SignupForm } from "./SignupForm";

export const metadata = { title: "Criar conta" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/" } = await searchParams;
  if (await getCurrentUser()) redirect("/");
  return (
    <>
      <h1 className="text-2xl font-bold">Criar conta</h1>
      <p className="mt-1 mb-6 text-sm text-muted">Entre para a comunidade de quem vive de massa.</p>
      {googleEnabled() && <div className="mb-4 flex flex-col gap-4"><GoogleButton next={next} /></div>}
      <SignupForm next={next} />
    </>
  );
}
