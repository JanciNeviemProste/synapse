# SYNAPSE SYSTEM — CLAUDE.md

Interný „agency OS" pre Synapse Studio. Single-tenant, jediný používateľ = Janči. Klient tento systém nikdy nevidí. Proces práce definuje `SYNAPSE-MASTER-PROMPT-v2.md`, tento súbor definuje kontext.

## Stack & príkazy
- NestJS 11 + TypeScript 5.9 + Prisma 6 (PostgreSQL na **Neon.tech**, pooled runtime + direct migrácie cez `DIRECT_URL`) + EJS/Tailwind CDN + grammy (Telegram). Package manager: **pnpm**.
- Dev: `pnpm start:dev` (watch, port 3000)
- Build: `pnpm run build` (= `prisma generate && nest build`)
- Test: `pnpm test` (vitest) · Lint: `pnpm lint` (eslint flat) · Typecheck: `pnpm typecheck`
- DB: `pnpm prisma:migrate` (migrate dev — od baseline jediná cesta pre zmeny schémy), `pnpm prisma:studio`. `prisma:push` existuje len historicky — NEPOUŽÍVAŤ na zdieľanú DB.
- CI: `.github/workflows/ci.yml` — build → lint → typecheck → test → audit(high) na push/PR do main.
- Deploy: Railway cez `Dockerfile`. Devcontainer = GitHub Codespaces (runtime pre AI Coder agenta).

## Architektúra
Jeden NestJS proces: EJS SSR dashboard + Telegram bot + crony. Dashboard/kanban servuje `src/leads/leads.controller.ts` (route `/`). Telegram router `src/telegram/telegram.update.ts` — moduly si registrujú handlery. AI cez `src/ai/ai.service.ts` (Anthropic SDK / Claude CLI fallback).

Moduly: `auth` (login + globálne gardy), `leads`, `coder`, `research`, `tracking`, `booking`, `figma`, `cloner`, `gmail`, `images`, `telegram`, `ai`, `database`, `common`. Vo výstavbe: `content-studio` (viď nižšie).

## Content Studio (od 2026-07-06, fázy CS-1..CS-8 hotové)
- Spec: `docs/content-studio/SPEC.md` · architektúra + limity + V2 roadmap: `docs/content-studio/ARCHITECTURE.md` · adaptačné ADR: `docs/DECISIONS.md` (2026-07-06).
- Flow: nápad (text/voice/audio/AI interview) → piliere → plány → Reel skripty (3 varianty) → AI review + compliance → schválenie (server-side vynútené) → handoff export. Plus Content Intelligence (video → analýza → Content DNA) a Style Memory.
- Kľúčové pravidlá zo specu: human approval povinný (server-side), žiadne auto-publikovanie, žiadny Instagram scraping, mock mode funguje bez platených kľúčov, AI skóre vždy označené ako odhad, inšpirácie len na vzory — nikdy nekopírovať formulácie, video výkon = hypotézy, nie kauzalita.
- **Odvetvovo neutrálny** (od 2026-07-06): žiadny obor nie je zadrôtovaný, doménu (obor/publikum/tón/compliance) riadi výhradne Brand DNA (`/content-studio/settings`). Compliance prompt univerzálny, reguláciu aplikuje podľa odvetvia značky.
- Provider architektúra: interfaces v `src/content-studio/providers/`; adaptery anthropic (nad `AiService`) / openai (fetch, bez SDK) / mock; výber cez env `*_PROVIDER` (auto = reálny len s credentials). Nové env mená viď ARCHITECTURE.md.
- **Čaká na DB:** migrácia `content_studio_init` sa vytvorí až PO baseline (fáza 4). Runtime nikdy nebežal (DB down). FFmpeg pridaný do Dockerfile.

## Auth model (od 2026-07-05)
- **Nová routa = admin by default.** Globálny `APP_GUARD`: ThrottlerGuard → AuthGuard (`src/auth/auth.module.ts`).
- Verejné routy explicitne cez `@Public()` (`src/common/decorators/public.decorator.ts`). Aktuálny allowlist: `/login`, `/t/:ref`, `POST /api/tracking/event`, booking public (page/slots/create), cloner public (form/preview/create/status `GET /api/cloner/:id`).
- Prístup: browser cookie `synapse_auth` (sha256 hesla, HttpOnly, 30 dní) cez `/login`, alebo header `x-admin-password` pre curl/API. Query `?password=` bol ODSTRÁNENÝ.
- `ADMIN_PASSWORD` bez defaultu — nenastavené = fail closed (503-štýl 401 na všetko admin).
- Rate limity: global 120/min, `POST /login` 5/min, verejné POST 10/min.
- Statické `/output/*` a `/public/*` sú verejné by design (cloner preview zdieľaný prospektom).

