# DECISIONS.md — ADR log

## 2026-07-07 — Peťo podklady: extrahovaný text, nie binárka
Peťo nahráva PDF/Word/text do brandu, aby z nich AI čerpala. Rozhodnutie: pri uploade sa vytiahne TEXT (pdf-parse@1.1.1 lazy-loaded — v2 je ťažké pdfjs API a blokuje subpath import; mammoth pre .docx; UTF-8 pre .txt/.md/.csv) a uloží sa len text do `PetoDoc` — **binárka sa neukladá** (Railway efemérny FS, generovanie potrebuje len text, menej storage). Pri generovaní keyword retrieval (reuse `scoreDocument`/`extractKeywords` z Content Studia) vyberie top 4 relevantné časti ako `knowledge`. Skenované PDF bez textovej vrstvy → jasná hláška (OCR mimo rozsah). Zamietnuté: ukladanie originálov na disk (efemérny FS), pgvector (V2), OCR (potvrdené neskôr).

## 2026-07-07 — Peťové Studio: izolovaný zjednodušený flow + Groq STT
Klient „Peťo" chce ultra-jednoduchý nástroj (hlasovka → prepis → skripty), bez zložitosti Content Studia. Rozhodnutie: samostatný modul `src/peto/` s vlastnými lean tabuľkami (`PetoBrand`/`PetoTemplate`/`PetoScript`) — **plne izolovaný** od Content Studia (nulový blast radius), ale znovupoužíva AI vrstvu cez `ContentProviderFactory`. Prepis hlasu cez **Groq Whisper** (`whisper-large-v3-turbo`, free tier) — OpenRouter audio nevie, Groq je OpenAI-kompatibilný a zadarmo; factory transcription auto-priorita groq→openai→mock. Zamietnuté: (a) `space`/workspace tag naprieč Content Studio službami (väčší blast radius); (b) zdieľanie dát s Content Studiom (Peťo by prepísal Jančiho brand); (c) OpenAI Whisper ako default (Groq zadarmo). Peťo používa rovnaký admin login (multi-user mimo rozsah).

## 2026-07-06 — Neon.tech namiesto Supabase, čistý štart
Supabase free-tier projekt sa po nečinnosti pauzol a stal sa neobnoviteľne nedostupným (`tenant/user not found`). Prechod na Neon: čistý Postgres (žiadne Supabase featury sa nepoužívali), auto-wake pri prvom pripojení (~500 ms), scale-to-zero. Rozhodnutie Jančiho: čistý štart bez záchrany starých leadov. Implementácia: `directUrl` v schema.prisma (pooler nepodporuje DDL), init migrácia `20260706203034_init` (27 tabuliek, CREATE-only), `prisma migrate deploy` pri každom Docker boote. Zamietnuté: obnova Supabase + pg_dump migrácia dát.

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

## 2026-07-06 — Content Studio odvetvovo neutrálny
Pôvodne malo Content Studio na viacerých miestach zadrôtovaného finančného poradcu (compliance prompt na NBS reguláciu, mock dáta o poistkách). Rozhodnutie: modul má byť univerzálny pre akékoľvek odvetvie, doménu riadi výhradne Brand DNA. Compliance prompt prepísaný na univerzálny (regulácia sa aplikuje podľa `ComplianceInput.industry`/`complianceNotes` — financie/zdravie/právo/hazard len keď sedia), mock dáta genericizované na neutrálne `[MOCK]` placeholdery, systémové šablóny odfinancializované. Reálne generovanie bolo aj predtým z veľkej časti neutrálne (Brand DNA v každom prompte). Zamietnuté: odvetvové presety/onboarding (väčšia práca, netreba — Brand DNA stačí).

## 2026-07-06 — Content Studio: celý spec, adaptovaný na single-tenant Synapse
Spec `docs/content-studio/SPEC.md` je písaný pre multi-tenant SaaS (workspaces, RLS, React, Brand DNA, Knowledge Base, Video Studio). Rozhodnutie (Janči): realizovať celý spec po fázach CS-1..CS-9 s adaptáciami: (1) single-tenant — bez workspace_id/RLS, izolácia = globálny AuthGuard; (2) EJS SSR + vanilla JS namiesto React; (3) Brand DNA a Knowledge Base sa vytvoria ako súčasť modulu (neexistovali); (4) „Video Studio handoff" = export schváleného script package, žiadna generácia videa; (5) jobs = DB tabuľka + interval worker namiesto queue systému; (6) storage = lokálny disk (Railway efemérny — v neskoršej fáze objektový storage); (7) zod ako nová dep na validáciu AI JSON výstupov (class-validator na to nie je stavaný); (8) každý AI provider má mock adapter — modul plne funkčný bez platených kľúčov (`*_PROVIDER=mock`). Zamietnuté: prepis na React/Next, multi-tenant vrstva „do zásoby", Instagram scraping (aj spec ho zakazuje).

## 2026-07-05 — Master prompt v2 ako procesný štandard
`SYNAPSE-MASTER-PROMPT-v2.md` = záväzný proces (DISKUSIA→GO→EXEKÚCIA, dôkazové reporty, security brány). Projektový `CLAUDE.md` = zdroj pravdy o kontexte, aktualizovaný po každej fáze.
