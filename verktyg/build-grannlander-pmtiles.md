# Bygg pmtiles-filer för grannländer (Härdat läge per land)

**Syfte:** Skapa en `.pmtiles`-fil per grannland (Danmark, Norge, Finland,
Estland, Lettland, Litauen) så att operatören kan slå på Härdat läge för
respektive land — exakt samma flöde som existerande svensk
[sverige.pmtiles](../audit/pmtiles-build.md), bara med en URL per land.

**Resultat per land:**
- `<land>.pmtiles` (~150 MB–1 GB beroende på storlek + maxzoom)
- SHA-256-hash + bytes (för storlekskontroll i klienten)
- Uppladdad till samma R2-bucket som `sverige.pmtiles`
  (`pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev`, bucket `hv-pmtiles`)

**Datakälla:** Protomaps daily build
(`https://build.protomaps.com/<YYYYMMDD>.pmtiles`, ~80 GB världstäckande,
Protomaps Basemap-schema). Kräver INGEN registrering eller API-nyckel.
Licens: ODbL (OpenStreetMap data) — attribution redan i appen.

**Tid per land:** ~5 min extract + uppladdning. Hela uppsättningen ≈ 1 h.

---

## Förkrav

- **`pmtiles` CLI** (samma som för Sverige):
  https://github.com/protomaps/go-pmtiles/releases/latest
- **Wrangler CLI** (Cloudflare R2): `npm install -g wrangler` + `wrangler login`
- ~5–10 GB ledigt diskutrymme för intermediär storage
- ~1–4 GB RAM
- Stabilt nät (filerna laddas direkt från Protomaps build-host över Range-requests)

---

## Bbox per land (avrundade till 0.5°)

Bboxar matchar `pmtilesPresets[code].bbox` i [countries.js](../countries.js) —
om du ändrar gränserna här, **uppdatera även countries.js** så att klientens
center+zoom-pan landar inom täckningen.

| Land | West | South | East | North |
|---|---|---|---|---|
| **DK** Danmark | 8.0 | 54.5 | 15.5 | 58.0 |
| **NO** Norge (utan Svalbard) | 4.0 | 57.5 | 31.5 | 71.5 |
| **FI** Finland | 19.0 | 59.5 | 32.0 | 70.5 |
| **EE** Estland | 21.5 | 57.5 | 28.5 | 59.8 |
| **LV** Lettland | 20.5 | 55.5 | 28.5 | 58.2 |
| **LT** Litauen | 20.5 | 53.5 | 27.0 | 56.5 |

---

## Steg 1 — Extract från Protomaps daily build

Kör extracten med `--maxzoom=15` (samma som Sverige; gator + byggnader
synliga från z 14). För större länder (NO, FI) — överväg `--maxzoom=14`
om filen blir > 2 GB och du vill sänka storleken.

```bash
DATE=$(date -u +%Y%m%d)
SOURCE=https://build.protomaps.com/${DATE}.pmtiles

# DK ~ 200 MB
./pmtiles extract "$SOURCE" danmark.pmtiles --bbox=8.0,54.5,15.5,58.0   --maxzoom=15

# NO ~ 800 MB (utan Svalbard)
./pmtiles extract "$SOURCE" norge.pmtiles    --bbox=4.0,57.5,31.5,71.5  --maxzoom=15

# FI ~ 600 MB
./pmtiles extract "$SOURCE" finland.pmtiles  --bbox=19.0,59.5,32.0,70.5 --maxzoom=15

# EE ~ 250 MB
./pmtiles extract "$SOURCE" estland.pmtiles  --bbox=21.5,57.5,28.5,59.8 --maxzoom=15

# LV ~ 300 MB
./pmtiles extract "$SOURCE" lettland.pmtiles --bbox=20.5,55.5,28.5,58.2 --maxzoom=15

# LT ~ 300 MB
./pmtiles extract "$SOURCE" litauen.pmtiles  --bbox=20.5,53.5,27.0,56.5 --maxzoom=15
```

