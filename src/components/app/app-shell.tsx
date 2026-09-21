"use client";

import { AnimatePresence, motion } from "motion/react";
import { Menu, Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  api,
  type CollectionView,
  type ItemInput,
  type ItemsResponse,
  type ItemView,
} from "@/lib/client-api";
import { ItemCard } from "@/components/app/item-card";
import { ItemForm } from "@/components/app/item-form";
import { Sidebar } from "@/components/app/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ViewerPanel } from "@/components/viewer/viewer-panel";
import { cn } from "@/lib/utils";

type TypeChip = "all" | ItemView["type"];

export function AppShell({ initialCollectionId }: { initialCollectionId: string | null }) {
  const t = useTranslations("app");
  const [collections, setCollections] = useState<CollectionView[]>([]);
  const [items, setItems] = useState<ItemView[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeCollection, setActiveCollection] = useState<string | null>(initialCollectionId);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [type, setType] = useState<TypeChip>("all");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ItemView | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    void api
      .get<{ collections: CollectionView[] }>("/api/collections")
      .then(({ collections: loaded }) => setCollections(loaded))
      .catch(() => undefined);
  }, []);

  const buildParams = useCallback((skip: number) => {
    const params = new URLSearchParams();
    if (activeCollection) params.set("collectionId", activeCollection);
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (type !== "all") params.set("type", type);
    if (activeTag) params.set("tag", activeTag);
    params.set("limit", "100");
    if (skip > 0) params.set("skip", String(skip));
    return params;
  }, [activeCollection, debouncedQuery, type, activeTag]);

  const fetchItems = useCallback(
    async (skip: number, append: boolean) => {
      try {
        const response = await api.get<ItemsResponse>(`/api/items?${buildParams(skip)}`);
        setItems((previous) => (append ? [...previous, ...response.items] : response.items));
        setTotal(response.total);
        setHasMore(response.hasMore);
        setLoadError(false);
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    },
    [buildParams],
  );

  useEffect(() => {
    // fetchItems only calls setState after its awaited API call resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchItems(0, false);
  }, [fetchItems]);

  const tags = useMemo(() => {
    const unique = new Set<string>();
    for (const item of items) {
      for (const tag of item.tags) {
        unique.add(tag);
      }
    }
    return [...unique].sort((a, b) => a.localeCompare(b));
  }, [items]);

  const selected = useMemo(
    () => items.find((item) => item._id === selectedId) ?? null,
    [items, selectedId],
  );

  function selectCollection(id: string | null) {
    setActiveCollection(id);
    setActiveTag(null);
    setSelectedId(null);
    setSidebarOpen(false);
  }

  function selectTag(tag: string | null) {
    setActiveTag(tag);
    setSelectedId(null);
    setSidebarOpen(false);
  }

  async function save(payload: ItemInput | FormData, id?: string) {
    if (payload instanceof FormData) {
      if (id) {
        const patch: Record<string, unknown> = {};
        const title = payload.get("title");
        if (title) patch.title = String(title);
        const tags = payload.get("tags");
        if (tags) patch.tags = JSON.parse(String(tags));
        const collectionId = payload.get("collectionId");
        if (collectionId) patch.collectionId = String(collectionId);
        const note = payload.get("note");
        if (note) patch.note = String(note);
        await api.patch(`/api/items/${id}`, patch);
      } else {
        await api.postForm<{ item: ItemView }>("/api/items", payload);
      }
    } else if (id) {
      await api.patch<{ item: ItemView }>(`/api/items/${id}`, payload);
    } else {
      await api.post<{ item: ItemView }>("/api/items", payload);
    }
    setFormOpen(false);
    setEditing(null);
    await fetchItems(0, false);
  }

  async function deleteItem(item: ItemView) {
    if (!window.confirm(t("confirmDelete"))) {
      return;
    }
    await api.del(`/api/items/${item._id}`);
    if (selectedId === item._id) {
      setSelectedId(null);
    }
    await fetchItems(0, false);
  }

  async function createCollection(name: string) {
    await api.post<{ collection: CollectionView }>("/api/collections", { name });
    const { collections: loaded } = await api.get<{ collections: CollectionView[] }>("/api/collections");
    setCollections(loaded);
  }

  async function deleteCollection(collection: CollectionView) {
    if (!window.confirm(t("confirmDeleteCollection"))) {
      return;
    }
    await api.del(`/api/collections/${collection._id}`);
    if (activeCollection === collection._id) {
      setActiveCollection(null);
    }
    const { collections: loaded } = await api.get<{ collections: CollectionView[] }>("/api/collections");
    setCollections(loaded);
  }

  async function logout() {
    await api.post("/api/gate/logout", {});
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/gate");
  }

  const chips: { value: TypeChip; label: string }[] = [
    { value: "all", label: t("all") },
    { value: "link", label: t("links") },
    { value: "note", label: t("notes") },
    { value: "file", label: t("files") },
  ];

  const sidebar = (
    <Sidebar
      collections={collections}
      activeCollectionId={activeCollection}
      tags={tags}
      activeTag={activeTag}
      onSelectCollection={selectCollection}
      onSelectTag={selectTag}
      onCreateCollection={createCollection}
      onDeleteCollection={(collection) => void deleteCollection(collection)}
      onLogout={() => void logout()}
    />
  );

  return (
    <div
      className={cn(
        "flex h-dvh flex-col bg-background text-foreground lg:grid lg:grid-rows-1 lg:overflow-hidden",
        selected ? "lg:grid-cols-[250px_minmax(0,1fr)_minmax(360px,460px)]" : "lg:grid-cols-[250px_minmax(0,1fr)]",
      )}
    >
      <header className="flex h-14 items-center gap-2 border-b border-border px-3 lg:hidden">
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} aria-label={t("menu")}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("search")}
            className="pl-8"
            aria-label={t("search")}
          />
        </div>
        <Button
          size="icon"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          aria-label={t("addItem")}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </header>

      <aside className="hidden overflow-y-auto border-r border-border lg:block">{sidebar}</aside>

      <AnimatePresence>
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
            <motion.aside
              className="absolute inset-y-0 left-0 w-72 border-r border-border bg-background"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "tween", duration: 0.2 }}
            >
              {sidebar}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:row-start-1">
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-border bg-background/95 p-3 backdrop-blur">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("search")}
              className="pl-8"
              aria-label={t("search")}
            />
          </div>
          <div className="flex gap-1">
            {chips.map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => setType(chip.value)}
                className={cn(
                  "h-8 rounded-md px-2.5 text-xs font-medium transition-colors",
                  type === chip.value
                    ? "bg-accent text-background"
                    : "text-muted hover:bg-surface hover:text-foreground",
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
          {activeTag && (
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className="h-8 rounded-md border border-border px-2.5 text-xs text-muted hover:text-foreground"
            >
              #{activeTag} ✕
            </button>
          )}
          <div className="ml-auto hidden lg:block">
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              {t("addItem")}
            </Button>
          </div>
        </div>

        <div className="flex-1 p-4">
          {loading && items.length === 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-32 animate-pulse rounded-lg border border-border bg-surface" />
              ))}
            </div>
          ) : loadError ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3">
              <p className="text-sm text-muted">{t("errorUnknown")}</p>
              <Button variant="outline" size="sm" onClick={() => void fetchItems(0, false)}>
                {t("common.retry")}
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3">
              <p className="text-sm text-muted">{t("noItems")}</p>
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                {t("addItem")}
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {items.map((item) => (
                  <div key={item._id} className="group relative">
                    <ItemCard item={item} onOpen={(opened) => setSelectedId(opened._id)} />
                    <div className="absolute right-2 top-2 hidden gap-1 group-hover:flex">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(item);
                          setFormOpen(true);
                        }}
                      >
                        {t("edit")}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => void deleteItem(item)}>
                        {t("delete")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {hasMore && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => void fetchItems(items.length, true)}
                    disabled={loading}
                  >
                    {t("loadMore")}
                  </Button>
                </div>
              )}
              {total > 0 && (
                <p className="mt-4 text-center text-xs text-muted">
                  {t("itemCount", { count: total })}
                </p>
              )}
            </>
          )}
        </div>
      </main>

      {selected && (
        <div className="fixed inset-0 z-30 flex flex-col bg-background lg:static lg:z-auto lg:row-start-1 lg:border-l lg:border-border">
          <ViewerPanel
            key={selected._id}
            item={selected}
            onClose={() => setSelectedId(null)}
          />
        </div>
      )}

      <ItemForm
        key={formOpen ? (editing?._id ?? "new") : "closed"}
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        collections={collections}
        defaultCollectionId={activeCollection}
        editing={editing}
        onSave={save}
      />
    </div>
  );
}
