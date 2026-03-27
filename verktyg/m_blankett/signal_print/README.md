# M-blankett Signal -> PDF -> Skrivare

> **OBS! Detta projekt ar under utveckling och har annu inte testats fullt ut.**
> Det ar ett personligt hobbyprojekt. Anvandning sker pa egen risk.
> Jag tar inget ansvar for eventuella fel, skador eller problem som kan uppsta
> vid anvandning av denna programvara.

Automatisk pipeline som lyssnar pa en Signal-grupp, tar emot meddelanden, formaterar dem som svenska M-blanketter (PDF) och skriver ut dem automatiskt.

**Digitalt in. Analogt ut. Helt automatiskt.**

---

## Installationsguide (steg for steg)

Har forklaras hur du installerar allt fran grunden pa en ny dator. Valj ditt operativsystem nedan.

### Forutsattningar

Du behover:
- En internetanslutning
- Rattigheter att installera program pa datorn

---

### Windows

**1. Installera Python**

Ga till https://www.python.org/downloads/ och ladda ner senaste versionen (3.10 eller nyare). Kor installationsfilen.

VIKTIGT: Kryssa i **"Add Python to PATH"** langst ner i installationsfonstret innan du klickar Install.

For att kontrollera att det fungerade, oppna **Kommandotolken** (sok efter "cmd" i Start-menyn) och skriv:
```
python --version
```
Du ska se nagonting i stil med `Python 3.12.x`.

**2. Installera Git**

Ga till https://git-scm.com/download/win och ladda ner installationsfilen. Kor den med standardinstallningarna.

**3. Ladda ner projektet**

Oppna Kommandotolken och skriv:
```
cd %USERPROFILE%\Desktop
git clone https://github.com/gitjoda71/m-blankett.git
cd m-blankett\signal_print
```
Nu finns projektmappen pa ditt skrivbord.

**4. Installera beroenden**

I samma terminal, skriv:
```
pip install -r requirements.txt
```

**5. Testa att det fungerar**

```
python m_blankett_pdf.py
```
Nu ska det skapas PDF-filer i mappen `output/`. Oppna dem och kontrollera att de ser ratt ut.

---

### Mac

**1. Installera Homebrew (pakethanterare)**

Oppna **Terminal** (sok i Spotlight med Cmd+Mellanslag) och klistra in:
```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
Folj instruktionerna pa skarmen.

**2. Installera Python och Git**

```
brew install python git
```

**3. Ladda ner projektet**

```
cd ~/Desktop
git clone https://github.com/gitjoda71/m-blankett.git
cd m-blankett/signal_print
```

**4. Installera beroenden**

```
pip3 install -r requirements.txt
```

**5. Testa att det fungerar**

```
python3 m_blankett_pdf.py
```
PDF-filer skapas i mappen `output/`.

---

### Linux (Ubuntu/Debian)

**1. Installera Python och Git**

Oppna en terminal och skriv:
```
sudo apt update
sudo apt install python3 python3-pip git
```

**2. Ladda ner projektet**

```
cd ~/Desktop
git clone https://github.com/gitjoda71/m-blankett.git
cd m-blankett/signal_print
```

**3. Installera beroenden**

```
pip3 install -r requirements.txt
```

**4. Testa att det fungerar**

```
python3 m_blankett_pdf.py
```
PDF-filer skapas i mappen `output/`.

---

## Konfigurera Signal-automatiken

Nar du har testat att PDF-genereringen fungerar kan du koppla pa Signal-lyssnaren. Det kraver Docker.

### 1. Installera Docker

- **Windows:** Ladda ner Docker Desktop fran https://www.docker.com/products/docker-desktop/
- **Mac:** `brew install --cask docker` eller ladda ner fran https://www.docker.com/products/docker-desktop/
- **Linux:** `sudo apt install docker.io`

### 2. Starta signal-cli-rest-api

```bash
docker run -d --name signal-api \
  -p 8088:8080 \
  -v $HOME/.local/share/signal-cli:/home/.local/share/signal-cli \
  -e MODE=json-rpc \
  bbernhard/signal-cli-rest-api
