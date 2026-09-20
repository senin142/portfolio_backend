# `certs/supabase-ca.pem`

Supabase signs its Postgres pooler TLS certs with its own private root CA
(`Supabase Root 2021 CA`, `O=Supabase Inc`) rather than a public CA — so Node's
default trust store rejects the connection (`SELF_SIGNED_CERT_IN_CHAIN`) even
though it's legitimate. `database.module.ts` and `config/config.js` both pin
this file explicitly and use `rejectUnauthorized: true`, instead of the old
`rejectUnauthorized: false` (which would silently accept *any* certificate,
including an attacker's — see `RED_TEAM_REPORT.md` finding #3 at the repo root).

This is public information (a CA cert, not a secret) — safe to commit.

**Obtained:** 2026-09-20, via a TOFU (trust-on-first-use) TLS handshake against
the project's own `DB_HOST` pooler endpoint, extracting the root of the
presented chain (leaf `*.pooler.supabase.com` → `Supabase Intermediate 2021 CA`
→ `Supabase Root 2021 CA`, self-signed). Cross-check this against Supabase's
own published CA bundle (Dashboard → Project Settings → Database → SSL
Configuration) next time it's touched, rather than re-extracting via TOFU.

**If connections start failing with a cert error after a Supabase-side
rotation:** re-download the current CA from the Dashboard path above and
replace this file — don't revert to `rejectUnauthorized: false` to unblock
yourself, that silently reopens the MITM gap this exists to close.
