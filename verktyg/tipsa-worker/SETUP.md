# Tipsa-Worker — setup

En Cloudflare Worker som driver två hemliga sidor på 7srapport.com:

- [`tipsa.html`](../../tipsa.html) — formulär för utvalda att lämna förslag
  (skapar GitHub Issue automatiskt, mottagaren behöver inget GitHub-konto)
- [`tavla.html`](../../tavla.html) — privat kanban för utvalda att se och
  flytta items mellan kolumnerna **Önskat / Kommer snart / Pågår / Klart**

Båda sidorna pratar med samma Worker via samma `FORM_SECRET`.

Du sätter upp det här en gång. Sen rullar det.

## Vad du har innan vi börjar

- Cloudflare-konto (du har redan — du har en R2-bucket för pmtiles)
- 5–10 minuter

## Steg 1: GitHub Personal Access Token (PAT)

Tokenen ger Workern rätt att skapa Issues i ditt repo.

1. Logga in på GitHub.
2. Klicka på din profilbild (uppe till höger) → **Settings**.
3. I vänstermenyn längst ner: **Developer settings**.
4. **Personal access tokens** → **Tokens (classic)** → **Generate new
   token (classic)**.
5. Fyll i:
   - **Note:** `7srapport-tipsa-worker`
   - **Expiration:** välj något du står ut med — t.ex. 90 dagar eller
     "No expiration" om du orkar rotera manuellt
   - **Select scopes:** kryssa i hela **`repo`**-blocket
6. Klicka **Generate token** längst ner.
7. **Kopiera tokenen direkt** — du ser den bara en gång. Klistra in
   den nånstans säkert tillfälligt (typ en notepad-flik). Vi använder
   den i steg 3.

## Steg 2: Skapa Workern i Cloudflare

### Snabba vägen (via dashboard)

1. Logga in på Cloudflare dashboard.
2. Vänstermenyn: **Workers & Pages** → **Create application** →
   **Create Worker**.
3. Namnge den, t.ex. `tipsa-7srapport`. Behåll default-domänen
   (`*.workers.dev`) eller koppla en egen subdomän senare — spelar
   ingen roll för funktionen.
4. Klicka **Deploy** (den deployar en hello-world först).
5. Klicka **Edit code**.
6. Ta bort default-koden.
7. Öppna `tipsa-worker.js` (i samma mapp som denna SETUP.md), kopiera
   hela innehållet och klistra in.
8. Klicka **Save and deploy**.

### Wrangler-vägen (om du har wrangler installerat)

```bash
cd verktyg/tipsa-worker
npx wrangler deploy
```

(Behöver `npm install -g wrangler` och `wrangler login` första gången.)

## Steg 3: Konfigurera secrets och variabler

Tillbaka i Worker-vyn på Cloudflare:

1. Klicka på Workerns namn → **Settings** → **Variables and Secrets**.
2. Under **Environment Variables**:
   - Klicka **Add variable** två gånger:
     - **Variable name:** `ALLOWED_ORIGIN` · **Value:** `https://7srapport.com`
     - **Variable name:** `GITHUB_REPO` · **Value:** `gitjoda71/7s-rapport`
3. Under **Secrets** (separat sektion, ofta längst ner):
   - Klicka **Add secret** två (eller tre) gånger:
     - **Secret name:** `GITHUB_TOKEN` · **Value:** tokenen du kopierade
       i steg 1
     - **Secret name:** `ACCESS_PIN` · **Value:** den åtkomstkod som
       utvalda mottagare ska mata in i pin-wallen på `tipsa.html` /
       `tavla.html`. Välj något lätt att uttala/skriva (t.ex.
       `gron-mossa-77` eller en passphrase). **Kopiera värdet** — vi
       delar den med utvalda i steg 7.
     - **Secret name:** `FORM_SECRET` (valfri, för bakåtkompat med v0.4)
       — kan utelämnas om du börjar från v0.6.
4. Klicka **Save and deploy**.

## Steg 4: Hitta Workerns URL

I Worker-vyn ser du URL:en under namnet, t.ex.
`https://tipsa-7srapport.dittanvändarnamn.workers.dev`. Kopiera den.

## Steg 5: Verifiera Worker-URL i tipsa.html och tavla.html

Sedan v0.6 har sidorna **ingen hardcoded pin/secret** — användaren matar
in `ACCESS_PIN` i pin-wallen och den lagras bara i sessionStorage. Bara
Worker-URL behöver vara rätt:

```javascript
const WORKER_URL = 'https://dawn-star-7fc5.nijoda.workers.dev';
```

Om din Worker har en annan URL: öppna [`tipsa.html`](../../tipsa.html)
och [`tavla.html`](../../tavla.html), byt `WORKER_URL`, committa och
pusha:

```bash
git add tipsa.html tavla.html
git commit -m "Uppdatera Worker-URL"
git push
```

## Steg 7: Dela ACCESS_PIN med utvalda mottagare

Skicka koden via en privat kanal (Signal, telefon, papper) till de
personer som ska få använda `tipsa.html` och `tavla.html`. Skicka inte
i öppna kanaler som loggas/arkiveras.

Användaren öppnar sidan → ser pin-wall → matar in koden → får tillgång
under sessionen (tills hen stänger browser-fliken).

