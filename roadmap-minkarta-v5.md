# Roadmap — MINKARTA v5 (rensa spelläge, live-rotation, auto-edit)

Femte iterationen av **MINKARTA**-tabben. v4 (`roadmap-minkarta-v4.md`) landade
nya SVG-symboler, automatisk PNG-bifogning vid delning och 4× förstorade
punktsymboler i exporten. v5 är en städ- och UX-runda i tre korta faser:

1. **Koppla bort spelläget SÄNKA MINOR** från publika sajten — filerna ligger
   kvar i repot men laddas inte längre. UI-spår tas bort.
2. **Realtids-rotation** i edit-popupen — sektorn snurrar live medan slidern
   dras, med korrekt återställning om popupen stängs utan Spara.
3. **Auto-öppna edit-dialog** så fort en symbol just ritats, så användaren
   slipper klicka på den igen för att fylla i etikett/antal/anteckning.

---

## FAS 1 — Ta bort spelläget "SÄNKA MINOR" från publika sajten

### Mål
Koppla bort spelläget från produktionsbygget och dölj all UI till det. Behåll
`minkarta-game.js` på disk för framtida referens.

### Filer
- `minkarta.html`
- `minkarta-game.js` (kommentar-rad högst upp, ingen logik-ändring)
- `service-worker.js`
- (kontroll: `index.html` och övriga `.html` i roten — inga träffar förväntade)

### Steg
1. Ta bort `<script src="minkarta-game.js" defer></script>` ur
   `minkarta.html` (~rad 20).
2. Ta bort kommentaren och raden "Exponera för spellägesmodulen" + det wrappande
   blocket i `DOMContentLoaded`-handlern (~rad 2220–2231) som bara används av
   spelläget. Behåll `clickHandler = handleMapClick` direkt utan wrap.
3. Ta bort `if (window.MK_GAME && window.MK_GAME.init) window.MK_GAME.init();`
   (~rad 2252).
4. Ta bort `gameActive()`-funktionen (~rad 1311–1313) och `if (gameActive())`-
   gate i `onFrihandStart` (~rad 1318–1321) — när modulen är borta är funktionen
   alltid `false` och guarden onödig.
5. Uppdatera Om-panelen (~rad 416): byt
   `"... PNG-export och spelläget SÄNKA MINOR."` mot
   `"... PNG-export och minprotokoll."` så meningen blir grammatiskt korrekt.
6. Lägg till en arkiv-kommentar högst upp i `minkarta-game.js`:
   ```
   // ARKIVERAD 2026-04-28: bortkopplad från minkarta.html.
   // Sparad för framtida referens. Återaktivera via <script>-tagg.
   ```
   Ingen annan ändring i den filen.
7. `service-worker.js`: ta bort `'./minkarta-game.js',` ur `FILES`-listan och
   bumpa `CACHE`-konstanten enligt befintligt mönster (timestamp).

### Acceptanskriterier
- Inga konsolerror (`MK_GAME is not defined` eller liknande) när
  `minkarta.html` öppnas.
- `grep -i "minkarta-game\|gameMode\|sänka minor\|MK_GAME"` på alla `.html`/
  service-worker.js → 0 träffar.
- `minkarta-game.js` finns kvar oförändrad förutom arkiv-kommentaren högst upp.

### Commit-msg
`MINKARTA: koppla bort spellaget SANKA MINOR fran sajten`

---

## FAS 2 — Realtids-rotation i edit-popupen

### Mål
Användaren ska se sektorn/symbolen rotera live i kartan medan slidern dras.
Stängs popupen utan Spara ska rotation återställas.

### Filer
- `minkarta.html` (synkron-blocket `edRot/edRotN` inuti `openEditPopup`,
  ~rad 1204–1213)

### Steg
1. Spara `const origRotation = obj.rotation` när popupen öppnas, inuti
   rotations-blocket.
2. På `input`-event från `edRot` (slider) OCH `edRotN` (number-input):
   skriv värdet till `obj.rotation` och kör `rebuildLayers()` så symbolen
   ritas om i realtid.
3. Lyssna på popup-close (`popup` `remove`-event på `map`) — om Spara INTE
   klickats, återställ `obj.rotation = origRotation` och `rebuildLayers()`.
4. Spara-handlern sätter `origRotation = obj.rotation` igen som "commit"-
   markör så att efterföljande close-event inte rullar tillbaka ändringen.
   Spara behåller sin existerande `obj.rotation = ...` + `rebuildLayers()`.

### Acceptanskriterier
- Dra slidern på en `verkansomrade`/`fordon_sid`/`forsvar` → sektorn snurrar
  live i kartan medan dragningen pågår.
- Stäng popup via X eller klick utanför utan att klicka Spara → sektorn är
  tillbaka i ursprungsvinkeln.
- Klicka Spara → sektorn stannar i nya vinkeln även efter att popup stängts.

### Commit-msg
`MINKARTA: realtidsrotation i edit-popup nar slidern dras`

---

## FAS 3 — Auto-öppna dialogruta när symbol just ritats

### Mål
Edit-popupen ska öppnas automatiskt när en ny symbol skapas. Allt är fortsatt
valfritt — klick utanför stänger utan att spara, vilket är dagens beteende.

### Filer
- `minkarta.html` (`addObject`-flödet, `handleMapClick` punkt-grenen,
  `finishDraft` polygon/linje-flödet)

### Steg
1. Skapa en intern hjälpare `autoOpenEditor(obj)` som:
   - Skippar för `typ === 'frihand'` och `typ === 'text'`.
   - Hämtar `state.layers[obj.id]` och anropar `openEditPopup(obj, layer, null)`
     (popupen plockar latlng från lagret när `e` är `null`/utan `latlng`).
2. Anropa `autoOpenEditor(obj)` efter:
   - punkt-grenen i `handleMapClick` (efter `addObject(obj)` för icke-UPK och
     efter UPK-flödets `rebuildLayers(); reverseGeocodeUpk(obj);`).
   - `finishDraft()` efter `addObject(obj)`.
3. UPK behåller sitt befintliga `reverseGeocode`-anrop — det körs parallellt.

### Acceptanskriterier
- Rita en mineringssymbol (`tramp`, `strv_tryck`, `fordonsmina`) → popup
  öppnas direkt på den nya symbolen.
- Stäng popup genom klick utanför utan att klicka Spara → symbolen finns kvar
  med default-värden, inget krasch, inga konsolerror.
- Rita en polygon, avsluta med dubbelklick → popup öppnas på den färdiga
  polygonen.
- Rita en frihand-stroke eller fri-text → INGEN auto-popup (oförändrat
  beteende).
- UPK-kollision blockerar Spara med röd hint (oförändrat).

### Commit-msg
`MINKARTA: oppna edit-dialog automatiskt nar symbol ritats`
