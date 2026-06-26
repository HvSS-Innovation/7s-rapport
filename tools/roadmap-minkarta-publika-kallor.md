# Roadmap: MINKARTA — byt PDF/sid-referenser mot publika källor

**Mål:** "Om MINKARTA & integritet"-panelen i `minkarta.html` (rad ~410–431) ska
kunna stå publikt på GitHub Pages utan att hänvisa till intern/icke-publik PDF.
Varje sakuppgift ska antingen stödjas av en öppet citerbar källa eller skrivas
om så att den inte längre påstår det specifika.

Sekundärt: städa motsvarande PDF-/sid-referenser i `README.md` (också publik via
GitHub) och i kodkommentarer i `minkarta-symbols.js`. Roadmap-filer
(`roadmap-*.md`, `roadmap.md`) lämnas orörda — de är arbetsanteckningar.

---

## FAS 1.1 — Inventering (KLAR vid roadmap-skrivning)

### Publikt synliga strängar (måste städas)

**`minkarta.html`:**

| Rad | Sträng |
|-----|--------|
| 415 | `(Fältarbeten s. 338–342). Kommande faser lägger till symbolpalett,` |
| 423 | `... är en bestämbar referenspunkt i terrängen (PDF s. 338), inte en skarp minposition.` |
| 427 | `<b>Reglementstolkning.</b> Svenska tecken enligt PDF sida 339.` |
| 429 | `Handbok 11.7.1.</p>` (slutet av Reglementstolkning-stycket) |

**`README.md`** (publik på GitHub):

| Rad | Sträng |
|-----|--------|
| 102 | `Härdar reglementstroheten i två riktningar: symbolerna följer nu PDF:en` |
| 113 | `symbolen som behåller röd accent — det speglar PDF:ens eget` |
| 118 | `PDF s. 339 + Handbok s. 86: \`landmina_okand\` (tom cirkel,` |
| 124 | `PDF-tolkningen. Ny palett-grupp "Övriga landminor".` |
| 204 | `(Fältarbeten s. 338–342, Handbok 11.7.1).` |

### Kodkommentarer (lägre prio — påverkar bara utvecklare som klonar repot)

**`minkarta-symbols.js`:**

| Rad | Sträng |
|-----|--------|
| 5 | `//  (Fältarbeten s. 338–342, Handbok 11.7.1 + Handbok 9.5 s. 86).` |
| 319 | `// UPK (Utgångs-Punkt-Koordinat) är en bestämbar terrängpunkt (PDF s.338),` |

**`minkarta.html`:**

| Rad | Sträng |
|-----|--------|
| 136 | `v3: vit korona (halo) runt svart linjearbete för att matcha PDF:en.` |

### Lämnas orörda

`roadmap-mineringar.md`, `roadmap-minkarta-v2.md`, `roadmap-minkarta-v3.md`,
`roadmap-minkarta-v4.md`, `roadmap.md` — interna arbetsanteckningar; deras
PDF-referenser är legitima och pekar utvecklaren mot källmaterialet.

---

## FAS 1.2 — Webbsökning efter publika källor

För varje uppgift som idag lutar sig mot PDF, hitta en publikt citerbar källa.
Skriv ut URL i rapporten så Joel kan verifiera att den faktiskt är publik.
**Hitta inte på källor.** Saknas öppen källa: skriv om meningen så den inte
påstår det specifika reglements-detaljet.

Sökmål (per faktauppgift):

- [ ] **A. "Mineringar på karta — sammanställning"** finns det en publik
  motsvarighet, t.ex. inscannad äldre FältR / SoldR på Riksarkivet, FOI-rapport,
  Försvarshögskolans bibliotek, soldF.com-faksimiler, eller en
  Markstridsskolan-publikation som beskriver kart-symbolerna?
  - Sök: `"mineringar på karta" site:forsvarsmakten.se`
  - Sök: `"mineringar på karta" filetype:pdf`
  - Sök: `"FältarbR" OR "Fältarbetsreglemente" Riksarkivet`
  - Sök: `soldf.com mineringar` / `soldf.com fältarbeten`
  - Sök: `DiVA "stridsvagnsmina" OR "minering" reglemente`

