# SYNAPSE SYSTEM — Claude Code Implementation Brief (FINAL)

> **Dátum:** 2026-03-12
> **Projekt:** Synapse System
> **Autor:** Janči (projekt owner)
> **Určené pre:** Claude Code (YOLO mode)
> **Model:** Claude Opus 4.6 (`claude-opus-4-6`)
> **Prostredie:** Lokálne (Windows, PowerShell)

---

## MASTER INŠTRUKCIE PRE AI

Toto je kompletný implementačný brief. Čítaj ho CELÝ pred začiatkom akejkoľvek práce.

### Tvoje kroky v presnom poradí:

```
KROK 0:  Preskúmaj existujúci AI Coder v ./aicoder/ → audit + zhrnutie
KROK 1:  Scaffold nový NestJS projekt
KROK 2:  Integruj opravený AI Coder + web UI + vylepšené prompty
KROK 3:  FB Lead Assistant + Research + Tracking + Follow-up
KROK 4:  Google Calendar Booking
KROK 5:  Figma-to-Code Pipeline
KROK 6:  Web Cloner s lead trackingom
KROK 7:  Dashboard + Kanban + Reports + Polish
```

### Pravidlá:

- **NEPÝTAJ SA MA NA NIČ.** Implementuj podľa tohto briefu.
- **Píš production-ready kód**, nie placeholdery ani TODO komentáre.
- **Každý modul musí byť funkčný** pred prechodom na ďalší.
- **Ak niečo nie je špecifikované**, rozhodni sa sám podľa best practices.
- **Dodržuj poradie krokov.**

---

## 1. PREHĽAD SYSTÉMU

**Názov:** Synapse System
**Priečinok:** synapse-system
**Typ:** NestJS backend + web frontend (EJS + Tailwind) + Telegram Bot
**Runtime:** Node.js 20+
**Package manager:** pnpm
**Databáza:** PostgreSQL 16
**Prostredie:** Lokálne (Windows, PowerShell, pnpm)
**AI Coder deploy:** GitHub Codespaces → Vercel (len pre generované weby)
**Žiadny Docker. Žiadny Redis. Žiadny Python.**

### Moduly:

| # | Modul | Popis |
|---|-------|-------|
| 0 | **AI Coder Bot** | Existujúci v ./aicoder/ → oprav, integruj, web UI |
| 1 | **FB Lead Assistant** | Gmail → AI → Research → 3x Telegram → Tracking → Follow-up |
| 2 | **Google Calendar Booking** | Verejná stránka → Calendar → Meet → Telegram |
| 3 | **Figma-to-Code Pipeline** | Figma REST API → AI → HTML → preview |
| 4 | **Web Cloner** | URL + info → scrape → AI → preview s trackingom |

---

## 2. TECH STACK

```
Runtime:          Node.js 20+ (LTS)
Framework:        NestJS 10+
Language:         TypeScript (strict mode)
Database:         PostgreSQL 16
ORM:              Prisma
AI Provider:      Anthropic Claude API (@anthropic-ai/sdk)
                  Model: claude-sonnet-4-20250514
Telegram:         grammy (s inline keyboard support)
Gmail:            googleapis
Google Calendar:  googleapis
Figma:            Figma REST API (https://api.figma.com/v1/)
Scraping:         puppeteer
HTML parsing:     cheerio
Git:              simple-git
Frontend:         EJS templates + Tailwind CSS (CDN)
Stock photos:     Unsplash API
Icons:            Lucide Icons (CDN)
Web analysis:     puppeteer + lighthouse (pre PageSpeed)
Business data:    puppeteer scraping finstat.sk, orsr.sk
```

### NEPOUŽÍVAJ:
- Docker, Kubernetes, Redis, Python, EspoCRM
- Figma MCP server (používame REST API)
- React/Next.js pre frontend (EJS + Tailwind CDN)
- Emoji ako ikony na generovaných weboch

---

## 3. ŠTRUKTÚRA PROJEKTU