## Env vars (mená; hodnoty len v .env / Railway — NIKDY do gitu)
`DATABASE_URL`, `DIRECT_URL`, `ADMIN_PASSWORD`, `PORT`, `APP_URL`, `AI_PROVIDER` (auto|anthropic|openrouter|claude-cli), `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` (default anthropic/claude-sonnet-4.5), `TELEGRAM_BOT_TOKEN`, `TELEGRAM_OWNER_CHAT_ID`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_USER_EMAIL`, `GOOGLE_CALENDAR_ID`, `GITHUB_TOKEN`, `GITHUB_USERNAME`, `VERCEL_TOKEN`, `FIGMA_ACCESS_TOKEN`, `FIGMA_CRON_INTERVAL`, `LEAD_CRON_INTERVAL`, `LEAD_MIN_CONFIDENCE`, `UNSPLASH_ACCESS_KEY`, `PEXELS_API_KEY`.

## NEDOTÝKAŤ SA (bez explicitného GO)
- `src/leads/**` + `src/gmail/**` — produkčný lead pipeline, živé dáta.
- `src/telegram/telegram.update.ts` — centrálny router, závisia naň všetky moduly.
- `prisma/schema.prisma` model `Lead` — živé dáta v DB.
- `aicoder/` — legacy fragment, gitignored, nezasahovať.

## Známe problémy (aktívne, 2026-07-06)
1. ~~DB nedostupná (Supabase)~~ VYRIEŠENÉ 2026-07-06: **čistý štart na Neon.tech** (init migrácia `20260706203034_init`, 27 tabuliek). Staré leady zo Supabase sa nepreniesli (rozhodnutie Jančiho — projekt bol mŕtvy). `prisma migrate deploy` beží automaticky pri Docker boote.
2. Booking/Cloner — smoke overené na živej DB (create+delete OK). Figma/Cloner GENEROVANIE stále neoverené end-to-end (čaká na FIGMA_ACCESS_TOKEN, resp. vedomý Anthropic spend). Booking bez Google Calendar creds funguje v degradovanom režime (sloty bez kalendára).
3. ~~PrismaService zhadzuje boot pri nedostupnej DB~~ VYRIEŠENÉ 2026-07-06: graceful degradácia — boot pokračuje, DB routy padajú per-request, `isConnected()` na introspekciu.
4. 7 moderate vulns (dev-chain: ajv/js-yaml/brace-expansion cez @nestjs/cli; qs cez platform-express) — accepted risk, bez same-major patchu.
5. Dead config: `cron.leadInterval`/`figmaInterval` v configuration.ts — @Cron dekorátory používajú inline literály.
6. `GmailParser.cleanFacebookUrl` stripuje query string, takže `profile.php?id=` URL strácajú id (messenger link sa nedá odvodiť) — funguje len pre username URLs a redirect-wrapped URLs.

## Stav (posledné 📊 hodnotenie — 2026-07-05, po fázach 1–3)
Build PASS · tsc PASS · 18/18 testov PASS · lint PASS · audit 0 high (7 moderate) · CI green (run 28755176540). P0 auth opravený (commit 0f41227), runtime dôkaz čaká na DB. Deploy-ready: NIE (blokátor: DB + neoverené moduly).

## Session log
### 2026-07-06: Content Studio CS-1..CS-9
- Rozhodnutie: celý spec postupne (Janči), adaptovaný na single-tenant NestJS/EJS.
- Commity: a5beb89 (CS-1 docs), c5c06db (CS-2 data/domain), c3e6f6f (CS-3 core UI), 4791d2a (CS-4 voice), e60891c (CS-5 interview), bf9d67d (CS-6 intelligence), baf9c8c (CS-7 plans/scripts), d32ce0b (CS-8 style memory), + CS-9 docs.
- 61 testov PASS, build/tsc/lint zelené po každej fáze. Nové deps: zod, @types/multer (dev).
- BLOKÁTORY: DB down (migrácie + runtime), OPENAI_API_KEY chýba (voice live), .env.example needitovateľný (permission deny) — env mená zdokumentované v docs/content-studio/ARCHITECTURE.md.

### 2026-07-05: Audit + fázy 1–3 realizácie
- Audit: nájdený P0 (nezapojený AuthGuard), 20 high vulns, 0 testov.
- Fáza 1 (0f41227): globálny auth (APP_GUARD ThrottlerGuard→AuthGuard), @Public() allowlist, /login stránka + cookie, query password zrušený, fail-closed ADMIN_PASSWORD, rate limity.
- Fáza 2 (2c732bd): audit 44→7 vulns, 0 high; pnpm up + same-major overrides (undici, multer, picomatch, fast-uri).
- Fáza 3 (d375ddf): vitest 18 testov, eslint flat config (19 nálezov opravených), GitHub Actions CI — zelené.
- BLOKÁTOR: Supabase DB nedostupná → fáza 4 (migrations baseline), fáza 5 (moduly) a runtime curl verifikácia auth čakajú.
- Next: obnoviť Supabase projekt (alebo nová DATABASE_URL) → runtime verify → fáza 4 → fáza 5 → finálny report.
