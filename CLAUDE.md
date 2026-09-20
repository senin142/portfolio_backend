# backend — Content CMS API

Persistent context for Claude Code in this repo. Read this first — it exists so a
fresh session doesn't have to re-derive the architecture by grepping through 45
files every time. Keep it accurate (see **Keeping this file updated** at the bottom).

## What this is

NestJS API for a small CMS: articles (with tags), JWT auth with roles, image
uploads, real-time publish notifications, audit logging. Companion repo:
`../frontend` (Next.js admin UI + public reading site). Full security posture
lives in `../RED_TEAM_REPORT.md` at the repo root — check it before touching auth,
media, or anything user-input-adjacent; it has open findings with exact file:line
references that this doc intentionally doesn't duplicate.

## Stack

NestJS 10 · TypeScript · Sequelize-TypeScript (Postgres via `pg`) · passport-jwt ·
`@nestjs/throttler` · `@nestjs/event-emitter` · Socket.IO (`@nestjs/websockets`) ·
`sharp` (image resize) · `bcrypt` · `sequelize-cli` for migrations. DB is a hosted
Supabase Postgres project (session pooler, not direct connection — see
`.env.example` comments for why).

## Commands

```
npm run start:dev        # watch mode, http://localhost:3001
npm run db:migrate       # apply pending migrations
npm run db:migrate:undo  # roll back last migration
npm run db:seed          # seed ~18 articles + demo admin/editor accounts
npm run db:reset         # undo all + re-migrate + re-seed
npm run lint             # eslint --fix
```

No test suite exists yet — don't claim "tests pass," there aren't any to run.

Seeded accounts (password `password123` for both): `admin@example.com` (admin),
`editor@example.com` (editor).

## Architecture

Feature modules under `src/`: `auth`, `users`, `articles`, `tags`, `media`,
`realtime`, `audit`, each with its own Sequelize-TypeScript model + service +
controller + DTOs. `src/config/configuration.ts` is the single source of env-var
reads (everything else goes through `ConfigService`, never `process.env` directly
— except `main.ts` and `realtime.gateway.ts`, see the comment in `main.ts` for why).

