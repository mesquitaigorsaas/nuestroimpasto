import type { Metadata } from "next";
import { getChannelByHandle } from "@/lib/queries";
import { ChannelView } from "./ChannelView";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const c = await getChannelByHandle(decodeURIComponent(handle).replace(/^@/, ""));
  return c ? { title: `${c.name} (@${c.handle})`, description: c.bio.slice(0, 160) } : { title: "Canal não encontrado" };
}

export default async function ChannelPage({ params }: Props) {
  const { handle } = await params;
  return <ChannelView handle={handle} tab="home" />;
}