- [ ] **B. UPK / Utgångs-Punkt-Koordinat / utgångspunkt i mineringssammanhang** —
  finns publik definition?
  - Wikipedia: `Mineringar`, `Stridsvagnsmina`, `MGRS`, `UTM`
  - Sök: `"utgångspunkt" minering reglemente`
  - Försvarsmakten utbildningsmaterial / handböcker som ligger öppet
  - Eventuell akademisk uppsats (DiVA / forsvarshogskolan.se)

- [ ] **C. Svenska kart-tecken för minor** (det som idag är "PDF sida 339") —
  finns publik symbol-tabell?
  - APMBC / Ottawa-konventionens marking-bilagor (mine.un.org, ICRC)
  - IMAS (International Mine Action Standards) — `mineactionstandards.org`
  - NATO APP-6 (joint military symbols) — open NATO STANAG
  - Wikipedia: `NATO Joint Military Symbology` (eng/sv)

- [ ] **D. Ambitionsnivåer 300/600/900 strvmina per km front** — finns
  öppen källa, eller måste meningen skrivas om?
  - Sök: `"strvmina" "per km" front reglemente`
  - Försvarshögskolan / KKrVA / FOI publikationer om svensk mineringsdoktrin
  - Krigsvetenskapliga akademins handlingar och tidskrift (kkrva.se, ofta öppet)
  - Eventuella öppna Försvarsmakten-handböcker (FM ger ut vissa öppet)

- [ ] **E. Stridsvagnsmina / fördröjningsminering / spärrning** — allmän
  bakgrund som ersätter PDF-referensen som motivering till verktyget:
  - Wikipedia sv: `Stridsvagnsmina`, `Personmina`, `Minering (krigföring)`,
    `Antitankmina`
  - Försvarsmakten.se översiktsmaterial om fältarbeten

För varje funnen källa, anteckna i rapporten under FAS 2:
```
- URL: ...
- Belägger: <vilken mening i info-panelen>
- Publik: ja/nej (offentlig sajt, ej inloggning)
- Licens/användning: <om relevant>
```

---

## FAS 1.3 — Ny formulering (utkast — finslipas i FAS 2 efter sökresultat)

Behåll samma rubriker: **Syfte**, **Integritet**, **Reglementstolkning**.

**Princip:**

1. Stryk uttrycken `(Fältarbeten s. 338–342)`, `(PDF s. 338)`, `PDF sida 339`,
   `Handbok 11.7.1`.
