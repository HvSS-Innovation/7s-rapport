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

## v0.3.1 — 2026-05-12 — Mindre städning
- Tagit bort 1227-tabell-rutan i RAMSOR-fliken. Den var bara en intro-platshållare utan riktigt innehåll. Full 1227-tabell ligger kvar i roadmap-data.js under "Kommer snart" och läggs in när tabellen är komplett.

## v0.3 — 2026-05-12 — In-app roadmap (Paket C)
- Ny sida `roadmap.html` länkad från footer-Om ("ROADMAP & ÖNSKEMÅL")
- 4 kolumner (Önskat / Kommer snart / Pågår / Klart), responsiv 4→2→1 kolumns
- `roadmap-data.js` manuellt uppdaterad datakälla, 8 startitems (3 Klart inkl. v0.1/v0.2/v0.3, 1 Pågår, 2 Kommer snart, 2 Önskat)
- "Önska en funktion"-knapp återanvänder feedback-länkens GitHub-template med `[Roadmap-önskan]`-prefix
- Service worker `CACHE` bump + `roadmap.html` & `roadmap-data.js` i FILES

**Mindre avvikelse:** "Önska funktion"-knappen länkar till samma GitHub Issues-flöde som befintliga feedback-knappen istället för en helt separat kanal. Konsekvent med existerande mönster, undviker duplicering. Användare som vill nå utvecklaren utan GitHub kan göra det via samma kanaler som tidigare.