**Powershell-syntax (Windows):**

```powershell
$Date = (Get-Date -Format "yyyyMMdd")
$Source = "https://build.protomaps.com/$Date.pmtiles"

.\pmtiles.exe extract $Source danmark.pmtiles  --bbox=8.0,54.5,15.5,58.0  --maxzoom=15
# osv. — kopiera raden per land och byt bbox/filnamn.
```

---

## Steg 2 — Beräkna SHA-256 + bytes per fil

```bash
for f in danmark.pmtiles norge.pmtiles finland.pmtiles \
         estland.pmtiles lettland.pmtiles litauen.pmtiles; do
    if [ -f "$f" ]; then
        sha256=$(sha256sum "$f" | cut -d' ' -f1)
        bytes=$(stat -c%s "$f" 2>/dev/null || stat -f%z "$f")
        printf "%-20s %s  %d bytes\n" "$f" "$sha256" "$bytes"
    fi
done
```

Powershell:
```powershell
@('danmark','norge','finland','estland','lettland','litauen') | ForEach-Object {
    $f = "$_.pmtiles"
    if (Test-Path $f) {
        $h = (Get-FileHash $f -Algorithm SHA256).Hash.ToLower()
        $b = (Get-Item $f).Length
        "{0,-22} {1}  {2} bytes" -f $f, $h, $b
    }
}
```

Spara hash + bytes per land — du behöver dem i steg 4.

---

## Steg 3 — Ladda upp till R2

Samma bucket som `sverige.pmtiles` (`hv-pmtiles`):

```bash
wrangler r2 object put hv-pmtiles/danmark.pmtiles  --file=danmark.pmtiles
wrangler r2 object put hv-pmtiles/norge.pmtiles    --file=norge.pmtiles
wrangler r2 object put hv-pmtiles/finland.pmtiles  --file=finland.pmtiles
wrangler r2 object put hv-pmtiles/estland.pmtiles  --file=estland.pmtiles
wrangler r2 object put hv-pmtiles/lettland.pmtiles --file=lettland.pmtiles
wrangler r2 object put hv-pmtiles/litauen.pmtiles  --file=litauen.pmtiles
```

R2-bucket har redan public access + CORS för 7srapport.com (samma config
som `sverige.pmtiles` använder). URL:en följer mönstret:

```
https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/<filnamn>.pmtiles
```

Verifiera att Range-requests + CORS fungerar:
```bash
curl -I -H "Origin: https://7srapport.com" -H "Range: bytes=0-99" \
    https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/danmark.pmtiles
```
Du ska se `206 Partial Content` + `Access-Control-Allow-Origin: *`.

---

## Steg 4 — Uppdatera `countries.js`

För varje uppladdad fil — fyll i `pmtiles.url`, `pmtiles.bytes` och
`pmtiles.sha256` i [countries.js](../countries.js):

```js
DK: {
    code: 'DK', label: 'Danmark', flag: '🇩🇰',
    bbox: { west: 8.0, south: 54.5, east: 15.5, north: 58.0 },
    center: [56.0, 11.5], zoom: 7,
    pmtiles: {
        url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/danmark.pmtiles',
        bytes: 198765432,           // <-- från steg 2
        sha256: 'abcd1234ef…'       // <-- från steg 2
    }
},
// motsvarande för NO, FI, EE, LV, LT
```

**Notera:** SHA-256 hoppas över i klient för filer > 256 MB (Web Crypto
kräver hela filen i RAM, sprängde mobil-RAM vid 2+ GB). Bytes används som
storlekskontroll — om en cachad version inte matchar `bytes` invaliderar
klienten den och hämtar nytt. Så **rätt bytes-tal är obligatoriskt**;
sha256 är dokumentation.

Commit och push:
```bash
git commit -am "feat(grannlander): aktivera danmark.pmtiles (xxx MB)"
git push origin main
```

