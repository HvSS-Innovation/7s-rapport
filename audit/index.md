# Audit-katalog — översikt

Denna mapp innehåller statisk audit, OPSEC-rapport, roadmap och löpande session-rapporter för 7S Rapport. Skapad 2026-04-30 i samband med första helhetsgenomgång.

## Dokument

| Fil | Innehåll |
|---|---|
| [audit.md](audit.md) | Statisk kodanalys: arkitektur, externa runtime-domäner, permissions-trigger-matris, CSP-bedömning, storage-inventering, fem icke-uppenbara förbättringskandidater. |
| [security.md](security.md) | OPSEC-bedömning per krav 1–14 i hotmodellen. Färdig kod för "Glöm allt"-knapp och form-sweep. Rekommenderad CSP per resurstyp. Lista av sårbarhetstester och deras status. |
| [roadmap.md](roadmap.md) | Tre svängar (idag/veckan/vision). Per punkt: problem → lösning → tid → risk → mätbart. Avslutas med prioriteringslista för Sväng 1. |
| [cot-fuzz.html](cot-fuzz.html) | Självständig regression-sida för CoT-XML-escape. 16 auto-test-fall (XML-meta, försök bryta ut, CDATA, unicode, citat-bomb, samt non-string input: null/undefined/nummer/boolean/object/array). Verifierar både att DOMParser accepterar resultatet och att `<remarks>`-textnodens innehåll bevaras. Öppna direkt: `https://7srapport.com/audit/cot-fuzz.html`. |
| [tnr-fuzz.html](tnr-fuzz.html) | Regression-sida för `parseTnrToISO` — hemvärnets TNR-format → UTC ISO-stämpel. 14 auto-test-fall: tom/null/undefined/streck → fallback till nu; kort TNR; komplett TNR med år; okänd månad; specifika datum (skottdag, sista minuten december); ogiltig dag (FEB 30, dokumenterar JS Date-wrapping); trasig input. Manuell paste-ruta. Öppna direkt: `https://7srapport.com/audit/tnr-fuzz.html`. |
| [session-1.md](session-1.md) | Pass 1 (2026-04-30): passiva geolocation-prompts borttagna, no-referrer/notranslate meta, opsec.js form-sweep. |
| [session-2.md](session-2.md) | Pass 2 (2026-04-30): CoT-XML-escape, opsec.html med Glöm enheten-knappen, footer-länk. |
| [session-3.md](session-3.md) | Pass 3 (2026-04-30): CSP-pilot på opsec.html, format-detection, robust SW install, noscript-fallback, karttile-regression-fix (strict-origin), PWA-capable + manifest, refactor av escapeXml och parseTnrToISO. |
| [session-4.md](session-4.md) | Pass 4 (2026-04-30): tnr-fuzz, JSON.parse-safety, SW-cache-regression-fix (403-tiles fastnade), select-stöd i opsec.js, aria-label på footer-länkar. |

## Status — Sväng 1 (idag)

| Punkt | Status | Commit |
|---|---|---|
| 1.1 Passiva geolocation-prompts borta | ✅ | `bbdbd30` |
| 1.2 CSP-skärpning på alla sidor | ⚙ Pilot på opsec.html (`61e7ea7`); rapportsidor återstår |
| 1.3 no-referrer + notranslate meta | ✅ | `bbdbd30` |
| 1.4 CoT-XML-escape | ✅ | `85ade1d` |
| 1.5 "Glöm enheten"-knapp | ✅ | `56ea164` |
| 1.6 opsec.js form-sweep | ✅ | `bbdbd30` |
| 1.7 Emoji → SVG-ikoner | ⏳ Skippad i denna omgång (stor sveptid; görs när inline-script är utbruten) |
| 1.8 Root-städ | ⏳ Avvaktar beslut om screenshots / gamla XML-källfiler |

## Hur navigera

- **Vill veta vad som hittades:** `audit.md` sektion 1–9.
- **Vill veta vad som är OPSEC-säkert:** `security.md` sektion 1–14.
- **Vill veta vad som är planerat:** `roadmap.md` Sväng 1/2/3.
- **Vill verifiera CoT-XML-escape håller:** öppna `cot-fuzz.html` i browser.
- **Vill veta vad som hände senast:** senaste `session-N.md`.

## Konventioner

- Audit-dokument är skrivna en gång och uppdateras sällan. När de är inaktuella, skriv ny `session-N.md` istället för att redigera tidigare dokument.
- `roadmap.md` är levande — markera punkter som klara med commit-hash i tabellen ovan istället för att redigera roadmapen själv.
- `cot-fuzz.html` är ett *test*, inte ett dokument. Den ska alltid producera grön banner vid besök i live-prod. Om den röd-flaggar, har en regression smugit sig in i CoT-genereringen och måste fixas innan vidare arbete.

## Inte i audit-mappen

- README.md i repo-rot — användarens egna utvecklingsdagbok, inte denna audit.
- `roadmap-*.md` i repo-rot — feature-roadmaps från innan auditen (minkarta v1–v6, sensorskiss v1, mineringar). De är historik och bör konsolideras i Sväng 2 men inte tas bort.
