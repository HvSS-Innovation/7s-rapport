// roadmap-data.js — datakälla för roadmap.html (in-app roadmap).
//
// Datamodell (window.ROADMAP_DATA):
//   columns[]    — fast lista med 4 kolumner. Ordningen styr UI-flödet.
//   items[]      — varje önskemål/funktion. Fält:
//     id         — unik nyckel
//     title      — kort rubrik
//     desc       — fritext, max 1-2 meningar
//     column     — vilken kolumn ('wished'|'soon'|'inprogress'|'done')
//     tags[]     — valfria kategorier för visning
//     date       — ISO-datum när item nådde nuvarande kolumn (för 'done')
//
// Detta är manuellt uppdaterad — uppdatera vid release eller när
// önskemål kommer in via feedback-länken. Ingen GitHub-integration.

window.ROADMAP_DATA = {

  columns: [
    { id: 'wished',     name: 'Önskat',        desc: 'Förslag och idéer som inte är planerade än.' },
    { id: 'soon',       name: 'Kommer snart',  desc: 'Plan finns, väntar på sitt utvecklingsfönster.' },
    { id: 'inprogress', name: 'Pågår',         desc: 'Arbete pågår — kommer i nästa eller överskådlig version.' },
    { id: 'done',       name: 'Klart',         desc: 'Levererat och i drift på 7srapport.com.' }
  ],

  // Senast uppdaterad
  updated: '2026-05-12',

  items: [

    // ── KLART ─────────────────────────────────────────────────────────
    {
      id: 'v01-positionering-data',
      title: 'v0.1 — Positionering & Mina data',
      desc: 'Tydlig disclaimer på alla sidor (privatutvecklat, inte FM-kopplat), ny sida "Mina data & säkerhetskopia" med JSON-export/import, iOS-ITP-notis efter inaktivitet.',
      column: 'done',
      tags: ['Verktyg', 'Säkerhet'],
      date: '2026-05-12'
    },
    {
      id: 'v02-ramsor',
      title: 'v0.2 — Ramsor-flik',
      desc: 'Ny tab RAMSOR med roll-vald vy (Sjv/Sig/GrpC/PlutC/Förare), sök och "Övriga ramsor"-expander. Innehåll vid lansering: 5 sjv + 3 sig.',
      column: 'done',
      tags: ['Ramsor'],
      date: '2026-05-12'
    },
    {
      id: 'v03-roadmap',
      title: 'v0.3 — In-app roadmap',
      desc: 'Den här sidan. Ger insyn i vad som är på gång utan att man behöver vara på GitHub.',
      column: 'done',
      tags: ['Verktyg'],
      date: '2026-05-12'
    },

    // ── PÅGÅR ─────────────────────────────────────────────────────────
    {
      id: 'grpc-plutc-innehall',
      title: 'GrpC- och PlutC-ramsor',
      desc: 'Innehåll till gruppchefs- och plutonchefsrollerna i RAMSOR-fliken. Behöver verifieras mot säkra referenser innan publicering.',
      column: 'inprogress',
      tags: ['Ramsor']
    },

    // ── KOMMER SNART ─────────────────────────────────────────────────
    {
      id: '1227-fulltabell',
      title: 'Full 1227-tabell',
      desc: 'Fullständig referens (A=Adam, B=Bertil osv.) i RAMSOR-fliken under SIG.',
      column: 'soon',
      tags: ['Ramsor', 'Signalist']
    },
    {
      id: 'ra1444-detalj',
      title: 'RA 1444 — detaljerat handhavande',
      desc: 'Mer detaljerade handhavande-instruktioner och kort felsökningsguide.',
      column: 'soon',
      tags: ['Ramsor', 'Signalist']
    },

    // ── ÖNSKAT ───────────────────────────────────────────────────────
    {
      id: 'forare-ramsor',
      title: 'Förare-ramsor',
      desc: 'Innehåll för fordonsförare i RAMSOR-fliken. Behöver konkret önskelista — kontroll innan körning, körorder, etc.',
      column: 'wished',
      tags: ['Ramsor', 'Fordon']
    },
    {
      id: 'tos-ramsa',
      title: 'TOS-ramsa',
      desc: 'Önskemål om TOS-mall i Sjv-rollen. Avvaktar precisering om vilken TOS-variant som avses.',
      column: 'wished',
      tags: ['Ramsor', 'Sjukvård']
    }
  ]
};
