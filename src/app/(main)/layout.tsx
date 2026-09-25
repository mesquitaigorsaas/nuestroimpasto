import { Suspense } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { ImpressionTracker } from "@/components/video/ImpressionTracker";
import { getCurrentUser } from "@/lib/auth";
import { followingChannels, unreadCount } from "@/lib/queries";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const shellUser = user
    ? {
        id: user.id,
        name: user.name,
        handle: user.handle,
        avatar_key: user.avatar_key,
        role: user.role,
        member_type: user.member_type,
        verification_status: user.verification_status,
      }
    : null;
  return (
    <AppShell user={shellUser} unread={user ? await unreadCount(user.id) : 0} following={user ? await followingChannels(user.id) : []}>
      {children}
      <Suspense fallback={null}>
        <ImpressionTracker />
      </Suspense>
    </AppShell>
  );
}
