# SYNAPSE SYSTEM — CLAUDE.md

Interný „agency OS" pre Synapse Studio. Single-tenant, jediný používateľ = Janči. Klient tento systém nikdy nevidí. Proces práce definuje `SYNAPSE-MASTER-PROMPT-v2.md`, tento súbor definuje kontext.

## Stack & príkazy
- NestJS 11 + TypeScript 5.9 + Prisma 6 (PostgreSQL/Supabase) + EJS/Tailwind CDN + grammy (Telegram). Package manager: **pnpm**.
- Dev: `pnpm start:dev` (watch, port 3000)
- Build: `pnpm run build` (= `prisma generate && nest build`)
- Test: `pnpm test` (vitest) · Lint: `pnpm lint` (eslint flat) · Typecheck: `pnpm typecheck`
- DB: `pnpm prisma:migrate` (migrate dev — od baseline jediná cesta pre zmeny schémy), `pnpm prisma:studio`. `prisma:push` existuje len historicky — NEPOUŽÍVAŤ na zdieľanú DB.
- CI: `.github/workflows/ci.yml` — build → lint → typecheck → test → audit(high) na push/PR do main.
- Deploy: Railway cez `Dockerfile`. Devcontainer = GitHub Codespaces (runtime pre AI Coder agenta).

## Architektúra
Jeden NestJS proces: EJS SSR dashboard + Telegram bot + crony. Dashboard/kanban servuje `src/leads/leads.controller.ts` (route `/`). Telegram router `src/telegram/telegram.update.ts` — moduly si registrujú handlery. AI cez `src/ai/ai.service.ts` (Anthropic SDK / Claude CLI fallback).

Moduly: `auth` (login + globálne gardy), `leads`, `coder`, `research`, `tracking`, `booking`, `figma`, `cloner`, `gmail`, `images`, `telegram`, `ai`, `database`, `common`.

## Auth model (od 2026-07-05)
- **Nová routa = admin by default.** Globálny `APP_GUARD`: ThrottlerGuard → AuthGuard (`src/auth/auth.module.ts`).
- Verejné routy explicitne cez `@Public()` (`src/common/decorators/public.decorator.ts`). Aktuálny allowlist: `/login`, `/t/:ref`, `POST /api/tracking/event`, booking public (page/slots/create), cloner public (form/preview/create/status `GET /api/cloner/:id`).
- Prístup: browser cookie `synapse_auth` (sha256 hesla, HttpOnly, 30 dní) cez `/login`, alebo header `x-admin-password` pre curl/API. Query `?password=` bol ODSTRÁNENÝ.
- `ADMIN_PASSWORD` bez defaultu — nenastavené = fail closed (503-štýl 401 na všetko admin).
- Rate limity: global 120/min, `POST /login` 5/min, verejné POST 10/min.
- Statické `/output/*` a `/public/*` sú verejné by design (cloner preview zdieľaný prospektom).

## Env vars (mená; hodnoty len v .env / Railway — NIKDY do gitu)
`DATABASE_URL`, `ADMIN_PASSWORD`, `PORT`, `APP_URL`, `AI_PROVIDER`, `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_OWNER_CHAT_ID`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_USER_EMAIL`, `GOOGLE_CALENDAR_ID`, `GITHUB_TOKEN`, `GITHUB_USERNAME`, `VERCEL_TOKEN`, `FIGMA_ACCESS_TOKEN`, `FIGMA_CRON_INTERVAL`, `LEAD_CRON_INTERVAL`, `LEAD_MIN_CONFIDENCE`, `UNSPLASH_ACCESS_KEY`, `PEXELS_API_KEY`.

## NEDOTÝKAŤ SA (bez explicitného GO)
- `src/leads/**` + `src/gmail/**` — produkčný lead pipeline, živé dáta.
- `src/telegram/telegram.update.ts` — centrálny router, závisia naň všetky moduly.
- `prisma/schema.prisma` model `Lead` — živé dáta v DB.
- `aicoder/` — legacy fragment, gitignored, nezasahovať.

## Známe problémy (aktívne, 2026-07-05)
1. **DB nedostupná:** Supabase pooler hlási `tenant/user postgres.jeehqohblhnhbotvqgzd not found` — projekt pravdepodobne pauznutý/zrušený. Blokuje runtime verifikáciu auth, migrations baseline (fáza 4) a oživenie modulov (fáza 5).
2. Booking/Figma/Cloner — kód + auth + rate limity hotové, ale end-to-end nikdy neoverené (čaká na DB + credentials).
3. `PrismaService.onModuleInit` pri nedostupnej DB zhodí celý boot (rethrow) — zvážiť graceful degradáciu.
4. 7 moderate vulns (dev-chain: ajv/js-yaml/brace-expansion cez @nestjs/cli; qs cez platform-express) — accepted risk, bez same-major patchu.
5. Dead config: `cron.leadInterval`/`figmaInterval` v configuration.ts — @Cron dekorátory používajú inline literály.
6. `GmailParser.cleanFacebookUrl` stripuje query string, takže `profile.php?id=` URL strácajú id (messenger link sa nedá odvodiť) — funguje len pre username URLs a redirect-wrapped URLs.

## Stav (posledné 📊 hodnotenie — 2026-07-05, po fázach 1–3)
Build PASS · tsc PASS · 18/18 testov PASS · lint PASS · audit 0 high (7 moderate) · CI green (run 28755176540). P0 auth opravený (commit 0f41227), runtime dôkaz čaká na DB. Deploy-ready: NIE (blokátor: DB + neoverené moduly).

## Session log
### 2026-07-05: Audit + fázy 1–3 realizácie
- Audit: nájdený P0 (nezapojený AuthGuard), 20 high vulns, 0 testov.
- Fáza 1 (0f41227): globálny auth (APP_GUARD ThrottlerGuard→AuthGuard), @Public() allowlist, /login stránka + cookie, query password zrušený, fail-closed ADMIN_PASSWORD, rate limity.
- Fáza 2 (2c732bd): audit 44→7 vulns, 0 high; pnpm up + same-major overrides (undici, multer, picomatch, fast-uri).
- Fáza 3 (d375ddf): vitest 18 testov, eslint flat config (19 nálezov opravených), GitHub Actions CI — zelené.
- BLOKÁTOR: Supabase DB nedostupná → fáza 4 (migrations baseline), fáza 5 (moduly) a runtime curl verifikácia auth čakajú.
- Next: obnoviť Supabase projekt (alebo nová DATABASE_URL) → runtime verify → fáza 4 → fáza 5 → finálny report.
