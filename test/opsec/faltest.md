# Fälttest — Härdat läge på riktig telefon

**Varför den här listan finns:** allt automatiskt testande sker i Chromium på
en laptop bakom en lokal proxy. Fyra testlager (egress-gate, invariant, svep,
race) bevisar att koden beter sig rätt — men inget av dem kan säga något om
PWA-livscykeln på Android/iOS, om lagringsvräkning, om delningsarket, eller om
verktyget faktiskt går att *använda* i härdat läge. Det är det den här listan
prövar.

Kör den efter större ändringar i härdat-kedjan. Tar ~15 minuter.

**Status per 2026-07-31: aldrig körd.** Fyll i utfallet nedan första gången.

---

## Förberedelse

1. Installera PWA:n på telefonen (Lägg till på hemskärmen).
2. Öppna **MINKARTA** på betrodd anslutning.
3. **Ladda ner offline** → välj ditt landskap → vänta tills det är klart.
4. Slå på **Härdat läge**.
5. Sätt telefonen i **flygplansläge**.

> Flygplansläge är avsiktligt: det är enda sättet att bevisa noll radiotrafik.
> Härdat läge stoppar appens egna anrop, men webbläsarens egen kontroll av om
> appen har en ny version går inte att stänga inifrån en webbapp.

---

## A. Kärnkedjan — fungerar verktyget alls?

| # | Gör | Förväntat |
|---|-----|-----------|
| A1 | Öppna 7S, fyll i en rapport | Går som vanligt |
| A2 | Tryck **Karta**, välj position | Kartan ritas lokalt. Varningsraden ska vara **grön**: "Härdat läge PÅ" |
| A3 | Bekräfta positionen | MGRS hamnar i STÄLLE. **Ingen adress** ska fyllas i (geokodning är avstängd) |
| A4 | Bifoga foto | Status ska säga "metadata rensad" |
| A5 | Tryck **Publicera** → dela | Delningsarket öppnas, text + CoT-fil följer med |
| A6 | Öppna CoT-filen i ATAK om du har den | Punkten ska hamna **på rätt plats** |

---

## B. De fyra nya sätten att säga nej

Dessa infördes 2026-07-30. Alla är avsiktliga — men om någon känns för
hårdhänt i fält är det den viktigaste återkopplingen från hela testet.

| # | Gör | Förväntat | Känns det rätt? |
|---|-----|-----------|-----------------|
| B1 | Skriv ett **platsnamn** i STÄLLE (t.ex. "Ladan vid korsningen") och tryck dela | Ruta: "Kan inte skapa TAK-fil… ingen fil skapas". Textrapporten ska fortfarande gå att dela | ☐ |
| B2 | Gör en minkarta, **dölj ett lager**, exportera PNG | Toast: "N objekt i dolda lager tas INTE med". Bilden ska sakna det dolda | ☐ |
| B3 | Tvinga omladdning av sidan (dra ner / stäng och öppna appen) | Härdat ska fortsatt vara **på**. Blir det av med besked om att spärren inte kan upprätthållas — notera det | ☐ |
| B4 | Låt appen ligga i härdat några dagar | Ingen uppdatering sker. Nya versioner kommer först när härdat stängs av | ☐ |

---

## C. Sanningstest — visar appen rätt läge?

| # | Gör | Förväntat |
|---|-----|-----------|
| C1 | Kolla statusraden i MINKARTA | Ska namnge din lokala karta ("Härdat: Uppland"), **inte** OpenTopoMap |
| C2 | Öppna appen i **två flikar**, slå av härdat i den ena | Den andra ska följa med — ingen grön garanti kvar där |
| C3 | Scrolla till sidfoten, tryck feedback-länken | Ska vägra med besked, inte öppna GitHub |
| C4 | Öppna VÄDER | Knappen avstängd, grön banner om härdat läge |

---

## D. Efter testet

1. Stäng av flygplansläge.
2. Stäng av härdat läge.
3. Kontrollera att kartan återgår till OpenTopoMap och att väder fungerar igen.
4. Kör **Glöm enheten** (opsec.html) om testet gjordes med skarpa uppgifter.

---

## Utfall

| Datum | Telefon / OS | Vad gick fel | Åtgärdat |
|-------|--------------|--------------|----------|
| | | | |

Noteras även i `SECURITY_BACKLOG.md` om något visar sig vara en säkerhetsbrist
snarare än en UX-fråga.
