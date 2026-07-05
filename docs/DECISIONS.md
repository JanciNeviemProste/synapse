# DECISIONS.md — ADR log

## 2026-03 — Monolit bez Dockeru/Redis/Python (retroaktívne, zo SYNAPSE-SYSTEM-FINAL.md)
Jeden NestJS proces (backend + EJS SSR + Telegram bot + crony), žiadny message broker ani worker fleet. Dôvod: solo developer, single-tenant, minimálna prevádzková réžia. Zamietnuté: monorepo, React SPA, Redis queue.

## 2026-03 — Telegram ako primárne UI, web len dashboard/kanban (retroaktívne)
Ovládanie systému cez grammy bota (inline keyboards); web slúži na prehľad leadov a verejné stránky (booking, cloner). Dôvod: rýchlosť obsluhy z mobilu. Zamietnuté: plnohodnotná web admin app.

## 2026-05 — `prisma db push` namiesto migrácií (retroaktívne, z ANALYSIS-2026-05-01.md)
Vedomý shortcut pre v1. Riziko: žiadna história schémy, deštruktívne zmeny bez ochrany. Kandidát na revíziu (viď TOP 5 z auditu 2026-07-05).

## 2026-07-05 — Auth: APP_GUARD + manuálny cookie parse, bez cookie-parser
Globálny AuthGuard (admin by default, `@Public()` allowlist). Cookie sa parsuje ručne z headera (~10 riadkov) — cookie-parser dep zamietnutý (built-in stačí). Query `?password=` odstránený (leak do logov/history). Heslo v cookie len ako sha256 hash.

## 2026-07-05 — Vitest bez unplugin-swc
Testy cielia pure logiku bez NestJS DI, esbuild transform stačí (`reflect-metadata` v setup file). Ak pribudnú DI/e2e testy s `emitDecoratorMetadata`, treba pridať `unplugin-swc`.

## 2026-07-05 — pnpm.overrides len same-major
undici@7→7.28, multer@2→2.2, picomatch@4→4.0.4, fast-uri@3→3.1.2. Cross-major overrides (napr. brace-expansion) zamietnuté — riziko rozbitia Express/Nest interných API prevyšuje moderate severity.

## 2026-07-05 — `GET /api/cloner/:id` je verejný
Anonymný prospect po submite formulára polluje status. Endpoint vracia whitelisted subset polí (bez `generatedHtml`) — overené v cloner.controller.ts.

## 2026-07-05 — Master prompt v2 ako procesný štandard
`SYNAPSE-MASTER-PROMPT-v2.md` = záväzný proces (DISKUSIA→GO→EXEKÚCIA, dôkazové reporty, security brány). Projektový `CLAUDE.md` = zdroj pravdy o kontexte, aktualizovaný po každej fáze.
