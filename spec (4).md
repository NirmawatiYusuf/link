# SPEC.md — LinkForge (Personal Link & Knowledge Manager)

## 1. Overview

LinkForge is a personal web application for saving links, short notes, and lightweight files into nested collections with automatic thumbnails, an in-app viewer, and a global password gate. The project is intended to be open source, so security, documentation, and code quality should be production-grade even though the first use case is personal.

### 1.1 Goals
- Provide a fast, pleasant interface to capture and organize links, notes, and files.
- Act as a personal knowledge base with tags, search, and an embedded viewer.
- Work well on mobile, tablet, and desktop, and be installable as a PWA.
- Be easy to self-host (Vercel + MongoDB Atlas) and simple to contribute to.

### 1.2 Non-Goals (for the initial version)
- Multi-tenant user accounts (only a single global gate/password in MVP).
- Complex sharing/permissions between different users.
- Full-featured team knowledge management (this is focused on individual use).

---

## 2. Tech Stack

- Framework: **Next.js (App Router)** + **TypeScript**
- Hosting: **Vercel** (edge/Node runtimes as required)
- Database: **MongoDB Atlas**
- Styling: **Tailwind CSS** + **shadcn/ui**
- Icons: **lucide-react**
- Animation: **Motion (motion.dev)** for subtle UI animations
- i18n: **next-intl** (English + Indonesian)
- PWA: **@ducanh2912/next-pwa** or an equivalent App Router-compatible setup
- Rate limiting: **Upstash Redis** (recommended for production deployments)

---

## 3. Core Features

### 3.1 Access Gate (Global Password)

MVP uses a single passcode gate instead of full user authentication:

- Password gate is required before accessing any content (collections/items).
- Password is stored as a **hash** (bcrypt/argon2) either in a `settings` collection or environment variable, never as plaintext.
- Successful login issues a session token (JWT or random token) stored in an **HttpOnly, Secure, SameSite=Lax cookie**.
- Login endpoint is **rate-limited** (e.g., max 5 attempts per minute per IP) to reduce brute-force risk.
- Session is validated on the server for all protected pages/API routes using middleware or dedicated guards.
- Possibility to later replace with full-featured auth (Auth.js, passkeys) without rewriting the app.

UI behavior:
- Full-screen password gate page, with a centered card (~max-width 420px), subtle entrance animation (fade + scale from 0.98), and a shake animation on incorrect password.
- Password input with visibility toggle icon, clear error messages, and a language toggle (EN/ID) in the corner.

### 3.2 Content Organization

- **Nested collections** (folders), potentially unlimited depth (UX guidelines recommend up to 3 levels deep).
- **Tags**: free-form tags, multiple tags per item, with autocomplete from existing tags.
- **Filters**: by collection, tags, content type (link/note/file), domain (e.g., youtube.com), date range.
- **Search**: full-text search over title, description, notes, and optional content snapshot.

### 3.3 Item Types

- **Link**
  - Fields: `title`, `url`, `description`, `thumbnail`, `favicon`, `domain`, `tags[]`, `collectionId`, `note`, `canEmbed`, timestamps.
  - On save, the system attempts to fetch metadata (title, description, favicon, og:image) to build a nice card.

- **Note**
  - Fields: `title`, `body`, `tags[]`, `collectionId`, timestamps.
  - Supports basic Markdown (headings, lists, emphasis, links) for note content.

- **File**
  - Fields: `title`, `fileRef`, `fileType`, `tags[]`, `collectionId`, timestamps.
  - Stored in an object storage (Vercel Blob or an S3-compatible bucket) — **not directly in MongoDB**.
  - Strict MIME type and size validation on upload.

### 3.4 In-App Viewer (Embedded Web View)

- Clicking a link item opens an in-app viewer:
  - Desktop: right-hand panel (third column) with header + iframe.
  - Mobile: full-screen modal or separate route focused on the content.
- Viewer header shows: link title, domain, tags, and a prominent **“Open in Browser”** button (`<a target="_blank" rel="noopener noreferrer">`).
- Iframe uses `sandbox` and lazy-loading attributes:
  - Example: `sandbox="allow-scripts allow-same-origin allow-popups"` for reasonable functionality.
