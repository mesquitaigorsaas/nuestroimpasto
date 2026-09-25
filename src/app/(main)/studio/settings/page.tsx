import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Icon } from "@/components/icons";
import { PageContainer, PageTitle } from "@/components/ui";
import { ProfileForm } from "./ProfileForm";

export const metadata = { title: "Personalizar canal" };

export default async function SettingsPage() {
  const user = await requireUser("/studio/settings");
  return (
    <PageContainer className="max-w-3xl">
      <Link href="/studio" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <Icon name="arrowLeft" size={16} /> Estúdio
      </Link>
      <PageTitle icon="settings" title="Personalizar canal" subtitle={`nuestroimpasto.com/@${user.handle}`} />
      <ProfileForm
        user={{
          name: user.name,
          bio: user.bio,
          specialty: user.specialty,
          location: user.location,
          website: user.website,
          instagram: user.instagram,
          avatar_key: user.avatar_key,
          banner_key: user.banner_key,
          handle: user.handle,
        }}
      />
    </PageContainer>
  );
}