GitHub Pages auto-deployar och Service Worker invaliderar gamla cachen.
Lands-knappen `[🇩🇰 DK]` blir aktiv automatiskt vid nästa sidladdning
(eftersom `HVCountries.isReady('DK')` nu returnerar true).

---

## Steg 5 — Verifiera live

För varje färdiglagrat land:

1. Öppna https://7srapport.com/minkarta.html
2. Hard-reload (Ctrl+Shift+R)
3. Klicka på t.ex. `[🇩🇰 DK]` i kontroll-raden
4. Vyn pannar till Danmark (center 56°N, 11.5°E, zoom 7)
5. Härdat läge slås på — knappen `[🇩🇰 DK]` får aria-pressed=true
6. Klicka **Ladda ner offline** (samma knapp som för Sverige)
7. Progress-pille visar bytes nedladdade — bör matcha din uppladdade fil
8. Slå på flygplansläge → kartan funkar fortfarande
9. DevTools → Application → Cache Storage → `hv-pmtiles-v1` listar filen

Klicka `[🇩🇰 DK]` igen → härdat läge stängs av (aria-pressed=false).

---

## Underhåll

OSM-data uppdateras dagligen i Protomaps daily build. Bygg om kvartalsvis
(eller vid större kartändringar i regionen):

```bash
DATE=$(date -u +%Y%m%d)
SOURCE=https://build.protomaps.com/${DATE}.pmtiles

# Bygg om alla 6 (~30 min total)
./pmtiles extract "$SOURCE" danmark.pmtiles  --bbox=8.0,54.5,15.5,58.0  --maxzoom=15
# … osv

# Beräkna nya hash + bytes (steg 2)
# Ladda upp över befintliga (steg 3) — wrangler r2 put skriver över by default
# Uppdatera bytes + sha256 i countries.js (steg 4)
# Commit + push
```

Användarna får automatiskt nya filen vid nästa klick på lands-knappen
(content-length-mismatch invaliderar gamla cachen).

---

## Felsökning

**Extract-fel: "could not access source"**
→ Daily build-URL:n är typ `https://build.protomaps.com/20260505.pmtiles`.
  Verifiera att URL:n existerar (öppna i webbläsare → ska börja ladda).
  Om dagens build inte finns än, gå tillbaka 1–2 dagar.

**`pmtiles extract` hänger / är extremt långsam**
→ Source är ~80 GB; extracten gör Range-requests över WAN. På långsam lina
  kan det ta 10+ min. Kör med `--verbose` för progress.

**Filen blev större än väntat**
→ Sänk `--maxzoom` till 14 eller 13. Z 15 ger ~4× större fil än z 13.
  Z 14 räcker i de flesta operativa fall.

**Knappen i UI:n fortsätter visa disabled**
→ Verifiera att `pmtiles.url` är icke-tom OCH `pmtiles.bytes > 0` i
  countries.js. Båda krävs av `HVCountries.isReady(code)`.

**Härdat läge aktiveras men kartan visas svart/grå**
→ Pannar inte automatiskt till landet — kolla `center` + `zoom` i
  countries.js. Eller protomaps-leaflet kunde inte läsa pmtiles-headern;
  console.log → `[pmtiles] kunde inte läsa header`. Verifiera att
  filen faktiskt är giltig: `pmtiles show <fil>.pmtiles`.

---

## Referenser

- Sverige-bygget (samma metod, mer detaljer): [audit/pmtiles-build.md](../audit/pmtiles-build.md)
- Sverige-hillshade-bygget (samma R2-host, GeoTIFF→raster-pipeline):
  [verktyg/build-sverige-hillshade.md](build-sverige-hillshade.md)
- Protomaps daily build: https://docs.protomaps.com/guide/getting-started
- pmtiles CLI: https://github.com/protomaps/go-pmtiles
- Wrangler R2: https://developers.cloudflare.com/workers/wrangler/commands/#r2-object