- `canEmbed` field reflects whether the URL can be embedded (based on CSP / `X-Frame-Options` checks done once or set manually).
- If iframe fails (blocked CSP, timeout, error): show a friendly error with fallback options, **never render a broken/blank frame**.

### 3.5 Layout & Theme

Visual theme should feel like a modern developer tool, not a generic AI neon UI.

- **Dark neutral base**:
  - Canvas: `#0D0F12`
  - Surfaces (cards/sidebar): `#16191E`
  - Borders: `#262A33`
  - Main text: `#F3F4F6`
  - Muted text: `#9CA3AF`
- **Single accent color**: either a warm amber (`#F59E0B`) or a refined indigo (`#5E6AD2`) for primary buttons, active states, and badges.
- Layout (desktop, `lg` and up):
  - Left: sidebar (collections/tags) with optional collapse.
  - Center: bookmark grid/list.
  - Right: viewer panel with embedded content.
- Card hover: subtle lift (`translate-y` -2px), border highlight, no heavy glow/blur.
- Typography: use system or modern sans-serif stack consistent with shadcn/ui.

### 3.6 PWA

- `app/manifest.ts` or `app/manifest.json` defining:
  - `name`, `short_name`, `icons` (multi-res, square), `start_url`, `display: "standalone"`, `theme_color` and `background_color`.
- Service worker configured via `next-pwa` (or similar) to:
  - Cache static assets and shell.
  - Provide a basic offline fallback page.
- Metadata in `app/layout.tsx` for `applicationName`, `appleWebApp`, and `themeColor`.

---

## 4. Responsive Design

Use Tailwind CSS default breakpoints, with clear layout behavior per breakpoint:

| Breakpoint | Min width | Layout behavior |
|-----------|-----------|-----------------|
| Base (mobile) | < 640px | Single column. Sidebar becomes a bottom sheet/drawer. Viewer appears as a full-screen modal when an item is opened. |
| `sm` | ≥ 640px | Two-column content grid. Sidebar remains a drawer, toggled via a menu button. |
| `md` | ≥ 768px | 2–3 column grid; sidebar can become a persistent collapsible pane on the left. |
| `lg` | ≥ 1024px | Full three-column layout: persistent sidebar, central grid/list, right-hand viewer panel. |
| `xl` / `2xl` | ≥ 1280px | 3–4 column grid, wider viewer, and more generous spacing/margins. |

Additional responsive considerations:
- Minimum touch area of **44×44px** for buttons, tags, and icons on mobile.
- Password gate card remains centered with max-width ~420px and responsive padding.
- Iframe viewer on small screens defaults to full-screen for readability.
- Optional custom breakpoints (e.g., `tablet`, `laptop`) can be added via `theme.screens` in `tailwind.config.ts`.

---

## 5. Security Requirements

Because the project is open source, security best practices are mandatory.

### 5.1 Authentication & Session

- Password:
  - Stored **only as a hash** (bcrypt/argon2), with per-password salt.
  - No plaintext password in code, database, logs, or environment.
- Session token:
  - JWT or opaque session ID, signed with a secret stored in environment variables.
  - Persisted in a **HttpOnly, Secure, SameSite=Lax cookie**.
- Login rate limiting:
  - Example: max 5 login requests per minute per IP.
  - Implement via Upstash Redis or in-memory limiter for small deployments.
- Protected routes:
  - All content APIs (create/update/delete items, update settings) must validate a valid session on the server.
  - Use middleware or helper functions to enforce auth before controller logic.

### 5.2 HTTP Security Headers

Set security headers using Next.js configuration or edge middleware:

| Header | Example value | Purpose |
|--------|---------------|---------|
| `Content-Security-Policy` | Restrict `script-src`, `style-src`, `img-src`, `frame-src`, `connect-src` to trusted origins | Prevent XSS and content injection attacks. |
| `X-Frame-Options` | `DENY` (except for dedicated viewer routes where iframe is required) | Protect against clickjacking on main app pages. |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-type sniffing. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer data leakage. |
| `Permissions-Policy` | Disable unused APIs (e.g., `camera=(), microphone=(), geolocation=()`) | Restrict browser features not used by the app. |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Enforce HTTPS via HSTS. |

