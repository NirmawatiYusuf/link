import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "id"],
  defaultLocale: "en",
  // Keep the SPEC.md §7.1 URL structure (no locale prefixes).
  localePrefix: "never",
});
