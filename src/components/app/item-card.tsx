"use client";

import { FileText, Link2, StickyNote } from "lucide-react";
import { motion } from "motion/react";
import type { ItemView } from "@/lib/client-api";
import { cn } from "@/lib/utils";

const icons = { link: Link2, note: StickyNote, file: FileText };

export function ItemCard({
  item,
  onOpen,
}: {
  item: ItemView;
  onOpen: (item: ItemView) => void;
}) {
  const Icon = icons[item.type];
  const hasThumbnail = item.type === "link" && item.thumbnail;
  return (
    <motion.button
      type="button"
      whileHover={{ y: -2 }}
      onClick={() => onOpen(item)}
      className="group flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:border-accent/40"
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-background",
            !hasThumbnail && "text-muted",
          )}
        >
          {hasThumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnail as string}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          ) : (
            <Icon className="h-4.5 w-4.5" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
          {item.domain && <p className="truncate text-xs text-muted">{item.domain}</p>}
        </div>
      </div>
      {item.description && (
        <p className="line-clamp-2 text-xs text-muted">{item.description}</p>
      )}
      {item.type === "note" && item.note && (
        <p className="line-clamp-3 whitespace-pre-wrap text-xs text-muted">{item.note}</p>
      )}
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-background px-2 py-0.5 text-[10px] text-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </motion.button>
  );
}
