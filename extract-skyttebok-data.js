#!/usr/bin/env node
//
// extract-skyttebok-data.js — engångs-/repeterbart extraktionsskript.
// Läser h-skjutb-ak-2021.pdf och skriver skyttebok-data.js.
//
// Användning:
//   node extract-skyttebok-data.js
//
// Krav: pdftotext (Poppler / xpdf-tools) i PATH.
// På Windows följer det med Git for Windows
// (C:\Program Files\Git\mingw64\bin\pdftotext.exe).
//
// Skriptet läser BAS-sidorna (53–70) ur PDF:en och bygger
// `window.SKYTTEBOK_DATA` med:
//   - delmoment 1–12 (namn, övningsspann)
//   - övning 1–40 (titel, kortfakta, genomförandetext)
//   - kompetensprov BAS (id 'kp_bas')
//
// Om PDF:en byts ut körs detta skript om. Om en specifik övning får
// rörig parse — fixa fältet i den genererade filen direkt; skriptet är
// idempotent och perfekta resultat behöver inte återskapas exakt.

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PDF = path.join(__dirname, 'h-skjutb-ak-2021.pdf');
const OUT = path.join(__dirname, 'skyttebok-data.js');

if (!fs.existsSync(PDF)) {
  console.error('Hittar inte', PDF);
  process.exit(1);
}

