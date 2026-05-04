# PMTiles bygg-pipeline (Sverige)

**Datum:** 2026-05-04 (uppdaterad — bytt från Planetiler-bygge till
Protomaps daily-extract pga schema-mismatch).
**Syfte:** Skapa `sverige.pmtiles` med **Protomaps Basemap-schema** så att
protomaps-leaflet:s renderare visar gator + byggnader korrekt. Snabbaste
vägen: `pmtiles extract` mot Protomaps publika daily-build.

> **Tidigare approach (kvar för referens):** Planetiler bygge från OSM
> extract producerar OpenMapTiles-schema, vilket protomaps-leaflet inte
> renderar fullt ut (bara landuse/water). Använd extract-vägen istället.

**Snabbpipeline (~5 min):**
```bash
# 1. Hämta pmtiles CLI (Windows-binär eller Linux/Mac equivalent)
curl -fsSL https://github.com/protomaps/go-pmtiles/releases/latest/download/go-pmtiles_*_Windows_x86_64.zip -o pmtiles-cli.zip
unzip pmtiles-cli.zip

# 2. Extracta Sverige från senaste Protomaps daily build
./pmtiles.exe extract \
  https://build.protomaps.com/$(date -u +%Y%m%d).pmtiles \
  sverige.pmtiles \
  --bbox=10.5,55.0,24.5,69.5 \
  --maxzoom=15

# 3. SHA-256 + bytes
sha256sum sverige.pmtiles
stat -c %s sverige.pmtiles  # eller wc -c
```

Resterande steg (R2 upload + uppdatera klient) är samma som beskrivet
nedan, men du hoppar över Planetiler-sektionen.

---

## Gamla pipeline (Planetiler-bygge — DEPRECATED för 7srapport.com)

Schema-mismatch — använd inte. Behållen för referens om annat
renderingssystem används framöver.

**Slutprodukt:**
- `sverige.pmtiles` — ~150–250 MB beroende på max-zoom
- SHA-256-hash för verifiering
- En GitHub Release med pmtiles-filen som attachment

---

## Krav

- **Disk:** ~3 GB ledigt (OSM-extract 800 MB + intermediär storage + 250 MB output)
- **RAM:** 4 GB minimum, 8 GB rekommenderat
- **Tid:** ~15–30 min på modern dator
- **Verktyg:** Docker (lättast på Windows + Mac + Linux)

Alternativ utan Docker: installera `planetiler` + `pmtiles` CLI manuellt.
Docker-vägen är dokumenterad här eftersom den är samma på alla OS.

---

## Setup

### Windows

1. Installera **Docker Desktop**: https://www.docker.com/products/docker-desktop/
   (efter installation: starta Docker Desktop, vänta tills "running")
2. Öppna **PowerShell** (eller Git Bash)
3. Skapa en arbetsmapp:
   ```powershell
   mkdir C:\pmtiles-build
   cd C:\pmtiles-build
   ```

### Mac / Linux

1. `brew install docker` (Mac) eller `sudo apt install docker.io` (Linux)
2. ```bash
   mkdir -p ~/pmtiles-build && cd ~/pmtiles-build
   ```

---

## Steg 1 — Bygg `sverige.pmtiles` med Planetiler

Planetiler är ett Java-verktyg från OnTheGoMap som:
- Hämtar OSM-extract automatiskt från Geofabrik
- Bygger OpenMapTiles-schema (kompatibelt med `protomaps-leaflet`)
- Skriver direkt till `.pmtiles` utan mellansteg
- Optimerar tile-storlek (drop-densest, max-bytes)

```bash
docker run --rm \
  -v "$(pwd):/data" \
  -e JAVA_TOOL_OPTIONS="-Xmx4g" \
  ghcr.io/onthegomap/planetiler:latest \
  --download \
  --area=europe/sweden \
  --output=/data/sverige.pmtiles \
  --maxzoom=13 \
  --force
```

**På Windows PowerShell** byt `$(pwd)` mot `${PWD}`:

```powershell
docker run --rm `
  -v "${PWD}:/data" `
  -e JAVA_TOOL_OPTIONS="-Xmx4g" `
  ghcr.io/onthegomap/planetiler:latest `
  --download `
  --area=europe/sweden `
  --output=/data/sverige.pmtiles `
  --maxzoom=13 `
  --force
```

**Parametrar:**
- `--maxzoom=13` — z 0–13 (~150 MB). Höj till 14 för mer detalj (+50 %), 15
  för full detalj (+200 %). Z 13 räcker för operativ kart-läsning, gator
  syns i städer.
- `--area=europe/sweden` — Geofabrik-extract. Andra alternativ:
  `europe/sweden-norrbotten` för bara Norrbotten, etc.
- `-Xmx4g` — Java-heap. Höj till `-Xmx8g` om datorn har RAM och Java OOM:ar.

**Output:** `sverige.pmtiles` på ~150 MB. Eta cirka 15 min på modern hårdvara.

---

## Steg 2 — Beräkna SHA-256

### Windows

