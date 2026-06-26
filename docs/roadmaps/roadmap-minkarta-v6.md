# MINKARTA v6 – Roadmap: Sökrutans MGRS-bugg

Bakgrund: Användaren skrev "33VXF 69104 80045" (Sverige, band V = 56–64°N)
och kartan hoppade till Centralafrika ("33NVH 06031 61648", band N = ekvator).
Rotorsak: `MGRS.inverse` i `minkarta.html` hanterar inte latitudbandet — den
deklarerar `minNorth` men använder den aldrig. MGRS-radbokstäver upprepas var
2 000 000:e meter, så northing måste justeras med N×2M där N väljs så att
resulterande lat hamnar i bandets giltiga intervall.

---

## Fas 1 — Fixa MGRS-inverse band-justering

### Mål
"33VXF 69104 80045" → kartan hoppar till mellan-Sverige (band V, ~60°N),
inte Kamerun. Alla 20 latitudband (C–X) ska fungera på södra OCH norra
halvklotet.

### Filer
- `minkarta.html` (`MGRS.inverse`, ca rad 474)

### Steg
1. Bryt isär den enradiga `inverse`-funktionen i läsbara block med
   namngivna variabler. Behåll algoritmen identisk, bara formattera om.
2. Lägg till intern hjälpare `bandLatRange(bandLetter)` som returnerar
   `{minLat, maxLat}` (band X spänner 72–84, övriga 8°).
3. Iterera N=0..4: för varje N, beräkna `northingTry = rawN + N*2_000_000`,
   kör resten av inversen, och välj första N där resulterande lat ligger
   i [bandMinLat - tolerans, bandMaxLat + tolerans]. Om ingen träffar,
   returnera `null` (sökrutan flashar redan rött i `handleSearch`).
4. Bevara södra halvklotet (band C–M): subtrahera 10 000 000 m FN-offset
   från `northingTry` innan den används som meridional distance i
   inverse-formeln. Forward-funktionen lägger på 10M för `lat<0`.

### Acceptanskriterier
- "33VXF 69104 80045" → lat ≈ 60.6, lon ≈ 17.5 (±0.5°). Kartan hamnar i
  mellan-Sverige (Uppland/Gästrikland).
- "33UXP 39000 28000" → Stockholm-trakten (~59.3, 18.0).
- "29HQE 12345 67890" → södra Sydafrika (band H, sydligt halvklot, lat ~-32).
- "32VNH 12345 67890" → västkust-Norge (~61.5, 5).
- Status-raden i kartan visar samma MGRS som `MGRS.forward` på den nya
  positionen (round-trip-konsistens).

### Commit-msg
`MINKARTA: fixa MGRS-inverse for alla latitudband`

---

## Fas 2 — Tolerantare MGRS-parser

### Mål
Klistra in MGRS med variabla mellanslag och versaler/gemener.

### Filer
- `minkarta.html` (`extractCoord`, ca rad 479)

### Steg
1. Byt regex till
   `/(\d{1,2})\s*([C-X])\s*([A-Z])\s*([A-Z])\s*(\d{2,10})/i`
   som matchar "33VXF 69104 80045", "33V XF 69104 80045",
   "33 V XF 6910480045" och "33vxf6910480045".
2. Plocka grupperna direkt ur regex-matchen (slipp andra inre regex).
   Splitta sista gruppens siffror i två lika halvor om längden är jämn
   (2–10 tkn). Ojämnt antal → returnera null.
3. Lämna lat/lon-grenen oförändrad.

### Acceptanskriterier
- Alla varianter ovan → samma `{kind:'mgrs', value:'33VXF 69104 80045'}`.
- "abc 33VXF 69104 80045 def" → matchar (regex är inte ankrad).
- "33Z..." (ogiltigt band) → null (Z är inte i C–X).

### Commit-msg
`MINKARTA: tolerantare MGRS-parser i sokrutan`

---

## Fas 3 — Exponera MGRS för manuell debug

### Mål
Gör round-trip-test enkelt att köra manuellt i devtools-konsolen.

### Filer
- `minkarta.html`

### Steg
1. Direkt efter att MGRS-IIFE:n returnerat, lägg till
   `window.MK_MGRS = MGRS;`. Inga UI-ändringar.

### Acceptanskriterier
- I devtools fungerar `MK_MGRS.inverse("33VXF 69104 80045")` och
  returnerar `[lat, lon]` i mellan-Sverige.

### Commit-msg
`MINKARTA: exponera MGRS pa window for manuell debug`

---

## Efterkontroll
- Öppna `minkarta.html`, klistra in "33VXF 69104 80045", tryck Gå →
  kartan hoppar till mellan-Sverige.
- Klistra in "59.33, 18.07" → Stockholm.
- Klistra in skräp ("hej") → röd outline blinkar, ingen kartrörelse.
- Skriv ut de tre commit-hasharna i kort form.
