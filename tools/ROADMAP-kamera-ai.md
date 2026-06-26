# Kamera-AI-logg — Roadmap & dokumentation

Ett system som låter en **Android-telefon** skicka en live-bildström till en
**Windows-dator**, där en lokal AI-modell (**moondream** via **Ollama**)
analyserar bilderna och postar beskrivningen + foto till en **Signal-grupp**.
Hela kedjan körs lokalt, inga moln-API:er.

---

## 1. Arkitektur — ASCII-flödesschema

```
 +-------------------+                              +---------------------------+
 |  Android-telefon  |                              |      Windows-laptop       |
 |                   |      Tailscale VPN           |                           |
 |  [IP Webcam]      |   (100.x.x.x, fungerar       |  [Python-script]          |
 |  [Tailscale]      |    även över mobildata)      |                           |
 |                   |                              |                           |
 |         /shot.jpg | ---------------------------> | hamtar JPEG               |
 |     /sensors.json | <--------------------------- | GPS -> MGRS (mgrs)        |
 +-------------------+                              |          |                |
                                                    |          v                |
                                                    |  [Ollama localhost:11434] |
                                                    |   - moondream  (bild->EN) |
                                                    |   - llama3.2:1b(EN  ->SV) |
                                                    |          |                |
                                                    |          v                |
                                                    |  [signal-cli]             |
                                                    |   (Java, direkt via jar)  |
                                                    +------------|--------------+
                                                                 |
                                                                 v
                                                +----------------------------------+
                                                |         Signal-grupp             |
                                                |   - text: tid + MGRS + desc      |
                                                |   - bilaga: JPEG                 |
                                                +----------------------------------+
```

---

## 2. Sammanfattning (~100 ord)

En Android-telefon fungerar som en fjärrkamera via appen **IP Webcam**.
Telefonen och en Windows-laptop kopplas ihop genom **Tailscale**, så
datorn når telefonen även över mobildata. På laptopen kör **Ollama** två
små öppna AI-modeller lokalt: **moondream** beskriver bilden på engelska,
och **llama3.2:1b** översätter till svenska. Ett Python-script hämtar
bilder var 30:e sekund, frågar Ollama, hämtar GPS från telefonen och
konverterar till **MGRS-koordinat**. Resultatet skickas med bilden till
en **Signal-grupp** via **signal-cli** (Java). Ingen data lämnar
enheterna förrän i Signal-steget — allt AI-arbete är lokalt.

---

## 3. Återskapa systemet — steg för steg

### Förutsättningar
- Windows 10/11
- NVIDIA GPU rekommenderat (RTX-serie fungerar utmärkt)
- Android-telefon
- Signal-konto med ett mobilnummer

