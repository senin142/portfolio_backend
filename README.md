# Content CMS — Backend

NestJS API for a small content management system: article CRUD with role-gated publishing, tags,
a public unauthenticated reading API, and real-time publish notifications over WebSocket.

This is the backend half of a two-repo portfolio project. The frontend lives at
[portfolio_frontend](https://github.com/senin142/portfolio_frontend).

This is original code written for a personal portfolio. It is **not** a copy of any employer's
codebase.

## What it does

- JWT auth with two roles: `admin` (manages users and content) and `editor` (manages content only).
- Article CRUD — create / edit / publish / unpublish / delete — with search by title and tags.
- `ArticlesModule` registers **two controllers sharing one service**: `ArticlesController` (admin,
  JWT-gated, full CRUD) and `PublicArticlesController` (no auth, published-only reads) — the
  dual-controller-per-domain pattern in actual code, not just description.
- Tags: a proper many-to-many (`tags` + `article_tags` join table), powering a "similar articles"
  endpoint ranked by number of shared tags.
- Real-time: a dedicated Socket.IO gateway (`RealtimeModule`), decoupled from the REST surface via
  `@nestjs/event-emitter` — `ArticlesService` emits an `article.published` domain event and the
  gateway is the only thing that knows Socket.IO exists.
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

- No refresh-token flow — tokens simply expire (`JWT_EXPIRES_IN`) and the user re-logs in.
- No rate limiting or audit logging on auth endpoints.
- The Socket.IO gateway allows CORS from any origin (`*`) — fine for a public read-only broadcast
  of already-public article metadata, would be scoped down for anything sensitive.
