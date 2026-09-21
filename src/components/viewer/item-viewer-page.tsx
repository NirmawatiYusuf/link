"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { api, type ItemView } from "@/lib/client-api";
import { ViewerPanel } from "@/components/viewer/viewer-panel";

export function ItemViewerPage({ itemId }: { itemId: string }) {
  const t = useTranslations("common");
  const [item, setItem] = useState<ItemView | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    void api
      .get<{ item: ItemView }>(`/api/items/${itemId}`)
      .then(({ item: loaded }) => setItem(loaded))
      .catch(() => setError(true));
  }, [itemId]);

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="flex h-12 items-center gap-2 border-b border-border px-3">
        <Link href="/" className="rounded p-2 text-muted hover:bg-surface hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-sm font-medium">
          {item?.title ?? (error ? t("error") : "")}
        </h1>
      </header>
      <div className="min-h-0 flex-1">
        {error ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            {t("error")}
          </div>
        ) : item ? (
          <ViewerPanel key={item._id} item={item} onClose={() => window.history.back()} />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
