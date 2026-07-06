# Content Studio — architektúra (stav k 2026-07-06)

Spec: `SPEC.md` v tomto adresári. Adaptačné rozhodnutia: `../DECISIONS.md` (2026-07-06). Realizované fázy CS-1..CS-8, hardening CS-9.

## Prehľad

Modul `src/content-studio/` — všetky routy admin-only (globálny AuthGuard, žiadna `@Public()`). Flow:

```
Vstup (text / voice / audio / AI interview / video)
→ AI extrakcia nápadov (Brand DNA + Knowledge Base kontext)
→ Piliere → Content plán → Reel skripty (3 varianty A/B/C)
→ AI review + compliance → ľudské schválenie (server-side vynútené)
→ Video Studio handoff (export package)
Paralelne: Content Intelligence (video → analýza → Content DNA)
a Style Memory (učenie z úprav — len explicitne schválené preferencie).
```

## Vrstvy

- **providers/** — business logika závisí len na interfaces (`provider.interfaces.ts`). Adaptery: `anthropic.provider.ts` (nad `AiService`, Zod validácia + 1 korekčný retry), `openai-transcription.provider.ts` (Whisper cez fetch, bez SDK), `openai-realtime.provider.ts` (efemérne tokeny), `mock.provider.ts` (deterministické SK dáta — **celý modul funguje bez platených kľúčov**). Výber: `provider.factory.ts` — `*_PROVIDER=auto|mock|anthropic|openai`; `auto` = reálny provider len ak existujú credentials, inak mock.
- **prompts/** — 11 prompt súborov (spec §20 + 14.13): anti-injection rámovanie (`<untrusted>` delimitre), slovenský výstup, zákaz kopírovania tvorcov, zákaz kauzálnych tvrdení pri videách.
- **schemas/** — Zod schémy všetkých AI výstupov + `parseAiJson` (fence stripping, validácia; nič nevalidované sa neukladá).
- **domain/status.ts** — statusové prechody (skripty §22, plán items §15, joby 14.2) ako pure funkcie; `canHandOff` = len APPROVED/READY_FOR_VIDEO.
- **jobs/** — `ContentJob` tabuľka + interval worker (5 s), retry s backoffom; handler registruje `IntelligenceService` (typ `video-analysis`).
- **storage/** — privátny lokálny disk `storage/content-studio/` (mimo web rootov `output/`/`public/`), MIME/size validácia, generované názvy súborov. ⚠ Railway FS je efemérny — trvalé médiá vyžadujú objektový storage (V2).
- **intelligence/** — `media.service.ts` (ffmpeg/ffprobe, graceful degradácia), `intelligence.service.ts` (pipeline UPLOADED→…→READY_FOR_REVIEW→APPROVED), `metrics.ts` (normalizácia + evidence levels — pure, testované), `content-dna.service.ts` (DNA len zo schválených analýz; pravidlá vyžadujú schválenie).
- **services/** — brand-profile (Brand DNA), knowledge (keyword retrieval, pripravené na pgvector), ideas, templates (14 SK systémových — nemenné, duplikovateľné), pillars, inspiration (bez scrapingu), voice (audio sa default neukladá), interview, plans, scripts, style-memory.

## Env vars (mená)

`CONTENT_STRATEGY_PROVIDER/MODEL`, `SCRIPT_GENERATION_PROVIDER/MODEL`, `SCRIPT_REVIEW_PROVIDER/MODEL`, `COMPLIANCE_PROVIDER/MODEL`, `TRANSCRIPTION_PROVIDER/MODEL`, `REALTIME_VOICE_PROVIDER/MODEL`, `VIDEO_UNDERSTANDING_PROVIDER/MODEL`, `OPENAI_API_KEY`, `CONTENT_STUDIO_STORAGE_DIR`, `CONTENT_AUDIO_MAX_FILE_SIZE_MB`, `VIDEO_ANALYSIS_MAX_FILE_SIZE_MB`, `VIDEO_ANALYSIS_MAX_DURATION_SECONDS`. Bez nastavenia čohokoľvek beží všetko v mock móde.

## Mock mode

`*_PROVIDER=mock` (alebo `auto` bez kľúčov). Mock výstupy sú validované tými istými Zod schémami (unit testy). E2E bez kľúčov: nápad → skripty → review → schválenie → handoff; video pipeline s mock transkripciou/analýzou.

## Bezpečnosť & GDPR

Všetko admin-only; AI endpointy rate-limitované per-route; DTO validácia (global ValidationPipe whitelist); upload MIME/size validácia; audio sa ukladá len pri explicitnom opt-ine; granulárne mazanie (audio / session / video + odvodené dáta); UI varovanie na anonymizáciu klientov; efemérne realtime tokeny server-side; EJS `<%=` escaping; žiadne secrets v client kóde.

## Známe limity (V1)

1. **Migrácie neaplikované** — DB down; po obnove: baseline `0_init` → `pnpm prisma migrate dev --name content_studio_init`. Šablóny sa seedujú lazy pri prvom použití.
2. Video analýza je transcript-based (text) — frame/OCR/scene detection providery sú v interface, implementácia = V2.
3. Voice/realtime naživo vyžaduje `OPENAI_API_KEY`; dovtedy mock.
4. Storage na lokálnom disku — pri Railway redeployi sa videá stratia (V2: Supabase Storage + signed URLs).
5. Regenerácia po sekciách: hook/CTA cez reviewer improvements; caption-only regenerácia = V2.
6. Knowledge retrieval = keyword scoring; pgvector = V2.
7. Drag & drop plánovanie = V2 (teraz date input).

## V2 roadmap

Objektový storage + signed URLs, pgvector retrieval, frame-level video analýza (scene detection + OCR + multimodal), oficiálna Meta integrácia pre inšpirácie, caption-only regenerácia, batch DNA automatizácia, Telegram handler pre Content Studio, usage quotas/cost tracking per provider.
