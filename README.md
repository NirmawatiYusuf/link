# LinkForge

LinkForge is a personal link & knowledge manager. Save links, short notes, and
lightweight files into nested collections, tag and search them, and preview
content in an in-app viewer. Spec-driven: `SPEC.md` at the project root is the
source of truth for features, data model, routing, and security.

## Features

- Global password gate (bcrypt-hashed, rate-limited login, HttpOnly session cookie)
- Nested collections, free-form tags, filters (collection, tag, type, domain, date), full-text search
- Items: links (with automatic metadata, thumbnail, favicon, embeddability detection),
  notes (Markdown-ish text), and files (PDF, images, text; strict MIME/size validation)
- In-app viewer with sandboxed iframe, "Open in Browser" fallback, and friendly error states
- Responsive three-column layout (mobile drawer → desktop sidebar/grid/viewer)
- i18n English/Indonesian (next-intl), dark neutral theme with amber accent
- PWA: manifest, service worker with offline fallback page
- Security headers (CSP, HSTS, X-Frame-Options, Permissions-Policy, …)

## Tech stack

Next.js 16 (App Router) · TypeScript · MongoDB Atlas (official driver) ·
Tailwind CSS v4 · Motion · next-intl · jose (sessions) · bcryptjs · zod ·
Vercel Blob (files) · pnpm

## Getting started

1. `pnpm install`
2. `cp .env.example .env` and fill it in (see table below)
3. `pnpm dev` → http://localhost:3000

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | yes* | Atlas/Mongo connection string (*needed for content APIs) |
| `MONGODB_DB` | no | Database name (default: `linkforge`) |
| `GATE_PASSWORD_HASH` | yes* | bcrypt hash of the gate password (`bcryptjs.hashSync(pw, 12)`); escape `$` as `\$` in `.env`; settings-doc value overrides it |
| `SESSION_SECRET` | yes | JWT signing secret (`openssl rand -base64 48`) |
| `BLOB_READ_WRITE_TOKEN` | no | Vercel Blob token; unset → files stored in `.local-blob/` (dev) |
| `LOGIN_RATE_LIMIT` / `LOGIN_RATE_WINDOW_SECONDS` | no | Login throttling per IP (defaults: 5 / 60) |

## Scripts

- `pnpm dev` — development server
- `pnpm build` — production build (type-check included)
- `pnpm start` — serve the production build
- `pnpm lint` — ESLint (incl. React Compiler rules)
- `pnpm test` — Vitest unit tests

## Architecture

```
src/
  app/
    (gate)/gate/        password gate page
    (app)/              app shell, collection/item pages, settings
    api/                gate, collections, items, files, settings
  components/           gate, app shell, viewer, settings, ui primitives, pwa
  i18n/                 next-intl routing + request config
  messages/             en/id dictionaries
  lib/                  db, types, auth, password, rateLimit, files, metadata,
                        validate (zod), http helpers, client API
proxy.ts               auth guard + locale negotiation
```

API routes validate a session cookie server-side (proxy + per-request checks),
validate every input with zod, and return a consistent `{ error: { code, message } }`
shape on failure.

## Deployment (Vercel + MongoDB Atlas)

1. Push to GitHub, import into Vercel.
2. Create an Atlas cluster and a Blob store; add the environment variables above.
3. Deploy. The gate password defaults to `GATE_PASSWORD_HASH`; change it from
   Settings after the first login (it is then stored hashed in the `settings` collection).

Rate limiting is in-memory (per server instance) — for multi-instance
deployments, add an Upstash Redis-backed `RateLimitStore` (`src/lib/rateLimit.ts`).

## Security notes

- Passwords: bcrypt only, never stored or logged in plaintext.
- Sessions: short-lived JWT in an HttpOnly, Secure, SameSite=Lax cookie.
- Login: rate-limited per IP (429 + `Retry-After`).
- Uploads: allowlisted MIME types, 10 MB cap, stored in object storage.
- CSP uses `'unsafe-inline'` for scripts because Next.js injects inline hydration
  scripts; a nonce-based CSP is a follow-up. `frame-src` allows https (and http)
  so arbitrary sites can be previewed in the viewer.

## License

MIT — see [LICENSE](LICENSE).
