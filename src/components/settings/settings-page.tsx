"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { api } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { routing } from "@/i18n/routing";

interface SettingsResponse {
  settings: { defaultLocale: string; theme: string };
}

export function SettingsPageClient() {
  const t = useTranslations("settings");
  const common = useTranslations("common");
  const [settings, setSettings] = useState<SettingsResponse["settings"] | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .get<SettingsResponse>("/api/settings")
      .then((response) => setSettings(response.settings))
      .catch(() => undefined);
  }, []);

  async function save(rest: Record<string, string>) {
    if (saving) {
      return;
    }
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await api.post("/api/settings", rest);
      setSaved(true);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : common("error"));
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    if (saving) {
      return;
    }
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await api.post("/api/settings", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setSaved(true);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : common("error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex h-12 items-center gap-2 border-b border-border px-4">
        <a href="/" className="text-sm text-muted hover:text-foreground">
          ←
        </a>
        <h1 className="text-sm font-semibold">{t("title")}</h1>
      </header>

      <div className="mx-auto mt-6 w-full max-w-md space-y-6">
        {!settings ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted" />
        ) : (
          <>
            <section className="rounded-xl border border-border bg-surface p-4">
              <h2 className="text-sm font-medium text-foreground">{t("language")}</h2>
              <div className="mt-2 flex gap-2">
                {routing.locales.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => void save({ locale: code })}
                    className={
                      settings.defaultLocale === code
                        ? "h-10 rounded-md bg-accent px-4 text-sm font-medium text-background"
                        : "h-10 rounded-md border border-border px-4 text-sm text-muted hover:border-accent/50"
                    }
                  >
                    {code === "en" ? "English" : "Bahasa Indonesia"}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-surface p-4">
              <h2 className="text-sm font-medium text-foreground">{t("theme")}</h2>
              <p className="mt-1 text-xs text-muted">{t("themeDark")}</p>
            </section>

            <form
              onSubmit={changePassword}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <h2 className="text-sm font-medium text-foreground">{t("password")}</h2>
              <label className="mt-3 flex flex-col gap-1.5 text-sm">
                <span className="text-muted">{t("currentPassword")}</span>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>
              <label className="mt-3 flex flex-col gap-1.5 text-sm">
                <span className="text-muted">{t("newPassword")}</span>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <span className="text-xs text-muted">{t("passwordHint")}</span>
              </label>
              <Button type="submit" disabled={saving} className="mt-4 w-full">
                {saving ? common("loading") : t("changePassword")}
              </Button>
            </form>

            <p role="status" className="text-center text-sm">
              {saved && <span className="text-green-500">{t("saved")}</span>}
              {error && <span className="text-red-400">{error}</span>}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
