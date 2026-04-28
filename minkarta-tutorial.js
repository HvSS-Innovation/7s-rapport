// ─────────────────────────────────────────────────────────────────────────────
//  MINKARTA Tutorial — interaktiv onboarding (Steg 0: skelett).
//
//  Exponerar window.MK_TUTORIAL med:
//    start(stepKey?)   — 'welcome' | 'symbols' | 'master' | undefined (auto)
//    stop()            — stänger overlay, rensar demo-lager
//    reset()           — nollställer state, raderar localStorage-nyckeln
//    isCompleted()     — bool
//    getProgress()     — { welcome, symbols, master, discoveries[] }
//
//  Stegspecifikt innehåll fylls i i senare commits (steg 1, 2, 3).
// ─────────────────────────────────────────────────────────────────────────────

(function () {
    'use strict';

    const STORAGE_KEY = 'minkarta_tutorial_v1';
    const STEPS = ['welcome', 'symbols', 'master'];

    // ── State ────────────────────────────────────────────────────────────────
    function defaultState() {
        return {
            version: 1,
            completed: false,
            skipped: false,
            openedFirstTime: false,
            steps: {
                welcome: { seen: false, completed: false },
                symbols: { seen: false, completed: false },
                master:  { seen: false, completed: false }
            },
            discoveries: []
        };
    }

    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return defaultState();
            const parsed = JSON.parse(raw);
            if (!parsed || parsed.version !== 1) return defaultState();
            // Säkerställ att alla fält finns även om gammal struktur lästes
            const def = defaultState();
            return Object.assign(def, parsed, {
                steps: Object.assign(def.steps, parsed.steps || {}),
                discoveries: Array.isArray(parsed.discoveries) ? parsed.discoveries : []
            });
        } catch (_) {
            return defaultState();
        }
    }

    function saveState() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
    }

    let state = loadState();

    // ── DOM-helpers ──────────────────────────────────────────────────────────
    function el(tag, attrs, children) {
        const node = document.createElement(tag);
        if (attrs) {
            Object.keys(attrs).forEach(k => {
                if (k === 'class') node.className = attrs[k];
                else if (k === 'text') node.textContent = attrs[k];
                else if (k === 'html') node.innerHTML = attrs[k];
                else if (k.startsWith('on') && typeof attrs[k] === 'function') {
                    node.addEventListener(k.slice(2), attrs[k]);
                } else {
                    node.setAttribute(k, attrs[k]);
                }
            });
        }
        if (children) {
            (Array.isArray(children) ? children : [children]).forEach(c => {
                if (c == null) return;
                node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
            });
        }
        return node;
    }

    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    // ── Auto-start-toast ─────────────────────────────────────────────────────
    let toastEl = null;

    function showAutoStartToast() {
        if (toastEl) return;
        toastEl = el('div', { class: 'mkt-toast', role: 'dialog', 'aria-label': 'Tutorial-erbjudande' }, [
            el('div', { class: 'mkt-toast-text', text: 'Hej! Vill du ha en snabb rundtur av kartan?' }),
            el('div', { class: 'mkt-toast-actions' }, [
                el('button', {
                    type: 'button',
                    text: 'Nej tack',
                    onclick: () => { state.skipped = true; saveState(); hideToast(); }
                }),
                el('button', {
                    type: 'button',
                    class: 'mkt-primary',
                    text: 'Ja tack',
                    onclick: () => { hideToast(); start('welcome'); }
                })
            ])
        ]);
        document.body.appendChild(toastEl);
        requestAnimationFrame(() => toastEl.classList.add('show'));
    }

    function hideToast() {
        if (!toastEl) return;
        toastEl.classList.remove('show');
        const ref = toastEl;
        setTimeout(() => { if (ref && ref.parentNode) ref.parentNode.removeChild(ref); }, 320);
        toastEl = null;
    }

    // ── Overlay + spotlight + bubbla ────────────────────────────────────────
    let overlayEl = null;
    let spotlightEl = null;
    let bubbleEl = null;

    function ensureOverlay() {
        if (overlayEl) return;
        overlayEl = el('div', { id: 'mktOverlay', 'aria-live': 'polite' });
        spotlightEl = el('div', { class: 'mkt-spotlight' });
        overlayEl.appendChild(spotlightEl);
        document.body.appendChild(overlayEl);
        document.addEventListener('keydown', onKey);
        window.addEventListener('scroll', schedulePositionUpdate, true);
        window.addEventListener('resize', schedulePositionUpdate);
    }

    function destroyOverlay() {
        document.removeEventListener('keydown', onKey);
        window.removeEventListener('scroll', schedulePositionUpdate, true);
        window.removeEventListener('resize', schedulePositionUpdate);
        if (positionUpdateRaf) { cancelAnimationFrame(positionUpdateRaf); positionUpdateRaf = 0; }
        if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
        overlayEl = null;
        spotlightEl = null;
        bubbleEl = null;
    }

    let positionUpdateRaf = 0;
    function schedulePositionUpdate() {
        if (positionUpdateRaf) return;
        positionUpdateRaf = requestAnimationFrame(() => {
            positionUpdateRaf = 0;
            const screen = activeScreens[activeIndex];
            if (!screen || !overlayEl) return;
            const target = screen.target ? document.querySelector(screen.target) : null;
            placeSpotlight(target);
            placeBubble(target ? target.getBoundingClientRect() : null);
        });
    }

    function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); stop(); }
    }

    function placeSpotlight(target) {
        if (!overlayEl) return;
        if (!target) {
            overlayEl.classList.add('no-spotlight');
            return;
        }
        overlayEl.classList.remove('no-spotlight');
        const rect = target.getBoundingClientRect();
        const pad = 6;
        spotlightEl.style.top    = (rect.top - pad) + 'px';
        spotlightEl.style.left   = (rect.left - pad) + 'px';
        spotlightEl.style.width  = (rect.width  + pad * 2) + 'px';
        spotlightEl.style.height = (rect.height + pad * 2) + 'px';
    }

    function placeBubble(targetRect) {
        if (!bubbleEl) return;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const margin = 12;
        const isMobile = vw <= 600;

        // Mät bubblan EFTER att ev. mobile-bredd-CSS appliceras
        const bw = bubbleEl.offsetWidth;
        const bh = bubbleEl.offsetHeight;

        let top, left;

        if (!targetRect) {
            // Ingen target — centrera bubblan
            top  = (vh - bh) / 2;
            left = (vw - bw) / 2;
        } else {
            // Vertikal: föredra UNDER target. Om inte plats — flippa OVAN.
            const spaceBelow = vh - targetRect.bottom - margin;
            const spaceAbove = targetRect.top - margin;
            if (spaceBelow >= bh) {
                top = targetRect.bottom + margin;
            } else if (spaceAbove >= bh) {
                top = targetRect.top - bh - margin;
            } else {
                // Varken över eller under — välj sidan med mest plats
                top = spaceAbove > spaceBelow
                    ? Math.max(margin, targetRect.top - bh - margin)
                    : targetRect.bottom + margin;
            }
            top = clamp(top, margin, vh - bh - margin);

            // Horisontell: centrera under/över target på desktop, full bredd på mobil
            if (isMobile) {
                left = (vw - bw) / 2;
            } else {
                left = clamp(targetRect.left + targetRect.width / 2 - bw / 2, margin, vw - bw - margin);
            }
        }

        bubbleEl.style.top    = top + 'px';
        bubbleEl.style.left   = left + 'px';
        bubbleEl.style.right  = '';
        bubbleEl.style.bottom = '';
    }

    function renderBubble(screen) {
        // screen = { title, lines:[], actions:[{label, primary?, ghost?, onClick}], target?, progress? }
        if (bubbleEl && bubbleEl.parentNode) bubbleEl.parentNode.removeChild(bubbleEl);
        const actions = (screen.actions || []).map(a => el('button', {
            type: 'button',
            class: a.primary ? 'mkt-primary' : (a.ghost ? 'mkt-ghost' : ''),
            text: a.label,
            onclick: a.onClick
        }));
        const lineNodes = (screen.lines || []).map(t => el('p', { class: 'mkt-bubble-text', text: t }));
        bubbleEl = el('div', { class: 'mkt-bubble', role: 'dialog', 'aria-modal': 'false' }, [
            screen.title ? el('div', { class: 'mkt-bubble-title', text: screen.title }) : null,
            ...lineNodes,
            screen.progress ? el('div', { class: 'mkt-bubble-progress', text: screen.progress }) : null,
            el('div', { class: 'mkt-bubble-actions' }, actions),
            el('button', { class: 'mkt-bubble-close', type: 'button', 'aria-label': 'Stäng', text: '×', onclick: stop })
        ]);
        overlayEl.appendChild(bubbleEl);

        const target = screen.target ? document.querySelector(screen.target) : null;
        // Skrolla target in i view OM den inte redan är synlig.
        // Använd instant-scroll så getBoundingClientRect() ger korrekt
        // position direkt — smooth-scroll är asynkron och leder till att
        // spotlighten placeras på targets pre-scroll-position.
        if (target && typeof target.scrollIntoView === 'function') {
            const r = target.getBoundingClientRect();
            const margin = 24;
            const fullyVisible =
                r.top    >= margin &&
                r.bottom <= window.innerHeight - margin &&
                r.left   >= 0 &&
                r.right  <= window.innerWidth;
            if (!fullyVisible) {
                try {
                    target.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
                } catch (_) {
                    // Fallback för webbläsare som inte stöder 'instant'-strängen
                    target.scrollIntoView({ block: 'center', inline: 'center' });
                }
            }
        }
        // Vänta en frame så ev. scroll och layout hunnit landa innan vi mäter
        requestAnimationFrame(() => {
            placeSpotlight(target);
            requestAnimationFrame(() => {
                const rect = target ? target.getBoundingClientRect() : null;
                placeBubble(rect);
            });
        });
    }

    // ── Stegmotor ────────────────────────────────────────────────────────────
    let activeStep = null;       // 'welcome' | 'symbols' | 'master'
    let activeIndex = 0;
    let activeScreens = [];

    // Steg 1 — Välkommen till kartan (7 skärmar)
    const WELCOME_SCREENS = [
        {
            title: 'Steg 1 av 3 — Välkommen',
            lines: [
                'Det här är MINKARTA. Här ritar du upp minläggningar med svenska kart-tecken.',
                'Vill du ha en kort rundtur?'
            ],
            target: null
        },
        {
            title: 'Kartan — prova själv',
            lines: [
                'Det här är din karta. Drag för att panorera, pinch-zooma (mobil) eller scrolla (dator) för att zooma in och ut.',
                'Prova nu! Kartan reagerar direkt — klicka "Vidare" när du är klar.'
            ],
            target: '#mapContainer'
        },
        {
            title: 'Status-raden',
            lines: [
                'Här ser du var mitten av kartan ligger i MGRS, och vilken zoomnivå du är på.'
            ],
            target: '.status-row'
        },
        {
            title: 'Symbolpaletten',
            lines: [
                'Här nere finns alla kart-tecken du kan rita. Vi tittar närmare på tre stycken nu.'
            ],
            target: '#paletteRoot'
        },
        {
            title: 'Stridsvagnsmina',
            lines: [
                'Den vanligaste markeringen på en minläggningskarta — en tryckutlöst stridsvagnsmina.'
            ],
            target: '[data-tool="strv_tryck"]'
        },
        {
            title: 'Truppmina',
            lines: [
                'Truppminor markeras med en svart cirkel och två antenntrådar.'
            ],
            target: '[data-tool="tramp"]'
        },
        {
            title: 'UPK',
            lines: [
                'UPK = Utgångs-Punkt-Koordinat. En bestämbar referenspunkt i terrängen, inte en mina.',
                'Klart! Du kan starta steg 2 när du vill från "Lär dig MINKARTA"-knappen.'
            ],
            target: '[data-tool="upk"]'
        }
    ];

    function getScreensFor(stepKey) {
        if (stepKey === 'welcome') return WELCOME_SCREENS.slice();
        // Steg 2 + 3 fylls i i senare commits
        const titles = {
            symbols: 'Steg 2 — Symbolernas värld',
            master:  'Steg 3 — Bli en kartmästare'
        };
        return [{
            title: titles[stepKey] || 'MINKARTA Tutorial',
            lines: [
                'Det här steget är inte byggt än. Kommer i en senare uppdatering.',
                'Du kan stänga rundturen när som helst med Esc eller krysset.'
            ],
            target: null
        }];
    }

    function start(stepKey) {
        ensureOverlay();
        overlayEl.classList.add('active');
        activeStep = stepKey || pickAutoStep();
        if (!STEPS.includes(activeStep)) activeStep = 'welcome';
        state.steps[activeStep].seen = true;
        state.openedFirstTime = true;
        saveState();
        activeScreens = getScreensFor(activeStep);
        activeIndex = 0;
        renderActiveScreen();
    }

    function nextScreen() {
        if (activeIndex >= activeScreens.length - 1) {
            markCompleted(activeStep);
            stop();
            return;
        }
        activeIndex += 1;
        renderActiveScreen();
    }

    function prevScreen() {
        if (activeIndex === 0) return;
        activeIndex -= 1;
        renderActiveScreen();
    }

    function renderActiveScreen() {
        const screen = activeScreens[activeIndex];
        if (!screen) { stop(); return; }
        const total = activeScreens.length;
        const isFirst = activeIndex === 0;
        const isLast  = activeIndex === total - 1;
        const actions = [];
        if (!isFirst) {
            actions.push({ label: 'Tillbaka', ghost: true, onClick: prevScreen });
        } else {
            actions.push({ label: 'Hoppa över', ghost: true, onClick: stop });
        }
        actions.push({
            label: isLast ? 'Klar' : 'Vidare',
            primary: true,
            onClick: nextScreen
        });
        const composed = Object.assign({}, screen, {
            actions: actions,
            progress: total > 1 ? ((activeIndex + 1) + ' av ' + total) : ''
        });
        renderBubble(composed);
    }

    function markCompleted(stepKey) {
        if (!STEPS.includes(stepKey)) return;
        state.steps[stepKey].completed = true;
        state.completed = STEPS.every(k => state.steps[k].completed);
        saveState();
    }

    function stop() {
        if (overlayEl) overlayEl.classList.remove('active');
        clearTutorialDemoLayer();
        destroyOverlay();
        activeStep = null;
        activeScreens = [];
        activeIndex = 0;
    }

    function reset() {
        try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
        state = defaultState();
    }

    function isCompleted() { return !!state.completed; }

    function getProgress() {
        return {
            welcome: state.steps.welcome.completed,
            symbols: state.steps.symbols.completed,
            master:  state.steps.master.completed,
            discoveries: state.discoveries.slice()
        };
    }

    function pickAutoStep() {
        for (const k of STEPS) if (!state.steps[k].completed) return k;
        return 'welcome';
    }

    // ── Demo-lager (placeholder för steg 2/3) ────────────────────────────────
    function clearTutorialDemoLayer() {
        try {
            if (window.tutorialDemoLayer && typeof window.tutorialDemoLayer.clearLayers === 'function') {
                window.tutorialDemoLayer.clearLayers();
            }
        } catch (_) {}
    }

    // ── "Lär dig MINKARTA"-knapp + meny ─────────────────────────────────────
    let menuEl = null;

    function closeMenu() {
        if (!menuEl) return;
        if (menuEl.parentNode) menuEl.parentNode.removeChild(menuEl);
        menuEl = null;
        document.removeEventListener('click', onDocClickForMenu, true);
    }

    function onDocClickForMenu(e) {
        if (menuEl && !menuEl.contains(e.target)) closeMenu();
    }

    function buildMenuItem(stepKey, label) {
        const done = state.steps[stepKey].completed;
        const item = el('div', {
            class: 'mkt-menu-item' + (done ? ' done' : ''),
            onclick: (e) => { e.stopPropagation(); closeMenu(); start(stepKey); }
        }, [
            el('span', { text: label }),
            el('span', { class: 'mkt-menu-item-status', text: done ? 'klar' : 'ej klar' })
        ]);
        return item;
    }

    function openMenu(anchor) {
        closeMenu();
        menuEl = el('div', { class: 'mkt-menu', role: 'menu' }, [
            buildMenuItem('welcome', 'Steg 1 — Välkommen till kartan'),
            buildMenuItem('symbols', 'Steg 2 — Symbolernas värld'),
            buildMenuItem('master',  'Steg 3 — Bli en kartmästare'),
            el('div', { class: 'mkt-menu-divider' }),
            el('div', {
                class: 'mkt-menu-item',
                onclick: (e) => { e.stopPropagation(); closeMenu(); start('welcome'); }
            }, [el('span', { text: 'Spela om allt från början' })]),
            el('div', {
                class: 'mkt-menu-item',
                onclick: (e) => {
                    e.stopPropagation();
                    closeMenu();
                    reset();
                }
            }, [el('span', { text: 'Återställ tutorial-progress' })])
        ]);
        document.body.appendChild(menuEl);
        const r = anchor.getBoundingClientRect();
        const mw = menuEl.offsetWidth;
        menuEl.style.top  = (r.bottom + 6) + 'px';
        menuEl.style.left = clamp(r.left, 8, window.innerWidth - mw - 8) + 'px';
        // Fördröjt globalt klick-stäng (annars triggar samma klick)
        setTimeout(() => document.addEventListener('click', onDocClickForMenu, true), 0);
    }

    function injectLauncher() {
        const host = document.getElementById('mapControls');
        if (!host) return;
        if (host.querySelector('.mkt-launcher')) return;
        const btn = el('button', {
            type: 'button',
            class: 'mkt-launcher',
            text: 'Lär dig MINKARTA',
            title: 'Starta interaktiv rundtur av kartan'
        });
        btn.addEventListener('click', () => openMenu(btn));
        host.appendChild(btn);
    }

    // ── Init ─────────────────────────────────────────────────────────────────
    function init() {
        injectLauncher();
        // Re-injicera om mapControls renderas om av minkarta.html
        const observer = new MutationObserver(() => injectLauncher());
        const host = document.getElementById('mapControls');
        if (host) observer.observe(host, { childList: true });

        // Auto-start-toast: bara första gången, om inte skippat eller redan klart
        if (!state.openedFirstTime && !state.skipped && !state.completed) {
            // Vänta lite så användaren hinner se kartan landa
            setTimeout(showAutoStartToast, 1200);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Exponera API
    window.MK_TUTORIAL = {
        start: start,
        stop: stop,
        reset: reset,
        isCompleted: isCompleted,
        getProgress: getProgress
    };
})();
