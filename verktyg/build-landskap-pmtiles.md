# Bygg PMTiles per landskap (offline-karta i bitar)

Recept för att bygga + hosta en `.pmtiles`-fil per svenskt landskap, så att
landskaps-väljaren (`shared/landskap-offline.js`, öppnas från "Ladda ner
offline"- och "Härdat läge"-knapparna) kan ladda ner ett landskap i taget i
stället för hela Sverige (~4,1 GB) i en klump.

Samma mönster som [`build-grannlander-pmtiles.md`](./build-grannlander-pmtiles.md),
bara med 25 landskap i stället för 6 grannländer. Klient-koden (`landskap.js`)
är redan på plats — det som saknas är de byggda filerna + ifyllda presets.

---

## Genväg: extrahera ur den befintliga `sverige.pmtiles`

`pmtiles extract` kan klippa ut ett bbox ur en **fjärr**-PMTiles via HTTP
Range-requests. Eftersom `sverige.pmtiles` redan ligger på R2 (rätt
Protomaps-schema, maxzoom 15) behöver du **inte** ladda ner Protomaps planet-
build — extrahera landskapen direkt ur Sverige-filen:

```bash
SRC="https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/sverige.pmtiles"
MAXZOOM=15   # 15 = gator+byggnader (som grannländerna). 13 = ~4× mindre filer.

pmtiles extract "$SRC" skane.pmtiles --bbox=12.4517,55.3392,14.5863,56.5328 --maxzoom=$MAXZOOM
```

(Vill du i stället bygga ur en lokal planet/Sverige-fil: byt `SRC` till
sökvägen till `.pmtiles`-filen på disk — allt annat är identiskt.)

---

## 1. Förutsättningar

- `pmtiles` CLI (Go): https://github.com/protomaps/go-pmtiles/releases
- `wrangler` (Cloudflare) för R2-upload, eller valfri R2/S3-klient.
- Tillgång till samma R2-bucket som `sverige.pmtiles` (bucket `hv-pmtiles`,
  publik dev-URL `pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev`).
- CORS på bucketen tillåter redan `7srapport.com` (samma som Sverige-filen) —
  landskaps-filerna ärver det, ingen ny CORS-regel behövs.

---

## 2. Bygg alla 25 landskap

Bbox:arna nedan är beräknade ur Lantmäteriets landskapsgeometri
(`perliedman/svenska-landskap`, CC0) — exakt samma som `landskap.js` använder.
Ordning: Götaland, Svealand, Norrland.

```bash
#!/usr/bin/env bash
set -euo pipefail
SRC="https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/sverige.pmtiles"
MAXZOOM=15
OUT=./landskap-pmtiles
mkdir -p "$OUT"

# id  west south east north   (# Namn)
LANDSKAP=(
  "blekinge 14.3901 56.0003 16.0582 56.5035"        # Blekinge
  "bohuslan 11.1069 57.6886 12.2287 59.1014"        # Bohuslän
  "dalsland 11.6518 58.3799 12.7824 59.2637"        # Dalsland
  "gotland 18.11 56.91 19.3356 58.3914"             # Gotland
  "halland 11.9014 56.3241 13.4675 57.6327"         # Halland
  "skane 12.4517 55.3392 14.5863 56.5328"           # Skåne
  "smaland 13.0771 56.2974 16.7842 58.2718"         # Småland
  "vastergotland 11.7856 57.1455 14.7396 59.0331"   # Västergötland
  "oland 16.3917 56.2089 17.1242 57.3592"           # Öland
  "ostergotland 14.4397 57.6996 16.9386 59.0187"    # Östergötland
  "dalarna 12.1377 59.8541 16.7048 62.2675"         # Dalarna
  "narke 14.2891 58.6462 15.8621 59.473"            # Närke
  "sodermanland 15.6166 58.6161 18.4917 59.4914"    # Södermanland
  "uppland 16.6242 59.2231 19.0822 60.6433"         # Uppland
  "varmland 11.6911 58.761 14.79 61.056"            # Värmland
  "vastmanland 14.3318 59.1979 16.9193 60.1951"     # Västmanland
  "gastrikland 16.131 60.1886 17.367 61.0556"       # Gästrikland
  "halsingland 14.6864 60.9921 17.5236 62.3435"     # Hälsingland
  "harjedalen 12.0561 61.5639 14.9395 62.9734"      # Härjedalen
  "jamtland 11.9746 62.2808 16.999 65.1189"         # Jämtland
  "lappland 14.3259 63.8801 23.2694 69.0581"        # Lappland (stort — kan bli stor fil)
  "medelpad 14.7811 62.1374 17.7475 62.947"         # Medelpad
  "norrbotten 19.6288 65.0564 24.1553 68.1431"      # Norrbotten
  "vasterbotten 18.7569 63.5224 21.585 65.381"      # Västerbotten
  "angermanland 15.2996 62.4822 19.7792 64.538"     # Ångermanland
)

for row in "${LANDSKAP[@]}"; do
  read -r id w s e n <<< "$row"
  echo ">>> $id  bbox=$w,$s,$e,$n"
  pmtiles extract "$SRC" "$OUT/$id.pmtiles" --bbox="$w,$s,$e,$n" --maxzoom=$MAXZOOM
done
echo "Klart. Filer i $OUT/"
ls -la "$OUT"
```

> **Storlek:** ett mellanstort landskap blir grovt ~50–150 MB vid maxzoom 15.
> Lappland (störst) kan bli rejält större — sänk dess `--maxzoom` till 13 om
> filen blir opraktisk. `--maxzoom=13` ger ~4× mindre filer rakt av men gator i
> tätorter syns först vid 14–15.

---

## 3. Ladda upp till R2

```bash
for f in ./landskap-pmtiles/*.pmtiles; do
  name=$(basename "$f")
  wrangler r2 object put "hv-pmtiles/$name" --file="$f" --content-type=application/octet-stream
done
```

---

## 4. Fyll i `landskap.js`-presets

Klienten aktiverar ett landskap automatiskt så fort `url` + `bytes` är ifyllda.
Kör detta för att skriva ut raderna att klistra in i `pmtiles: { … }` per
landskap (`bytes` = exakt filstorlek, `sha256` informativt — hash-verifiering
hoppas över för filer > 256 MB, men `bytes`-mismatch invaliderar gamla cachade
versioner efter rebuild):

```bash
BASE="https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev"
for f in ./landskap-pmtiles/*.pmtiles; do
  id=$(basename "$f" .pmtiles)
  bytes=$(stat -c%s "$f" 2>/dev/null || stat -f%z "$f")
  sha=$(sha256sum "$f" 2>/dev/null | cut -d' ' -f1 || shasum -a 256 "$f" | cut -d' ' -f1)
  echo "$id -> url: '$BASE/$id.pmtiles', bytes: $bytes, sha256: '$sha'"
done
```

Klistra in i respektive `presets.<id>.pmtiles` i `landskap.js`. Exempel:

```js
skane: {
    id: 'skane', namn: "Skåne", landsdel: "Götaland", kod: 1,
    bbox: { west: 12.4517, south: 55.3392, east: 14.5863, north: 56.5328 },
    center: [55.936, 13.519], zoom: 7,
    pmtiles: {
        url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/skane.pmtiles',
        bytes: 94371840,
        sha256: '…'
    }
},
```

Inget annat behöver röras — väljaren plockar upp `isReady(id)` automatiskt och
"Kommer snart" byts mot "Ladda ner" för det landskapet.

---

## 5. Reproducera `landskap.js` + `landskap-geo.js` (om geometrin behöver byggas om)

Datat kommer från `perliedman/svenska-landskap` (CC0, bygger på Lantmäteriets
Distriktskarta). `landskap-geo.js` är den förenklade geometrin för väljarens
SVG-karta; `landskap.js` är presets + bbox. Bygg om så här:

```bash
curl -sL -o landskap-klippt.geojson \
  "https://raw.githubusercontent.com/perliedman/svenska-landskap/master/svenska-landskap-klippt.geo.json"
node simplify-landskap.js   # → landskap-geo.out.js  + landskap-bboxes.json
node gen-landskap-js.js     # → landskap.out.js  (läser landskap-bboxes.json)
# kopiera landskap-geo.out.js → landskap-geo.js, landskap.out.js → landskap.js
```

`simplify-landskap.js` (Douglas-Peucker tol 0.006° + 3-decimalers avrundning,
droppar mikro-öar och hål; ~40 500 → ~3 600 punkter, ~60 KB) och
`gen-landskap-js.js` (presets + auto-zoom per landskap) ligger i samma mapp som
detta recept. Ändra `MAXZOOM`/tolerans där om du vill ha annan upplösning.

---

## OPSEC

- Landskaps-filerna ligger på **vår egen R2** — att ladda ner ett landskap
  läcker bara "någon hämtade landskaps-filen X" till R2-loggen, **inte** vilket
  delområde operatören tittar på (till skillnad från raster-bulk mot
  OpenTopoMap, som både bryter OSM:s ToS och avslöjar intresseområdet i en
  burst). Detta är därför den OPSEC-rena vägen — samma resonemang som hela
  Härdat läge bygger på.
- Efter nedladdning serverar service-workern alla Range-requests lokalt ur
  `hv-pmtiles-v1` → noll utgående anrop för kart-visning inom landskapet.
