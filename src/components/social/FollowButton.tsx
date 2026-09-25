"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleFollowAction } from "@/actions/social";
import { Icon } from "../icons";

type Props = {
  channelId: string;
  initialFollowing: boolean;
  loggedIn: boolean;
  full?: boolean;
  onCount?: (n: number) => void;
};

export function FollowButton({ channelId, initialFollowing, loggedIn, full, onCount }: Props) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, start] = useTransition();

  function click() {
    if (!loggedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setFollowing((f) => !f); // otimista
    start(async () => {
      const res = await toggleFollowAction(channelId);
      if (!res.ok) {
        setFollowing(initialFollowing);
        if (res.error) alert(res.error);
        return;
      }
      setFollowing(res.active);
      if (res.count !== undefined) onCount?.(res.count);
      router.refresh();
    });
  }

  return (
    <button
      onClick={click}
      disabled={pending}
      className={`btn ${following ? "btn-soft" : "btn-red"} ${full ? "w-full" : ""}`}
      aria-pressed={following}
    >
      {following ? (
        <>
          <Icon name="check" size={18} /> Seguindo
        </>
      ) : (
        "Seguir"
      )}
    </button>
  );
}