2. Ersätt med antingen
   (a) länk till publik källa, eller
   (b) generell formulering ("svenska militära kart-tecken för minor", "etablerad
       referenspunkt i terrängen") utan sid-/PDF-namn.
3. UPK-förklaringen ska finnas kvar — det är användarvärde — men utan
   PDF-källhänvisning. Den kan stå som funktionell beskrivning.
4. Ambitionsnivåerna `300/600/900 strvmina/km` får bara stå kvar om publik
   källa hittas (D). Annars: ersätt med "tre ambitionsnivåer" utan siffror,
   eller stryk meningen helt.

Mall för ny "Reglementstolkning" om alla källor faller bort:
> **Reglementstolkning.** MINKARTA använder svenska militära kart-tecken för
> minor. Symboltolkning och dokumentationsformat baseras på öppet tillgängligt
> material om svensk mineringsdoktrin (länkar nedan).

Mall om publik källa hittas:
> **Reglementstolkning.** Symboler och dokumentationsformat följer
> [\<källa A\>](url). UPK-begreppet beskrivs i [\<källa B\>](url).

---

## FAS 2 — Utförande (gör i ordning, en commit per delsteg)

- [ ] **2.1** Utför webbsökningarna A–E. Skriv resultat i en sektion längst ner
  i denna fil under rubriken `## Sökresultat 2026-04-28`. Lista varje URL med
  publik-status. Stanna och visa Joel innan jag skriver om texten.

- [ ] **2.2** Skriv färdig ny text för info-panelen baserat på vilka källor som
  faktiskt fanns publikt. Visa diff för Joel innan jag commit:ar.

- [ ] **2.3** Uppdatera `minkarta.html` rad 410–431. Behåll struktur (Syfte,
  Integritet med samma 3 listpunkter om tile-/Nominatim-anrop, Reglements­tolkning).
  Commit: `MINKARTA: byt PDF-/sid-referenser mot publika källor i info-panelen`.

- [ ] **2.4** Uppdatera `README.md` rader 102, 113, 118, 124, 204 — antingen ta
  bort "PDF"-ord eller skriv om så att README inte refererar till intern PDF.
  Commit: `MINKARTA: rensa README från PDF-/sid-referenser`.

- [ ] **2.5** (Lägre prio, kan slås ihop) Uppdatera kodkommentarer i
  `minkarta-symbols.js` rad 5 och 319, samt `minkarta.html` rad 136. Skriv
  ut samma kunskap utan att namnge intern PDF.
  Commit: `MINKARTA: rensa PDF-referenser i kodkommentarer`.

- [ ] **2.6** Verifiering — kör Grep:
  - `Grep "PDF" minkarta.html` → 0 träffar förväntas.
  - `Grep "PDF\|s\. 33\|sida 33\|Fältarbeten\|Handbok 11" minkarta.html` → 0 träffar.
  - `Grep "PDF\|Fältarbeten" README.md` → 0 träffar.
  - Roadmap-filer ignoreras (med `--glob '!roadmap*.md'`).

- [ ] **2.7** `git push` och skriv ut commit-hash(arna).

---

## Risker / öppna frågor

- Kan visa sig att inga öppna svenska källor finns för symbolerna och att
  meningen måste skrivas om till en mer generell formulering. Det är OK —
  panelen får då hellre vara vag än läcka PDF-citat.
- Wikipedia är publikt men inte alltid auktoritativt; använd det främst för
  begreppsförklaring (UPK, MGRS, stridsvagnsmina) snarare än som regelkälla.
- Om APMBC/IMAS används som referens: kontrollera att Sverige faktiskt följer
  den standarden för kart-tecken. Gör det inte → använd inte den länken som
  källa till "svenska tecken".

---

## Sökresultat 2026-04-28

Sökmetod: WebSearch + WebFetch på engelska/svenska, fokus svenska publika
sajter. Endast källor som verifierats publika utan inloggning listas nedan.

### A — "Mineringar på karta" / sammanställning

- **URL:** https://sv.wikipedia.org/wiki/Mina
  - Belägger: "alla mineringar märkas ut på kartor" (allmän princip), grundläggande
    skillnad fullbreddsutlöst vs tryckutlösande, referens till Ottawakonventionen.
  - Publik: ja
  - Licens: CC BY-SA 4.0
- **URL:** https://www.forsvarsmakten.se/siteassets/2-om-forsvarsmakten/dokument/handbocker/h-hvplut-grp-3-2016.pdf
  - Belägger: "Handbok Hemvärnspluton-grupp Del 3 Anvisningar 2016" innehåller
    avsnitt om Minering enligt sökmotor-snippet. **Direktnedladdning gav 404
    vid testning 2026-04-28** — länken ligger dock kvar i Försvarsmaktens
    sökindex. Verifiera manuellt innan vi använder den som källa.
  - Publik: osäker (sannolikt ja, men URL inte stabil i testet)
- **URL:** https://www.forsvarsmakten.se/siteassets/2-om-forsvarsmakten/dokument/handbocker/handbok-underrattelsetjanst-markforband-grunder.pdf
  - Belägger: Handbok Underrättelsetjänst Markförband grunder 2024. Refererar
    fältarbeten och minfält i underrättelsesammanhang.
  - Publik: ja (officiell siteasset-länk på forsvarsmakten.se)
- **URL:** https://www.forsvarsmakten.se/siteassets/2-om-forsvarsmakten/dokument/handbocker/d-hv.pdf
  - Belägger: Direktiv Hemvärn 2023. Pionjärplutoner ska kunna utföra
    fördröjande fältarbeten inklusive minering och minfältsspaning.
  - Publik: ja (officiell siteasset-länk på forsvarsmakten.se)
- **URL:** https://www.flygvapenfrivilliga.se/media/1289/soldf_2001_-_soldaten_i_f_lt.pdf
  - Belägger: Soldaten i fält (SoldF) 2001 – soldathandboken. Innehåller
    fältarbeten, signaler och tecken, lägeskartor och skisser enligt Wikipedia
    och övriga sökträffar. Direktanalys av PDF:en blockerades av storlek
    (10 MB-gräns) — innehåll behöver verifieras lokalt.
  - Publik: ja (publicerad av Flygvapenfrivilliga, medlemsorganisation under FM)

### B — UPK / utgångspunkt / referenspunkt vid minering

- **Resultat:** Ingen öppen, citerbar definition av UPK i mineringssammanhang
  hittades. Begreppet förekommer i den interna PDF:en men inte i någon
  publikt indexerad svensk källa.
- **URL:** https://www.saob.se/artikel/?unik=R_0493-0263.w8bR-0008
  - Belägger: SAOB definierar "referenspunkt" allmänt som "utgångspunkt för
    beräkning". Stöder en *funktionell* (icke-reglements-) formulering om vad
    UPK gör, men inte själva förkortningen UPK.
  - Publik: ja
- **URL:** https://www.ne.se/uppslagsverk/ordbok/svensk/referenspunkt
  - Belägger: NE-uppslagsord "referenspunkt".
  - Publik: ja (smakprov, ingen inloggning krävs för kort definition)
- **Slutsats för 1.3:** UPK-förklaringen behöver skrivas om som ren funktionell
  beskrivning ("en bestämbar referenspunkt i terrängen") utan att luta sig
  mot intern PDF eller utan öppen reglements-källa.

### C — Svenska kart-tecken för minor (publik symbol-tabell)

- **Resultat:** Ingen publik svensk officiell symbol-tabell för minor hittades
  som öppen webbresurs. Den auktoritativa källan ("SoldR Mtrl Vapen Minor"
  från Försvarsmakten 2001) refereras i sökträffar men ligger inte öppet på
  forsvarsmakten.se.
- **URL:** https://en.wikipedia.org/wiki/NATO_Joint_Military_Symbology
  - Belägger: NATO APP-6 / STANAG 2019 är den **NATO-standard** som täcker
    minfältssymboler. Inkluderar "nuisance minefields" och "protective
    minefields".
  - Publik: ja
  - Reservation: NATO-standard, inte svensk reglements-bunden. Får inte
    påstås vara "svenska tecken".
- **URL:** http://www.mapsymbs.com/APP-6ADRDCValcartierEdition121(Mod).pdf
  - Belägger: Komplett kommenterad APP-6A med minfält-symboler.
  - Publik: ja (inofficiell men publik kommentarsutgåva)
- **URL:** https://www.lantmateriet.se/sv/geodata/vara-produkter/produktsupport/kartsymboler/
  - Belägger: Lantmäteriets *civila* kartsymboler — relevant för bakgrund om
    att kartritning är kodad symboliska, men säger inget om militära
    minsymboler.
  - Publik: ja
- **Slutsats för 1.3:** Stryk meningen "Svenska tecken enligt PDF sida 339".
  Ersätt med generell formulering ("baseras på etablerade svenska militära
  kart-tecken för minor") utan sidhänvisning. Möjlig länk: Wikipedia NATO
  Joint Military Symbology som *sekundär* referens till "närliggande
  internationell standard", inte som primär svensk källa.

### D — Ambitionsnivåer 300/600/900 strvmina per km front

- **Resultat:** **Inga öppna svenska källor** hittades som belägger de specifika
  siffrorna 300/600/900 strvmina/km. Sökningar mot kkrva.se, FOI, DiVA, SVT
  och soldf.com gav inga träffar på exakt formuleringen.
- **URL:** https://www.diva-portal.org/smash/get/diva2:532066/FULLTEXT01.pdf
  - Belägger: Försvarshögskolan, "Självständigt arbete krigsvetenskap" (kurskod
    1OP147) — uppsats som behandlar mineringsdoktrin/fältarbeten. Kunde inte
    läsas som text via WebFetch (binär PDF). Kräver lokal nedladdning för att
    bekräfta om siffrorna förekommer.
  - Publik: ja (DiVA är öppen)
- **Slutsats för 1.3:** Med nuvarande publika fynd måste meningen om
  ambitionsnivåer **antingen strykas eller skrivas om utan siffror**, t.ex.
  "tre olika täthetsnivåer för minering". Endast om DiVA-uppsatsen vid lokal
  läsning bekräftar siffrorna kan de stå kvar — och då med tydlig länk till
  uppsatsen som källa.

### E — Stridsvagnsmina / spärrning / fältarbeten (allmän bakgrund)

- **URL:** https://sv.wikipedia.org/wiki/Stridsvagnsmina_5
  - Belägger: STRVM 5 — svenska försvarsmaktens standardmina mot pansarfordon,
    tryckutlöst, plastskal, ca 10 kg sprängämne.
  - Publik: ja
- **URL:** https://sv.wikipedia.org/wiki/Stridsvagnsmina_6
  - Belägger: STRVM 6 / FFV 028 — fullbreddsutlöst RSV-mina, magnetisk
    detektor, elektronisk tändning.
  - Publik: ja
- **URL:** https://sv.wikipedia.org/wiki/Stridsvagnsmina_m/52B
  - Belägger: Äldre svensk strvmina, historisk bakgrund.
  - Publik: ja
- **URL:** https://sv.wikipedia.org/wiki/F%C3%B6rs%C3%A5tminering
  - Belägger: Definition av försåtminering som taktik (lönnfällor med
    sprängladdningar). Säger inget om svenska reglementsdetaljer eller UPK.
  - Publik: ja
- **URL:** https://www.soldf.com/vapen/stridsvagnsmina-5-strvm5/
  - Belägger: Detaljerad teknisk beskrivning av STRVM 5.
  - Publik: ja
- **URL:** https://www.soldf.com/vapen/stridsvagnsmina-6-strvm6-ffv-028/
  - Belägger: Detaljerad teknisk beskrivning av STRVM 6, samt definition av
    fältarbeten ("åtgärder för att öka egen rörlighet, försvåra motståndarens
    rörlighet, försvåra upptäckt, minska verkan av motståndarens eld, samt
    minering och minröjning").
  - Publik: ja
- **URL:** https://digitaltmuseum.se/011024488174/stridsvagnsmina-6
  - Belägger: Armémuseums sida om STRVM 6 — kulturhistorisk bakgrund.
  - Publik: ja (CC-licensierad)
- **URL:** https://www.forsvarsmakten.se/siteassets/2-om-forsvarsmakten/dokument/reglementen/sakr-amroj.pdf
  - Belägger: Reglemente Verksamhetssäkerhet – Am- och minröjning 2023.
    Officiellt FM-dokument.
  - Publik: ja
- **Slutsats för 1.3:** Massor av öppna källor finns för **bakgrund och
  motivering** av verktyget. Stridsvagnsmina-relaterade Wikipedia-sidor +
  soldf.com räcker mer än väl för att förklara *varför* MINKARTA finns,
  utan att hänvisa till intern PDF.

---

## Sammanfattning till Joel — verifiera innan FAS 2.2

**Vad är möjligt utan PDF-citat:**

1. **Bakgrund / motivering** ✅ — Wikipedia + soldf.com räcker.
2. **Mineringar på karta som princip** ✅ — Wikipedia "Mina" stödjer påståendet
   att mineringar märks ut kartografiskt.
3. **UPK** ⚠️ — måste skrivas som funktionell beskrivning utan reglementskälla.
4. **Svenska kart-tecken** ⚠️ — generell formulering, ingen sid-/PDF-referens.
   Eventuell sekundär länk till NATO Joint Military Symbology för kontext.
5. **Ambitionsnivåer 300/600/900** ❌ — ingen publik källa hittad. Mening
   måste strykas eller skrivas om utan siffror, om inte DiVA-uppsatsen vid
   lokal granskning visar sig innehålla dem.

**Förslag på primära nya länkar i info-panelen:**

- https://sv.wikipedia.org/wiki/Mina (allmän bakgrund + kartmärkning)
- https://sv.wikipedia.org/wiki/Stridsvagnsmina_5 (svensk standard-strvmina)
- https://www.soldf.com/vapen/stridsvagnsmina-5-strvm5/ (teknisk fördjupning)
- (eventuellt) https://www.forsvarsmakten.se/siteassets/2-om-forsvarsmakten/dokument/handbocker/d-hv.pdf — Direktiv Hemvärn 2023 om pionjärplutonens fältarbeten

**Öppna frågor till Joel innan FAS 2.2:**

1. OK att stryka 300/600/900-siffrorna eller vill du att jag laddar ner
   DiVA-uppsatsen lokalt och söker efter dem först?
2. OK att Wikipedia blir primär bakgrundskälla, eller ska jag försöka hitta
   en mer auktoritativ FM-publik handbok (t.ex. läsa SoldF 2001 PDF lokalt)?
3. OK att UPK står kvar som funktionell beskrivning utan källa, eller stryka
   stycket helt?

