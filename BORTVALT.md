# Bortvalt i 7S Rapport

Utvärderade men ratade alternativ, så samma utvärdering inte görs om från noll.
Ett stycke per post: datum, vad som valdes bort, skälet, vad som gäller i stället.

## 2026-08-30 — Fototiden ENSAM som fotobilagans filnamn (i stället för TNR)

**Bortvalt:** att döpa bilagan efter enbart när bilden togs (EXIF
`DateTimeOriginal`, samma källa som autofyller Stund), t.ex. `7S-271850.jpeg`.

**Skäl:** fototiden saknas ofta — Signal- och WhatsApp-vidarebefordrade bilder
är EXIF-strippade, skärmdumpar och nedladdade bilder likaså — så konventionen
skulle behöva falla tillbaka på TNR ändå, och mottagaren kan inte se vilken av
de två hen tittar på. Den bryter också kopplingen rapport↔bilaga: TNR står i
rapporttexten, fototiden gör det inte. TNR genereras dessutom alltid av appen
och är unikt per rapport, medan flera bilder kan dela samma fotominut.

**Gäller i stället:** `7S-<TNR>-S<fototid>.jpg` sedan v0.3.32 — TNR först så
korrelationen till rapporten består, fototiden som suffix bara när bilden hade
en EXIF-tidsstämpel. Suffixets värde tas ur Stund så bilagan aldrig säger emot
rapporttexten (EXIF-tiden som fallback). Implementationen ligger i
`generateReport()` i `index.html`.

**Kvarstår bortvalt av samma skäl:** att gissa fram en fototid när EXIF saknas
(t.ex. filens mtime) — den är oftast nedladdningstiden, inte fotograferingens,
och ett filnamn som ljuger är sämre än ett som tiger.
