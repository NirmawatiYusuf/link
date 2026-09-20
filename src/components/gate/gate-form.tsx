"use client";

import { useLocale, useTranslations } from "next-intl";
import { motion } from "motion/react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { routing } from "@/i18n/routing";

export function GateForm() {
  const t = useTranslations("gate");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<"wrong" | "limited" | "server" | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!password || submitting) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/gate/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        router.replace("/");
        router.refresh();
        return;
      }
      if (response.status === 429) {
        setError("limited");
      } else if (response.status === 401) {
        setError("wrong");
      } else {
        setError("server");
      }
      setAttempt(attempt + 1);
      setPassword("");
    } catch {
      setError("server");
      setAttempt(attempt + 1);
    } finally {
      setSubmitting(false);
    }
  }

  function switchLocale(next: string) {
    void fetch("/api/gate/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    }).then(() => document.location.reload());
  }

  return (
    <>
      <div className="absolute right-4 top-4 flex items-center gap-1">
        {routing.locales.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => switchLocale(code)}
            className={`rounded-md px-2 py-1 text-xs font-medium uppercase transition-colors ${
              code === locale ? "bg-accent text-background" : "text-muted hover:text-foreground"
            }`}
            aria-label={code}
          >
            {code}
          </button>
        ))}
      </div>
      <motion.div
        className="w-full max-w-[420px]"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
      >
        <motion.div
          key={attempt}
          animate={attempt > 0 ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-xl border border-border bg-surface p-6 shadow-sm"
        >
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-background">
            <Lock className="h-5 w-5 text-accent" aria-hidden />
          </div>
          <h1 className="mt-4 text-center text-xl font-semibold text-foreground">{t("heading")}</h1>
          <p className="mt-1 text-center text-sm text-muted">{t("subtitle")}</p>

          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <label className="flex flex-col gap-1.5 text-sm" htmlFor="gate-password">
              <span className="text-muted">{t("passwordLabel")}</span>
              <div className="relative">
                <input
                  id="gate-password"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t("passwordPlaceholder")}
                  required
                  autoFocus
                  autoComplete="current-password"
                  className="h-11 w-full rounded-md border border-border bg-background px-3 text-foreground outline-none placeholder:text-muted focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label={show ? t("hidePassword") : t("showPassword")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                >
                  {show ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </label>

            {error === "wrong" && (
              <p className="text-sm text-red-400" role="alert">{t("errorWrong")}</p>
            )}
            {error === "limited" && (
              <p className="text-sm text-red-400" role="alert">{t("errorRateLimited")}</p>
            )}
            {error === "server" && (
              <p className="text-sm text-red-400" role="alert">{t("errorServer")}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !password}
              className="h-11 w-full rounded-md bg-accent font-medium text-background hover:bg-[#d98f08] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? tc("loading") : t("unlock")}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </>
  );
}
