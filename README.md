# Content CMS — Backend

NestJS API for a small content management system: article CRUD with role-gated publishing, tags,
a public unauthenticated reading API, and real-time publish notifications over WebSocket.

This is the backend half of a two-repo portfolio project. The frontend lives at
[portfolio_frontend](https://github.com/senin142/portfolio_frontend).

This is original code written for a personal portfolio. It is **not** a copy of any employer's
codebase.

## What it does

- JWT auth with two roles: `admin` (manages users and content) and `editor` (manages content only).
  Short-lived (15m) access tokens paired with rotating, revocable refresh tokens — see
  "Notes" below for the detail. Rate-limited (`@nestjs/throttler`) against brute-force.
- Audit log (`AuditLogService` / `GET /audit-log`, admin-only) covering auth events and
  destructive/privileged actions (role changes, deletions).
- Article CRUD — create / edit / publish / unpublish / delete — with search by title and tags.
- `ArticlesModule` registers **two controllers sharing one service**: `ArticlesController` (admin,
  JWT-gated, full CRUD) and `PublicArticlesController` (no auth, published-only reads) — the
  dual-controller-per-domain pattern in actual code, not just description.
- Tags: a proper many-to-many (`tags` + `article_tags` join table), powering a "similar articles"
  endpoint ranked by number of shared tags.
- Real-time: a dedicated Socket.IO gateway (`RealtimeModule`), decoupled from the REST surface via
  `@nestjs/event-emitter` — `ArticlesService` emits an `article.published` domain event and the
  gateway is the only thing that knows Socket.IO exists.
- Image uploads with a shared storage cap: `MediaModule` stores one image per article, with an
  optional server-side resize (`sharp`, max 1600px wide, re-encoded as JPEG) toggled by the
  caller. All articles share a single 150MB cap (`STORAGE_CAP_BYTES` in `media.service.ts`) —
  every upload runs an eviction pass afterward that deletes the oldest images first until usage
  is back under the cap, so one big unresized upload can't silently starve the rest of the demo.
  `GET /media/usage` exposes current usage for the dashboard's storage bar. Uploads are capped at
  10MB and restricted to JPEG/PNG/WEBP/GIF by MIME type — both checks return a clean 4xx rather
  than crashing or letting an arbitrary file get stored as if it were an image.
- Swagger/OpenAPI docs.

## Architecture

Structured as feature modules (`auth`, `users`, `articles`, `tags`, `realtime`), each with its own
Sequelize-TypeScript model, service, controller and DTOs. Auth is JWT-based (passport-jwt); route
access is enforced with a `JwtAuthGuard` plus a custom `RolesGuard`/`@Roles()` decorator. Schema
changes go through `sequelize-cli` migrations rather than model sync, and a seed script populates
~18 realistic articles (with tags) plus a demo admin/editor account.

**Why Sequelize over an ORM like Prisma/TypeORM**: Sequelize-TypeScript keeps the model definitions
close to plain classes/decorators while `sequelize-cli` gives explicit, reviewable migration files —
useful for demonstrating schema evolution rather than relying on `sync()`.

## Running it locally

```bash
docker compose up -d          # local PostgreSQL
cp .env.example .env          # edit JWT_SECRET etc. if you like
npm install
npm run db:migrate
npm run db:seed
npm run start:dev
```

The API runs at `http://localhost:3001`. Swagger docs are at `http://localhost:3001/api/docs`.

Seeded accounts (password for both: `password123`):

- `admin@example.com` — admin
- `editor@example.com` — editor

Point the [frontend](https://github.com/senin142/portfolio_frontend) at this API via its
`NEXT_PUBLIC_API_URL` env var.

## Scripts

| Command | Description |
|---|---|
| `npm run start:dev` | Start the API in watch mode |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:migrate:undo` | Roll back the last migration |
| `npm run db:seed` | Run seed data |
| `npm run db:reset` | Undo all migrations, re-migrate, re-seed |

## Notes / things I'd change for production

- ~~No refresh-token flow~~ — fixed: access tokens are now short-lived (15m, `JWT_ACCESS_EXPIRES_IN`)
  paired with a rotating refresh token (30d, `JWT_REFRESH_EXPIRES_IN_DAYS`). `POST /auth/refresh`
  issues a new pair and immediately revokes the old refresh token server-side (`refresh_tokens`
  table, only a SHA-256 hash of the token is stored, never the raw value) — reusing an
  already-rotated token is rejected, and `POST /auth/logout` revokes on demand. The frontend
  (`lib/api.ts`) retries once on a 401 via a shared in-flight refresh, so this is invisible during
  normal use; only a fully-expired/revoked refresh token bounces the user to `/login`.
- ~~No audit logging on auth endpoints~~ — fixed: `audit_logs` table + `AuditLogService`, logging
  `login_success`/`login_failed`/`signup`/`logout`/`user_role_changed`/`user_deleted`/
  `article_deleted` with actor, target, IP, and metadata. `GET /audit-log` (admin-only) to view it.
  Logging is fire-and-forget (never blocks or fails the request it's recording).
- Images are stored as `bytea` in Postgres, not object storage (S3/GCS/Supabase Storage) — simplest
  thing that let the storage-quota logic be verified directly against real row sizes for this demo.
  A real deployment would move the bytes to object storage and keep only a pointer + size in
  Postgres, since a database is a poor place to keep growing binary blobs long-term.
- ~~The Supabase DB credential in use is the full `postgres` superuser role~~ — fixed: the app now
  connects as a dedicated `cms_app` role (migration `20260101000010-scoped-app-role.js`) with
  only `SELECT/INSERT/UPDATE/DELETE` on this app's 4 tables via RLS policies, nothing else. The
  `postgres` superuser credential still exists (needed to re-run that one migration if the role
  ever needs recreating) but the running app never uses it — kept in `.env` as
  `DB_SUPERUSER_USERNAME`/`DB_SUPERUSER_PASSWORD`, separate from `DB_USERNAME`/`DB_PASSWORD`.
- Ran a red-team pass (2026-09-14): confirmed no SQL injection (Sequelize params), no password-hash
  leakage through this app's own API, no stack-trace leakage, RBAC boundaries hold, and fixed the
  gaps found:
  - Brute-force login (now rate-limited via `@nestjs/throttler`, 5/min on `/auth/*`).
  - Wildcard Socket.IO CORS (now scoped to `FRONTEND_ORIGIN`).
  - **Critical**: Supabase's auto-generated PostgREST API was serving the full `users` table —
    including bcrypt password hashes — to anyone with the public "publishable" key, completely
    bypassing this app's own auth. Root cause: tables were created via raw Sequelize migrations
    against the `postgres` superuser rather than through Supabase's normal onboarding, which
    nudges you toward enabling Row Level Security — RLS was simply never turned on. Fixed by
    running `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on all 5 tables with zero policies
    (default-deny for the `anon`/`authenticated` roles PostgREST uses; this app's own connection,
    as the `postgres` superuser, bypasses RLS entirely and is unaffected). Verified: the REST API
    now returns `[]` for both `users` and `articles`; this app's endpoints work unchanged. Only
    seed/demo data (no real users) was ever exposed. **If any new table is ever added directly
    via migration, remember to enable RLS on it too** — it does not happen automatically outside
    Supabase's own table-creation UI.
  - `npm audit` still shows ~21 findings in transitive/build-time deps (worth a periodic re-check,
    particularly multer given it handles untrusted uploads) — none currently exploitable at
    runtime through this app's own code paths.
