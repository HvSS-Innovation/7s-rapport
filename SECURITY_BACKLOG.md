# hv — Säkerhets- och buggbacklog

Kod-specifika fynd för detta repo. Workspace-spanning sätts i
`../SECURITY_BACKLOG.md`. Nyaste posten överst. Åtgärdade poster lämnas kvar
med ✅ + datum.

---

## Öppna poster

### 2026-05-29 — Audit-sweep på `arkitektur-review`-grenen

Genomgång av OPSEC-kontrakt + logikbuggar i kalkylpages. Tre parallella
Explore-agenter + manuell verifiering av fil:rad. Föregjorda
hallucinationer (bl.a. ett påstått Safari-bug i `opsec.js` som faktiskt
ligger i `opsec.html`) har sorterats bort.

#### HIGH

1. ✅ **`drondrift.html:696` — tom höjd-input nollställer inte state**
   - `if (raw === '') return;` returnerar utan att rensa `state[field]`,
     så när användaren backar bort sin angivna höjd visas fortfarande
     gamla beräkningen i resultatkortet.
   - **Repro:** Höjd 50 → vind 8 → riktning N → zon visas → backspace ut
     hela höjd-fältet → fältet tomt, men resultatkortet ligger kvar med
     "150 m" som om höjd fortfarande vore 50.
   - **Risk i fält:** Operatören tror hen tömt formuläret men ser ändå ett
     "resultat" från förra körningen. Panik-vänligheten bryter.
   - **Fix:** `if (raw === '') { state[field] = null; saveState(); render(); return; }`
   - **Åtgärdat (commit `8f622d3`):** `wireQuickRow` (drondrift.html:696–703)
     rensar nu `state[field] = null`, tar bort snabbval-highlight, saveState +
     render vid tomt fält. Verifierad 2026-06-19.

2. ✅ **`postschema.html:373 vs :395` — två olika månadslistor (MAJ vs MAY)**
   - `toggleTnrFormat` använder svenska förkortningar (`MAJ`, `OKT`).
   - `setNow` använder engelska (`MAY`, `OCT`).
   - **Repro:** I maj eller oktober: klicka "Nu" → fält fylls med `…MAY…`
     resp `…OCT…`. Klicka format-switchen kort→lång igen så regenereras
     samma stämpel via `toggleTnrFormat` med `MAJ`/`OKT`. Slutformatet
     beror på vilken funktion som senast skrev.
   - **Risk:** Felaktig TNR vid genererat schema — TNR:en blir inte
     reglementsenlig och kan inte ens parse:as konsekvent (regex på
     rad 375 accepterar bägge varianterna utan att normalisera).
   - **Fix:** Använd `const MÅN = ['JAN','FEB','MAR','APR','MAJ','JUN','JUL','AUG','SEP','OKT','NOV','DEC'];`
     på en plats i filen, referera från båda funktionerna. Samma mönster
     bör kontrolleras i `obslosa.html`, `rassoika.html` och varje
     formulär med TNR-toggle.
   - **Åtgärdat (commit `40dcad4`, 2026-06-19):** Grep visade att samma
     copy-paste-bug fanns i **11 sidor**, inte bara de två som flaggades
     (ah, eobusare, index, fors, obo, obslosa, pedars, rassoika, scrim,
     weft, what). postschema var redan fixad i `7c62071`. Alla konvergerade
     till engelsk lista (MAY/OCT) för att matcha `setNow`/`nowTnr` och NATO
     DTG — inte svensk som fix-förslaget ovan antydde. Roten: TNR-logiken är
     inlinead per sida; en delad `lib/tnr.js` skulle eliminera buggklassen
     (se arkitektur-review).

3. **`landing-smakprov.html:7–9` — Google Fonts CDN + ingen CSP**
   - Filen `preconnect`:ar `fonts.googleapis.com` + `fonts.gstatic.com`
     och `<link href="https://fonts.googleapis.com/css2?…">`.
   - Saknar `<meta http-equiv="Content-Security-Policy">` helt — alla
     andra sidor i repot har minst `upgrade-insecure-requests`.
   - **Risk:** Varje besökare på smakprov-sidan tickar in hos Google. Det
     bryter README:s påstående om att jsDelivr/unpkg är ersatta med
     self-host (Google Fonts var aldrig listat men följer samma princip).
     Saknad CSP innebär ingen brytspärr mot tredjepart om sidan får ny
     content senare.
   - **Fix:** Self-hosta de tre fontfamiljerna (`Stardos Stencil`,
     `Special Elite`, `JetBrains Mono`) under `fonts/` precis som Inter,
     eller acceptera CDN och dokumentera explicit i README + lägg minst
     en strikt CSP-meta som matchar (det andra alternativet är värre).
   - **Delvis åtgärdat 2026-06-02:** Strikt CSP tillagd med explicit
     whitelist för `https://fonts.googleapis.com` (style-src) och
     `https://fonts.gstatic.com` (font-src). Allt annat utgående är
     blockerat. Kvar: ladda ner WOFF2-filerna och self-hosta så
     whitelisten kan tas bort helt.

