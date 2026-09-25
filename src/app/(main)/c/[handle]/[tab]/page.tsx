import { notFound } from "next/navigation";
import { ChannelView, type ChannelTab } from "../ChannelView";

const VALID: ChannelTab[] = ["videos", "respostas", "seguidores", "sobre"];

export default async function ChannelTabPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string; tab: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { handle, tab } = await params;
  const { sort } = await searchParams;
  if (!VALID.includes(tab as ChannelTab)) notFound();
  return <ChannelView handle={handle} tab={tab as ChannelTab} sort={sort} />;
}
