"use client";

import { Folder, Inbox, LogOut, Plus, Settings, Tag, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import type { CollectionView } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collections: CollectionView[];
  activeCollectionId: string | null;
  tags: string[];
  activeTag: string | null;
  onSelectCollection: (id: string | null) => void;
  onSelectTag: (tag: string | null) => void;
  onCreateCollection: (name: string) => Promise<void>;
  onDeleteCollection: (collection: CollectionView) => void;
  onLogout: () => void;
}

function buildTree(collections: CollectionView[]): Map<string | null, CollectionView[]> {
  const byParent = new Map<string | null, CollectionView[]>();
  for (const collection of collections) {
    const bucket = byParent.get(collection.parentId) ?? [];
    bucket.push(collection);
    byParent.set(collection.parentId, bucket);
  }
  for (const bucket of byParent.values()) {
    bucket.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  }
  return byParent;
}

export function Sidebar({
  collections,
  activeCollectionId,
  tags,
  activeTag,
  onSelectCollection,
  onSelectTag,
  onCreateCollection,
  onDeleteCollection,
  onLogout,
}: SidebarProps) {
  const t = useTranslations("app");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const tree = buildTree(collections);

  function renderBranch(parentId: string | null, depth: number) {
    const nodes = tree.get(parentId) ?? [];
    return nodes.map((collection) => (
      <div key={collection._id}>
        <div
          className={cn(
            "group flex h-8 items-center gap-2 rounded-md pr-1 text-sm transition-colors",
            depth > 0 && "ml-4",
            activeCollectionId === collection._id
              ? "bg-surface text-foreground"
              : "text-muted hover:bg-surface hover:text-foreground",
          )}
        >
          <button
            type="button"
            onClick={() => onSelectCollection(collection._id)}
            className="flex h-full min-w-0 flex-1 items-center gap-2 px-2"
          >
            <Folder className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{collection.name}</span>
          </button>
          <button
            type="button"
            onClick={() => onDeleteCollection(collection)}
            aria-label={t("delete")}
            className="hidden rounded p-1 text-muted hover:text-red-400 group-hover:block"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {renderBranch(collection._id, depth + 1)}
      </div>
    ));
  }

  async function addCollection(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    await onCreateCollection(trimmed);
    setName("");
    setAdding(false);
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <h1 className="px-2 text-lg font-semibold text-foreground">LinkForge</h1>

      <button
        type="button"
        onClick={() => onSelectCollection(null)}
        className={cn(
          "flex h-8 items-center gap-2 rounded-md px-2 text-sm transition-colors",
          activeCollectionId === null && !activeTag
            ? "bg-surface text-foreground"
            : "text-muted hover:bg-surface hover:text-foreground",
        )}
      >
        <Inbox className="h-3.5 w-3.5" aria-hidden />
        {t("allItems")}
      </button>

      <div>
        <div className="mb-1 flex items-center justify-between px-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            {t("collections")}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setAdding(!adding)}
            aria-label={t("newCollection")}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        {adding && (
          <form onSubmit={addCollection} className="mb-2 flex gap-1 px-2">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("collectionNamePlaceholder")}
              className="h-8 text-xs"
              autoFocus
            />
            <Button type="submit" size="sm" className="h-8">
              {t("create")}
            </Button>
          </form>
        )}
        {renderBranch(null, 0)}
      </div>

      {tags.length > 0 && (
        <div>
          <span className="mb-1 block px-2 text-xs font-medium uppercase tracking-wide text-muted">
            {t("tags")}
          </span>
          <div className="flex flex-col">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onSelectTag(activeTag === tag ? null : tag)}
                className={cn(
                  "flex h-8 items-center gap-2 rounded-md px-2 text-sm transition-colors",
                  activeTag === tag
                    ? "bg-surface text-foreground"
                    : "text-muted hover:bg-surface hover:text-foreground",
                )}
              >
                <Tag className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{tag}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto">
        <Link
          href="/settings"
          className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm text-muted transition-colors hover:bg-surface hover:text-foreground"
          onClick={() => onSelectCollection(null)}
        >
          <Settings className="h-4 w-4" aria-hidden />
          {t("settings")}
        </Link>
        <Button variant="ghost" className="w-full justify-start" onClick={onLogout}>
          <LogOut className="h-4 w-4" />
          {t("logout")}
        </Button>
      </div>
    </div>
  );
}