4. ✅ **`service-worker.js:495–509` — PMTiles-prefetch håller hela filen i
   RAM**
   - `runPmtilesJob` läser via `reader.read()` och pushar varje chunk till
     `blobChunks.push(new Blob([value]))`, sedan `new Blob(blobChunks, …)`
     på rad 509 innan `cache.put`. Browsern fragmenterar Blob:ar in i
     disk vid behov, men hela tidsfönstret från start till `cache.put`
     håller hela filen levande som referenser samtidigt.
   - **Risk:** Sverige.pmtiles är ~4 GB. Att läsa en 4 GB fil i en
     mobilbrowsers SW är att be om OOM-kill mid-download — i värsta fall
     fastnar SW:n i ett dåligt tillstånd och blockar future-PMTiles-jobb
     tills användaren rensar.
   - In-page `pmtiles-layer.js` har samma 256 MB-threshold för
     SHA-256-hopp av samma anledning, men SW-versionen har ingen sådan
     guard alls.
   - **Fix:** Streama till disk-backed Blob med
     `new Blob(blobChunks)`-skapad direkt i loop (efter varje chunk:
     blobChunks blir array av Blob → kvarvarande chunks rensas inte
     förrän slut-Blob byggs). Bättre alternativ: skapa target-blobben
     med `new Blob()` och appenda inkrementellt via ny Blob var Nte
     chunk + släpp `value`. Eller chunk:a `cache.put` i bitar via
     Range-svar — komplexare. Minimum:
     `blobChunks.push(value)` (Uint8Array, inte Blob), sätt
     `new Blob(blobChunks)` precis innan put så Vi8U inte ligger kvar
     i shadow-Blob:ar.
   - **Åtgärdat 2026-06-02:** Bytte till `TransformStream`-pipe —
     `resp.body.pipeThrough(progressStream)` strömmar direkt från
     fetch-stream till `cache.put`, ingen ackumulering i RAM alls.
     Progress observeras chunk-vis i transformen. Abort/fel propageras
     via stream-error → cache.put rejectar → ingen partiell cache-post.

#### MEDIUM

5. ✅ **15 sidor har bara `upgrade-insecure-requests` som CSP**
   - Sidor med svag CSP: `ah, data, eobusare, fors, index, minkarta,
     obo, obslosa, pedars, postschema, rassoika, scrim, sensorskiss,
     skyttebok, skyttebok-info, vader, weft, what`.
   - 17 sidor (`app6, drondrift, fg, forkort, hjalm24, linje, matt,
     opsec, patl, ra763, ramsor, roadmap, saekr, sigskydd, symbol, tccc,
     un` samt `tipsa, tavla`) har strikt
     `default-src 'self'; … connect-src 'self'; frame-ancestors 'none'`.
   - README §"CSP — status" påstår att bara `opsec.html` har strikt CSP
     — dokumentationen är föråldrad. Roadmap för utrullning fanns i
     `audit/roadmap.md` (nu `docs/audit/roadmap.md` på den här branchen).
   - **Risk:** De viktigaste tactical-sidorna (`minkarta`, `sensorskiss`,
     `vader`, `obslosa`, rapportkonceptet) är just de som har **svag**
     CSP. Det är inte en aktiv läcka (egress går ändå bara dit koden
     säger), men ett brott mot "strikt CSP > upgrade-insecure-requests"-
     principen.
   - **Fix:** Kopiera strikta CSP:n från `drondrift.html:5` (eller
     `opsec.html:5`) till alla 15 sidor. Verifiera att `connect-src`-
     listan är komplett — `vader.html` behöver `https://nominatim.openstreetmap.org
     https://api.open-meteo.com https://api.smhi.se`, `minkarta.html` +
     `sensorskiss.html` behöver tile-hosts + R2-bucket-URL etc.
   - **Åtgärdat 2026-06-02:** Utrullad i tre grupper. 5a (9 pure-form-
     sidor) får samma strikta CSP som drondrift. 5b (6 kart-modal +
     2 full-map = 8 sidor) får tile-hosts + Nominatim + Overpass +
     R2-bucket i img-src/connect-src; TODO-kommentaren om CSP-utrullning
     borttagen samtidigt. 5d (vader) får Nominatim + Open-Meteo +
     `www.smhi.se`. Hela appen nu på strikt `default-src 'self'` —
     `upgrade-insecure-requests` används inte längre någonstans.

6. ✅ **`tipsa.html:6` + `tavla.html:6` — `connect-src https://*.workers.dev`**
   - Wildcard tillåter vilken som helst Cloudflare Workers-subdomän, inte
     bara den faktiska tipsa-workern.
   - **Risk:** Om en XSS skulle smyga in på dessa två sidor (osannolikt
     med `unsafe-inline` redan i bilden) kunde data exfiltreras till
     vilken Workers-subdomän som helst. Liten risk i praktiken.
   - **Fix:** Snäva till exakt URL, t.ex.
     `connect-src 'self' https://7srapport-tipsa.<konto>.workers.dev`.
   - **Åtgärdat 2026-06-02:** Wildcard ersatt med exakt
     `https://dawn-star-7fc5.nijoda.workers.dev`.