```
synapse-system/
├── aicoder/                              # EXISTUJÚCI KÓD — prečítaj prvý!
│
├── prisma/
│   └── schema.prisma
│
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   │
│   ├── common/
│   │   ├── config/configuration.ts
│   │   ├── filters/global-exception.filter.ts
│   │   ├── guards/auth.guard.ts
│   │   └── utils/
│   │       ├── telegram-formatter.ts
│   │       └── message-splitter.ts
│   │
│   ├── database/
│   │   ├── database.module.ts
│   │   └── prisma.service.ts
│   │
│   ├── telegram/
│   │   ├── telegram.module.ts
│   │   ├── telegram.service.ts           # core: setup + send + inline keyboards
│   │   └── telegram.update.ts            # ALL command + callback handlers
│   │
│   ├── ai/
│   │   ├── ai.module.ts
│   │   ├── ai.service.ts                 # Claude API wrapper
│   │   └── ai-learning.service.ts        # A/B test tracking + tone optimization
│   │
│   ├── images/
│   │   ├── images.module.ts
│   │   └── images.service.ts             # Unsplash API
│   │
│   ├── research/
│   │   ├── research.module.ts
│   │   ├── research.service.ts           # orchestrácia celého research flow
│   │   ├── google-search.service.ts      # Google search pre osobu/firmu
│   │   ├── orsr.service.ts               # ORSR + ŽRSR scraping
│   │   ├── finstat.service.ts            # Finstat scraping (obrat, tržby)
│   │   ├── web-analyzer.service.ts       # Analýza existujúceho webu klienta
│   │   └── trust-score.service.ts        # Výpočet trust score
│   │
│   ├── gmail/
│   │   ├── gmail.module.ts
│   │   ├── gmail.service.ts
│   │   └── gmail.parser.ts
│   │
│   ├── leads/
│   │   ├── leads.module.ts
│   │   ├── leads.service.ts
│   │   ├── leads.controller.ts           # REST API + web views
│   │   ├── leads.cron.ts                 # 5-min polling
│   │   ├── leads-followup.cron.ts        # 10-min + 24h reminders
│   │   ├── leads-report.cron.ts          # denný + týždenný report
│   │   └── dto/
│   │
│   ├── tracking/
│   │   ├── tracking.module.ts
│   │   ├── tracking.service.ts           # lead activity tracking
│   │   ├── tracking.controller.ts        # tracking pixel + event endpoints
│   │   └── heat-score.service.ts         # heat score calculation
│   │
│   ├── booking/
│   │   ├── booking.module.ts
│   │   ├── booking.service.ts
│   │   ├── booking.controller.ts
│   │   └── calendar.service.ts
│   │
│   ├── coder/
│   │   ├── coder.module.ts
│   │   ├── coder.service.ts
│   │   ├── coder.controller.ts
│   │   └── codespaces.service.ts
│   │
│   ├── figma/
│   │   ├── figma.module.ts
│   │   ├── figma.service.ts
│   │   ├── figma-codegen.service.ts
│   │   ├── figma.cron.ts
│   │   └── dto/
│   │
│   └── cloner/
│       ├── cloner.module.ts
│       ├── cloner.service.ts
│       ├── cloner.controller.ts
│       └── dto/
│
├── views/
│   ├── layouts/main.ejs
│   ├── dashboard.ejs
│   ├── coder/index.ejs
│   ├── coder/history.ejs
│   ├── leads/index.ejs                   # kanban board
│   ├── leads/detail.ejs
│   ├── leads/stats.ejs                   # štatistiky + grafy
│   ├── booking/public.ejs
│   ├── booking/admin.ejs
│   ├── figma/index.ejs
│   ├── figma/preview.ejs
│   ├── cloner/public.ejs
│   ├── cloner/admin.ejs
│   └── cloner/preview.ejs
│
├── public/
│   ├── css/custom.css
│   └── js/
│       ├── app.js
│       ├── kanban.js                     # drag & drop kanban
│       └── tracking.js                   # client-side tracking snippet
│
├── output/
│   ├── figma/
│   └── cloner/
│
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── nest-cli.json
└── README.md
```

---

## 4. DATABÁZA — Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== LEADS ====================

model Lead {
  id              String     @id @default(uuid())
  authorName      String
  profileUrl      String?
  postUrl         String?
  messengerUrl    String?
  groupName       String?
  postSummary     String     @db.Text
  publicComment   String?    @db.Text
  privateMessage  String?    @db.Text
  source          String     @default("facebook")
  category        String?
  confidence      Float?

  // Research
  researchSummary   String?    @db.Text
  trustScore        Int?       @default(0)           // 0-100
  linkedinUrl       String?
  companyName       String?
  companyRegNumber  String?                           // IČO
  companyInfo       String?    @db.Text
  companyRevenue    String?                           // obrat v €
  companyFoundedYear Int?
  clientWebsite     String?
  socialProfiles    String?    @db.Text               // JSON

  // Web analysis
  webAnalysis       String?    @db.Text               // JSON: mobile, speed, design, seo
  priceEstimate     String?                           // "1500-3000€"

  // Tracking
  heatScore         Int        @default(10)           // 0-100
  linkOpened        Boolean    @default(false)
  linkOpenedAt      DateTime?
  formStarted       Boolean    @default(false)
  formCompleted     Boolean    @default(false)
  previewGenerated  Boolean    @default(false)
  previewViews      Int        @default(0)
  previewTotalTime  Int        @default(0)            // seconds
  lastPreviewViewAt DateTime?

  // AI Learning
  messageVariant    String?                           // A/B variant ID
  responseType      String?                           // "builder_link" | "booking_link"

  // Status
  status            LeadStatus @default(NEW)
  contactedAt       DateTime?
  reminderSentAt    DateTime?
  followUpSentAt    DateTime?
  isBlacklisted     Boolean    @default(false)

  emailMessageId  String?    @unique
  rawEmailSnippet String?    @db.Text
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  notes           Note[]
  activities      LeadActivity[]
}

model Note {
  id        String   @id @default(uuid())
  leadId    String
  lead      Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)
  content   String   @db.Text
  createdAt DateTime @default(now())
}

model LeadActivity {
  id        String   @id @default(uuid())
  leadId    String
  lead      Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)
  event     String                                    // "link_opened", "form_started", "form_completed", "preview_viewed", "preview_revisit"
  metadata  String?  @db.Text                         // JSON
  createdAt DateTime @default(now())
}

model Blacklist {
  id        String   @id @default(uuid())
  name      String
  profileUrl String?
  reason    String?
  createdAt DateTime @default(now())
}

// AI Learning
model MessagePerformance {
  id             String   @id @default(uuid())
  leadId         String
  variant        String                               // variant identifier
  messageType    String                               // "public_comment" | "private_dm"
  toneStyle      String?                              // "helpful" | "direct" | "casual"
  phraseUsed     String?  @db.Text                    // key phrases
  linkType       String?                              // "builder" | "booking" | "none"
  resultAction   String?                              // "opened" | "completed" | "ignored" | "replied"
  convertedToCall Boolean @default(false)
  convertedToSale Boolean @default(false)
  saleAmount      Float?
  createdAt      DateTime @default(now())
}

