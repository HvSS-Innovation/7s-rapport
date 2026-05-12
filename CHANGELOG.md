# CHANGELOG

Kort milstolpslogg för utvecklingscykeln **Positionering / Ramsor / In-app roadmap**.
Detaljerade beskrivningar finns i README-dagboken.

## v0.1 — 2026-05-12 — Positionering & Mina data
- Disclaimer i `footer.js` (sprids till alla 14+ formulär) + synlig på `index.html` + i README
- README-sweep: "för Hemvärnet" → "riktat till hemvärnssoldater" där det kan antyda officiell anknytning
- Ny sida `data.html` med "Var ligger mina data?", plattformsmatris, JSON-export/import (localStorage + IndexedDB), källkod-vs-data-separation
- iOS-ITP-engångsnotis efter >5 dagars inaktivitet (länk till `data.html` för säkerhetskopia)
- Service worker `CACHE` bump → `hv-20260512_v01_disclaimer`, `data.html` i FILES

## v0.2 — 2026-05-12 — Ramsor-flik (Paket A)
- Ny tab `ramsor.html` med roll-vald vy (Sjv / Sig / GrpC / PlutC / Förare), sök, "Övriga ramsor"-expander
- `ramsor-data.js` med 8 ramsor: Sjv (METHANE, SAFE, C-ABCDE, MIST, 9-LINE MEDEVAC) + Sig (Talgruppsbyte, RA 1444-handhavande, 1227-tabell)
- Deskriptiva grå kategoritaggar (Sjukvård, Signalist, Internationellt, Generellt, Materiel, Referens) — ingen auktoritets-signal
- RAMSOR-tab tillagd i tab-nav-sub på 19 sidor
- Språk-sweep matt.html: "Försvarsmakten · Västra militärregionen" → "hjälpverktyg"
- Service worker `CACHE` bump + `ramsor.html` & `ramsor-data.js` i FILES

**Avvikelse från roadmap:** GrpC + PlutC levereras som placeholders i v0.2 istället för fyllt innehåll. Skäl: utan synlig SoldF-källa i UI och utan säker FM-publikation att luta sig på är felaktighetsrisken större än värdet av snabb leverans. Innehåll fylls på i v0.2.x när säkra referenser verifierats. TOS lämnad helt tills användaren preciserar.

## v0.8.1 — 2026-05-12 — Drop var som helst i kolumnen
- Drop på tom yta i en kolumn (under sista item) placerar nu kortet sist
- Refaktor: ny `commitReorder()` delas mellan `dropOnItem` och `dropAtEnd`
- Drop fungerar både för reorder inom kolumn och flytt mellan kolumner via tom yta
- Ingen Worker- eller Cloudflare-action behövs

## v0.8 — 2026-05-12 — Reorder inom kolumn + FLIP-animation
- Drop på item-nivå: drag kan landa `before` eller `after` ett specifikt item baserat på muspos
- Visuell drop-indikator (accentfärgad streck) ovanför/under target-itemet
- Manuell prio-ordning persisterad i Cloudflare KV (namespace bunden som `KANBAN_KV`)
- Ny Worker-endpoint `POST /reorder { column, orderedNumbers }`
- `GET /issues` berikar items med `position`-fält från KV — frontend sorterar efter den
- FLIP-animation i render(): items mäts före/efter rebuild, glider på plats med CSS-transition
- Optimistic UI med rollback vid fel + load()-fallback

**Kräver manuell action av Joel:** skapa Cloudflare KV-namespace + binda som `KANBAN_KV` till Workern + re-deploya Worker. Detaljerade steg i `verktyg/tipsa-worker/SETUP.md` (Steg 8).

## v0.7 — 2026-05-12 — Drag-and-drop på kanban-tavlan
- HTML5 Drag-and-Drop på items i tavla.html (desktop)
- Optimistic UI: item flyttas direkt vid drop, server-anrop i bakgrunden, rollback vid fel
- Visuell feedback: dragging-state (opacity 0.4) + drop-zone highlight (streckad accent)
- Refaktor: ny `executeMove()` är delad kärnlogik för modal-knapp-flytt och drag-drop
- Modal/knapp-flytt kvar som alternativ + fallback för touch (touch-stöd kommer i v0.8)
- Ingen Worker-ändring, ingen deploy-action — befintlig `POST /move` används