7. ✅ **`opsec.html:188–190` — hårdkodad Safari IDB-fallback**
   - `const known = ['minkarta', 'sensorskiss'];` används som fallback
     när `indexedDB.databases()` inte finns (Safari).
   - **Risk:** Om någon ny IndexedDB-databas läggs till (t.ex. ny
     sensor-modul eller en cache för adress-lookup) glöms den bort av
     Safari-användare vid "Glöm enheten". Just nu finns inga andra
     IDB-databaser i koden, så ingen aktiv läcka.
   - **Fix-alternativ:**
     1. Behåll listan + lägg en konstant centralt + lint som varnar.
     2. Sätt ett sentinel-värde via `localStorage.setItem('hv_known_idbs', JSON.stringify([...]))`
        vid varje IDB-open, läs den vid wipe.
   - **Åtgärdat 2026-06-02:** Alternativ 1. `KNOWN_IDB_DATABASES` är nu
     en topp-konstant med sökmönster-kommentar. Två nya varningar i
     wipe-loggen: Safari-användare ser att fallbacken kör + vilka namn
     som testas; på Chrome/FF: om runtime-listan innehåller DB:er som
     saknas i konstanten loggas tydlig varning så devs ser glömda namn.

8. ✅ **`sensorskiss-export.js:208–211` — tysta tile-fel i PNG-export**
   - Misslyckade tiles ritas som mörkgrön rektangel (`#152815`) utan
     varning, både i UI och i den genererade PNG:n.
   - **Risk:** Offline eller dåligt nät → operatören delar en sensor-
     skiss där delar av kartan är ersatta med solid färg, mottagaren
     vet inte att det är en renderingsbugg utan tror att det är ett
     uppmärkt område.
   - **Fix:** Räkna misslyckade tiles i `tiles`-arrayen; om
     `> 10 %` (eller `>= 1`?) → throw, eller åtminstone visa
     toast/varning innan share-action.
   - **Åtgärdat 2026-06-02:** Räknar failures innan ritning. Om
     `failedTiles/total > 0.1` kastas tydligt fel — sensorskiss.html
     fångar redan med try/catch och visar toast med meddelandet.

9. ✅ **`postschema.html:549` — schedulering kan välja "busy" soldat som
   absolut sista fallback**
   - `nyPerson = candidates[0] || fallback[0] || activePool[0];`
     Sista falback ignorerar både vilokrav och `busyNow`-check.
   - **Risk:** Vid extremt snäv konfig (få soldater + många poster +
     hård vilo-regel) kan en soldat dubbel-bokas i schemat utan
     varning. Edge case, men ingen synlig fel-toast.
   - **Fix:** Kasta tydligt fel: `if (!nyPerson) { alert('Schemat går
     inte att lösa med givna soldater/vilokrav.'); return; }`
   - **Åtgärdat 2026-06-02:** Sista fallback `|| activePool[0]` borttagen.
     Om både `candidates` och `fallback` är tomma visas alert och
     `schema = []; return;` bryter genereringen.

#### LOW

10. **`drondrift.html:840 + 743` — dead code för `hojdQuick`**
    - `wireQuickRow('hojdQuick', 'hojd', 'hojdCustom', 0, 500)` och
      `['hojdQuick', 'vindQuick', 'riktQuick'].forEach(…)` refererar
      ett element som inte längre finns (snabbval rensade i commit
      `484549f`). Båda funktionerna no-op:ar gracefully så ingen
      synbar bug, bara skräp.
    - **Fix:** Ta bort `hojdQuick` ur båda referenserna och låt
      `wireQuickRow` antingen kortas eller behållas för just custom-
      input-delen.
    - **Verifierad ofarlig 2026-06-19 (lämnas):** `wireQuickRow` (rad 849)
      MÅSTE stå kvar — den wirar höjd-fritextfältet `hojdCustom` inkl.
      HIGH #1-fixen, inte bara snabbval-raden. Endast `rowId`-argumentet
      `'hojdQuick'` resolverar till null och no-op:ar via `if (row)`-guarden.
      Ren kosmetik; rörs inte ("skriv inte om sådant som fungerar").

11. ✅ **README §"CSP — status" — föråldrad text**
    - Säger "Strikt CSP på plats på opsec.html. Övriga 14 sidor har
      fortfarande den bredare originalvarianten". Verkligheten är att
      17 sidor redan har strikt CSP. Uppdatera så ingen tror sajten
      är svagare än den är.
    - **Åtgärdat 2026-06-19:** README §"CSP — status" omskriven — alla sidor
      har strikt CSP, `upgrade-insecure-requests` borttaget överallt, per-sida
      allowlists dokumenterade.

12. **`drondrift.html:824` — extern länk via `window.open`**
    - `window.open(EXT_URL, '_blank', 'noopener,noreferrer')` är säker.
      Modal-gating av "lämnar 7srapport.com" + ack-checkbox är bra UX.
      Ingen åtgärd. Listad här som "verified clean".

---

## Åtgärdade

*(Inga ännu.)*
