"use client";

import Link from "next/link";
import { useState } from "react";
import { TECH_FIELDS, categoryName, type TechInfo } from "@/lib/constants";
import { formatDate, linkify, timeAgo, viewsLabel } from "@/lib/format";
import { Icon } from "../icons";

type Props = {
  views: number;
  createdAt: string;
  description: string;
  tags: string;
  category: string;
  tech: TechInfo;
};

export function DescriptionBox({ views, createdAt, description, tags, category, tech }: Props) {
  const [open, setOpen] = useState(false);
  const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
  const techEntries = TECH_FIELDS.filter((f) => tech[f.key]);
  const long = description.length > 220 || description.split("\n").length > 3;

  return (
    <div
      className={`mt-3 rounded-2xl bg-cream-2 p-3 text-sm ${!open && long ? "cursor-pointer hover:bg-cream-3" : ""}`}
      onClick={() => !open && long && setOpen(true)}
    >
      <div className="flex flex-wrap gap-x-2 font-semibold">
        <span>{viewsLabel(views)}</span>
        <span title={formatDate(createdAt)}>{open ? formatDate(createdAt) : timeAgo(createdAt)}</span>
        <Link href={`/?cat=${category}`} className="text-gold-dark hover:underline" onClick={(e) => e.stopPropagation()}>
          #{categoryName(category).toLowerCase()}
        </Link>
        {tagList.slice(0, 3).map((t) => (
          <Link key={t} href={`/results?q=${encodeURIComponent(t)}`} className="text-gold-dark hover:underline" onClick={(e) => e.stopPropagation()}>
            #{t.replace(/\s+/g, "")}
          </Link>
        ))}
      </div>

      {techEntries.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {(open ? techEntries : techEntries.slice(0, 4)).map((f) => (
            <div key={f.key} className="rounded-xl bg-white/70 px-3 py-2">
              <div className="text-[11px] font-medium tracking-wide text-muted uppercase">{f.label}</div>
              <div className="mt-0.5 text-[13px] font-medium break-words">{tech[f.key]}</div>
            </div>
          ))}
        </div>
      )}

      {description && (
        <p className={`mt-3 whitespace-pre-line ${!open ? "line-clamp-3" : ""}`}>
          {linkify(description).map((p, i) =>
            p.type === "link" ? (
              <a key={i} href={p.value} target="_blank" rel="noopener noreferrer nofollow" className="text-gold-dark hover:underline" onClick={(e) => e.stopPropagation()}>
                {p.value}
              </a>
            ) : (
              <span key={i}>{p.value}</span>
            ),
          )}
        </p>
      )}

      {open && tagList.length > 3 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {tagList.map((t) => (
            <Link key={t} href={`/results?q=${encodeURIComponent(t)}`} className="chip chip-off h-7 bg-white/70 text-xs">
              #{t}
            </Link>
          ))}
        </div>
      )}

      {(long || techEntries.length > 4 || tagList.length > 3) && (
        <button
          className="mt-2 flex items-center gap-1 font-semibold"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(!open);
          }}
        >
          {open ? "Mostrar menos" : "…mais"}
          {!open && <Icon name="chevronDown" size={16} />}
        </button>
      )}
    </div>
  );
}
