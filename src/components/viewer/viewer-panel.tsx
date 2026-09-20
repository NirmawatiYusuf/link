"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, X } from "lucide-react";
import type { ItemView } from "@/lib/client-api";
import { Button } from "@/components/ui/button";

const LOAD_TIMEOUT_MS = 12000;

export function ViewerPanel({ item, onClose }: { item: ItemView; onClose: () => void }) {
  const t = useTranslations("viewer");
  const [loading, setLoading] = useState(true);
  const [timedOut, setTimedOut] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (item.type !== "link" && item.type !== "file") {
      return;
    }
    timer.current = setTimeout(() => {
      setLoading(false);
      setTimedOut(true);
    }, LOAD_TIMEOUT_MS);
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [item._id, item.type]);

  const isLink = item.type === "link";
  const src = isLink ? item.url : item.type === "file" ? item.fileRef : null;
  const blocked = isLink && item.canEmbed === "no";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
          {(item.domain || item.tags.length > 0) && (
            <p className="truncate text-xs text-muted">
              {[item.domain, ...item.tags].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isLink && item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("openBrowser")}
              title={t("openBrowser")}
              className="rounded p-2 text-muted hover:bg-surface hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={t("close")}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {item.type === "note" ? (
          <div className="h-full overflow-y-auto whitespace-pre-wrap p-4 text-sm text-foreground">
            {item.note}
          </div>
        ) : src && !blocked ? (
          <>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background text-sm text-muted">
                {t("loading")}
              </div>
            )}
            <iframe
              src={src}
              title={item.title}
              className="h-full w-full"
              sandbox="allow-scripts allow-same-origin allow-popups"
              referrerPolicy="no-referrer"
              loading="lazy"
              onLoad={() => {
                setLoading(false);
                setTimedOut(false);
              }}
            />
            {timedOut && (
              <div className="absolute inset-x-0 bottom-0 border-t border-border bg-background p-3 text-center text-xs text-muted">
                {t("timeout")}
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="text-sm text-muted">{blocked ? t("blocked") : t("failed")}</p>
            {isLink && item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-1.5 rounded-md bg-accent px-3.5 text-sm font-medium text-background hover:bg-[#d98f08]"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                {t("openBrowser")}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