### 5.3 Input Validation & Storage

- Validate and sanitize all user input (URLs, text, tags) on the server.
- Use parameterized queries/driver methods that avoid manual string concat to reduce injection risk.
- Escaped and sanitized content is used when rendering notes or user-provided HTML.
- File uploads:
  - Max size limit (configurable).
  - Allow only specific MIME types (PDF, images, text).
  - Store in dedicated object storage, never inline in MongoDB documents.

### 5.4 Dependency & Config Hygiene

- Environment variables (MongoDB URI, JWT secret, password hash) are never committed.
- Provide `.env.example` showing required keys for local development.
- Use tooling like Dependabot/Snyk and `npm audit` to monitor vulnerabilities.
- Logging avoids sensitive data — no passwords, session tokens, or cookie contents.

---

## 6. Data Model (MongoDB)

### 6.1 Collections

**`collections`**
- `_id`: ObjectId
- `name`: string
- `parentId`: ObjectId | null (null if root)
- `icon`: string | null
- `order`: number (for manual ordering in UI)
- `createdAt`: Date

**`items`**
- `_id`: ObjectId
- `type`: enum (`"link" | "note" | "file"`)
- `title`: string
- `url`: string | null (for `link` type)
- `description`: string | null
- `thumbnail`: string | null
- `favicon`: string | null
- `domain`: string | null
- `tags`: string[]
- `collectionId`: ObjectId | null
- `note`: string | null (for additional notes)
- `canEmbed`: enum (`"unknown" | "yes" | "no"`)
- `fileRef`: string | null (for `file` type)
- `fileType`: string | null
- `createdAt`: Date
- `updatedAt`: Date

**`settings`**
- `_id`: ObjectId
- `passwordHash`: string
- `defaultLocale`: string (e.g., `"en"`, `"id"`)
- `theme`: string (e.g., `"dark"`)
- `updatedAt`: Date

### 6.2 Indexes

Recommended indexes:
- Text index on `title`, `description`, and `note` for search.
- Indexes on `collectionId`, `tags`, and `type` for filtering.
- Time-based index on `createdAt` for chronological queries.

---

## 7. API & Routing (High-Level)

### 7.1 App Router Structure

- `/gate` — password gate page (public, but protected by gate logic).
- `/` — main app shell (requires valid session).
- `/settings` — update language, theme, and password (requires auth).
- `/collections` — list and create collections.
- `/collections/[id]` — view a specific collection.
- `/items/[id]` — view an item + open viewer.

### 7.2 Core API Endpoints

Route handlers under `app/api` (exact design can evolve, but must follow):

- `POST /api/gate/login` — verify password, issue session.
- `POST /api/gate/logout` — clear session cookie.
- `GET /api/collections` — list collections.
- `POST /api/collections` — create collection.
- `PATCH /api/collections/[id]` — update collection.
- `DELETE /api/collections/[id]` — delete collection.

- `GET /api/items` — list items (with filters & search query params).
- `POST /api/items` — create item (link/note/file).
- `PATCH /api/items/[id]` — update item.
- `DELETE /api/items/[id]` — delete item.

All `api` routes must:
- Validate session (except login).
- Validate inputs and return consistent error formats.

---

## 8. Open Source Guidelines

- Provide a clear `README.md` explaining setup, environment variables, and deployment.
- Include `CONTRIBUTING.md` with coding style (TypeScript, linting), testing instructions, and PR guidelines.
- Use a permissive license (e.g., MIT) suitable for personal and small-team usage.
- Maintain an issue template for bug reports and feature requests.
- Document security considerations and known limitations clearly.

---

## 9. Future Enhancements (Post-MVP)

- AI-assisted auto-tagging and automatic link summaries when saving items.
- Semantic search over saved content via embeddings.
- Reminder system for unread items and revisit scheduling.
- Import/export from Pocket, Raindrop, browser bookmarks, JSON/Markdown.
- Upgrade from single-password gate to multi-user authentication with passkeys/WebAuthn.
