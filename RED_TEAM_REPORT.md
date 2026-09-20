# Red Team Report — Content CMS (backend + frontend)

Last full pass: 2026-09-20. Findings are ranked P0 (critical) → P3 (low). Each entry
states what's open, why it matters, and the method to close it. Items marked
**[FIXED]** are closed and kept here only so the history of what was checked stays
in one place — see the commit referenced for the actual patch.

---

## Section 1 — Backend

### P0 — Critical

- **[FIXED]** Supabase's auto-generated PostgREST API served the entire `users`
  table — including bcrypt password hashes — to anyone holding the public
  "publishable" key, completely bypassing this app's own auth. Root cause: tables
  created via raw migrations don't get Supabase's usual RLS nudge.
  **Method used:** `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` with a
  `cms_app`-only policy per table (migration `20260101000009-enable-rls.js`).
  **Standing rule going forward:** any future migration that adds a table must
  enable RLS + add the policy in the same migration, or it's public by default.

### P1 — High

- **[FIXED]** No rate limiting anywhere — 20 rapid wrong-password `/auth/login`
  attempts all just returned `401`, no throttling. **Method used:**
  `@nestjs/throttler`, global 60 req/min/IP default, 5 req/min on
  `/auth/login` and `/auth/signup` specifically.
- **[FIXED]** Socket.IO gateway allowed `cors: { origin: '*' }` — any site could
  open unlimited WebSocket connections. **Method used:** scoped to
  `FRONTEND_ORIGIN`, same as the REST API's CORS config.
- **[FIXED]** The app connected to Supabase as the `postgres` superuser — full
  control of the entire project, not just this app's tables. **Method used:** a
  dedicated `cms_app` role (migration `20260101000010-scoped-app-role.js`) with
  RLS policies granting only `SELECT/INSERT/UPDATE/DELETE` on this app's own
  tables.
- **[FIXED]** Refresh tokens didn't exist — a single JWT was valid for a full day
  with no way to revoke it early. **Method used:** 15-minute access tokens paired
  with a rotating, revocable refresh token (SHA-256 hash stored, never the raw
  value); reuse of an already-rotated token is rejected.

### P2 — Medium (open)

- **Upload endpoint file-type/size checks — [FIXED]**, noted here for
  completeness: `fileFilter` restricting to JPEG/PNG/WEBP/GIF, 10MB cap, both
  return clean 4xx. (`media.controller.ts`)
- **Audit log has no frontend UI.** `GET /audit-log` exists and is admin-gated,
  logs auth events + destructive actions, and is verified working — but nothing
  in `portfolio_frontend` renders it. Right now the only way to see it is a raw
  API call. **Method to close:** a simple admin-only page
  (`/dashboard/audit-log`) that tables the response — no new backend work
  needed, this is pure frontend.
- **`npm audit` still reports ~21 findings** in backend production deps, mostly
  transitive/build-time. The one that's actually runtime-relevant: **multer has
  several open, unpatched DoS-class CVEs in its current stable line (2.4.0,
  already latest)** — only fixed in an unstable 3.0 alpha. Exposure is limited
  since the upload endpoint is JWT+role-gated, not public. **Method to close:**
  re-run `npm audit` periodically; move off multer's alpha-only fix once it
  stabilizes, or accept the residual risk given the auth gate (document the
  decision either way, don't just let it go stale silently).
- **Images stored as `bytea` in Postgres, not object storage.** Was a deliberate
  simplification to make the storage-quota logic directly verifiable against
  real row sizes. **Method to close (if ever needed):** move bytes to Supabase
  Storage/S3/GCS, keep only a pointer + size in Postgres.

### P3 — Low (open)

- **No refresh-token *family* revocation.** Logging out revokes the one token in
  use; if a refresh token was stolen and used from a second device, both devices
  keep independent valid sessions until each token naturally expires or is
  individually logged out. A stricter model would revoke the entire lineage on
  first detected reuse. **Method to close:** add a `familyId` to
  `refresh_tokens` and revoke all rows sharing it when a reuse is detected
  (currently a reused token is just rejected, not treated as a signal to kill
  siblings).
- **No audit logging on the audit log itself** (who viewed it, when) — minor,
  low-value for a demo of this size.
- **No deploy yet.** `Dockerfile` exists and is ready for Cloud Run
  "deploy from source," but the service isn't live anywhere public — it only
  runs when started locally. Not a "bug," but worth tracking as the actual gap
  between "hardened" and "usable by someone else." See Track A in prior
  session notes.

---

## Section 2 — Frontend

### P2 — Medium (open)

- **No UI for the audit log** — see backend P2 above, this is the frontend half
  of that gap.
- **`ArticleForm`'s image uploader has no client-side file-size pre-check** —
  a user can select an 8MB file, wait for the upload to start, and only then
  get the server's rejection if it's actually over. Low friction cost for a
  demo, but a quick win: check `file.size` before calling `uploadImage` and
  show the same message inline immediately.

### P3 — Low / verified clean, no action needed

- **XSS surface checked, clean.** Only one `dangerouslySetInnerHTML` in the
  whole frontend (`layout.tsx`'s theme-init script), and it's a fixed constant
  string with no user input anywhere near it — safe. Article bodies render via
  plain JSX text interpolation (React auto-escapes), not innerHTML.
- **Refresh-token flow verified end-to-end** (2026-09-14 session): simulated
  access-token expiry → silent refresh, page keeps working; simulated
  full-session invalidation (both tokens bad) → clean bounce to `/login`,
  storage cleared, no stuck state.

---

## How to use this

Work top-down by priority. P0/P1 are already closed — if you're auditing fresh,
re-verify them (a regression here is the highest-value thing to catch early)
before spending time on P2/P3. The two real "next things to actually do" are:
the audit-log frontend page (P2, cheap, high signal for interview
defensibility — "I built an audit trail" is a better story with a screen to
show for it) and deciding whether to actually deploy (Track A).
