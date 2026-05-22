// lib/nav.js — single source of truth för navigeringen.
// Konfigurera per sida innan denna laddas (precis efter window.FORM_ID-raden):
//   <script>window.HV_PAGE = 'WHAT';</script>
//   <script src="lib/nav.js"></script>
// HV_PAGE-värdet måste matcha ett `id` i ITEMS-arrayen nedan. Fallback:
// filnamn-matching mot href-fältet (case-insensitive).

(function (global) {
  'use strict';

  // Grupper visas i denna ordning. HIDDEN renderas alltid sist, dolt
  // bakom "Visa dolda"-toggle (state i localStorage.hv_nav_showHidden).
  const GROUPS = [
    { id: 'OBSERVATION', label: 'OBSERVATION' },
    { id: 'RAPPORT',     label: 'RAPPORT'     },
    { id: 'PLANERING',   label: 'PLANERING'   },
    { id: 'ADMIN',       label: 'ADMIN'       },
    { id: 'RAMSOR',      label: 'RAMSOR'      },
    { id: 'HIDDEN',      label: 'Dolda'       }
  ];

  // Varje item:
  //   id     — stabil nyckel (sätts via window.HV_PAGE på varje sida).
  //   label  — text i UI.
  //   href   — relativ URL.
  //   group  — pekar på GROUPS.id.
  //   badge  — frivillig badge-text (visas inline efter label).
  //   roles  — frivillig array; aktiveras i v0.3, lämnas odefinierat tills dess.
  //
  // Ordningen i arrayen är ordningen i drawern. Tidigare "children" är platta
  // syskon nu — FORS/PEDARS ligger direkt efter OBSLÖSA, SÄKR/PATL direkt
  // efter UN, osv. Inga visuella hierarkier, alla items ser likadana ut.
  const ITEMS = [
    // OBSERVATION — kärnformulär.
    { id: '7S',    label: '7S',    href: 'index.html', group: 'OBSERVATION' },
    { id: 'WHAT',  label: 'WHAT',  href: 'what.html',  group: 'OBSERVATION' },
    { id: 'SCRIM', label: 'SCRIM', href: 'scrim.html', group: 'OBSERVATION' },
    { id: 'WEFT',  label: 'WEFT',  href: 'weft.html',  group: 'OBSERVATION' },
    { id: 'AH',    label: 'A–H',   href: 'ah.html',    group: 'OBSERVATION' },

    // RAPPORT — observations- och läges-rapporter.
    { id: 'OBSLOSA',  label: 'OBSLÖSA',  href: 'obslosa.html',  group: 'RAPPORT' },
    { id: 'FORS',     label: 'FORS',     href: 'fors.html',     group: 'RAPPORT' },
    { id: 'PEDARS',   label: 'PEDARS',   href: 'pedars.html',   group: 'RAPPORT' },
    { id: 'EOBUSARE', label: 'EOBUSARE', href: 'eobusare.html', group: 'RAPPORT' },
    { id: 'RASSOIKA', label: 'RASSOIKA', href: 'rassoika.html', group: 'RAPPORT' },

    // PLANERING — kartor, schema, väder.
    { id: 'MINKARTA',    label: 'MINKARTA',    href: 'minkarta.html',    group: 'PLANERING' },
    { id: 'SENSORSKISS', label: 'SENSORSKISS', href: 'sensorskiss.html', group: 'PLANERING' },
    { id: 'SCHEMA',      label: 'SCHEMA',      href: 'postschema.html',  group: 'PLANERING' },
    { id: 'VADER',       label: 'VÄDER',       href: 'vader.html',       group: 'PLANERING' },

    // ADMIN — mätningar, skytte, kontrollrapporter.
    { id: 'MATT',   label: 'MÅTT',   href: 'matt.html',      group: 'ADMIN' },
    { id: 'SKYTTE', label: 'SKYTTE', href: 'skyttebok.html', group: 'ADMIN' },
    { id: 'OBO',    label: 'OBO',    href: 'obo.html',       group: 'ADMIN', badge: 'BETA' },
    { id: 'UN',     label: 'UN',     href: 'un.html',        group: 'ADMIN' },
    { id: 'SAEKR',  label: 'SÄKR',   href: 'saekr.html',     group: 'ADMIN' },
    { id: 'PATL',   label: 'PATL',   href: 'patl.html',      group: 'ADMIN' },

    // RAMSOR — har egen intern matrix + roll-picker, rörs inte.
    { id: 'RAMSOR', label: 'RAMSOR', href: 'ramsor.html', group: 'RAMSOR' },

    // HIDDEN — "Visa dolda"-toggle. Hela f.d. SKOLA-gruppen lever här nu
    // (utbildning/referens-sidor som sällan används direkt vid övning).
    // Handtecken deep-linkar till ramsor.html-sektion tills den får egen sida.
    { id: 'SIGSKYDD',   label: 'SIGSKYDD',   href: 'sigskydd.html',          group: 'HIDDEN' },
    { id: 'RA763',      label: 'RA763',      href: 'ra763.html',             group: 'HIDDEN' },
    { id: 'FORKORT',    label: 'FÖRKORT',    href: 'forkort.html',           group: 'HIDDEN' },
    { id: 'FG',         label: 'FG',         href: 'fg.html',                group: 'HIDDEN' },
    { id: 'SYMBOL',     label: 'SYMBOL',     href: 'symbol.html',            group: 'HIDDEN' },
    { id: 'APP6',       label: 'APP-6',      href: 'app6.html',              group: 'HIDDEN' },
    { id: 'LINJE',      label: 'LINJE',      href: 'linje.html',             group: 'HIDDEN' },
    { id: 'TCCC',       label: 'TCCC',      href: 'tccc.html',               group: 'HIDDEN' },
    { id: 'HANDTECKEN', label: 'Handtecken', href: 'ramsor.html#handtecken', group: 'HIDDEN' },
    { id: 'HJALM24',    label: 'Hjälm 24',   href: 'hjalm24.html',           group: 'HIDDEN' }
  ];

  // ── State (localStorage med try/catch — Safari private mode kan throwa) ──
  const LS_SHOW_HIDDEN = 'hv_nav_showHidden';
  const LS_PINNED      = 'hv_nav_pinned';
  function getShowHidden() {
    try { return localStorage.getItem(LS_SHOW_HIDDEN) === '1'; } catch (_) { return false; }
  }
  function setShowHidden(v) {
    try { localStorage.setItem(LS_SHOW_HIDDEN, v ? '1' : '0'); } catch (_) {}
  }
  function getPinned() {
    try { return localStorage.getItem(LS_PINNED) === '1'; } catch (_) { return false; }
  }
  function setPinned(v) {
    try { localStorage.setItem(LS_PINNED, v ? '1' : '0'); } catch (_) {}
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
    if (item.id === activeId) a.classList.add('is-active');
    return a;
  }

  function buildGroup(group, activeId, role) {
    const items = ITEMS.filter(it => it.group === group.id && itemVisibleForRole(it, role));
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

    const nav = el('nav', { class: 'hv-nav-list', 'aria-label': 'Huvudnavigation' });
    GROUPS.forEach(g => {
      const section = buildGroup(g, activeId, role);
      if (section) nav.appendChild(section);
    });
    drawerEl.appendChild(nav);

    const footer = el('footer', { class: 'hv-nav-footer' });
    const toggle = el('button', {
      class: 'hv-nav-hidden-toggle',
      type: 'button',
      'aria-pressed': getShowHidden() ? 'true' : 'false'
    });
    toggle.textContent = getShowHidden() ? 'Dölj' : 'Visa dolda';
    toggle.addEventListener('click', () => {
      const next = !getShowHidden();
      setShowHidden(next);
      drawerEl.classList.toggle('show-hidden', next);
      toggle.textContent = next ? 'Dölj' : 'Visa dolda';
      toggle.setAttribute('aria-pressed', next ? 'true' : 'false');
    });
    footer.appendChild(toggle);
    drawerEl.appendChild(footer);

    if (getShowHidden()) drawerEl.classList.add('show-hidden');

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

  function init() {
    // Sätt body[data-page] som krok för per-sida-specifik styling.
    const activeId = detectActiveId();
    if (activeId) document.body.setAttribute('data-page', activeId);
    buildBurger();
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
    open: openDrawer,
    close: closeDrawer,
    refresh: function () {
      if (!drawerBuilt) return;
      // Bygg om innehållet vid roll- eller state-byte. Behåller open/close-state.
      const wasOpen = drawerEl.classList.contains('is-open');
      drawerEl.remove();
      overlayEl.remove();
      drawerBuilt = false;
      buildDrawer();
      if (wasOpen) openDrawer();
    }
  };
}(window));
