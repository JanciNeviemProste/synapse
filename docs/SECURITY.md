# SECURITY.md — Synapse System

## Threat model (single-tenant)
Jediný admin (Janči). Auth: `ADMIN_PASSWORD` → browser cookie `synapse_auth` (sha256 hesla, HttpOnly, SameSite=Lax, 30 dní, Secure v prod) alebo header `x-admin-password`. Porovnania `timingSafeEqual`. Fail closed pri nenastavenom hesle. Globálny guard — nová routa je admin by default, verejné len cez `@Public()`. Rate limity: 120/min global, login 5/min, verejné POST 10/min. Statické `/output/*`, `/public/*` verejné by design (zdieľané preview). Pri úniku hesla: rotovať `ADMIN_PASSWORD` v .env/Railway — cookie sa tým invaliduje (hash sa zmení).

## Checklist 6A — stav k 2026-07-05 (po fáze 1–3)

| Položka | Stav | Dôkaz |
|---|---|---|
| Server-side auth na admin routách | **PASS (kód)** | APP_GUARD v `src/auth/auth.module.ts`, commit 0f41227; runtime curl dôkaz čaká na DB |
| Rate limiting | PASS (kód) | @nestjs/throttler global + per-route @Throttle |
| Query-string password | ODSTRÁNENÝ | auth.guard.ts už query nečíta |
| `pnpm audit --audit-level=high` | **PASS** | 0 high/critical; 7 moderate accepted (ajv/js-yaml/brace-expansion via @nestjs/cli dev-chain, qs via platform-express) |
| CI security brána | PASS | audit high v .github/workflows/ci.yml, run 28755176540 green |

## Checklist 6A — pôvodný audit (2026-07-05 ráno, historický)

| Položka | Stav | Dôkaz |
|---|---|---|
| Server-side auth na admin routách | **FAIL (P0)** | `AuthGuard` existuje, ale grep `UseGuards\|APP_GUARD` v `src/` = 0 zápisov → dashboard `/`, `/api/leads`, coder routy verejné |
| RLS (Supabase) | N/A | DB je priamy PostgreSQL cez Prisma, nie Supabase klient — auth musí riešiť app vrstva (viď FAIL vyššie) |
| Input validácia | ČIASTOČNE | Global `ValidationPipe` (whitelist+forbidNonWhitelisted) v `src/main.ts`; DTO len 3: cloner, leads update, booking — ostatné routy bez DTO |
| Rate limiting na verejných endpointoch | FAIL | `@nestjs/throttler` nie je v dependencies; tracking/booking/cloner bez limitu |
| Secrets v client bundle | N/A | EJS SSR, žiadny client bundle build |
| .env v .gitignore | PASS | `.gitignore` riadky 3–4: `.env`, `.env.local` (pozn.: `.env.production` by pokrytý nebol — použiť `.env*` pattern) |
| Secrets v git histórii | PASS | `git log -p --all -S` pre `sk_live`/`ANTHROPIC_API_KEY`/`ghp_`/`AIza`/`xoxb` — len placeholdery (`sk-ant-...`, `ghp_xxx`) v .env.example, commit 85b4ca8 |
| `pnpm audit --audit-level=high` | **FAIL** | 44 vulns: 2 low / 22 moderate / **20 high** (undici×6, basic-ftp×4, multer, simple-git, lodash, ws, path-to-regexp, picomatch, effect, defu, fast-uri×2) |
| XSS (dangerouslySetInnerHTML) | N/A / neoverené | EJS views — treba audit `<%-` (unescaped) výstupov, zatiaľ nerobený |
| IDOR / CSRF | neoverené | vyžaduje bežiacu app (6B pentest) |

## Content Studio (2026-07-06)
Celý modul admin-only (globálny guard, žiadna `@Public()` routa). AI endpointy per-route rate limity (3–20/min podľa ceny). Uploady: MIME allowlist + size limity (audio 50 MB, video 300 MB), generované názvy súborov, privátny storage mimo web rootov. Prompt injection: untrusted vstupy v `<untrusted>` delimitroch, AI výstupy validované Zod schémami (nič nevalidované sa neukladá). Privacy: audio len s opt-inom, granulárne mazanie (audio/session/video+odvodené), efemérne realtime tokeny (API kľúč nikdy do browsera). EJS všade `<%=` (escaped). Runtime pentest čaká na DB.

## 6B Mini-pentest
Zatiaľ nevykonaný — nie je live/preview URL v tejto session. Povinný pred najbližším production deployom; výsledky doplniť sem (tabuľka test × očakávanie × výsledok × PASS/FAIL). **Pozn.: kým je P0 (nezapojený AuthGuard) otvorený, každý deploy je blokovaný.**