**Rotera koden:** ändra `ACCESS_PIN`-secreten i Cloudflare när du vill.
Inga commits eller deploys av sidan behövs — bara den nya pinen delas.

## Steg 6: Testa

**Tipsa-sidan:**
1. Öppna `https://7srapport.com/tipsa.html` i en browser.
2. Fyll i rubrik och beskrivning.
3. Klicka **Skicka tipset**.
4. Du bör se "Tack! Tipset är registrerat (ärende #N)".
5. Gå till repot på GitHub → Issues. Du ska se en ny issue med titel
   `[Tipsa] [...] ...` och labels `tipsa` + `kat:...`.

**Tavlan:**
1. Öppna `https://7srapport.com/tavla.html`.
2. Du bör se 4 kolumner — Önskat / Kommer snart / Pågår / Klart — med
   alla öppna och senaste closed Issues fördelade.
3. Klicka på ett item → modal med detaljer + flytta-knappar.
4. Klicka **Pågår** (t.ex.) → bekräfta → item flyttas både i UI:t och i
   GitHub (label `status:inprogress` läggs på Issuen automatiskt).

## Kanban-kolumner och GitHub status-labels

Tavlan mappar GitHub Issues till kolumner enligt regler:

| Kolumn        | Mappning                                            |
|---------------|-----------------------------------------------------|
| Önskat        | Öppen Issue utan `status:*`-label (eller med `status:wished`) |
| Kommer snart  | Öppen Issue med label `status:soon`                 |
| Pågår         | Öppen Issue med label `status:inprogress`           |
| Klart         | **Closed** Issue (oavsett labels)                   |

Workern hanterar att skapa/ta bort `status:*`-labels och öppna/stänga
issues när du klickar "Flytta" på tavlan. **Du behöver inte skapa
labels manuellt i GitHub** — Workern lägger till dem första gången de
behövs.

Pull-requests filtreras bort automatiskt — tavlan visar bara Issues.

## Säkerhet

Workern släpper bara igenom requests som:

- Kommer från `ALLOWED_ORIGIN` (https://7srapport.com)
- Innehåller rätt `FORM_SECRET` i payloaden
- Är gilta POST med JSON och har rubrik + beskrivning

Cloudflare har också automatisk rate-limiting och DDoS-skydd på
Worker-anrop. Free-tier ger 100 000 requests/dag — gott för det här.

**Om du får spam:**

1. Byt `FORM_SECRET` (både i Worker-secrets och i `tipsa.html`).
2. Committa och pusha den nya `tipsa.html`.
3. Befintliga länkar slutar fungera direkt — användarna måste få nya
   länkar med uppdaterad sida.

## Rotera token

GitHub-tokenen tar slut efter 90 dagar (eller den expiration du valde).
När den gör det:

1. Skapa ny token enligt steg 1.
2. Gå till Worker → Settings → Variables and Secrets.
3. Hitta `GITHUB_TOKEN`-secreten, klicka **Edit** (eller radera och
   skapa ny).
4. Klistra in nya värdet, klicka Save.

Inga commits behövs — tokenen ligger bara i Workern.

## Avveckla

Om du vill stänga av:

- **Tillfälligt:** pausa Workern i Cloudflare-UI:t. `tipsa.html`
  fortsätter visa "Kunde inte skicka" tills du sätter på igen.
- **Permanent:** radera Workern och radera `tipsa.html` ur repot.

## Felsökning

| Symptom | Trolig orsak | Fix |
|---|---|---|
| "Origin ej tillåten" (403) | `ALLOWED_ORIGIN` matchar inte | Kontrollera att den är satt till exakt `https://7srapport.com` (utan slash på slutet). |
| "Ogiltig token" (403) | `FORM_SECRET` i `tipsa.html` matchar inte värdet i Worker | Verifiera att de är identiska teckenexakt. Inga citationstecken inkluderade. |
| "GitHub API-fel (401)" | `GITHUB_TOKEN` är ogiltig/utgången | Skapa ny i GitHub, uppdatera i Worker. |
| "GitHub API-fel (404)" | `GITHUB_REPO` är fel eller token saknar `repo`-scope | Verifiera `GITHUB_REPO`-värdet och tokenens scopes. |
| "Sidan är inte fullt konfigurerad" | Placeholder kvar i `tipsa.html` | Du har inte fyllt i Worker-URL och FORM_SECRET (steg 5). |

## Filöversikt

```
verktyg/tipsa-worker/
├── tipsa-worker.js   ← Worker-koden (klistra in i Cloudflare)
├── wrangler.toml     ← om du deployar via wrangler CLI
└── SETUP.md          ← detta dokument
```

Hemliga sidor:
```
/tipsa.html           ← formulär för att lämna förslag — dela ut URL:en manuellt
/tavla.html           ← privat kanban — dela ut URL:en manuellt
```

## Uppdatera Workern senare

Om Worker-koden uppdateras i repot (`verktyg/tipsa-worker/tipsa-worker.js`)
deployas det **inte automatiskt** till Cloudflare — det är två separata
världar.

För att rulla ut ny Worker-kod:

1. Öppna ny version av `tipsa-worker.js` i Antigravity, kopiera allt.
2. Cloudflare dashboard → Workers & Pages → din Worker → **Edit code**.
3. Markera allt i editorn, klistra in nya koden.
4. Klicka **Save and deploy**.

Secrets och variabler ligger kvar — du behöver inte sätta om dem.
