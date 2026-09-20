"use client";

import { Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { CollectionView, ItemInput, ItemView } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Tab = "link" | "note" | "file";

export function ItemForm({
  open,
  onClose,
  collections,
  defaultCollectionId,
  editing,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  collections: CollectionView[];
  defaultCollectionId: string | null;
  editing: ItemView | null;
  onSave: (payload: ItemInput | FormData, id?: string) => Promise<void>;
}) {
  const t = useTranslations("app");
  const [tab, setTab] = useState<Tab>(editing?.type ?? "link");
  const [url, setUrl] = useState(editing?.type === "link" ? (editing.url ?? "") : "");
  const [title, setTitle] = useState(
    editing?.title.startsWith("Untitled") ? "" : (editing?.title ?? ""),
  );
  const [body, setBody] = useState(editing?.type === "note" ? (editing.note ?? "") : "");
  const [tags, setTags] = useState(editing?.tags.join(", ") ?? "");
  const [note, setNote] = useState(editing?.note ?? "");
  const [collectionId, setCollectionId] = useState(
    editing?.collectionId ?? defaultCollectionId ?? "",
  );
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  if (!open) {
    return null;
  }

  const tabs: { value: Tab; label: string }[] = [
    { value: "link", label: t("itemLink") },
    { value: "note", label: t("itemNote") },
    { value: "file", label: t("itemFile") },
  ];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) {
      return;
    }
    setSaving(true);
    try {
      const tagsArray = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 20);
      const collection = collectionId === "" ? null : collectionId;
      if (tab === "file" && file) {
        const form = new FormData();
        form.append("file", file);
        if (title) form.append("title", title);
        if (tagsArray.length) form.append("tags", JSON.stringify(tagsArray));
        if (collection) form.append("collectionId", collection);
        if (note) form.append("note", note);
        await onSave(form, editing?._id);
      } else if (tab === "link") {
        await onSave(
          {
            type: "link",
            url,
            title: title || undefined,
            collectionId: collection,
            tags: tagsArray,
            note: note || undefined,
          },
          editing?._id,
        );
      } else {
        await onSave(
          {
            type: "note",
            body,
            title: title || undefined,
            collectionId: collection,
            tags: tagsArray,
            note: note || undefined,
          },
          editing?._id,
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <form
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-lg space-y-4 rounded-xl border border-border bg-surface p-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            {editing ? t("editItem") : t("addItemTitle")}
          </h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label={t("cancel")}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {!editing && (
          <div className="flex gap-1 rounded-md bg-background p-1">
            {tabs.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setTab(item.value)}
                className={cn(
                  "h-8 flex-1 rounded text-xs font-medium transition-colors",
                  tab === item.value
                    ? "bg-accent text-background"
                    : "text-muted hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {tab === "link" && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">{t("linkUrl")}</span>
            <Input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
              required
              autoFocus
            />
          </label>
        )}

        {tab === "note" && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">{t("noteBody")}</span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={t("noteBodyPlaceholder")}
              required
              rows={6}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
            />
          </label>
        )}

        {tab === "file" && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">{t("filePick")}</span>
            <input
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              required
              className="text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-background file:px-3 file:py-1.5 file:text-sm file:text-foreground"
            />
            <p className="text-xs text-muted">{t("fileHint")}</p>
          </label>
        )}

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">{t("itemTitle")}</span>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("itemTitlePlaceholder")}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">{t("tagsLabel")}</span>
          <Input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder={t("tagsPlaceholder")}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">{t("collectionLabel")}</span>
          <select
            value={collectionId}
            onChange={(event) => setCollectionId(event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
          >
            <option value="">{t("noCollection")}</option>
            {collections.map((collection) => (
              <option key={collection._id} value={collection._id}>
                {collection.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">{t("noteLabel")}</span>
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t("notePlaceholder")}
          />
        </label>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            disabled={saving || (tab === "link" && !url) || (tab === "file" && !file)}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? t("saving") : editing ? t("save") : t("create")}
          </Button>
        </div>
      </form>
    </div>
  );
}
