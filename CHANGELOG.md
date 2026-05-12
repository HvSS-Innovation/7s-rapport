# CHANGELOG

Kort milstolpslogg för utvecklingscykeln **Positionering / Ramsor / In-app roadmap**.
Detaljerade beskrivningar finns i README-dagboken.

## v0.1 — 2026-05-12 — Positionering & Mina data
- Disclaimer i `footer.js` (sprids till alla 14+ formulär) + synlig på `index.html` + i README
- README-sweep: "för Hemvärnet" → "riktat till hemvärnssoldater" där det kan antyda officiell anknytning
- Ny sida `data.html` med "Var ligger mina data?", plattformsmatris, JSON-export/import (localStorage + IndexedDB), källkod-vs-data-separation
- iOS-ITP-engångsnotis efter >5 dagars inaktivitet (länk till `data.html` för säkerhetskopia)
- Service worker `CACHE` bump → `hv-20260512_v01_disclaimer`, `data.html` i FILES

## v0.2 — Planerad — Ramsor-flik (Paket A)
- Ny tab `ramsor.html` med roll-vald vy (GrpC / PlutC / Sjv / Sig / Förare)
- Deskriptiva grå taggar (kategori) — ingen auktoritets-signal
- Innehåll: Sjv (METHANE/SAFE/CABCDE), Sig (1227/RA1444/talgrupp), GrpC/PlutC minneskort
- TOS + Förare som `[Avvaktar specifikation]`-placeholders

## v0.3 — Planerad — In-app roadmap (Paket C)
- `roadmap.html` med 4 kolumner: Önskat / Kommer snart / Pågår / Klart
- "Önska funktion"-knapp (mailto eller Signal-länk)