## v0.6 — 2026-05-12 — Pin-spärr (ACCESS_PIN) på tipsa.html och tavla.html
- Ny Worker-endpoint `POST /auth` — testar pin utan side-effects
- Ny secret `ACCESS_PIN` i Workern — primär kod, ersätter `FORM_SECRET` (som blir bakåtkompat-fallback)
- Pin-wall i tipsa.html + tavla.html — sidans innehåll döljs tills pin matas in. Pin lagras i sessionStorage (försvinner vid stängd flik).
- FORM_SECRET borttagen ur sidornas hardcoded kod — användaren matar in pin, ingen hemlighet i källkoden
- Rotering: byt `ACCESS_PIN`-secret i Cloudflare när som helst utan deploy av sidan

**Kräver manuell action av Joel:** sätt `ACCESS_PIN`-secret i Cloudflare + re-deploya Workern + dela koden med utvalda mottagare via privat kanal.

## v0.5 — 2026-05-12 — Privat kanban-tavla via samma Worker
- Ny hemlig sida `tavla.html` — kanban med 4 kolumner (Önskat / Kommer snart / Pågår / Klart), klickbara items med flytta-knappar
- Worker utökad med `GET /issues` (lista) och `POST /move` (flytta mellan kolumner). Mappning via `status:*`-labels + open/closed-state.
- Worker skapar labels automatiskt — inga manuella labels behövs i GitHub
- PR:s filtreras bort, bara Issues visas
- SETUP.md uppdaterad med kanban-instruktioner + re-deploy-guide

**Kräver manuell action av Joel:** re-deploya Workern i Cloudflare med nya `tipsa-worker.js` + uppdatera `tavla.html` med samma WORKER_URL + FORM_SECRET som tipsa.html.

## v0.4 — 2026-05-12 — Privat tipsa-ingång via Cloudflare Worker
- Ny hemlig sida `tipsa.html` — ej länkad från någon annan del av appen, märkt `noindex,nofollow`
- Formuläret POSTar till en Cloudflare Worker som skapar GitHub Issue automatiskt (användaren behöver inget GitHub-konto, ingen e-postklient)
- Worker-kod, wrangler.toml och SETUP.md i `verktyg/tipsa-worker/`
- Workern kräver engångs-config (GitHub PAT, FORM_SECRET, ALLOWED_ORIGIN, GITHUB_REPO) — full guide i SETUP.md
- `tipsa.html` ingår inte i service workerns FILES — sidan ska inte seedas i alla användares enheter

## v0.3.1 — 2026-05-12 — Mindre städning
- Tagit bort 1227-tabell-rutan i RAMSOR-fliken. Den var bara en intro-platshållare utan riktigt innehåll. Full 1227-tabell ligger kvar i roadmap-data.js under "Kommer snart" och läggs in när tabellen är komplett.

## v0.3 — 2026-05-12 — In-app roadmap (Paket C)
- Ny sida `roadmap.html` länkad från footer-Om ("ROADMAP & ÖNSKEMÅL")
- 4 kolumner (Önskat / Kommer snart / Pågår / Klart), responsiv 4→2→1 kolumns
- `roadmap-data.js` manuellt uppdaterad datakälla, 8 startitems (3 Klart inkl. v0.1/v0.2/v0.3, 1 Pågår, 2 Kommer snart, 2 Önskat)
- "Önska en funktion"-knapp återanvänder feedback-länkens GitHub-template med `[Roadmap-önskan]`-prefix
- Service worker `CACHE` bump + `roadmap.html` & `roadmap-data.js` i FILES

**Mindre avvikelse:** "Önska funktion"-knappen länkar till samma GitHub Issues-flöde som befintliga feedback-knappen istället för en helt separat kanal. Konsekvent med existerande mönster, undviker duplicering. Användare som vill nå utvecklaren utan GitHub kan göra det via samma kanaler som tidigare.
