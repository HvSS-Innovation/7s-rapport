# Bygg sverige-hillshade.pmtiles (Fas 2)

**Syfte:** Skapa en raster-PMTiles med hillshade (relief-skuggning) för
hela Sverige, från Copernicus DEM GLO-30 (CC-BY 4.0). Filen serveras som
overlay ovanpå basemap (vanlig OTM eller PMTiles i Härdat läge) via
[topo-overlay.js](../topo-overlay.js).

**Resultat:**
- `sverige-hillshade.pmtiles` (~150–400 MB beroende på maxzoom + format)
- SHA-256-hash + bytes
- Uppladdad till samma R2-bucket som `sverige.pmtiles`

**Datakälla:** Copernicus DEM GLO-30 (Global Digital Elevation Model,
30 m upplösning). Licens CC-BY 4.0 — kräver ENDAST attribution, ingen
registrering eller API-nyckel. Täcker hela Sverige inklusive Treriksröset
(69° N), till skillnad från NASA SRTM-30 som upphör vid 60° N.

**Officiell källa:**
- Copernicus Data Space Ecosystem (CDSE):
  https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-mission-data/copernicus-dem
- Eller spegling via OpenTopography:
  https://portal.opentopography.org/raster?opentopoID=OTSDEM.032021.4326.3
  (kräver gratis konto, men datafilen är CC-BY)

---

## Förkrav