### 3.1 Installera Ollama
1. Ladda ner från [ollama.com](https://ollama.com) — Windows-installer
2. I PowerShell:
   ```
   ollama pull moondream
   ollama pull llama3.2:1b
   ```

### 3.2 Installera Python + paket
```
python --version              # kräver Python 3.10+
pip install requests pillow opencv-python mgrs packaging
```

### 3.3 Installera Java (Temurin)
- Ladda ner JDK från [adoptium.net](https://adoptium.net)
- Starta om terminalen efter installation
- Verifiera: `java --version`

### 3.4 Installera signal-cli
```powershell
Invoke-WebRequest `
  -Uri "https://github.com/AsamK/signal-cli/releases/download/v0.14.2/signal-cli-0.14.2.tar.gz" `
  -OutFile "$env:USERPROFILE\Downloads\signal-cli.tar.gz"
tar -xzf "$env:USERPROFILE\Downloads\signal-cli.tar.gz" -C "$env:USERPROFILE\Downloads"
```

Länka konto:
```
& "$env:USERPROFILE\Downloads\signal-cli-0.14.2\bin\signal-cli.bat" link -n "Laptop"
```
Scanna QR-koden med Signal-appen på telefonen.

Lista grupper för att hitta grupp-ID:
```
& "$env:USERPROFILE\Downloads\signal-cli-0.14.2\bin\signal-cli.bat" -a +46XXXXXXXXX listGroups
```

### 3.5 Installera Tailscale
- På **datorn:** [tailscale.com/download](https://tailscale.com/download)
- På **telefonen:** Play Store → Tailscale
- Logga in med samma konto på båda

### 3.6 Konfigurera telefonen
- Installera **IP Webcam** (av Pavel Khlebovich) från Play Store
- Aktivera **GPS / Sensor data** i appens inställningar
- Starta Tailscale på telefonen
- Starta IP Webcam → "Start server"
- Notera IP-adressen (`100.x.x.x:8080`)

### 3.7 Konfigurera scriptet
Öppna [webcam-ai-logg.py](webcam-ai-logg.py) och uppdatera:
```python
KAMERA_URL   = "http://100.88.51.128:8080"   # telefonens Tailscale-IP
SIGNAL_KONTO = "+46XXXXXXXXX"                # ditt Signal-nummer
SIGNAL_GRUPP = "...=="                       # grupp-ID från listGroups
SIGNAL_HOME  = r"C:\...\signal-cli-0.14.2"   # sökväg till signal-cli
INTERVALL_SEK = 30                           # sekunder mellan analyser
```

### 3.8 Kör
```
python webcam-ai-logg.py
```

### 3.9 Säkerhet (rekommenderat)
Blockera Ollama från internet — all AI-trafik går lokalt:
```powershell
New-NetFirewallRule `
  -DisplayName "Blockera Ollama internet" `
  -Direction Outbound `
  -Program "C:\Users\<USER>\AppData\Local\Programs\Ollama\ollama.exe" `
  -Action Block -Profile Any
```
Tillfälligt inaktivera vid modelluppdatering:
```powershell
Disable-NetFirewallRule -DisplayName "Blockera Ollama internet"
# ... pull ny modell ...
Enable-NetFirewallRule -DisplayName "Blockera Ollama internet"
```

---

## 4. Felsökning som vi stötte på under utvecklingen

| Problem | Orsak | Lösning |
|---------|-------|---------|
| Webbkameran visar en låsikon | IR-kamera/Windows Hello valdes | Använd telefonen via IP Webcam istället |
| Timeout mot telefon | Olika nätverk | Tailscale |
| Moondream svarar tomt på svenska | Modellen för liten för non-english | Översätt med llama3.2:1b efteråt |
| Översättning timeout | Moondream dålig på rena textuppgifter | Separat textmodell (llama3.2:1b) |
| Signal-meddelande blev en rad | `.bat` strippar newline i argument | Anropa Java-JAR direkt istället |
| Main class finns inte | Fel klass | `org.asamk.signal.Main` (inte `.App`) |
| UnicodeDecodeError | Svenska tecken i stderr | `.decode('utf-8', errors='replace')` |

---

## 5. Framtida features / önskemål

### 5.1 Rekommenderad hårdvara för fältbruk

**Kamera:** eufyCam S3 Pro (T88943W1)
- 4K, f/1.0 öppning, 1/1.8" sensor, MaxColor Vision (starlight)
- RTSP-stöd via HomeBase — strömmen kan hämtas direkt av Python/OpenCV
- IP67 vädertålig, solpanel/batteri
- Open source-bibliotek finns: [eufy-security-client](https://github.com/bropat/eufy-security-client)

**Uppkoppling per kameraposition (utan WiFi):**
```
eufy-kamera --WiFi--> 4G-router --mobildata--> Tailscale --> dator med Ollama
```
- Liten 4G-router (t.ex. GL.iNet Mango + 4G-dongle, ~500 kr)
- Tailscale installerat på routern — skapar VPN-tunnel automatiskt
- Datorn med Ollama når RTSP-strömmen via Tailscale (100.x.x.x)
- Fungerar var som helst med mobiltäckning

**Räckvidd i mörker (utan IR-lampa, passiv kamera):**

| Ljusförhållande | Räckvidd | Bildkvalitet |
|---|---|---|
| Gatljus i närheten (~1–10 lux) | 15–25 m | Bra, AI klarar analys |
| Molnigt, månsken (~0.01 lux) | 8–15 m | Grynig, former syns |
| Molnigt, inget månsken (~0.001 lux) | 3–8 m | Mycket brusig |
| Becksvart novembernatt | ~0–3 m | I princip blind |

**För riktigt mörker + regskyltar — rekommenderad hybridlösning:**
```
Termisk kamera (FLIR/Hikmicro, detekterar rörelse 200m+)
        |
        v  trigger vid rörelse
940nm IR-blixt + vanlig kamera (tar bild, läser skylt)
  (940nm är osynlig för blotta ögat, till skillnad från 850nm)
        |
        v
Ollama (AI-analys) --> Signal
```

### 5.2 Flera samtidiga kameror
- Stöd för **N kameror** parallellt med olika IP-adresser / RTSP-strömmar
- Konfigurerbart per-kamera: intervall, Signal-grupp, kamera-namn/tagg
- Trådpool: varje kamera i en egen worker så långsam analys inte blockerar övriga
- Gemensam loggfil med kamera-ID

### 5.3 IR-känsliga kameror (utan aktiv IR-belysning)
- **Starlight / low-light / IP-kameror** med Sony STARVIS-sensor eller liknande
- Hämta via **RTSP-ström** (bra stöd i OpenCV) istället för HTTP JPEG
- Nattobservationer utan att avslöja positionen (ingen IR-lampa)
- Vid behov: **940nm IR-belysare** (osynlig) + kamera känslig för 940nm

### 5.4 Detektion av fordon och registreringsskyltar
- Lägg till **YOLOv8/v10** eller liknande lokal objektdetektering som förfilter
  – låt bara bilder med fordon gå vidare till moondream (sparar tid)
- **OCR-steg**: kör [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) eller
  [EasyOCR](https://github.com/JaidedAI/EasyOCR) på detekterade skyltregioner
- Logga: `fordonstyp (sedan/suv/lastbil) | färg | regnr | tidpunkt | MGRS`

### 5.4 Smartare beslutslogik
- **Change detection** — skicka bara till Signal om scenen ändrats sedan förra analysen
  (perceptuellt hash eller bakgrundssubtraktion)
- **Deduplicering** av samma fordon inom X sekunder
- **Allowlist** av registreringsskyltar — tystna på "kända" fordon

### 5.5 Större / bättre vision-modell
- Testa **llava:13b** eller **qwen2.5-vl** lokalt (kräver mer VRAM)
- **SmolVLM2** när det finns i Ollama — snabbare än moondream
- Mätt: RTX 5070 klarar ~7B modeller i realtid

### 5.6 Rapportformat
- Återinför **7S-formatet** när extraktionen fungerar (kräver 3B+ textmodell)
- **Alternativa mallar**: METT-TC, SALUTE, etc.
- Strukturerad output i **JSON** för vidare systemintegration

### 5.7 Persistens & analys över tid
- Spara alla observationer i **SQLite** med embedding av beskrivningen
- Sökfunktion: *"när sågs en röd lastbil senast?"*
- Geografisk karta över observationer (MGRS → Leaflet)

### 5.8 Driftsäkerhet
- Automatisk återstart vid tappad anslutning till telefonen
- Watchdog om Ollama kraschar
- Startas automatiskt vid login (Windows Task Scheduler)
- Dashboard med senaste bild + logg (enkel Flask-app)

### 5.9 Privacy / PII
- Ansiktsblurring innan bilden skickas (moondream kan fortfarande beskriva)
- Lokal-bara-läge som loggar men aldrig skickar till Signal

---

## 6. Akustiskt drönare-detektionssystem (LoRa-mesh)

Ett distribuerat förvarningssystem med mikrofoner i trädtoppar som
detekterar drönarljud och larmar via LoRa till en central mottagare.

### 6.1 Arkitektur

```
                    [tradtopp]         [tradtopp]         [tradtopp]
                        |                  |                  |
                   +----------+       +----------+       +----------+
                   | Mikrofon |       | Mikrofon |       | Mikrofon |
                   | + ESP32  |       | + ESP32  |       | + ESP32  |
                   | + LoRa   |       | + LoRa   |       | + LoRa   |
                   +----+-----+       +----+-----+       +----+-----+
                        |  LoRa            |  LoRa            |  LoRa
                        +--------+---------+---------+--------+
                                 |
                                 v
                        +----------------+
                        | LoRa-gateway   |
                        | (mottagare)    |
                        +-------+--------+
                                |  USB/seriell
                                v
                        +----------------+
                        | Dator / RPi    |
                        | - databas      |
                        | - AI-analys    |
                        | - Signal-larm  |
                        +----------------+
```

### 6.2 Sensornod (varje trädtopp)

**Hårdvara per nod (~100–150 kr):**
- ESP32 + LoRa-modul (AliExpress, SX1276/SX1262)
- MEMS-mikrofon (INMP441 eller liknande, ~15 kr)
- LiPo-batteri (18650, ~30 kr) + liten solpanel (~40 kr)
- Väderskyddat hölje (IP65)

**Mjukvara på noden (MicroPython eller Arduino C):**
1. Lyssnar kontinuerligt via I2S-mikrofon
2. Kör lokal **FFT/spektralanalys** — drönare har distinkt frekvens ~200–800 Hz
3. Vid drönarliknande frekvenstopp som överstiger tröskel:
   - Skickar LoRa-paket: `nod_id | tidpunkt | konfidensgrad | frekvenstoppar`
4. Viloläge mellan analyser för att spara batteri

**Drönarsignatur:**
- Propellerfrekvens varierar med motortyp men ligger typiskt 200–800 Hz
- Harmoniska övertoner vid 2x och 3x grundfrekvensen
- Skiljer sig markant från fågelljud, vind, och fordonsbuller

### 6.3 LoRa-gateway (mottagare)

- LoRa-mottagare (samma modultyp) kopplad via USB/seriell till dator eller RPi
- Räckvidd: **2–10 km siktlinje** (LoRa i skog: ~1–3 km realistiskt)
- Samlar paket från alla noder
- Parsear och tidsstämplar inkommande larm

### 6.4 Central analys (dator / RPi)

**Databaslagring (SQLite):**
- Alla detektioner loggas: `nod_id, tidpunkt, konfidensgrad, frekvenstoppar`
- Historik för analys och mönsterigenkänning

**Triangulering:**
- Om 3+ noder detekterar samtidigt → uppskatta drönarens position
  baserat på tidsskillnad (TDoA) eller signalstyrka
- Plotta på karta (MGRS-koordinater)

**Integration med kamerasystemet:**
- Vid drönarlarm → trigga närmaste kamera att fotografera
- AI-analys av bilden bekräftar drönare visuellt
- Dubbelbekräftelse: ljud + bild = hög konfidens

**Signal-larm:**
- Vid bekräftad detektion → skicka till Signal-grupp:
  ```
  [2026-11-15 03:42:17]
  DRÖNARE DETEKTERAD
  Nod: Alfa-3 (konfidensgrad 87%)
  Position: 33V VP 123 456 (triangulerad)
  Frekvens: 412 Hz + övertoner
  ```

### 6.5 Framtida utveckling

- **AI-klassificering på noden**: TinyML (TensorFlow Lite Micro) för att
  skilja drönare från helikopter, motorsåg, etc. direkt på ESP32
- **Mesh-nätverk**: noder kan vidarebefordra varandras paket om gatewayen
  är utom räckhåll — utökar täckningsområdet
- **Riktningsbestämning**: stereo-mikrofoner (2 st per nod) ger
  ungefärlig riktning till ljudkällan
- **Spektrumbibliotek**: bygg databas över kända drönarmodeller
  (DJI Mavic, DJI FPV, militära, etc.) för modellidentifiering
- **Integration med radardata** eller ADS-B (för att filtrera bort
  legitim lufttrafik)

---

## 7. Filer i projektet

| Fil | Syfte |
|-----|-------|
| [webcam-ai-logg.py](webcam-ai-logg.py) | Huvudscript — produktion |
| [kamera-ai-logg.py](kamera-ai-logg.py) | Tidig version (ej längre använd) |
| [kamera-test.py](kamera-test.py) | Diagnostikverktyg för lokala kameror |
| [bild-test.py](bild-test.py) | Testar AI-kedjan med en statisk bild |
| webcam-logg.txt | Tidsstämplad loggfil (skapas vid körning) |
