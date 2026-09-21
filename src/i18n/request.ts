import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { routing } from "./routing";
import en from "../messages/en.json";
import id from "../messages/id.json";

const messages = { en, id } as const;

export default getRequestConfig(async () => {
  // No URL prefixes (SPEC §7.1): the locale comes from the NEXT_LOCALE cookie.
  const requested = (await cookies()).get("NEXT_LOCALE")?.value;
  const locale = requested && hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return { locale, messages: messages[locale as keyof typeof messages] };
});