- **GDAL** (gdal_translate, gdaldem, gdalbuildvrt, gdal_merge)
  - Ubuntu/Debian: `sudo apt install gdal-bin python3-gdal`
  - Mac: `brew install gdal`
  - Windows: OSGeo4W (https://www.osgeo.org/projects/osgeo4w/) eller WSL
- **go-pmtiles CLI**: https://github.com/protomaps/go-pmtiles/releases
- **gdal2tiles.py** (medföljer GDAL)
- ~30 GB ledigt diskutrymme (DEM rå 5 GB + tiles intermediär ~15 GB + output)
- ~4–8 GB RAM
- ~1–4 timmar (beroende på datorhastighet och vald maxzoom)

---

## Steg 1 — Hämta Copernicus DEM för Sverige

Sverige ligger inom bbox: `lon 10.5–24.5, lat 55.0–69.5`. Copernicus
DEM är tilead i 1°×1° GeoTIFF-rutor.

### Via aws-cli (snabbast — GLO-30 hostas av AWS Open Data)

```bash
mkdir -p ~/sverige-dem && cd ~/sverige-dem

# AWS publika bucket — ingen registrering behövs
# Bucket: copernicus-dem-30m, region: eu-central-1
# Path-pattern: Copernicus_DSM_COG_10_N{lat}_00_E{lon}_00_DEM/Copernicus_DSM_COG_10_N{lat}_00_E{lon}_00_DEM.tif

for lat in $(seq 55 69); do
  for lon in $(seq 10 24); do
    name="Copernicus_DSM_COG_10_N${lat}_00_E0${lon}_00_DEM"
    [ "$lon" -ge 10 ] && name="Copernicus_DSM_COG_10_N${lat}_00_E0${lon}_00_DEM"
    [ "$lon" -ge 100 ] && name="Copernicus_DSM_COG_10_N${lat}_00_E${lon}_00_DEM"
    aws s3 cp --no-sign-request \
      "s3://copernicus-dem-30m/${name}/${name}.tif" \
      "${name}.tif" 2>/dev/null || true
  done
done

# Verifiera nedladdade filer
ls -lh *.tif | head
```

**Förväntad storlek:** ~5 GB totalt för Sverige.

### Alternativ: via OpenTopography

1. Skapa konto på https://portal.opentopography.org (gratis)
2. Välj "Copernicus Global DSM 30m" → ange bbox 10.5,55.0,24.5,69.5
3. Ladda ner som GeoTIFF
4. Hoppa till Steg 2

---

## Steg 2 — Slå ihop till en VRT (virtual raster)

VRT är en lättviktsfil som refererar till alla GeoTIFF utan att kopiera
data. Snabbare än `gdal_merge`.

```bash
gdalbuildvrt sverige-dem.vrt *.tif

# Bekräfta extent
gdalinfo sverige-dem.vrt | grep -E '(Size|Origin|Pixel)'
```

---

## Steg 3 — Generera hillshade som GeoTIFF

`gdaldem hillshade` simulerar solljus mot terrängen och producerar en
8-bit gråskaleraster där dalgångar är mörka och solbelysta sluttningar
ljusa. Utan `-multidirectional` försvinner sluttningar i N-S-riktning;
multi ger bättre balanserad bild.

```bash
gdaldem hillshade \
  -multidirectional \
  -z 1.5 \
  -compute_edges \
  sverige-dem.vrt \
  sverige-hillshade.tif

# z 1.5 = lätt vertikal överdrift för bättre läsbarhet
# multidirectional = slätare resultat än enkel sun_angle
# compute_edges = undvik svarta kanter mellan tile-fogar
```

**Förväntad storlek:** ~3 GB GeoTIFF.

---

## Steg 4 — Reprojicera till Web Mercator (EPSG:3857)

PMTiles raster-tiles måste vara i Web Mercator för att Leaflet ska kunna
visa dem korrekt mot OSM-tiles.

```bash
gdalwarp \
  -t_srs EPSG:3857 \
  -r bilinear \
  -multi -wo NUM_THREADS=ALL_CPUS \
  -co COMPRESS=LZW \
  sverige-hillshade.tif \
  sverige-hillshade-3857.tif
```

---

## Steg 5 — Tila och PMTilesa

`gdal2tiles.py` skapar PNG-tiles per zoomnivå. För overlay räcker
z 5–13 (z 13 = ~30m/pixel = matchar DEM-källan).

```bash
mkdir tiles-out
gdal2tiles.py \
  --zoom=5-13 \
  --processes=4 \
  --tilesize=256 \
  --webviewer=none \
  --xyz \
  sverige-hillshade-3857.tif \
  tiles-out/

# Förvandla XYZ-tiles → PMTiles
pmtiles convert tiles-out/ sverige-hillshade.pmtiles
```

**Tips:** Om filen blir för stor (>500 MB), sänk maxzoom till 11 eller
konvertera till WebP istället för PNG via `--tiledriver=WEBP` (kräver
nyare GDAL ≥3.6).

---

## Steg 6 — SHA-256 + storlek

```bash
sha256sum sverige-hillshade.pmtiles
stat -c%s sverige-hillshade.pmtiles      # Linux/WSL
# eller
wc -c < sverige-hillshade.pmtiles        # alla unix
```

På Windows PowerShell:
```powershell
Get-FileHash sverige-hillshade.pmtiles -Algorithm SHA256 | Select-Object Hash
(Get-Item sverige-hillshade.pmtiles).Length
```

---

## Steg 7 — Ladda upp till R2

Samma bucket som `sverige.pmtiles`. Använd `wrangler` eller R2-konsollen.

```bash
# Via wrangler
wrangler r2 object put 7s-pmtiles/sverige-hillshade.pmtiles \
  --file sverige-hillshade.pmtiles

# Verifiera
curl -I https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/sverige-hillshade.pmtiles
# Förväntat: 200 OK + Accept-Ranges: bytes + CORS-headers
```

CORS för 7srapport.com är redan konfigurerat på bucketen. Range-requests
fungerar automatiskt via Cloudflare R2.

---

## Steg 8 — Aktivera i klienten

Öppna [topo-overlay.js](../topo-overlay.js) och lägg in den nya källan i
`SOURCES`-objektet (avkommentera `'sverige-hillshade'` och fyll i):

```js
'sverige-hillshade': {
    kind: 'pmtiles-raster',
    url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/sverige-hillshade.pmtiles',
    expectedBytes: 287654321,    // <-- byt till storleken från Steg 6
    expectedSha256: 'abc...',     // <-- byt till hashen från Steg 6
    attribution: '© <a href="https://dataspace.copernicus.eu/">Copernicus DEM GLO-30</a> CC-BY 4.0',
    opacity: 0.55,
    minZoom: 5,
    maxZoom: 13,
    label: 'Höjdkurvor Sverige (offline)'
},
```

Ändra också `DEFAULT_SOURCE_ID` till `'sverige-hillshade'` så att den nya
källan är default när Härdat läge är på.

Commit + push. Topografi-knappen pekar nu på Sverige-filen och fungerar
helt offline efter pre-download.

---

## Underhåll

Copernicus DEM uppdateras sällan (senaste releasen 2022). Bygg om bara
om du höjer maxzoom eller byter algoritm. Bumpa filnamnet till
`sverige-hillshade-v2.pmtiles` så att gamla cachade versioner i klienten
invalideras automatiskt via storleks-checken i `topo-overlay.js`.

---

## Felsökning

**`gdal_translate: command not found`**
→ GDAL inte installerat. Se Förkrav.

**Tomma rutor i hillshade**
→ Saknade DEM-tiles. Kolla `ls *.tif` mot Sverige-bbox och kör `aws s3 cp`
  igen för saknade rutor.

**PMTiles-fil för stor (>1 GB)**
→ Sänk maxzoom till 11 eller konvertera till WebP.

**`pmtiles convert` OOM**
→ go-pmtiles streamar — om OOM:ar är det troligen ett pipe-läge. Kör med
  explicit källkatalog och destinationsfil utan stdin/stdout-pipe.

**Hillshade-tiles syns inte i klienten**
→ Kolla DevTools → Network. Tile-URL ska börja med pmtiles://. Om
  PMTiles-headern inte kan läsas (CORS, Range-stöd) loggar
  topo-overlay.js ett fel i konsolen.

---

## Referenser

- Copernicus DEM datasheet: https://spacedata.copernicus.eu/documents/20126/0/GEO1988-CopernicusDEM-SPE-002_ProductHandbook_I1.00.pdf
- AWS Open Data Copernicus DEM: https://registry.opendata.aws/copernicus-dem/
- gdaldem hillshade: https://gdal.org/programs/gdaldem.html#hillshade
- gdal2tiles: https://gdal.org/programs/gdal2tiles.html
- go-pmtiles: https://github.com/protomaps/go-pmtiles
- PMTiles raster spec: https://github.com/protomaps/PMTiles/blob/main/spec/v3/spec.md
