# SYNAPSE SYSTEM — Setup Guide & Copy-Paste Commands

---

## PRÍKAZY NA SPUSTENIE CLAUDE CODE

### 1. Vytvor projekt

```powershell
mkdir C:\projects\synapse-system
cd C:\projects\synapse-system
```

### 2. Skopíruj existujúceho AI Codera

```powershell
mkdir aicoder
```

Skopíruj celý kód tvojho existujúceho AI Codera do priečinka `aicoder/`.

### 3. Ulož brief

Stiahni súbor `SYNAPSE-SYSTEM-FINAL.md` a ulož ho do `C:\projects\synapse-system\`.

### 4. Spusti Claude Code

```powershell
claude --model claude-opus-4-6 --dangerously-skip-permissions
```

### 5. Prvá správa (copy-paste)

```
Prečítaj súbor SYNAPSE-SYSTEM-FINAL.md v tomto priečinku. Je to kompletný implementačný brief pre Synapse System. Začni KROKOM 0 — prečítaj a zaudituj kód v priečinku ./aicoder/. Potom pokračuj podľa briefu krok za krokom. Na konci každého kroku napíš krátke zhrnutie.
```

---

## NASTAVENIE API KĽÚČOV (krok za krokom)

---

### 1. TELEGRAM BOT

1. Otvor Telegram, nájdi @BotFather
2. Napíš `/newbot`
3. Zadaj meno bota (napr. "Synapse System")
4. Zadaj username (napr. `synapse_system_bot`)
5. Dostaneš **BOT TOKEN** — ulož si ho
6. Otvor chat s tvojím novým botom a napíš `/start`
7. Otvor v prehliadači: `https://api.telegram.org/bot{TOKEN}/getUpdates`
8. Nájdi `"chat":{"id":123456789}` — toto je tvoj **CHAT ID**

```env
TELEGRAM_BOT_TOKEN=token_z_botfather
TELEGRAM_OWNER_CHAT_ID=tvoj_chat_id
```

---

### 2. GMAIL + GOOGLE CALENDAR (OAuth)

1. Choď na https://console.cloud.google.com/
2. Vytvor nový projekt (napr. "Synapse System")
3. Choď do **APIs & Services → Library**
4. Zapni tieto API:
   - Gmail API
   - Google Calendar API
5. Choď do **APIs & Services → Credentials**
6. Klikni **Create Credentials → OAuth client ID**
7. Application type: **Web application**
8. Authorized redirect URIs: `https://developers.google.com/oauthplayground`
9. Ulož si **Client ID** a **Client Secret**
10. Choď na https://developers.google.com/oauthplayground/
11. Klikni ozubené koliesko vpravo hore → zaškrtni "Use your own OAuth credentials"
12. Vlož Client ID a Client Secret
13. V ľavom paneli nájdi a zaškrtni:
    - `https://mail.google.com/`
    - `https://www.googleapis.com/auth/calendar`
    - `https://www.googleapis.com/auth/calendar.events`
14. Klikni **Authorize APIs** → prihláš sa Google účtom
15. Klikni **Exchange authorization code for tokens**
16. Ulož si **Refresh Token**

```env
GMAIL_CLIENT_ID=tvoj_client_id
GMAIL_CLIENT_SECRET=tvoj_client_secret
GMAIL_REFRESH_TOKEN=tvoj_refresh_token
GMAIL_USER_EMAIL=tvoj_gmail@gmail.com
GOOGLE_CALENDAR_ID=primary
```

---

### 3. ANTHROPIC API KEY

1. Choď na https://console.anthropic.com/
2. Prihláš sa (máš Max 5x plán)
3. Choď do **Settings → API Keys**
4. Klikni **Create Key**
5. Pomenuj: "Synapse System"
6. Ulož si kľúč

```env
ANTHROPIC_API_KEY=sk-ant-...
```

**POZOR:** API calls sú platené zvlášť od Max plánu. Sonnet 4.6 stojí ~$3/mil input tokenov. Na 50 leadov/deň to je ~15-45€/mesiac.

---

### 4. FIGMA ACCESS TOKEN

1. Otvor https://www.figma.com/
2. Klikni na svoj avatar vľavo hore → **Settings**
3. Scrollni na **Personal access tokens**
4. Klikni **Generate new token**
5. Pomenuj: "Synapse System"
6. Ulož si token