enum LeadStatus {
  NEW
  CONTACTED
  REPLIED
  QUALIFIED
  CONVERTED
  REJECTED
}

// ==================== BOOKING ====================

model Booking {
  id              String        @id @default(uuid())
  clientName      String
  clientEmail     String
  clientPhone     String?
  dateTime        DateTime
  meetLink        String?
  calendarEventId String?
  leadId          String?                             // prepojenie na lead ak existuje
  status          BookingStatus @default(PENDING)
  notes           String?       @db.Text
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

enum BookingStatus {
  PENDING
  CONFIRMED
  COMPLETED
  CANCELLED
}

// ==================== AI CODER ====================

model CoderTask {
  id             String     @id @default(uuid())
  source         String     @default("telegram")
  telegramChatId String?
  command        String     @default("code")
  prompt         String     @db.Text
  response       String?    @db.Text
  generatedFiles String?    @db.Text
  repoUrl        String?
  deployUrl      String?
  status         TaskStatus @default(PENDING)
  duration       Int?
  createdAt      DateTime   @default(now())
  completedAt    DateTime?
}

enum TaskStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

// ==================== FIGMA PIPELINE ====================

model DesignTask {
  id             String           @id @default(uuid())
  figmaUrl       String
  figmaFileKey   String
  figmaNodeIds   String?
  fileName       String?
  submittedBy    String           @default("telegram")
  status         DesignTaskStatus @default(PENDING)
  generatedCode  String?          @db.Text
  outputPath     String?
  previewUrl     String?
  errorMessage   String?          @db.Text
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  processedAt    DateTime?
}

enum DesignTaskStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

// ==================== WEB CLONER ====================

model CloneRequest {
  id             String      @id @default(uuid())
  sourceUrl      String
  clientName     String
  clientEmail    String
  businessName   String
  businessField  String
  businessInfo   String      @db.Text
  additionalInfo String?     @db.Text
  clientPhone    String?
  leadId         String?                              // prepojenie na lead ak prišiel z DM
  trackingRef    String?     @unique                  // unikátny ref code pre tracking
  status         CloneStatus @default(PENDING)
  previewUrl     String?
  generatedHtml  String?     @db.Text
  screenshotPath String?
  errorMessage   String?     @db.Text
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
  completedAt    DateTime?
}

enum CloneStatus {
  PENDING
  SCRAPING
  GENERATING
  COMPLETED
  FAILED
}
```

---

## 5. KROK 0: AUDIT EXISTUJÚCEHO AI CODERA

### Toto je PRVÝ krok.

```
1. Prečítaj CELÝ obsah priečinka ./aicoder/
2. Porozumej architektúre:
   - Telegram bot → Claude Code v GitHub Codespaces → Git push → Vercel deploy → Telegram notifikácia
3. Napíš audit zhrnutie:
   - Čo funguje dobre
   - Čo je broken / chýba
   - Čo treba opraviť
4. NEOPRAVUJ ešte — najprv len audituj
```

---

## 6. KROK 2: AI CODER INTEGRÁCIA

### Po scaffolde nového projektu (KROK 1) integruj AI Codera:

- Prekopíruj opravený kód do `src/coder/`
- Refaktoruj do NestJS (service + controller + module)
- Zachovaj celú pipeline: Telegram → Codespaces → Git → Vercel → Telegram

### Web UI (`/coder`):
- Textarea pre prompt
- Dropdown: "React Landing Page", "HTML/CSS Web", "Next.js App", "Custom"
- Progress: Processing → Building → Deploying → Done (polling `/api/coder/:id/status`)
- Po dokončení: GitHub link + Vercel link
- História: `/coder/history` — tabuľka všetkých taskov

### KRITICKÉ — Vylepšený system prompt pre generovanie webov:

```
Si expert frontend developer a dizajnér. Vytváraš profesionálne, moderné webové stránky.

VIZUÁLNY DIZAJN:

1. IKONY:
   - NIKDY nepoužívaj emoji ako ikony (žiadne 📊 🏦 🔒 💼)
   - Použi Lucide Icons: <script src="https://unpkg.com/lucide@latest"></script>
   - Použitie: <i data-lucide="briefcase"></i> a lucide.createIcons()

2. OBRÁZKY:
   - Použi Unsplash pre hero sekcie a ilustrácie
   - URL formát: https://images.unsplash.com/photo-{ID}?w={width}&h={height}&fit=crop&q=80
   - Vyber RELEVANTNÉ fotky podľa témy webu
   - Pre hero: gradient overlay + text navrchu
   - NIKDY nepoužívaj placeholder.com

3. TYPOGRAFIA:
   - Google Fonts (Inter, Plus Jakarta Sans, Playfair Display)
   - Headings: font-weight 600-800, proper line-height
   - Body: 16-18px, line-height 1.6-1.7
   - Farby textu: tmavošedé (#1a1a2e, #2d2d3f), nie čisto čierne

4. LAYOUT:
   - 8px spacing grid
   - Sekcie: padding-y min 80px
   - Max-width: 1200px
   - Karty: subtle border ALEBO shadow (nie oboje), border-radius 12-16px

5. FARBY:
   - CSS custom properties (:root)
   - Gradient pozadia pre hero
   - Hover stavy pre všetky interaktívne elementy

6. CELKOVO:
   - Musí vyzerať ako od profesionálneho dizajnéra
   - Smooth scroll, subtle CSS transitions
   - Mobile responsive
   - Sémentický HTML
   - Jeden HTML súbor s inline CSS + JS
```

---

## 7. KROK 3: FB LEAD ASSISTANT (NAJVÄČŠÍ MODUL)

### 7.1 Gmail Polling

- Cron `*/5 * * * *`
- Query: `from:(facebookmail.com OR notification@facebook.com) is:unread`
- OAuth2 (`googleapis`), stiahni FULL message, dekóduj base64
- Po spracovaní označ ako prečítaný
- `emailMessageId` deduplikácia

### 7.2 Gmail Parser (`gmail.parser.ts`)

Parsuj HTML cez `cheerio`. Extrahuj:
- Meno autora
- Profil URL → z toho odvoď Messenger URL: `https://m.me/{username}` alebo `https://www.facebook.com/messages/t/{userId}`
- Post URL (hľadaj "View Post" / "See Post" linky)
- Názov skupiny
- Text príspevku

Fallback: HTML → plain text → raw snippet.

### 7.3 Keyword Pre-filter (bez AI)

```typescript
const LEAD_KEYWORDS = [
  'web', 'webstránk', 'website', 'stránk', 'e-shop', 'eshop',
  'online obchod', 'internetový obchod',
  'wordpress', 'woocommerce', 'shopify', 'prestashop',
  'frontend', 'backend', 'fullstack', 'developer', 'programátor',
  'web design', 'ux', 'ui', 'landing page', 'redesign',
  'programovanie', 'vývoj', 'development', 'aplikáci', 'appk',
  'ppc', 'google ads', 'facebook ads', 'meta ads', 'reklam',
  'kampaň', 'kampane', 'marketing', 'digitálny marketing',
  'online marketing', 'performance', 'lead generation', 'konverz',
  'remarketing', 'seo', 'sem', 'optimalizáci', 'agentúr', 'agency',
  'ai', 'umelá inteligencia', 'automatizáci', 'automat',
  'video', 'animáci', 'kóder', 'kodér', 'IT',
  'hľadám programátora', 'hľadám webára', 'potrebujem web',
  'potrebujem stránku', 'potrebujem eshop', 'robí niekto web',
  'viete mi odporučiť', 'odporúčte', 'poraďte', 'kto robí',
  'koľko stojí web', 'cena za web', 'cenová ponuka',
];
```

### 7.4 AI Relevance Check

Len ak prešiel pre-filter. System prompt:

```
Si expert na digitálny marketing a IT služby na Slovensku a v Česku.
Analyzuješ Facebook posty pre digitálnu agentúru ponúkajúcu:
- Tvorba webstránok a e-shopov
- PPC reklama (Google Ads, Facebook Ads)
- SEO/SEM
- Programovanie na mieru
- AI automatizácie

Odpovedz VÝHRADNE platným JSON (žiadny markdown, žiadne backticks):
{"relevant":true/false,"confidence":0.0-1.0,"reason":"krátke vysvetlenie","category":"web|eshop|ppc|seo|programming|ai|video|other"}
```

### 7.5 Research Module (`research.service.ts`)

Ak relevant=true AND confidence >= 0.5, spusti research:

**Krok 1 — Google Search:**
- Hľadaj: "{meno} {priezvisko}" + "LinkedIn", "firma", "IČO"
- Extrahuj: LinkedIn URL, firemné info

**Krok 2 — ORSR/ŽRSR scraping (orsr.service.ts):**
- Hľadaj meno na orsr.sk (Obchodný register SR)
- Ak nájde firmu: názov, IČO, dátum založenia
- Hľadaj aj na zrsr.sk (Živnostenský register)

**Krok 3 — Finstat scraping (finstat.service.ts):**
- Ak máš IČO, scrapni finstat.sk/firma/{IČO}
- Extrahuj: tržby za posledný rok v €, počet zamestnancov
- Puppeteer headless scraping

**Krok 4 — Web klienta:**
- Ak sa nájde web (z ORSR, Google, FB profilu), ulož URL
- Spusti automatickú web analýzu (viď 7.6)

**Krok 5 — Trust Score výpočet (trust-score.service.ts):**

```typescript
function calculateTrustScore(data: ResearchData): number {
  let score = 0;
  if (data.hasFacebookProfile) score += 10;
  if (data.facebookFriends > 100) score += 5;
  if (data.hasLinkedIn) score += 15;
  if (data.hasCompanyInORSR) score += 20;
  if (data.companyAge > 2) score += 5;
  if (data.revenue > 50000) score += 10;
  if (data.revenue > 200000) score += 5;
  if (data.hasWebsite) score += 10;
  if (data.websiteIsModern) score += 5;
  if (data.multipleSocialProfiles) score += 5;
  // Max ~90-100
  return Math.min(score, 100);
}
```

### 7.6 Web Analyzer (`web-analyzer.service.ts`)

Ak lead má existujúci web, automaticky ho analyzuj:

```typescript
async analyzeWebsite(url: string): Promise<WebAnalysis> {
  // 1. Puppeteer: otvor stránku
  // 2. Screenshot (pre porovnanie)
  // 3. Skontroluj:
  //    - Mobile responsive (viewport 375px → skontroluj horizontal scroll)
  //    - Load time (performance.timing)
  //    - Či má meta description, title, og:tags
  //    - Či má SSL (https)
  //    - Design odhadni cez AI: moderný/zastaralý/priemerný
  //    - Či má Google Analytics / FB Pixel
  // 4. Vráť štruktúrovaný výsledok
}
```

Výstup:
```json
{
  "mobileResponsive": false,
  "loadTimeSeconds": 8.2,
  "hasSSL": true,
  "hasMeta": false,
  "hasAnalytics": false,
  "designAssessment": "zastaralý (odhadom 2018-2019)",
  "seoIssues": ["chýba meta description", "žiadny blog", "chýba sitemap"],
  "recommendation": "Redesign — silný argument pre predaj"
}
```

### 7.7 Cenový odhad

AI generuje cenový odhad na základe kategórie, komplexnosti a obratu klienta:

```
System: Na základe typu požiadavky a informácií o klientovi odhadni cenový rozsah.
Kategórie:
- Jednoduchý web (landing page): 500-1000€
- Firemný web (5-10 podstránok): 1500-3000€
- E-shop (WooCommerce/Shopify): 2000-5000€
- Customný web/aplikácia: 3000-10000€
- PPC setup + manažment: 300-800€/mesiac
- SEO audit + optimalizácia: 500-2000€

Zohľadni obrat klienta — ak je vysoký, cenový rozsah môže byť vyšší.
Odpovedz JSON: {"estimate":"1500-3000€","type":"Firemný web (redesign)","affordable":true}
```

### 7.8 AI Response Generation

**DYNAMICKÁ tretia správa** — podľa kategórie:

System prompt:
```
Si skúsený obchodník malej digitálnej agentúry na Slovensku.
Generuješ odpovede na Facebook posty kde ľudia hľadajú IT/marketing služby.

Pravidlá:
- Píš po slovensky. Ak post v češtine, píš po česky.
- Buď prirodzený a ľudský.
- Nebuď agresívne predajný. Najprv pomôž, potom naznač expertízu.
- Píš v prvej osobe ("ja", "mám skúsenosti").
- Max 2-3 vety na odpoveď. Max 1 emoji.

DÔLEŽITÉ pre súkromnú správu:
- Ak kategória je "web" alebo "eshop": vlož link na Web Builder {builderUrl}
- Ak kategória je "ppc", "seo", "marketing": vlož link na booking {bookingUrl}
- Ak kategória je "programming" alebo "ai": vlož link na booking {bookingUrl}

Odpovedz VÝHRADNE platným JSON:
{
  "publicComment": "verejný komentár (2-3 vety)",
  "privateMessage": "súkromná správa (2-3 vety + príslušný link)"
}
```

Navyše použi dáta z AI Learning modulu:
```
Historicky najúspešnejšie frázy: {topPhrases}
Frázy, ktorým sa vyhýbať: {avoidPhrases}
Odporúčaný tone of voice: {recommendedTone}
```

### 7.9 Tri Telegram Správy

**SPRÁVA 1 — Lead Info + Research:**

```
🔥 Nový lead z FB skupiny

👤 {authorName}
📊 Trust: {trustScore}% | 🔥 Heat: {heatScore}/100
📂 Kategória: {category}

🔍 RESEARCH:
🏢 Firma: {companyName || "nenájdená"}
🔢 IČO: {companyRegNumber || "N/A"}
💰 Obrat 2025: {companyRevenue || "N/A"}
🌐 Web: {clientWebsite || "nenájdený"}
💼 LinkedIn: {linkedinUrl || "nenájdený"}
📱 Facebook: {facebookStatus}
📅 Firma založená: {companyFoundedYear || "N/A"}
{trustIndicators}

🌐 WEB ANALÝZA: (ak existuje web)
📱 Mobile: {mobileResponsive ? "✅" : "❌"}
⚡ Rýchlosť: {loadTime}s
🎨 Dizajn: {designAssessment}
🔍 SEO: {seoSummary}
💡 {webRecommendation}

💶 Cenový odhad: {priceEstimate}

📝 Príspevok:
"{postSummary}"

🔗 FB príspevok: {postUrl}
💬 Messenger: {messengerUrl}

🆔 #lead_{shortId}
```

S inline klávesnicou:
```
[✅ Kontaktovaný] [❌ Ignorovať]
[📊 Viac info] [🚫 Blacklist]
```

**SPRÁVA 2 — Komentár (copy-paste):**

```
💬 Komentár pre: {authorName}
━━━━━━━━━━━━━━━━━
{publicComment}
━━━━━━━━━━━━━━━━━
```

Inline klávesnica:
```
[📋 Kopírovať text]
```

**SPRÁVA 3 — Súkromná správa (copy-paste):**

```
✉️ Správa pre: {authorName}
━━━━━━━━━━━━━━━━━
{privateMessage}
━━━━━━━━━━━━━━━━━
```

Inline klávesnica:
```
[📋 Kopírovať text]
```

### 7.10 Follow-up System

**10-minútový reminder** (`leads-followup.cron.ts`):

Cron `*/1 * * * *` — každú minútu skontroluj:
- Leady so statusom NEW, createdAt > 10 min, reminderSentAt == null

```
⏰ REMINDER: {authorName} (pred {minutes} min)
Trust: {trustScore}% | {category}
Ešte si neoznačil ako kontaktovaný!

[✅ Kontaktovaný] [❌ Ignorovať] [⏰ +30 min]
```

Tlačidlo "+30 min" nastaví reminderSentAt = now + 30 min.

**24h follow-up** — ak lead otvoril link ale neodpísal:

```
⏰ Follow-up: {authorName}
{trackingStatus}
Navrhovaná follow-up správa:
━━━━━━━━━━━━━━━━━
{aiGeneratedFollowUp}
━━━━━━━━━━━━━━━━━

[📋 Kopírovať] [✅ Hotovo] [⏰ Zajtra]
```

### 7.11 HOT Lead Alert

Ak heat score presiahne 70:

```
🔥🔥🔥 HOT LEAD: {authorName} (heat: {heatScore}/100)
{hotReason}
📞 Kontaktuj TERAZ

[📞 Volaný] [💬 Napísaný] [📊 Detail]
```

### 7.12 Denný Súhrn (20:00)

Cron `0 20 * * *`:

```
📊 Denný súhrn — {date}

📥 Nové leady: {newCount}
✅ Relevantné: {relevantCount} ({relevantPercent}%)
📞 Kontaktované: {contactedCount}
💬 Odpovedali: {repliedCount}
🌐 Použili Builder: {builderCount}
🔥 HOT leady: {hotCount}

Top kategórie: {topCategories}

📈 Tone of voice insights:
{aiLearningInsights}

Zajtra follow-up:
{tomorrowFollowUps}
```

### 7.13 Týždenný Report (pondelok 8:00)

Cron `0 8 * * 1`:

```
📊 Týždenný report — {weekRange}

📥 Leady celkom: {totalLeads}
✅ Relevantné: {relevantCount} ({percent}%)
📞 Kontaktované: {contactedCount}
💬 Odpovedali: {repliedCount}
🌐 Použili Builder: {builderUsed}
🔥 Konverzie: {conversions}

💰 Pipeline hodnota: ~{pipelineValue} €
📈 Konverzný pomer: {conversionRate}%
⏱️ Priem. čas do odpovede: {avgResponseTime}

🧠 AI insights:
- Najlepšia kategória: {bestCategory} ({bestCategoryRate}% response)
- Najhoršia: {worstCategory} ({worstCategoryRate}% response)
- {builderVsBookingInsight}
- Najaktívnejšie skupiny: {topGroups}
- Peak čas príspevkov: {peakTimes}

💡 Odporúčanie: {weeklyRecommendation}

⏰ Optimálne časy na odpoveď:
{bestResponseTimes}
```

### 7.14 Odporúčanie Najlepšieho Času na Odpoveď

Systém analyzuje kedy sú leady z konkrétnych skupín najaktívnejšie. Ak lead postne o 22:00:

```
⏰ Tip: {authorName} postol o {postTime}
Podľa históriky skupiny "{groupName}" sú
používatelia najaktívnejší: {peakTime}
Odporúčaný čas odpovede: {recommendedTime}
```

### 7.15 Blacklist/Whitelist

Telegram príkazy:
```
/blacklist {meno alebo ID}     — pridaj na blacklist
/whitelist                     — zobraz blacklist
/unblacklist {ID}              — odstráň z blacklistu
```

Callback button "🚫 Blacklist" v správe 1 → pridá na blacklist.
Blacklisted leads sa preskakujú pri parsovaní.

### 7.16 AI Learning Module (`ai-learning.service.ts`)

Ukladá ku každému leadu:
- Aký variant správy dostal (frázy, tón, link type)
- Čo sa stalo (otvoril link? vyplnil? konvertoval?)

Periodicky (raz za týždeň) analyzuje:
- Ktoré frázy majú najvyšší open rate
- Ktorý tone of voice konvertuje najlepšie
- Builder link vs booking link — čo funguje kde

Výstup vloží do promptu pre generovanie budúcich správ:
```
HISTORICKÉ DÁTA (použi na optimalizáciu tónu):
- Najúspešnejšie frázy: {top5Phrases}
- Frázy s nízkou konverziou: {bottom5Phrases}
- Odporúčaný tón: {bestTone}
- Builder link konverzia: {builderRate}%
- Booking link konverzia: {bookingRate}%
```

---

## 8. TRACKING MODULE

### 8.1 Tracking Controller (`tracking.controller.ts`)

- `GET /t/:ref` — redirect + tracking pixel. Zaznamená "link_opened", updatne heatScore +15
- `POST /api/tracking/event` — client-side eventy:
  - `form_started` (+20 heat)
  - `form_completed` (+20 heat)
  - `preview_viewed` (+10 heat)
  - `preview_time` (ak > 180s: +10 heat)
  - `preview_revisit` (+15 heat)

### 8.2 Client-side tracking snippet (`public/js/tracking.js`)

Vkladá sa do cloner public stránky a preview stránky:

```javascript
// Sleduje: page view, time on page, form interactions
// Posiela eventy na /api/tracking/event s ref kódom
// Heartbeat každých 30 sekúnd pre čas na stránke
```

### 8.3 Heat Score Updates → Telegram

Ak heat presiahne 70, okamžitá notifikácia (viď 7.11).

### 8.4 Lead Activity Timeline

Na web UI detail leadu — timeline všetkých aktivít:

```
📅 12.3.2026 14:32 — Lead vytvorený z FB skupiny "Podnikatelia SK"
📅 12.3.2026 14:33 — Notifikácia poslaná na Telegram
📅 12.3.2026 14:45 — Označený ako kontaktovaný
📅 12.3.2026 15:02 — Otvoril Builder link (heat: 25→40)
📅 12.3.2026 15:04 — Zadal URL vzorového webu (heat: 40→60)
📅 12.3.2026 15:06 — Vyplnil formulár (heat: 60→80)
📅 12.3.2026 15:08 — Preview vygenerovaný
📅 12.3.2026 15:08 — Pozerá preview (2 min 34s) (heat: 80→90)
📅 13.3.2026 09:15 — Vrátil sa na preview (heat: 90→100) 🔥
```

---

## 9. MODUL 2: GOOGLE CALENDAR BOOKING

### 9.1 Booking Controller

- `GET /api/booking/slots?days=14` — voľné sloty (Po-Pi, 9:00-17:00, 30min)
- `POST /api/booking` — `{ clientName, clientEmail, clientPhone?, dateTime, leadId? }`
- `GET /api/booking/:id`

### 9.2 Calendar Service

- Google Calendar API, rovnaký OAuth ako Gmail
- Event: "Konzultácia — {clientName}" + Meet link + invite

### 9.3 Web UI

**Verejná stránka (`/booking/public`):**
- Date picker, voľné sloty, formulár, potvrdenie s Meet linkom
- Ak `?ref=` parameter → prepoj s leadom

**Admin (`/booking/admin`):**
- Nadchádzajúce bookingy, možnosť zrušiť

### 9.4 Telegram

```
📅 *Nový booking*
👤 {clientName} | 📧 {clientEmail}
🕐 {dateTime} | 🔗 {meetLink}
{leadInfo ak existuje prepojenie}
```

---

## 10. MODUL 3: FIGMA-TO-CODE PIPELINE

### Používame Figma REST API, NIE MCP.

### 10.1 Flow

```
Grafik pošle Figma link cez Telegram (/design URL) alebo email
→ DB: DesignTask PENDING
→ Cron: každých 30 min
→ Figma API: file tree + CSS + screenshots
→ AI: generuj HTML/CSS
→ output/figma/{taskId}/index.html
→ Telegram notifikácia + web preview
```

### 10.2 Figma Service

- `GET /files/{file_key}?geometry=paths`
- `GET /images/{file_key}?ids={nodeIds}&format=png&scale=2`
- Auth: `X-Figma-Token: {FIGMA_ACCESS_TOKEN}`

URL parsing:
```typescript
// https://www.figma.com/design/ABC123/Name?node-id=12-34
// fileKey = "ABC123", nodeId = "12-34"
```

### 10.3 Design Descriptor

Konvertuj Figma properties → CSS:
- fills → background-color
- cornerRadius → border-radius
- effects[DROP_SHADOW] → box-shadow
- layoutMode → display: flex
- itemSpacing → gap
- TEXT styles → font-family, font-size, font-weight, color

### 10.4 AI Codegen

Pošli design descriptor JSON + screenshot na Claude API. Použi rovnaký vylepšený prompt ako AI Coder (Lucide Icons, Unsplash, bez emoji).

### 10.5 Email auto-detect

Gmail service: emaily s `figma.com/design` → automaticky vytvor DesignTask.

### 10.6 Telegram

```
/design {url}       /designs       /design_{id}       /design_retry_{id}
```

---

## 11. MODUL 4: WEB CLONER

### 11.1 Flow

```
Zákazník otvorí /cloner/public?ref={trackingRef}
→ Tracking: "link_opened"
→ Vyplní formulár
→ Tracking: "form_completed"
→ Puppeteer: screenshot + scrape HTML
→ AI: transformuj obsah
→ output/cloner/{id}/index.html (s tracking.js snippetom)
→ Telegram notifikácia ownerovi
→ Email zákazníkovi s preview linkom
```

### 11.2 Public Form (`/cloner/public`)

Polia: URL vzorového webu, oblasť podnikania, názov firmy, email, služby/produkty, telefón (opt), ďalšie info (opt).

### 11.3 Cloner Service

**Scraping:** Puppeteer headless, viewport 1440x900, full page screenshot, page HTML, text content.

**AI prompt:**
```
System: Si expert web developer a copywriter.
Vytvor NOVÚ webstránku s ROVNAKÝM layoutom a štýlom ako vzor,
ale KOMPLETNE novým obsahom pre zákazníkov biznis.
Pre ikony použi Lucide Icons. Pre obrázky Unsplash.
Texty v slovenčine. JEDEN kompletný HTML súbor.
```

### 11.4 Preview s trackingom

Vygenerovaný HTML obsahuje tracking.js snippet, ktorý sleduje čas na stránke a posiela na `/api/tracking/event`.

---

## 12. KANBAN BOARD (Web UI)

Na `/leads` — vizuálny kanban:

```
NOVÝ → KONTAKTOVANÝ → ODPOVEDAL → KVALIFIKOVANÝ → KONVERTOVANÝ
```

- Drag & drop medzi stĺpcami (vanilla JS)
- Každá karta: meno, trust %, heat score, obrat, kategória
- Klik → detail leadu s celou timeline
- Filtre: dátum, kategória, trust range

---

## 13. DASHBOARD (`/`)

- Leady dnes: nové / kontaktované / hot
- Nasledujúci booking
- Posledný AI Coder task
- Pending design tasky a clone requesty
- Quick action linky
- Mini graf konverzií za posledný týždeň

---

## 14. TELEGRAM — KOMPLETNÉ PRÍKAZY

```
=== LEADS ===
/leads              — posledných 10 leadov
/lead_{id}          — detail
/status_{id}_{S}    — zmeň status
/stats              — štatistiky
/blacklist {meno}   — pridaj na blacklist
/whitelist          — zobraz blacklist
/unblacklist {id}   — odstráň

=== BOOKING ===
/bookings           — nadchádzajúce
/booking_{id}       — detail

=== AI CODER ===
/code {prompt}      — coding úloha
/review {code}      — review
/explain {code}     — vysvetli
/coder_history      — posledných 10

=== FIGMA ===
/design {url}       — nový design task
/designs            — zoznam
/design_{id}        — detail
/design_retry_{id}  — retry

=== WEB CLONER ===
/clones             — zoznam
/clone_{id}         — detail
/clone_retry_{id}   — retry

=== SYSTEM ===
/help               — tento zoznam
/start              — uvítacia správa
```

Všetky lead-related správy majú inline klávesnicu (grammy InlineKeyboard).

---

## 15. ENVIRONMENT VARIABLES

```env
# ===== APP =====
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
ADMIN_PASSWORD=your_admin_password

# ===== DATABASE =====
DATABASE_URL=postgresql://postgres:password@localhost:5432/synapse_system

# ===== TELEGRAM =====
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_OWNER_CHAT_ID=your_telegram_chat_id

# ===== GMAIL & GOOGLE =====
GMAIL_CLIENT_ID=your_google_oauth_client_id
GMAIL_CLIENT_SECRET=your_google_oauth_client_secret
GMAIL_REFRESH_TOKEN=your_google_refresh_token
GMAIL_USER_EMAIL=your_email@gmail.com
GOOGLE_CALENDAR_ID=primary

# ===== ANTHROPIC =====
ANTHROPIC_API_KEY=your_anthropic_api_key

# ===== FIGMA =====
FIGMA_ACCESS_TOKEN=your_figma_personal_access_token

# ===== UNSPLASH =====
UNSPLASH_ACCESS_KEY=your_unsplash_access_key

# ===== GITHUB + VERCEL (pre AI Coder) =====
GITHUB_TOKEN=your_github_token
GITHUB_USERNAME=JanciNeviemProste
VERCEL_TOKEN=your_vercel_token

# ===== CRON =====
LEAD_CRON_INTERVAL=*/5 * * * *
FIGMA_CRON_INTERVAL=*/30 * * * *
LEAD_MIN_CONFIDENCE=0.5
```

---

## 16. IMPLEMENTAČNÉ PORADIE (STRIKTNÉ)

```
KROK 0: AUDIT AI CODERA
  0.1  Prečítaj ./aicoder/ — celý obsah
  0.2  Napíš audit zhrnutie

KROK 1: SCAFFOLD
  1.1  pnpm init, NestJS scaffold
  1.2  Prisma setup + kompletná schema
  1.3  Config module, Database module
  1.4  EJS + Tailwind CDN setup
  1.5  Base layout (views/layouts/main.ejs)
  1.6  Telegram module (bot, /start, /help)
  1.7  AI module (Claude API wrapper)

KROK 2: AI CODER
  2.1  Oprav a presun do src/coder/
  2.2  coder.service + controller + codespaces.service
  2.3  Web UI: coder/index.ejs + history.ejs
  2.4  Telegram commands
  2.5  Vylepšený system prompt (Lucide + Unsplash)

KROK 3: FB LEAD ASSISTANT
  3.1  Gmail module (OAuth, fetch, mark read)
  3.2  Gmail parser (FB notifications)
  3.3  Research module (Google, ORSR, Finstat, web analyzer)
  3.4  Trust score service
  3.5  AI relevance check + response generation
  3.6  AI learning service (A/B tracking)
  3.7  Cenový odhad
  3.8  Leads service + controller + cron
  3.9  3x Telegram správy s inline klávesnicou
  3.10 Tracking module (controller + service + heat score)
  3.11 Follow-up cron (10 min + 24h)
  3.12 Denný súhrn cron (20:00)
  3.13 Týždenný report cron (pondelok 8:00)
  3.14 Optimal timing recommendations
  3.15 Blacklist/Whitelist
  3.16 Web UI: leads/index.ejs (kanban) + detail.ejs + stats.ejs

KROK 4: BOOKING
  4.1  Calendar service
  4.2  Booking service + controller
  4.3  Web UI: booking/public.ejs + admin.ejs
  4.4  Telegram commands + notifikácie

KROK 5: FIGMA PIPELINE
  5.1  Figma service (REST API)
  5.2  Figma codegen service
  5.3  Figma cron
  5.4  Web UI + Telegram commands
  5.5  Gmail auto-detect

KROK 6: WEB CLONER
  6.1  Puppeteer scraping
  6.2  Cloner service + controller
  6.3  Web UI: public + admin + preview
  6.4  Tracking integration
  6.5  Telegram commands

KROK 7: POLISH
  7.1  Dashboard (views/dashboard.ejs)
  7.2  Global exception filter
  7.3  NestJS Logger všade
  7.4  README.md
  7.5  .env.example finalizácia
```

---

## 17. KVALITA KÓDU

- ✅ TypeScript strict, NestJS Logger, class-validator, try/catch
- ❌ Žiadne TODO, žiadne testy (zatiaľ), žiadny Docker/Redis/Python
- ❌ Žiadne emoji ikony na generovaných weboch
- ❌ Žiadne dummy implementácie

---

## 18. SPUSTENIE

```bash
pnpm install
npx puppeteer browsers install chrome
pnpm prisma generate
pnpm prisma db push
cp .env.example .env   # vyplň hodnoty
pnpm run start:dev
```

---

**ZAČNI KROKOM 0. NEPÝTAJ SA. IMPLEMENTUJ.**