**Dual-controller-per-domain pattern** (the load-bearing architectural choice —
repeat this shape for any new public+admin resource, don't invent a different one):
a feature with both an admin and a public surface gets **two controllers sharing
one service**, never one controller branching on auth state.
- `ArticlesController` (JWT+role-gated, full CRUD) + `PublicArticlesController`
  (no auth, published-only reads) — both call `ArticlesService`.
- `MediaController` (JWT+role-gated, works on drafts too) +
  `PublicMediaController` (no auth, only ever resolves through
  `findPublishedBySlug`, so it 404s on anything unpublished) — both call
  `MediaService`.

**Auth model**: short-lived (15m) JWT access tokens + rotating, revocable refresh
tokens (raw value only ever returned to the client once, stored server-side as a
SHA-256 hash in `refresh_tokens`). `POST /auth/refresh` revokes the old token and
issues a new pair; reusing an already-rotated token is rejected (but does **not**
yet revoke the whole token family — open finding, see red-team report). Every
authenticated request re-fetches the user from the DB in `JwtStrategy.validate()`
and derives `role` from that live row, **not** from the JWT payload — so a role
change or account deletion takes effect on the very next request, not just at
token expiry. Rely on this; don't add role-caching that would undo it.

**Authorization**: three primitives, always in this order —
`JwtAuthGuard` (is this a valid token), `RolesGuard`/`@Roles()` (does this role
match), then `assertOwnerOrAdmin(user, resourceAuthorId)` (`common/authorization.ts`)
called manually inside the service method, after the resource is loaded, before
it's mutated. `ADMIN` always bypasses the ownership check; `EDITOR` may only
mutate resources where `resourceAuthorId === user.id`. This is enforced today on
every mutating `ArticlesService`/`MediaService` method (`update`, `setPublished`,
`remove`, `upload`, `removeByArticleId`) — **reads are intentionally not
ownership-scoped** (any authenticated editor can list/view any article, including
others' drafts — a newsroom-visibility choice, not an oversight). If you add a new
mutating route on an authored resource, call `assertOwnerOrAdmin` the same way;
don't add role-gating alone and assume that's equivalent — it isn't, that's the
exact gap this was added to close (see red-team report finding #2).
Public self-signup still grants `EDITOR` with no approval step — that half of
finding #2 is a deliberate deferred decision (fine while this only runs locally;
gate it before ever deploying publicly), not something this ownership check
substitutes for.

**Realtime**: `ArticlesService` never touches Socket.IO. It emits an
`article.published` domain event via `EventEmitter2` (`this.events.emit(...)` in
`articles.service.ts`) whenever an article transitions from unpublished →
published (create-with-published=true, update-into-published, or the explicit
`/publish` route) — never on every save. `RealtimeGateway` is the only thing that
imports `socket.io`; it just listens for that one event and re-emits over the
socket. Keep this separation — if a future feature needs to push over the socket,
emit a domain event and add a listener in the gateway, don't reach into
`RealtimeGateway` from a service.

**Media**: images are stored as `bytea` in Postgres (not object storage) — a
deliberate simplification so the shared 150MB storage cap (`STORAGE_CAP_BYTES` in
`media.service.ts`) is directly verifiable against real row sizes. One image per
article (`mediaModel.destroy({ where: { articleId } })` before every create).
Uploading past the cap evicts the *oldest* image across *all* articles, not just
the uploader's own — a real griefing vector, though now scoped down by the
ownership check above (an editor can only trigger it by uploading to their own
articles, not by targeting others' — red-team finding #10 is still open as a
defense-in-depth item, just less severe). Upload validation is two-layered:
`fileFilter` in `media.controller.ts` does a cheap first-pass check on the
client-declared `Content-Type` (attacker-controlled, not trustworthy alone);
`MediaService.upload` sniffs the actual file signature (`file-type`) and uses
that as the real gate and the source of truth for the stored/served
`mimeType`. It also runs every upload through `sharp(..., { limitInputPixels
})` regardless of whether resize is requested, to reject decompression bombs
before a full decode.

**Migrations own the schema** — `synchronize: false` always
(`database.module.ts`). Never add a model field without a matching
`sequelize-cli` migration; the app will not auto-sync it. Two migrations are not
optional boilerplate: `20260101000009-enable-rls.js` (Supabase's
auto-generated PostgREST API exposes any table without RLS to anyone holding the
public key — this **actually happened** to the `users` table including
password hashes before this migration existed) and
`20260101000010-scoped-app-role.js` (day-to-day connections use a
least-privilege `cms_app` role, not the `postgres` superuser). **Any new
migration that creates a table must enable RLS + add a `cms_app`-only policy in
the same migration**, or it's silently public. This is the single most important
rule in this file.

## Conventions

- DTOs use `class-validator` decorators; `main.ts` has global
  `ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true })`
  — unlisted body fields are rejected outright, not stripped silently.
- `UpdateXDto = PartialType(CreateXDto)` — don't hand-write update DTOs.
- Services throw Nest's built-in exceptions (`NotFoundException`,
  `ConflictException`, `UnauthorizedException`, `BadRequestException`) directly;
  no custom exception hierarchy exists. Match this rather than introducing one.
- `AuditLogService.log()` is fire-and-forget (`.catch(() => undefined)`) — a
  missed audit entry must never fail or block the request it's logging. Follow
  this pattern for any new audit call site; don't `await` it if failure would
  propagate.
- Slugs: `^[a-z0-9]+(?:-[a-z0-9]+)*$` enforced by DTO `@Matches`, uniqueness
  checked in the service (`assertSlugAvailable`), not a DB-level constraint check
  in application code (the DB does have a `unique` index as a backstop).
- Tags: free-text, normalized (`trim().toLowerCase()`) and `findOrCreate`d in
  `TagsService` — there's no tag management UI/endpoint beyond this; tags are
  created implicitly by whichever article uses them first.

## Known trade-offs (not bugs to silently "fix" — read the reasoning first)

- DB TLS: `database.module.ts` and `config/config.js` both pin Supabase's
  private root CA (`certs/supabase-ca.pem`) with `rejectUnauthorized: true` — do
  not revert to `rejectUnauthorized: false` to unblock a connection error, that
  silently reopens a MITM gap. If Supabase rotates their CA, re-download it (see
  `certs/README.md`) and replace the file instead.
- `npm audit` flags multer DoS-class CVEs (plus transitive ones in `qs`/`tar`/
  `uuid`) with no fix on the current stable line — accepted residual risk,
  documented in the red-team report, re-check periodically rather than
  reflexively bumping to an alpha.
- `file-type` is deliberately pinned to `v16` (`MediaService.upload`), not the
  current major — v17+ is pure ESM and this project compiles to CommonJS.
  Don't bump it without switching the call site to a dynamic `import()`.

## Keeping this file updated

Update this file in the same commit/session when you:
- add, remove, rename, or move a feature module, controller, or the routes it exposes;
- change the auth/authorization model (token lifetimes, what `JwtStrategy.validate`
  returns, guard behavior, or the ownership-check decision referenced above);
- add a migration that creates a table (confirm RLS + policy, then note it here
  only if it changes the "migrations own the schema" section's guidance);
- change a convention listed above (DTO pattern, exception style, audit logging).

Don't update it for routine bug fixes, dependency bumps, or anything already
covered by reading the code (exact line numbers, current dependency versions) —
this file is for architecture and decisions, not a changelog. If something here
turns out to be wrong or stale when you read it, fix it on the spot rather than
letting the drift compound for the next session.
