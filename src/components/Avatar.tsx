import { avatarColor, initials, mediaUrl } from "@/lib/format";

type Props = { name: string; src?: string | null; size?: number; className?: string };

export function Avatar({ name, src, size = 36, className = "" }: Props) {
  const url = mediaUrl(src);
  const style = { width: size, height: size };
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" style={style} className={`shrink-0 rounded-full object-cover bg-cream-2 ${className}`} />;
  }
  return (
    <span
      aria-hidden="true"
      style={{ ...style, background: avatarColor(name), fontSize: Math.max(11, size * 0.38) }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white select-none ${className}`}
    >
      {initials(name) || "?"}
    </span>
  );
}