```powershell
Get-FileHash sverige.pmtiles -Algorithm SHA256 | Select-Object -ExpandProperty Hash
```

### Mac / Linux

```bash
sha256sum sverige.pmtiles
# eller på Mac:
shasum -a 256 sverige.pmtiles
```

Spara hash:en — du behöver den i steg 4.

---

## Steg 3 — Ladda upp till GitHub Releases

GitHub Releases stöder filer upp till 2 GB med inbyggd Range-requests och
CORS open. Vår pmtiles på 150 MB passar bra.

### Via `gh` CLI (rekommenderas)

```bash
# Installera gh om du inte har det:
#   https://cli.github.com/

# Logga in en gång:
gh auth login

# Skapa release + ladda upp:
gh release create pmtiles-v1 sverige.pmtiles \
  --repo gitjoda71/7s-rapport \
  --title "PMTiles v1 — Sverige z 0–13" \
  --notes "Byggd $(date +%Y-%m-%d) från OpenStreetMap via Planetiler.
SHA-256: <klistra in hash från steg 2>"
```

### Via GitHub web

1. Öppna https://github.com/gitjoda71/7s-rapport/releases/new
2. Tag: `pmtiles-v1`
3. Title: `PMTiles v1 — Sverige z 0–13`
4. Description: SHA-256-hash + datum
5. Drag-drop `sverige.pmtiles` i "Attach binaries"
6. Klicka "Publish release"

**Resulterande URL** (du behöver den i steg 4):
```
https://github.com/gitjoda71/7s-rapport/releases/download/pmtiles-v1/sverige.pmtiles
```

---

## Steg 4 — Uppdatera 7srapport.com

Två konstanter i [pmtiles-layer.js](../pmtiles-layer.js) ska uppdateras:

```js
const SVERIGE_PMTILES_URL = 'https://github.com/gitjoda71/7s-rapport/releases/download/pmtiles-v1/sverige.pmtiles';
const SVERIGE_PMTILES_SHA256 = '<hash från steg 2>';
const SVERIGE_PMTILES_BYTES = 157000000; // ungefärlig storlek i bytes (uppdatera efter bygg)
```

Commit och push. CI deployar och appen pekar mot din nya fil.

---

## Steg 5 — Verifiera

1. Öppna https://7srapport.com/minkarta.html
2. Hard-reload (Ctrl+Shift+R)
3. Klicka **🛡 Härdat läge**
4. Första gången: appen frågar "Ladda ner Sverige offline (~150 MB)?"
5. Klicka Ja → progress-pille visar bytes nedladdade
6. När klar: SHA-256 verifieras automatiskt. Mismatch = avvisas, alert.
7. Pan över Sverige — alla tiles serveras lokalt utan utgående requests.

DevTools → Network → Offline → reload → kartan funkar fortfarande.

---

## Underhåll

OSM-data uppdateras dagligen. Bygg om kvartalsvis:

```bash
# Hämta senaste extract + bygg ny pmtiles
docker run --rm -v "$(pwd):/data" -e JAVA_TOOL_OPTIONS="-Xmx4g" \
  ghcr.io/onthegomap/planetiler:latest \
  --download --area=europe/sweden \
  --output=/data/sverige.pmtiles --maxzoom=13 --force

# Beräkna ny SHA-256
sha256sum sverige.pmtiles

# Skapa ny release med ny tag
gh release create pmtiles-v2 sverige.pmtiles \
  --title "PMTiles v2 — Sverige z 0–13 ($(date +%Y-%m-%d))"

# Uppdatera URL + hash i pmtiles-layer.js, commit, push.
```

Användarna får automatiskt nya filen vid första aktivering av Härdat läge
efter deploy (gamla cachade filen invalideras eftersom URL:en byts).

---

## Felsökning

**Docker-fel: "Cannot connect to the Docker daemon"**
→ Starta Docker Desktop först.

**Planetiler OOM (Out of Memory)**
→ Höj `-Xmx4g` till `-Xmx8g` eller `-Xmx12g`. Stänga andra appar.

**`sverige.pmtiles` är för stor (>500 MB)**
→ Sänk `--maxzoom` till 12. Eller använd `--area=europe/sweden-syd` (om
det finns) för regional täckning.

**Range-requests funkar inte i klient**
→ Kontrollera att GitHub Release är "published", inte "draft".
→ Verifiera CORS: `curl -I -H "Origin: https://7srapport.com" <URL>` ska
  ge `Access-Control-Allow-Origin: *`.

**SHA-256-mismatch i klient**
→ GitHub Release-fil kan vara olika från lokal — kontrollera att du laddat
  upp rätt fil. Beräkna hash på den nedladdade igen:
  `curl -L <URL> | sha256sum`.

---

## Referenser

- Planetiler: https://github.com/onthegomap/planetiler
- PMTiles-spec: https://github.com/protomaps/PMTiles/tree/main/spec
- Geofabrik OSM-extracts: https://download.geofabrik.de/europe/sweden.html
- protomaps-leaflet: https://github.com/protomaps/protomaps-leaflet