```env
FIGMA_ACCESS_TOKEN=figd_...
```

**Zadarmo** — nepotrebuješ platený plán. Grafik ti musí zdieľať súbor s View prístupom (tiež zadarmo).

---

### 5. UNSPLASH API KEY

1. Choď na https://unsplash.com/developers
2. Klikni **Register as a developer**
3. Vytvor novú aplikáciu
4. Pomenuj: "Synapse System"
5. Ulož si **Access Key**

```env
UNSPLASH_ACCESS_KEY=tvoj_access_key
```

**Zadarmo** — 50 requestov/hodinu (demo), 5000/hodinu (production po schválení).

---

### 6. GITHUB TOKEN

1. Choď na https://github.com/settings/tokens
2. Klikni **Generate new token (classic)**
3. Zaškrtni: `repo`, `workflow`
4. Pomenuj: "Synapse System"
5. Ulož si token

```env
GITHUB_TOKEN=ghp_...
GITHUB_USERNAME=JanciNeviemProste
```

---

### 7. VERCEL TOKEN

1. Choď na https://vercel.com/account/tokens
2. Klikni **Create**
3. Pomenuj: "Synapse System"
4. Ulož si token

```env
VERCEL_TOKEN=tvoj_vercel_token
```

---

### 8. POSTGRESQL

**Lokálne (Windows):**

1. Stiahni PostgreSQL z https://www.postgresql.org/download/windows/
2. Nainštaluj (zapamätaj si heslo pre user `postgres`)
3. Otvor pgAdmin alebo terminál:

```sql
CREATE DATABASE synapse_system;
```

```env
DATABASE_URL=postgresql://postgres:tvoje_heslo@localhost:5432/synapse_system
```

**Alternatíva (cloud DB):**

Ak nechceš inštalovať PostgreSQL lokálne, použi Supabase (free tier):
1. https://supabase.com/ → New Project
2. Skopíruj connection string z Settings → Database

```env
DATABASE_URL=postgresql://postgres:heslo@db.xxx.supabase.co:5432/postgres
```

---

## KOMPLETNÝ .env SÚBOR

Po nastavení všetkých API kľúčov vyplň `.env`:

```env
# APP
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
ADMIN_PASSWORD=tvoje_admin_heslo

# DATABASE
DATABASE_URL=postgresql://postgres:heslo@localhost:5432/synapse_system

# TELEGRAM
TELEGRAM_BOT_TOKEN=123456:ABC-xxx
TELEGRAM_OWNER_CHAT_ID=987654321

# GMAIL & GOOGLE
GMAIL_CLIENT_ID=xxx.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=GOCSPX-xxx
GMAIL_REFRESH_TOKEN=1//xxx
GMAIL_USER_EMAIL=tvoj@gmail.com
GOOGLE_CALENDAR_ID=primary

# ANTHROPIC
ANTHROPIC_API_KEY=sk-ant-xxx

# FIGMA
FIGMA_ACCESS_TOKEN=figd_xxx

# UNSPLASH
UNSPLASH_ACCESS_KEY=xxx

# GITHUB + VERCEL
GITHUB_TOKEN=ghp_xxx
GITHUB_USERNAME=JanciNeviemProste
VERCEL_TOKEN=xxx

# CRON
LEAD_CRON_INTERVAL=*/5 * * * *
FIGMA_CRON_INTERVAL=*/30 * * * *
LEAD_MIN_CONFIDENCE=0.5
```

---

## SPUSTENIE

```bash
pnpm install
npx puppeteer browsers install chrome
pnpm prisma generate
pnpm prisma db push
pnpm run start:dev
```

---

## OVERENIE ŽE FUNGUJE

1. Otvor http://localhost:3000 → Dashboard
2. Napíš botovi na Telegrame `/start` → odpovie
3. Napíš `/help` → zoznam príkazov
4. Napíš `/code Vytvor Hello World v HTML` → otestuje AI Codera
5. Počkaj 5 minút → ak máš FB notifikácie v Gmaile, prídu leady
6. Otvor http://localhost:3000/booking/public → booking stránka
7. Otvor http://localhost:3000/cloner/public → web cloner formulár