```

Pa Windows, byt ut `$HOME` mot `%USERPROFILE%`.

### 3. Registrera ditt telefonnummer (forsta gangen)

```bash
curl -X POST 'http://localhost:8088/v1/register/<+46DITTNUMMER>'
```
Du far ett SMS med en verifieringskod. Ange den:
```bash
curl -X POST 'http://localhost:8088/v1/register/<+46DITTNUMMER>/verify/<KOD>'
```

### 4. Skapa konfigurationsfil

Kopiera exempelfilen:
```bash
cp config.example.env .env
```

Oppna `.env` i en texteditor och fyll i:
```ini
SIGNAL_GROUP_ID=din-grupp-id-har
PRINTER_NAME=default
PORT=8080
```

### 5. Koppla ihop Signal med M-blankett

```bash
curl -X POST 'http://localhost:8088/v1/webhook' \
  -H 'Content-Type: application/json' \
  -d '{"url": "http://localhost:8080/api/v1/webhook"}'
```

### 6. Starta!

```bash
python main.py
```

Klart! Alla meddelanden i Signal-gruppen genererar nu automatiskt M-blanketter och skriver ut dem pa den forvalda skrivaren.

---

## Testa utan Signal

Du kan generera test-PDF:er utan att ha Signal konfigurerat:

```bash
python m_blankett_pdf.py
```

Eller med en specifik fil:

```bash
python m_blankett_pdf.py ../tests/test1_valstrukturerad.txt output/test.pdf
```

Testa utskrift:

```bash
python printer.py output/test1_valstrukturerad.pdf
```

---

## Meddelandeformat

Meddelanden i Signal-gruppen skrivs i detta format:

```
TILL: Insatskompaniet
FRAN: Bataljonsstaben
TID: 251400A MAR 2026
AMNE: ORDER LANGBEN
SIGN: N. Nilsson
---
1. LAGE
Fienden befinner sig soder om...

2. UPPGIFT
Insatskompaniet ska losa...
```

**Alla falt ar valfria.** Om falt saknas lamnas de tomma i blanketten. Om ingen struktur hittas alls hamnar hela texten i brodtexten. Om TID saknas genereras ett TNR (tidnummerreferens) automatiskt.

---

## Plattformsstod

| OS | Utskrift | Status |
|----|----------|--------|
| **Windows** | SumatraPDF eller Windows shell | Installera [SumatraPDF](https://www.sumatrapdfreader.com/) for tyst utskrift |
| **Mac** | `lp` (inbyggt) | Fungerar direkt |
| **Linux** | `lp` (CUPS) | Fungerar direkt |

## Konfiguration (.env)

| Variabel | Standard | Beskrivning |
|----------|----------|-------------|
| `SIGNAL_GROUP_ID` | *(tom)* | Signal-gruppens ID. Tom = alla grupper |
| `PRINTER_NAME` | `default` | Skrivarnamn. `default` = systemets standardskrivare |
| `PRINTER_METHOD` | `auto` | `auto`, `lp`, `sumatrapdf`, `osprint` |
| `OUTPUT_DIR` | `./output` | Mapp for genererade PDF:er |
| `PORT` | `8080` | Port for webhook-servern |
| `AUTO_PRINT` | `true` | Skriv ut automatiskt (`true`/`false`) |

## Arkitektur

```
Signal-grupp
    |
    v
signal-cli-rest-api (Docker)
    | webhook POST
    v
signal_listener.py (FastAPI)
    |
    |-> m_blankett_pdf.py  ->  PDF-fil
    |
    |-> printer.py  ->  Skrivare
```

## Beroenden

- Python 3.10+
- fpdf2 (PDF-generering)
- FastAPI + uvicorn (webhook-server)
- python-dotenv (konfiguration)
- Docker (for signal-cli-rest-api)
