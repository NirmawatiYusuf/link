import { load } from "cheerio";
import type { EmbedStatus } from "./types";

const USER_AGENT = "Mozilla/5.0 (compatible; LinkForgeBot/1.0)";
const FETCH_TIMEOUT_MS = 6000;

export interface LinkMetadata {
  title: string | null;
  description: string | null;
  thumbnail: string | null;
  favicon: string | null;
  domain: string;
  canEmbed: EmbedStatus;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: "follow" });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function absoluteUrl(value: string | null | undefined, base: string): string | null {
  if (!value) {
    return null;
  }
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

function metaContent($: CheerioLike, property: string): string | null {
  const fromProperty = $(`meta[property="${property}"]`).attr("content");
  if (fromProperty) {
    return fromProperty.trim();
  }
  return $(`meta[name="${property}"]`).attr("content")?.trim() ?? null;
}

export function parseEmbeddability(headers: Headers): EmbedStatus {
  const xFrameOptions = headers.get("x-frame-options")?.trim().toLowerCase();
  if (xFrameOptions === "deny") {
    return "no";
  }
  const csp = headers.get("content-security-policy") ?? "";
  if (/frame-ancestors\s+'?none'?/i.test(csp)) {
    return "no";
  }
  return "yes";
}

export async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {
  try {
    const base = new URL(url);
    const domain = base.hostname ?? url;
    const response = await fetchWithTimeout(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html, application/xhtml+xml, */*" },
    });
    if (!response || !response.ok) {
      return { title: null, description: null, thumbnail: null, favicon: null, domain, canEmbed: "unknown" };
    }
    const html = await response.text();
    const $ = load(html);
    return {
      title:
        (metaContent($, "og:title") ?? metaContent($, "twitter:title") ?? $("title").text().trim()) ||
        null,
      description:
        metaContent($, "og:description") ??
        metaContent($, "twitter:description") ??
        $('meta[name="description"]').attr("content")?.trim() ??
        null,
      thumbnail: absoluteUrl(metaContent($, "og:image") ?? metaContent($, "twitter:image"), url),
      favicon:
        absoluteUrl($('link[rel~="icon"]').attr("href"), url) ??
        absoluteUrl("/favicon.ico", base.origin),
      domain,
      canEmbed: parseEmbeddability(response.headers),
    };
  } catch {
    return { title: null, description: null, thumbnail: null, favicon: null, domain: "", canEmbed: "unknown" };
  }
}

type CheerioLike = {
  (selector: string): { attr(name: string): string | undefined; text(): string };
};
