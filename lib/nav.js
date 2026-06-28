// lib/nav.js — single source of truth för navigeringen.
// Konfigurera per sida innan denna laddas (precis efter window.FORM_ID-raden):
//   <script>window.HV_PAGE = 'WHAT';</script>
//   <script src="lib/nav.js"></script>
// HV_PAGE-värdet måste matcha ett `id` i ITEMS-arrayen nedan. Fallback:
// filnamn-matching mot href-fältet (case-insensitive).

(function (global) {
  'use strict';

  // Grupper visas i denna ordning. Intent-baserad taxonomi (vad soldaten vill
  // GÖRA), inte förkortningar. emoji/subtitle/blurb används av hubben
  // (start.html); drawern visar bara label. En enda källa för drawer + hubb +
  // webbplatskarta (version.js).
  const GROUPS = [
    { id: 'OBSERVATION', label: 'Observation',     emoji: '👀', subtitle: 'Kärnrapporten — vad du sett',
      blurb: '7S-rapporten: det första du fyller i när du observerat något — stund, ställe, händelse, symbol och sägesman.' },
    { id: 'RAPPORTERA',  label: 'Rapportera',      emoji: '📡', subtitle: 'Melda läge och materiel uppåt',
      blurb: 'Melda läget uppåt till chef: FORS (lägesrapport) och PEDARS (personal, fordon och materiel).' },
    { id: 'SIGNALEMENT', label: 'Signalement',     emoji: '🔎', subtitle: 'Beskriv fordon, flyg och person',
      blurb: 'Sett något? Välj rätt mall och beskriv det steg för steg — stridsfordon, civil bil, flyg/drönare eller en person.' },
    { id: 'KARTA',       label: 'Karta & terräng', emoji: '🗺️', subtitle: 'Rita, planera och bedöm i terräng',
      blurb: 'Alla kartverktyg samlade: rita minering och sensorer, dra korridorer du kan exportera, bedöm riskzon vid drönarfall — och kolla väderprognosen.' },
    { id: 'FORBERED',    label: 'Förbered gruppen',emoji: '✅', subtitle: 'Order, post, vakt och eldställning',
      blurb: 'Det ni sätter upp inför och under uppgiften: patrullchef-checklista, vaktschema, postinstruktion (OBSLÖSA), eldställning (EOBUSARE) och order (OBO).' },
    { id: 'LARA',        label: 'Plugga & slå upp',emoji: '📚', subtitle: 'Öva, repetera och hitta fakta',
      blurb: 'Öva med flashcards och prov (APP-6, farligt gods, förkortningar, RA763, signalskydd) och slå snabbt upp symboler, ramsor, handtecken, sjukvård, säkerhetsregler och linjebyggnad.' },
    { id: 'ADMIN',       label: 'Admin',           emoji: '📋', subtitle: 'Mått, materiel, skytte och sjukvård',
      blurb: 'Diverse fält- och förvaltningsuppgifter: kroppsmått, hjälmstorlek (Stridshjälm 24), farligt gods, patientliggare med triage och skyttelogg.' },
    { id: 'SYSTEM',      label: 'Appen & data',    emoji: '🔧', subtitle: 'Säkerhetskopia, radering och info',
      blurb: 'Säkerhetskopiera eller radera all data på enheten, läs hur instruktörssignaturer fungerar och se roadmapen.' }
  ];

  // Ikon-bibliotek. Lucide-style line-art, 24x24 viewBox, stroke=currentColor.
  // Refereras från ITEMS via `icon: 'name'`. Renderas till höger om labeln.
  const SVG_HEAD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">';
  const ICONS = {
    binoculars: SVG_HEAD + '<path d="M7 4v3M17 4v3"/><rect x="4" y="7" width="6" height="14" rx="1"/><rect x="14" y="7" width="6" height="14" rx="1"/><path d="M10 12h4"/></svg>',
    bubble:     SVG_HEAD + '<path d="M21 11a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.4-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
    car:        SVG_HEAD + '<path d="M2 16v-4c0-.5.4-1 1-1h4l2-3h6l2 3h4c.6 0 1 .5 1 1v4z"/><circle cx="6" cy="17" r="2"/><circle cx="18" cy="17" r="2"/></svg>',
    plane:      SVG_HEAD + '<path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>',
    book:       SVG_HEAD + '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    eye:        SVG_HEAD + '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    doc:        SVG_HEAD + '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    search:     SVG_HEAD + '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    shield:     SVG_HEAD + '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    compass:    SVG_HEAD + '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
    map:        SVG_HEAD + '<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>',
    radar:      SVG_HEAD + '<circle cx="12" cy="12" r="2"/><path d="M12 4a8 8 0 0 1 8 8"/><path d="M12 8a4 4 0 0 1 4 4"/><line x1="12" y1="12" x2="20" y2="4"/></svg>',
    calendar:   SVG_HEAD + '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    cloud:      SVG_HEAD + '<path d="M17.5 19a4.5 4.5 0 1 0-2.4-8.4 6 6 0 1 0-11.1 4.4"/><circle cx="6.5" cy="7.5" r="2.5"/></svg>',
    tape:       SVG_HEAD + '<circle cx="12" cy="10" r="7"/><circle cx="12" cy="10" r="2"/><path d="M5 17h14"/><path d="M5 17v4h14v-4"/></svg>',
    target:     SVG_HEAD + '<circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/><circle cx="12" cy="12" r="3"/></svg>',
    clipboard:  SVG_HEAD + '<rect x="9" y="2" width="6" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 14l2 2 4-4"/></svg>',
    folder:     SVG_HEAD + '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    shieldOk:   SVG_HEAD + '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>',
    person:     SVG_HEAD + '<circle cx="12" cy="6" r="3"/><path d="M5 22v-3a7 7 0 0 1 14 0v3"/></svg>',
    notebook:   SVG_HEAD + '<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="14" y2="14"/></svg>',
    lock:       SVG_HEAD + '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    radio:      SVG_HEAD + '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="17" cy="12" r="2"/><line x1="4" y1="9" x2="13" y2="9"/><line x1="4" y1="13" x2="8" y2="13"/></svg>',
    type:       SVG_HEAD + '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>',
    flag:       SVG_HEAD + '<path d="M4 22V4"/><path d="M4 4h13l-3 3 3 3H4"/></svg>',
    boxX:       SVG_HEAD + '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="9" y1="15" x2="15" y2="9"/></svg>',
    boxDot:     SVG_HEAD + '<rect x="3" y="6" width="18" height="12"/><circle cx="12" cy="12" r="2"/></svg>',
    line:       SVG_HEAD + '<line x1="3" y1="12" x2="21" y2="12"/></svg>',
    cross:      SVG_HEAD + '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
    hand:       SVG_HEAD + '<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8.5"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>',
    helmet:     SVG_HEAD + '<path d="M2 14h20"/><path d="M4 14V12a8 8 0 0 1 16 0v2"/><circle cx="8" cy="11" r="0.5" fill="currentColor" stroke="none"/></svg>',
    tank:        SVG_HEAD + '<path d="M2 14h20v3H2z"/><path d="M7 11h10v3H7z"/><line x1="14" y1="12.5" x2="22" y2="12.5"/><circle cx="5" cy="19" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="13" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></svg>',
    walking:     SVG_HEAD + '<circle cx="12" cy="4" r="2"/><path d="M12 6l-1 7"/><path d="M11 9l-3 4"/><path d="M11 9l4 3l-1 3"/><path d="M11 13l-3 4l-1 5"/><path d="M11 13l4 5l2 4"/></svg>',
    drone:       SVG_HEAD + '<rect x="10" y="10" width="4" height="4" rx="1"/><line x1="6" y1="6" x2="10" y2="10"/><line x1="18" y1="6" x2="14" y2="10"/><line x1="6" y1="18" x2="10" y2="14"/><line x1="18" y1="18" x2="14" y2="14"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/></svg>',
    stormCloud:  SVG_HEAD + '<path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"/><polyline points="13 11 9 17 15 17 11 23"/></svg>',
    humanTarget: SVG_HEAD + '<circle cx="12" cy="6" r="3"/><path d="M6 22V14a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v8"/><circle cx="12" cy="17" r="3"/><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"/></svg>',
    stretcher:   SVG_HEAD + '<line x1="6" y1="3" x2="6" y2="8"/><line x1="3.5" y1="5.5" x2="8.5" y2="5.5"/><rect x="2" y="11" width="20" height="3" rx="1"/><line x1="5" y1="14" x2="5" y2="18"/><line x1="19" y1="14" x2="19" y2="18"/><circle cx="5" cy="20" r="1.5"/><circle cx="19" cy="20" r="1.5"/></svg>'
  };

  // Varje item:
  //   id     — stabil nyckel (sätts via window.HV_PAGE på varje sida).
  //   label  — text i UI.
  //   href   — relativ URL.
  //   group  — pekar på GROUPS.id.
  //   icon   — nyckel i ICONS (frivillig).
  //   badge  — frivillig badge-text (visas inline efter label).
  //   roles  — frivillig array; aktiveras i v0.3, lämnas odefinierat tills dess.
  //
  // Ordningen i arrayen är ordningen i drawern, grupperad efter GROUPS-ordningen.
  // Inga visuella hierarkier, alla items ser likadana ut.
  const ITEMS = [
    // OBSERVATION — kärnrapporten.
    { id: '7S',       label: '7S',       href: 'index.html',    group: 'OBSERVATION', icon: 'binoculars' },

    // RAPPORTERA — melda läge/materiel uppåt till chef.
    { id: 'FORS',     label: 'FORS',     href: 'fors.html',     group: 'RAPPORTERA', icon: 'doc' },
    { id: 'PEDARS',   label: 'PEDARS',   href: 'pedars.html',   group: 'RAPPORTERA', icon: 'clipboard' },

    // SIGNALEMENT — beskriv det du sett. Även inbäddade i 7S Symbol-rutan.
    { id: 'WHAT',  label: 'WHAT',  href: 'what.html',  group: 'SIGNALEMENT', icon: 'tank' },
    { id: 'SCRIM', label: 'SCRIM', href: 'scrim.html', group: 'SIGNALEMENT', icon: 'car' },
    { id: 'WEFT',  label: 'WEFT',  href: 'weft.html',  group: 'SIGNALEMENT', icon: 'plane' },
    { id: 'AH',    label: 'A–H',   href: 'ah.html',    group: 'SIGNALEMENT', icon: 'walking' },

    // KARTA & TERRÄNG — kartverktyg + terräng-/riskbedömning + väder.
    { id: 'MINKARTA',    label: 'MINKARTA',    href: 'minkarta.html',    group: 'KARTA', icon: 'map' },
    { id: 'SENSORSKISS', label: 'SENSORSKISS', href: 'sensorskiss.html', group: 'KARTA', icon: 'drone' },
    { id: 'UPK',         label: 'UPK',         href: 'upk.html',         group: 'KARTA', icon: 'compass' },
    { id: 'DRONDRIFT',   label: 'DRÖNDRIFT',   href: 'drondrift.html',   group: 'KARTA', icon: 'radar' },
    { id: 'VADER',       label: 'VÄDER',       href: 'vader.html',       group: 'KARTA', icon: 'stormCloud' },

    // FÖRBERED GRUPPEN — order, post, vakt, eldställning inför/under uppgiften.
    { id: 'RASSOIKA', label: 'RASSOIKA', href: 'rassoika.html',   group: 'FORBERED', icon: 'clipboard' },
    { id: 'SCHEMA',   label: 'SCHEMA',   href: 'postschema.html', group: 'FORBERED', icon: 'calendar' },
    { id: 'OBSLOSA',  label: 'OBSLÖSA',  href: 'obslosa.html',    group: 'FORBERED', icon: 'eye' },
    { id: 'EOBUSARE', label: 'EOBUSARE', href: 'eobusare.html',   group: 'FORBERED', icon: 'clipboard' },
    { id: 'OBO',      label: 'OBO',      href: 'obo.html',        group: 'FORBERED', icon: 'clipboard', badge: 'BETA' },

    // PLUGGA & SLÅ UPP — flashcards + referens-uppslag (inkl. SÄKR + LINJE).
    // Handtecken deep-linkar till ramsor.html-sektion tills den får egen sida.
    { id: 'APP6',       label: 'APP-6',                   href: 'app6.html',              group: 'LARA', icon: 'boxDot' },
    { id: 'FG',         label: 'FG – Farligt gods',       href: 'fg.html',                group: 'LARA', icon: 'flag' },
    { id: 'FORKORT',    label: 'FÖRKORT – Förkortningar', href: 'forkort.html',           group: 'LARA', icon: 'type' },
    { id: 'RA763',      label: 'RA763',                   href: 'ra763.html',             group: 'LARA', icon: 'radio' },
    { id: 'SIGSKYDD',   label: 'SIGSKYDD – Signalskydd',  href: 'sigskydd.html',          group: 'LARA', icon: 'lock' },
    { id: 'SAEKR',      label: 'SÄKR',                    href: 'saekr.html',             group: 'LARA', icon: 'shieldOk' },
    { id: 'LINJE',      label: 'LINJE',                   href: 'linje.html',             group: 'LARA', icon: 'line' },
    { id: 'RAMSOR',     label: 'RAMSOR',                  href: 'ramsor.html',            group: 'LARA', icon: 'notebook' },
    { id: 'HANDTECKEN', label: 'Handtecken',              href: 'ramsor.html#handtecken', group: 'LARA', icon: 'hand' },
    { id: 'TCCC',       label: 'TCCC',                    href: 'tccc.html',              group: 'LARA', icon: 'cross' },

    // ADMIN — mått, materiel, skytte, sjukvård.
    { id: 'MATT',    label: 'MÅTT',     href: 'matt.html',      group: 'ADMIN', icon: 'tape' },
    { id: 'HJALM24', label: 'Hjälm 24', href: 'hjalm24.html',   group: 'ADMIN', icon: 'helmet' },
    { id: 'UN',      label: 'UN',       href: 'un.html',        group: 'ADMIN', icon: 'folder' },
    { id: 'PATL',    label: 'PATL',     href: 'patl.html',      group: 'ADMIN', icon: 'stretcher' },
    { id: 'SKYTTE',  label: 'SKYTTE',   href: 'skyttebok.html', group: 'ADMIN', icon: 'humanTarget' },

    // APPEN & DATA — system/meta-sidor. TIPSA utelämnad medvetet (pin-skyddad
    // privat ingång, ej publik länk — ska inte ytas i publik nav/hubb).
    { id: 'DATA',       label: 'Mina data',     href: 'data.html',           group: 'SYSTEM', icon: 'folder' },
    { id: 'SKYTTEINFO', label: 'Skytte – info', href: 'skyttebok-info.html', group: 'SYSTEM', icon: 'doc' },
    { id: 'ROADMAP',    label: 'Roadmap',       href: 'roadmap.html',        group: 'SYSTEM', icon: 'compass' },
    { id: 'OPSEC',      label: 'Glöm enheten',  href: 'opsec.html',          group: 'SYSTEM', icon: 'lock' }
  ];

  // Slim-läge (default): bara dessa items visas — fältets stress-snabbmeny.
  // "Visa hela menyn"-knappen i footern fäller ut hela grupperade menyn.
  // 7S/FORS/PEDARS (melda obs/läge/materiel) + WHAT (vanligaste signalementet)
  // + DRÖNDRIFT (akut riskzon vid drönarfall). Fler urvattnar genvägen.
  const SLIM_IDS = ['7S', 'FORS', 'PEDARS', 'WHAT', 'DRONDRIFT'];

  // ── State (localStorage med try/catch — Safari private mode kan throwa) ──
  const LS_PINNED      = 'hv_nav_pinned';
  const LS_SLIM        = 'hv_nav_slim';
  function getPinned() {
    try { return localStorage.getItem(LS_PINNED) === '1'; } catch (_) { return false; }
  }
  function setPinned(v) {
    try { localStorage.setItem(LS_PINNED, v ? '1' : '0'); } catch (_) {}
  }
  // Slim är default — bara explicit '0' ger fullständig meny.
  function getSlim() {
    try { return localStorage.getItem(LS_SLIM) !== '0'; } catch (_) { return true; }
  }
  function setSlim(v) {
    try { localStorage.setItem(LS_SLIM, v ? '1' : '0'); } catch (_) {}
  }
  // Pin är desktop-only (drawer vore för dominant på telefon).
  function isDesktop() {
    try { return window.matchMedia('(min-width: 1024px)').matches; } catch (_) { return false; }
  }

  // ── Aktiv-detektion: window.HV_PAGE först, filnamn-fallback sen. ──
  function detectActiveId() {
    if (typeof global.HV_PAGE === 'string' && global.HV_PAGE) return global.HV_PAGE;
    const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const match = ITEMS.find(i => (i.href || '').split('#')[0].toLowerCase() === file);
    return match ? match.id : null;
  }

  // ── Roll-stub: aktiveras i v0.3, är no-op idag. ──
  function getActiveRole() {
    try { return localStorage.getItem('hv_role') || null; } catch (_) { return null; }
  }
  function itemVisibleForRole(item, role) {
    if (!item.roles || !role) return true;
    return item.roles.indexOf(role) !== -1;
  }

  // ── Render ──
  let drawerEl = null;
  let overlayEl = null;
  let burgerEl = null;
  let drawerBuilt = false;
  let lastFocusBeforeOpen = null;

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(k => {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else if (k === 'html') node.innerHTML = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    if (children) children.forEach(c => c && node.appendChild(c));
    return node;
  }

  function buildItemLink(item, activeId) {
    const a = el('a', {
      href: item.href,
      'data-id': item.id,
      class: 'hv-nav-item'
    });
    a.appendChild(el('span', { class: 'hv-nav-label', text: item.label }));
    if (item.badge) {
      a.appendChild(el('span', { class: 'hv-nav-badge', text: item.badge }));
    }
    if (item.icon && ICONS[item.icon]) {
      const iconWrap = el('span', { class: 'hv-nav-icon' });
      iconWrap.innerHTML = ICONS[item.icon];
      a.appendChild(iconWrap);
    }
    if (item.id === activeId) a.classList.add('is-active');
    return a;
  }

  function buildGroup(group, activeId, role, slim) {
    let items = ITEMS.filter(it => it.group === group.id && itemVisibleForRole(it, role));
    if (slim) items = items.filter(it => SLIM_IDS.indexOf(it.id) !== -1);
    if (items.length === 0) return null;

    const section = el('section', { class: 'hv-nav-group', 'data-group': group.id });
    section.appendChild(el('h3', { class: 'hv-nav-group-title', text: group.label }));
    const ul = el('ul', { class: 'hv-nav-list-ul' });

    items.forEach(item => {
      const li = el('li');
      li.appendChild(buildItemLink(item, activeId));
      ul.appendChild(li);
    });
    section.appendChild(ul);
    return section;
  }

  function buildDrawer() {
    const activeId = detectActiveId();
    const role = getActiveRole();
    const slim = getSlim();

    overlayEl = el('div', { class: 'hv-nav-overlay', hidden: '' });
    overlayEl.addEventListener('click', closeDrawer);

    drawerEl = el('aside', {
      class: 'hv-nav-drawer',
      id: 'hv-nav-drawer',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'hv-nav-title',
      hidden: ''
    });

    const header = el('header', { class: 'hv-nav-header' });
    header.appendChild(el('h2', { id: 'hv-nav-title', text: 'Meny' }));

    // Pin-knapp (synlig bara på desktop via CSS). Klassisk pushpin-form:
    // cap upptill, smal kropp, nål som pekar nedåt.
    const pinBtn = el('button', {
      class: 'hv-nav-pin',
      type: 'button',
      'aria-label': 'Nåla menyn',
      'aria-pressed': getPinned() ? 'true' : 'false'
    });
    pinBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      '<path d="M12 17v5"/>' +
      '<path d="M9 10.76V6H8a2 2 0 0 1 0-4h8a2 2 0 0 1 0 4h-1v4.76a2 2 0 0 0 1.11 1.79' +
      'l1.78.9c.68.34 1.11 1.04 1.11 1.79V17H5v-1.76c0-.75.43-1.45 1.11-1.79l1.78-.9' +
      'A2 2 0 0 0 9 10.76z"/>' +
      '</svg>';
    pinBtn.addEventListener('click', () => applyPinnedState(!getPinned()));
    header.appendChild(pinBtn);

    const closeBtn = el('button', {
      class: 'hv-nav-close',
      type: 'button',
      'aria-label': 'Stäng meny'
    });
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => {
      if (getPinned()) applyPinnedState(false);
      closeDrawer();
    });
    header.appendChild(closeBtn);
    drawerEl.appendChild(header);

    // Översikt/hubb-länk — alltid överst. Väg till startsidan som visar alla
    // verktyg grupperade efter ändamål (start.html). Stil i nav.css (.hv-nav-hub).
    const hubLink = el('a', {
      class: 'hv-nav-hub',
      href: 'start.html',
      text: '◇  Översikt — alla verktyg'
    });
    if ((location.pathname.split('/').pop() || '').toLowerCase() === 'start.html') {
      hubLink.classList.add('is-active');
    }
    drawerEl.appendChild(hubLink);

    const nav = el('nav', { class: 'hv-nav-list', 'aria-label': 'Huvudnavigation' });
    GROUPS.forEach(g => {
      const section = buildGroup(g, activeId, role, slim);
      if (section) nav.appendChild(section);
    });
    drawerEl.appendChild(nav);

    const footer = el('footer', { class: 'hv-nav-footer' });
    if (slim) {
      // Slim-läge: en tydligt färgad knapp som fäller ut hela menyn.
      const fullBtn = el('button', { class: 'hv-nav-fullmenu', type: 'button' });
      fullBtn.appendChild(el('span', { class: 'hv-nav-fullmenu-label', text: 'Visa hela menyn' }));
      fullBtn.appendChild(el('span', { class: 'hv-nav-fullmenu-sub', text: 'Alla verktyg & rapporter' }));
      fullBtn.addEventListener('click', () => { setSlim(false); rebuildDrawer(); });
      footer.appendChild(fullBtn);
    } else {
      // Full meny: en diskret väg tillbaka till slim-snabbmenyn.
      const slimBtn = el('button', { class: 'hv-nav-slim-toggle', type: 'button' });
      slimBtn.textContent = 'Visa enkel meny';
      slimBtn.addEventListener('click', () => { setSlim(true); rebuildDrawer(); });
      footer.appendChild(slimBtn);
    }
    drawerEl.appendChild(footer);

    if (slim) drawerEl.classList.add('is-slim');

    document.body.appendChild(overlayEl);
    document.body.appendChild(drawerEl);
    drawerBuilt = true;
  }

  function openDrawer() {
    if (!drawerBuilt) buildDrawer();
    lastFocusBeforeOpen = document.activeElement;
    overlayEl.hidden = false;
    drawerEl.hidden = false;
    // Force reflow så transition kickar in.
    void drawerEl.offsetWidth;
    overlayEl.classList.add('is-open');
    drawerEl.classList.add('is-open');
    document.body.classList.add('hv-nav-locked');
    burgerEl.setAttribute('aria-expanded', 'true');

    // Focus close-knappen så användaren har en tydlig escape direkt.
    const closeBtn = drawerEl.querySelector('.hv-nav-close');
    if (closeBtn) closeBtn.focus();

    // Scrolla aktivt item till synligt.
    const active = drawerEl.querySelector('.hv-nav-item.is-active');
    if (active && active.scrollIntoView) {
      active.scrollIntoView({ block: 'nearest' });
    }

    document.addEventListener('keydown', onKeydown, true);
  }

  function closeDrawer() {
    if (!drawerBuilt) return;
    overlayEl.classList.remove('is-open');
    drawerEl.classList.remove('is-open');
    document.body.classList.remove('hv-nav-locked');
    burgerEl.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onKeydown, true);

    // Vänta på transition innan vi gömmer från a11y-tree.
    setTimeout(() => {
      if (!drawerEl.classList.contains('is-open')) {
        drawerEl.hidden = true;
        overlayEl.hidden = true;
      }
    }, 250);

    if (lastFocusBeforeOpen && lastFocusBeforeOpen.focus) {
      lastFocusBeforeOpen.focus();
    }
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeDrawer();
      return;
    }
    if (e.key === 'Tab') {
      // Enkel focus-trap: cykla mellan första och sista fokuserbara.
      const focusable = drawerEl.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  // Pin = drawer permanent öppen, body skjuts åt höger, ingen overlay.
  function applyPinnedState(pinned) {
    setPinned(pinned);
    if (pinned) {
      if (!drawerBuilt) buildDrawer();
      document.body.classList.add('hv-nav-pinned');
      drawerEl.classList.add('is-pinned', 'is-open');
      drawerEl.hidden = false;
      if (overlayEl) {
        overlayEl.hidden = true;
        overlayEl.classList.remove('is-open');
      }
      document.body.classList.remove('hv-nav-locked');
      if (burgerEl) burgerEl.setAttribute('aria-expanded', 'true');
    } else {
      document.body.classList.remove('hv-nav-pinned');
      if (drawerEl) drawerEl.classList.remove('is-pinned');
    }
    if (drawerBuilt) {
      const pinBtn = drawerEl.querySelector('.hv-nav-pin');
      if (pinBtn) pinBtn.setAttribute('aria-pressed', pinned ? 'true' : 'false');
    }
  }

  // Bygg om drawern från scratch och återställ open/pinned-läget. Används av
  // slim↔full-toggeln och HvNav.refresh (roll-/state-byte).
  function rebuildDrawer() {
    if (!drawerBuilt) return;
    const wasPinned = drawerEl.classList.contains('is-pinned');
    const wasOpen = drawerEl.classList.contains('is-open') && !wasPinned;
    drawerEl.remove();
    overlayEl.remove();
    drawerBuilt = false;
    buildDrawer();
    if (wasPinned) applyPinnedState(true);
    else if (wasOpen) openDrawer();
  }

  function buildBurger() {
    burgerEl = el('button', {
      class: 'hv-nav-burger',
      type: 'button',
      'aria-label': 'Öppna meny',
      'aria-controls': 'hv-nav-drawer',
      'aria-expanded': 'false'
    });
    burgerEl.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>' +
      '</svg>';
    burgerEl.addEventListener('click', () => {
      if (drawerEl && drawerEl.classList.contains('is-open')) closeDrawer();
      else openDrawer();
    });
    document.body.appendChild(burgerEl);
  }

  // Synlig "Översikt"-länk i sidhuvudet (→ start.html), så hubben hittas utan
  // att man öppnar menyn. In-flow under titeln (centrerad via margin:auto i
  // nav.css) — kolliderar inte med fixed burger/tema-knapp. Hoppas över på
  // hubben själv och i symbol-embed (?mode=embed).
  function injectOverviewLink() {
    try { if (new URLSearchParams(location.search).get('mode') === 'embed') return; } catch (_) {}
    const file = (location.pathname.split('/').pop() || '').toLowerCase();
    if (file === 'start.html') return;
    const header = document.querySelector('header');
    if (!header) return;
    const a = el('a', {
      class: 'hv-nav-overview',
      href: 'start.html',
      'aria-label': 'Översikt — alla verktyg',
      html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
        '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>' +
        '<rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>' +
        '</svg><span>Översikt</span>'
    });
    header.appendChild(a);
  }

  function init() {
    // Sätt body[data-page] som krok för per-sida-specifik styling.
    const activeId = detectActiveId();
    if (activeId) document.body.setAttribute('data-page', activeId);
    buildBurger();
    injectOverviewLink();
    // Auto-applicera pin om desktop + tidigare valt.
    if (getPinned() && isDesktop()) applyPinnedState(true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose för debugging och framtida integration (t.ex. ramsor.html role-picker).
  global.HvNav = {
    GROUPS: GROUPS,
    ITEMS: ITEMS,
    ICONS: ICONS,
    open: openDrawer,
    close: closeDrawer,
    refresh: rebuildDrawer
  };
}(window));