// pdftotext med -layout bevarar tabellstruktur. -enc UTF-8 fixar åäö.
// PDF-sidnumreringen är förskjuten 2 mot logiska sidor. BAS övning 1-40
// + Kompetensprov ligger PDF-sidor 53-72.
const raw = execSync(
  `pdftotext -layout -enc UTF-8 -f 53 -l 72 "${PDF}" -`,
  { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
);

const lines = raw.split(/\r?\n/);

// ── Delmoment ───────────────────────────────────────────────────────────
// Hårdkodad lista enligt PDF Tabell 4.2 sid 51. Att försöka parsa just
// den tabellen ur layout-PDF är spilld tid — strukturen är stabil.
const DELMOMENT = [
  { nr: 1,  namn: 'Målbildsförevisning',                        ovningar: [] },
  { nr: 2,  namn: 'SAR Stående',                                ovningar: [1, 2, 3] },
  { nr: 3,  namn: 'SAR Knästående utan stöd',                   ovningar: [4, 5] },
  { nr: 4,  namn: 'SAR Liggande',                               ovningar: [6, 7, 8] },
  { nr: 5,  namn: 'SAR Knästående/sittande med stöd',           ovningar: [9, 10, 11] },
  { nr: 6,  namn: 'Eldhandgrepp',                               ovningar: [12, 13, 14, 15, 16] },
  { nr: 7,  namn: '100 m',                                      ovningar: [17, 18, 19, 20, 21] },
  { nr: 8,  namn: 'Ställningsväxling',                          ovningar: [22, 23, 24, 25] },
  { nr: 9,  namn: 'Målväxling och vändningar',                  ovningar: [26, 27, 28, 29, 30, 31, 32] },
  { nr: 10, namn: 'Mörker BAS',                                 ovningar: [33, 34, 35, 36] },
  { nr: 11, namn: 'Skyddsmask',                                 ovningar: [37, 38, 39, 40] },
  { nr: 12, namn: 'Kompetensprov BAS',                          ovningar: ['kp_bas'] },
];

// ── Övningsblock ────────────────────────────────────────────────────────
// Strategi:
//  - Hitta varje rad som börjar med "Övning <N>" (där N är ett heltal).
//  - Allt fram till nästa "Övning"-rad eller "Delmoment"-rad är blocket.
//  - I blocket plockar vi ut fält som börjar med kända prefix.

function cleanField(s) {
  // Tar bort alternativ-spalt (efter mer än 8 mellanslag) och dubbel-ws.
  // PDF:n har många övningar med två målyta-kolumner; vi behåller bara
  // den första (huvudmålytan) i kortfakta. Båda finns i raw-blocket.
  return s.replace(/\s{8,}.*$/, '').replace(/\s+/g, ' ').trim();
}

function parseOvning(blockLines) {
  const out = {
    titel: '',
    avstand: '',
    mal: '',
    stallning: '',
    antal: '',
    traffkrav: '',
    krav: '', // alternativ till traffkrav (Övn 25)
    malyta: '',
    fokus: '',
    genomforande: '',
    raw: blockLines.join('\n').trim(),
  };

  // Titel-rad: "Övning <N> <text>"
  // PDF har sporadiskt en alternativ kolumn som bleder in på titelraden
  // (t.ex. "Övning 40 Skyddsmask liggande     D-Zon minus A-Zon").
  // cleanField stryper allt efter 8+ mellanslag.
  const titleLine = blockLines[0] || '';
  const tm = titleLine.match(/^\s*Övning\s+(\S+)\s*(.*)$/);
  if (tm) out.titel = cleanField(tm[2]);

  // Fält-prefix att leta efter på enskilda rader.
  const FIELD_RE = [
    ['avstand',   /^\s*Avstånd\s+(.+)$/],
    ['mal',       /^\s*Mål\s+(.+)$/],
    ['stallning', /^\s*Ställning\s+(.+)$/],
    ['antal',     /^\s*Antal\s+(.+)$/],
    ['traffkrav', /^\s*Träffkrav\s+(.+)$/],
    ['krav',      /^\s*Krav\s+(.+)$/],
    ['malyta',    /^\s*Målyta\s+(.+)$/],
    ['fokus',     /^\s*Fokus\s+(.+)$/],
  ];

  let inGenomforande = false;
  const genomforandeLines = [];

  for (const ln of blockLines.slice(1)) {
    // KP-BAS-blocket använder "Genomförande och instruktion till skytten:"
    // istället för standardrubriken. Båda matchas här.
    if (/^\s*Genomförande[\s\S]*?(instruktörskontroller|instruktion till skytten):?/i.test(ln)) {
      inGenomforande = true;
      continue;
    }
    if (inGenomforande) {
      // Fotnot/sidnummer ska inte med.
      if (/^\s*\d{1,3}\s*$/.test(ln)) continue;
      if (/^\s*HANDBOK\s*$/.test(ln)) continue;
      genomforandeLines.push(ln.trimEnd());
      continue;
    }
    for (const [key, re] of FIELD_RE) {
      const m = ln.match(re);
      if (m) {
        out[key] = cleanField(m[1]);
        break;
      }
    }
  }

  // Trimma trailing tomma rader och packa ihop multipla blanka.
  out.genomforande = genomforandeLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return out;
}

// Hitta block: gå rad-för-rad, samla rader mellan Övning-headers.
const blocks = []; // [{nr: number|'kp_bas', lines: string[]}]
let currentNr = null;
let currentLines = [];

function flush() {
  if (currentNr !== null) blocks.push({ nr: currentNr, lines: currentLines });
  currentLines = [];
  currentNr = null;
}

for (let i = 0; i < lines.length; i++) {
  const ln = lines[i];

  // Hopp av sidhuvud "HANDBOK" och rena sidnummer
  if (/^\s*HANDBOK\s*$/.test(ln)) continue;
  if (/^\s*\d{1,3}\s*$/.test(ln) && currentNr === null) continue;

  const novM = ln.match(/^\s*Övning\s+(\d+)\b/);
  if (novM) {
    flush();
    currentNr = parseInt(novM[1], 10);
    currentLines.push(ln);
    continue;
  }

  // Kompetensprov BAS — eget block.
  // PDF har en rubrik "Kompetensprov Bas Liggande med stöd, knästående/sittande, stående".
  const kpM = ln.match(/^\s*Kompetensprov\s+Bas\b/i);
  if (kpM) {
    flush();
    currentNr = 'kp_bas';
    currentLines.push('Övning kp_bas Kompetensprov BAS');
    continue;
  }

  if (currentNr !== null) {
    // Ny "Delmoment X"-rubrik avslutar pågående block.
    if (/^\s*Delmoment\s+\d+\s*[–-]/.test(ln)) {
      flush();
      continue;
    }
    currentLines.push(ln);
  }
}
flush();

// Bygg övningsobjekt indexerat på nummer.
const ovningar = {};
for (const b of blocks) {
  ovningar[b.nr] = parseOvning(b.lines);
}

// ── Validering ──────────────────────────────────────────────────────────
const expected = [];
for (let i = 1; i <= 40; i++) expected.push(i);
expected.push('kp_bas');
const missing = expected.filter(n => !(n in ovningar));
if (missing.length) {
  console.warn('VARNING: saknar övning(ar):', missing.join(', '));
} else {
  console.log('OK — alla 40 BAS-övningar + kompetensprov hittade.');
}

// ── Skriv ut ────────────────────────────────────────────────────────────
const header = `// AUTO-GENERERAD av extract-skyttebok-data.js — rör inte manuellt.
// Källa: H SKJUTB AK 2021, sid 53–70 (BAS övning 1–40 + Kompetensprov).
// Återskapa: \`node extract-skyttebok-data.js\`
//
// Strukturer:
//   window.SKYTTEBOK_DATA.delmoment[]  — { nr, namn, ovningar[] }
//   window.SKYTTEBOK_DATA.ovningar[id] — { titel, avstand, mal, stallning,
//                                           antal, traffkrav, krav, malyta,
//                                           fokus, genomforande, raw }
//
// id = heltal 1..40 ELLER strängen 'kp_bas'.
`;

const body =
  'window.SKYTTEBOK_DATA = ' +
  JSON.stringify({ delmoment: DELMOMENT, ovningar }, null, 2) +
  ';\n';

fs.writeFileSync(OUT, header + '\n' + body, 'utf8');
console.log('Skrev', OUT, '(' + Object.keys(ovningar).length, 'övningar)');
