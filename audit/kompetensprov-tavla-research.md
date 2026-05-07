# Kompetensprov BAS — research om tavel-poängsättning

**Status:** Spår A i `roadmap-kompetensprov-tavla.md` är **pausat**. Koden
kräver bekräftelse från Joel innan vi rör `ZON_POANG` eller `zoneAt`.

**Datum:** 2026-05-07
**Researcher:** Claude Opus 4.7 (1M context), VSCode-extension i hv-repot.

## TL;DR

Uppdragsspecens påstående *"`ZON_POANG = { H:1, A:5, X:2, B:4, C:3, D:3 }`
är fel"* matchar **inte** H SKJUTB AK 2021 (Försvarsmaktens egen handbok,
PDF i `hv/h-skjutb-ak-2021.pdf`). Den nuvarande tabellen i
`skyttebok.js:62` är *bokstavligen identisk* med kapitel 1.3.1.

Det enda riktiga problemet jag kan verifiera mot källan är att
**X-zonen är poängsatt (2 p) men `zoneAt()` returnerar aldrig X** —
en skytt kan alltså inte markera en X-träff i appen, även om reglementet
har den.

Eftersom Joel skrev *"Om du INTE hittar en auktoritativ källa: skriv in
i roadmappen att spåret pausar efter research-skivan och vänta på input
från mig. Anta inget."* — så pausar jag spåret tills Joel:
1. Bekräftar att det är 2021-utgåvan vi ska följa, **eller**
2. Tillhandahåller en 2024-källa (PDF, bild, eller intern dokumentation),
   **eller**
3. Säger uttryckligen *"lägg bara till X i `zoneAt`"* — då gör jag det
   utan att röra övriga zoner.

## Vad jag faktiskt hittade

### Källa: `h-skjutb-ak-2021.pdf` (lokal i repo-roten, 3,9 MB)

Extraherad med `pdftotext -layout -enc UTF-8`, kapitel 1.3.1 *Beräkning
av poängkvot*, sid 15–17:

```
   Helfigur 2020              Helfigur 2016
Träffzon  Poäng           Träffzon       Poäng
H            1            A-box           5
A            5            B+hakzon        5
X            2            A               2
B            4            C               4
C            3            D               3
D            3
```

Ord-för-ord-citat från handboken: *"Helfigur 2020 ska i första hand
användas. Helfigur 2016 kan användas med nedanstående mall för
konvertering av poäng."*

Exempel ur kap 1.3.1: *"Skjuttid: 20 sek. Poäng: A, A, A, A, B, B, B, C,
D = 5+5+5+5+4+4+4+3+3 = 38p. Poängkvot = 38p/20 s = 1,90."* — bekräftar
poängvärdena exakt.

### Källa: webbsökning för "H SKJUTB AK 2024"

WebSearch (US-only, 2026-05-07) hittade ingen auktoritativ 2024-utgåva.
Träffar:
- [Skjutbok AK 2022](https://www.forsvarsmakten.se/siteassets/2-om-forsvarsmakten/dokument/publikationer/skjutbok-ak-2022.pdf)
  — 404 vid fetch.
- [R SKJUTB 2021](https://www.forsvarsmakten.se/siteassets/2-om-forsvarsmakten/dokument/reglementen/r-skjutb-2021.pdf)
  — 404 vid fetch.
- [Hellsinge MSG reglemente](https://hmsg.se/Reglemente%20HMSG.pdf)
  — fetch lyckades men WebFetch:s text-extraktor kunde inte läsa
  scoringtabellen ur PDF:en.
- [Reservofficeren – Här är nya AK 24](https://reservofficerarna.se/reservofficeren/nyheter/har-ar-nya-ak-24/)
  — handlar om vapnet AK 24, inte ny handbok.
- [Cornucopia: Försvarsmakten inför AK M4A för grundutbildningen](https://cornucopia.se/2025/05/forsvarsmakten-infor-ak-m4a-for-grundutbildningen-till-hosten/)
  — vapenbyte 2025, ingen ny handbok-utgåva nämnd.

Slutsats: ingen ny 2024-utgåva av handboken hittad publikt. Tills annat
visas är 2021-utgåvan den senaste auktoritativa källan.

### Vad gäller HA-zonen?

Handboken nämner HA-zon i två sammanhang:
1. **Konverterings-tabellen Helfigur 2020 ↔ Helfigur 2016** (kap 1.3.2):
   *"HA → C-box (buk)"*. HA finns alltså som en målyta-beteckning på
   Helfigur 2020.
2. **Exempel 8 dialog**, kap 2: *"Övningen föreskriver tre träff i
   HA-zon på 100 m"*. Använt som målyta för en 100 m-övning.

Men **HA finns INTE i poäng-tabellen** i kap 1.3.1. Det är en
*målyta-beteckning* (geometrisk avgränsning för en specifik övning),
inte en separat poängsatt zon. Så att lägga in HA i `ZON_POANG` skulle
kräva att vi uppfinner ett poängvärde — vilket är exakt vad Joel sade
att jag inte ska göra.

### Vad gäller KS-zonen (kroppsskydd)?

**Inga träffar** i H SKJUTB AK 2021 PDF:en. Söktermen `KS` ger bara
träffar på irrelevant text ("KSP", "ksek" osv.). Inget tyder på att
kroppsskydds-undantaget är inskrivet i scoring-reglerna i 2021-utgåvan.
Möjligen nytt i en 2024-utgåva — men jag har ingen källa som bevisar
det.

## Det riktiga buggen som källan bekräftar

`zoneAt(x, y)` i [skyttebok.js:383](../skyttebok.js#L383) returnerar
bara `H | A | B | C | D | utanför`. Aldrig `X`. Det betyder att
`ZON_POANG.X = 2` är dead code — ingen träff kan någonsin hamna i X.

Reglementet säger däremot att X-zonen finns och är värd 2 p. Så
*någonstans* i ett verkligt scoring-flöde borde X kunna markeras.

Geometrin för X-zonen är beskriven i Bild 1.1, 1.3 och 1.4 i handboken,
men jag har bara textextraktorn — bilderna går inte att läsa via
`pdftotext`. Utan bilden kan jag inte rita en korrekt X-zon-geometri
i `zoneAt()`.

## Frågor till Joel

1. **Är 2021-utgåvan rätt referens?** Eller har du tillgång till en
   nyare H SKJUTB AK 2024 (PDF, scan, intern länk) som jag kan använda?
2. **Om 2021 är rätt:** vill du att jag bara lägger till X-zonen i
   `zoneAt` (med en geometri jag måste tolka från Bild 1.1 — alternativ:
   du klipper ut bilden och peka mig till den)?
3. **HA-zonen:** ska den vara en separat poängsatt zon, eller en
   del-region av A-zonen (huvud-träff inom A) utan eget poängvärde?
4. **KS-zon:** har du en intern källa som visar att kroppsskydds-
   undantaget finns i nuvarande scoring? Annars antar jag att det inte
   är aktuellt.

Tills jag fått svar på (1)–(4) **rör jag inte `ZON_POANG`, `zoneAt`,
`buildFigureSvg` eller `topNineScore`** för Spår A. Spår B och C går
vidare oberoende.
