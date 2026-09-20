# Contributing to LinkForge

Thanks for contributing! This project is spec-driven and open source.

## Ground rules

- **`SPEC.md` is authoritative.** If a change conflicts with the spec, propose
  the spec change explicitly instead of silently deviating.
- Prefer simple, production-ready patterns over clever/fragile ones.
- Never relax the security invariants (hashing, session cookie attributes,
  rate limiting, headers, env-only secrets).
- Keep TypeScript types explicit and reuse existing lib/ helpers.

## Workflow

1. Fork the repo (or use a feature branch) and base your branch on `main`.
2. Make small, reviewable changes; reference concrete file paths in the PR.
3. Run checks locally before pushing:
   ```bash
   pnpm lint
   pnpm test
   pnpm build
   ```
4. Open a PR against `main` describing what changed and how it was verified.

## Environment setup

See `README.md` → "Getting started". Local dev works without MongoDB for the
gate; content APIs need a `MONGODB_URI` (local `mongod` or an Atlas free tier).

## Tests

Unit tests live next to the code under `src/lib/__tests__/` and run with Vitest.
New pure logic (validation, auth, rate limiting, parsing) should ship with tests.

## Commit style

Short imperative summary line, lowercase, e.g. `add collection rename endpoint`.
Reference the phase or spec section when relevant.
