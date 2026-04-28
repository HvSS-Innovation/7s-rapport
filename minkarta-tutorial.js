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
    }

    function destroyOverlay() {
        document.removeEventListener('keydown', onKey);
        if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
        overlayEl = null;
        spotlightEl = null;
        bubbleEl = null;
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
        const isMobile = vw <= 600;
        if (isMobile) {
            // CSS-mediefråga sköter positionering — bara säkerställ att inline-styles inte krockar
            bubbleEl.style.top = '';
            bubbleEl.style.left = '';
            return;
        }
        const bw = bubbleEl.offsetWidth;
        const bh = bubbleEl.offsetHeight;
        let top, left;
        if (!targetRect) {
            top  = (vh - bh) / 2;
            left = (vw - bw) / 2;
        } else {
            // Föredra under spotlighten, annars över
            const spaceBelow = vh - targetRect.bottom;
            if (spaceBelow >= bh + 24) {
                top = targetRect.bottom + 12;
            } else {
                top = Math.max(12, targetRect.top - bh - 12);
            }
            left = clamp(targetRect.left + targetRect.width / 2 - bw / 2, 12, vw - bw - 12);
        }
        bubbleEl.style.top  = top + 'px';
        bubbleEl.style.left = left + 'px';
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
        placeSpotlight(target);
        // Vänta en frame så bubblan har korrekta dimensioner
        requestAnimationFrame(() => {
            const rect = target ? target.getBoundingClientRect() : null;
            placeBubble(rect);
        });
    }

    // ── Stegmotor ────────────────────────────────────────────────────────────
    let activeStep = null;       // 'welcome' | 'symbols' | 'master'
    let activeIndex = 0;
    let activeScreens = [];      // platshållare-array; senare commits fyller på

    function getStubScreens(stepKey) {
        const titles = {
            welcome: 'Steg 1 — Välkommen till kartan',
            symbols: 'Steg 2 — Symbolernas värld',
            master:  'Steg 3 — Bli en kartmästare'
        };
        return [{
            title: titles[stepKey] || 'MINKARTA Tutorial',
            lines: [
                'Skelettet är på plats. Fullständigt innehåll för det här steget kommer i en senare uppdatering.',
                'Du kan stänga rundturen när som helst med Esc eller krysset.'
            ],
            target: null,
            actions: [
                { label: 'Hoppa över', ghost: true, onClick: stop },
                { label: 'Markera som klar', primary: true, onClick: () => { markCompleted(stepKey); stop(); } }
            ]
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
        activeScreens = getStubScreens(activeStep);
        activeIndex = 0;
        renderActiveScreen();
    }

    function renderActiveScreen() {
        const screen = activeScreens[activeIndex];
        if (!screen) { stop(); return; }
        renderBubble(screen);
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
