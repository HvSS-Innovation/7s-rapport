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
        if (suggestTimer) { clearTimeout(suggestTimer); suggestTimer = 0; }
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
    let pulseTargetEl = null;

    function clearPulseTarget() {
        if (pulseTargetEl) {
            pulseTargetEl.classList.remove('mkt-pulse-target', 'mkt-pulse-strong');
            pulseTargetEl = null;
        }
    }

    function setPulseTarget(target, strong) {
        clearPulseTarget();
        // Hela kartan ar for stor for skala-puls — det blir visuellt rorigt.
        if (!target || target.id === 'mapContainer') return;
        target.classList.add('mkt-pulse-target');
        if (strong) target.classList.add('mkt-pulse-strong');
        pulseTargetEl = target;
    }

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
        clearPulseTarget();
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

        // Pil-riktning: om bubblan har .mkt-with-arrow, satt arrow-up nar
        // bubblan ligger UNDER target och arrow-down nar den ligger OVAN.
        if (bubbleEl.classList.contains('mkt-with-arrow')) {
            bubbleEl.classList.remove('mkt-arrow-up', 'mkt-arrow-down');
            if (targetRect) {
                if (top >= targetRect.bottom) bubbleEl.classList.add('mkt-arrow-up');
                else                          bubbleEl.classList.add('mkt-arrow-down');
            }
        }
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
        const bubbleClass = 'mkt-bubble' + (screen.arrow ? ' mkt-with-arrow' : '');
        bubbleEl = el('div', { class: bubbleClass, role: 'dialog', 'aria-modal': 'false' }, [
            screen.title ? el('div', { class: 'mkt-bubble-title', text: screen.title }) : null,
            ...lineNodes,
            screen.progress ? el('div', { class: 'mkt-bubble-progress', text: screen.progress }) : null,
            el('div', { class: 'mkt-bubble-actions' }, actions),
            el('button', { class: 'mkt-bubble-close', type: 'button', 'aria-label': 'Stäng', text: '×', onclick: stop })
        ]);
        overlayEl.appendChild(bubbleEl);

        const target = screen.target ? document.querySelector(screen.target) : null;
        setPulseTarget(target, !!screen.strongPulse);
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
                'Det här är MINKARTA. Här ritar du upp minläggningar.'
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
                'UPK = Utgångs-Punkt-Koordinat. En bestämbar referenspunkt i terrängen, inte en mina.'
            ],
            target: '[data-tool="upk"]'
        }
    ];

    // Steg 3 — Bli en kartmästare (7 skärmar, sedan diplom)
    const MASTER_SCREENS = [
        {
            title: 'Steg 3 av 3 — Sökning',
            lines: [
                'Sökfältet längst upp på skärmen.',
                'Skriv adress, klistra in MGRS eller lat,lon — kartan flyger dit.'
            ],
            target: '#mgrsSearch',
            arrow: true,
            strongPulse: true
        },
        {
            title: 'Rita en symbol',
            lines: [
                'Klicka en symbol i paletten och sedan på kartan för att rita. Linjer och polygoner avslutas med dubbelklick.'
            ],
            target: '#paletteRoot'
        },
        {
            title: 'Redigera en symbol',
            lines: [
                'I "Panorera / välj"-läget öppnar ett klick på en utlagd symbol en edit-popup för etikett, antal, anteckning och rotation.',
                'Slidern roterar i realtid.'
            ],
            target: null
        },
        {
            title: 'Yttergränsmarkörer',
            lines: [
                'Sätt två yttergränsmarkörer för att styra vilken yta PNG-exporten ska täcka. Annars fyller den med padding runt allt.'
            ],
            target: '[data-tool="ytter"]'
        },
        {
            title: 'Minprotokoll',
            lines: [
                'När kartan är klar fyller du i protokollet och delar via Signal eller PDF. Allt sparas lokalt i webbläsaren.'
            ],
            target: '#protoPanel'
        },
        {
            title: 'Klart!',
            lines: [
                'Du är nu en kartmästare. Lek fritt med kartan när du vill — tutorialen ligger kvar under "Lär dig MINKARTA"-knappen.'
            ],
            target: null
        }
    ];

    function getScreensFor(stepKey) {
        if (stepKey === 'welcome') return WELCOME_SCREENS.slice();
        if (stepKey === 'master')  return MASTER_SCREENS.slice();
        // 'symbols' hanteras som en egen panel, inte spotlight-flow
        return [{
            title: 'MINKARTA Tutorial',
            lines: ['Okänt steg.'],
            target: null
        }];
    }

    function start(stepKey) {
        activeStep = stepKey || pickAutoStep();
        if (!STEPS.includes(activeStep)) activeStep = 'welcome';
        state.steps[activeStep].seen = true;
        state.openedFirstTime = true;
        saveState();

        // Steg 2 har egen panel-UI, inte spotlight-flow
        if (activeStep === 'symbols') {
            openSymbolsAlbum();
            return;
        }

        ensureOverlay();
        overlayEl.classList.add('active');
        activeScreens = getScreensFor(activeStep);
        activeIndex = 0;
        renderActiveScreen();
    }

    function nextScreen() {
        if (activeIndex >= activeScreens.length - 1) {
            const justCompleted = activeStep;
            markCompleted(activeStep);
            if (justCompleted === 'master') {
                // Stäng spotlight-overlay men visa diplom direkt efter
                clearTutorialDemoLayer();
                destroyOverlay();
                activeStep = null;
                activeScreens = [];
                activeIndex = 0;
                showDiploma();
                return;
            }
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
        injectLauncher();
        // Mjukt förslag om nästa steg, ~1.2 sek efter att overlay/album stängts
        if (!state.completed) {
            setTimeout(() => suggestNextStep(stepKey), 1200);
        }
    }

    function suggestNextStep(justCompleted) {
        const next = { welcome: 'symbols', symbols: 'master' }[justCompleted];
        if (!next) return;
        if (state.steps[next] && state.steps[next].completed) return;
        showSuggestToast(justCompleted, next);
    }

    let suggestTimer = 0;

    function showSuggestToast(justCompleted, nextKey) {
        if (toastEl) hideToast();
        const messages = {
            welcome: 'Steg 1 klart! Vill du fortsätta till Symbolernas värld?',
            symbols: 'Snyggt! Vill du gå vidare till Bli en kartmästare?'
        };
        toastEl = el('div', { class: 'mkt-toast', role: 'dialog', 'aria-label': 'Förslag om nästa steg' }, [
            el('div', { class: 'mkt-toast-text', text: messages[justCompleted] || 'Vill du gå vidare?' }),
            el('div', { class: 'mkt-toast-actions' }, [
                el('button', { type: 'button', text: 'Senare', onclick: hideToast }),
                el('button', {
                    type: 'button',
                    class: 'mkt-primary',
                    text: 'Ja, fortsätt',
                    onclick: () => { hideToast(); start(nextKey); }
                })
            ])
        ]);
        document.body.appendChild(toastEl);
        requestAnimationFrame(() => toastEl.classList.add('show'));
        // Auto-stäng efter 9 sek så toasten inte hänger kvar i evighet
        if (suggestTimer) { clearTimeout(suggestTimer); }
        suggestTimer = setTimeout(() => { hideToast(); }, 9000);
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
        injectLauncher();
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

    // ── Demo-lager: ett L.featureGroup som lever bara medan tutorialen är öppen ──
    let demoLayer = null;
    let demoCount = 0;

    function ensureDemoLayer() {
        if (!window.MK_MAP || !window.L) return null;
        if (demoLayer) return demoLayer;
        demoLayer = window.L.featureGroup().addTo(window.MK_MAP);
        return demoLayer;
    }

    function clearTutorialDemoLayer() {
        try {
            if (demoLayer) {
                demoLayer.clearLayers();
                demoCount = 0;
            }
        } catch (_) {}
    }

    function placeDemoSymbol(symId) {
        const map = window.MK_MAP;
        const sym = window.MK_SYMBOLS && window.MK_SYMBOLS[symId];
        if (!map || !sym || !window.L) return;
        const layer = ensureDemoLayer();
        if (!layer) return;

        // Golden-angle-spiral runt center: organisk spridning utan staplar
        const center = map.getCenter();
        const cp = map.latLngToContainerPoint(center);
        const angle  = demoCount * 137.5 * Math.PI / 180;
        const radius = 50 + demoCount * 6;
        const p = window.L.point(
            cp.x + radius * Math.cos(angle),
            cp.y + radius * Math.sin(angle)
        );
        const pos = map.containerPointToLatLng(p);

        const icon = window.L.divIcon({
            className: 'mk-icon mkt-demo-icon',
            html: sym.svg,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });
        window.L.marker(pos, { icon: icon, interactive: false }).addTo(layer);
        demoCount += 1;
    }

    // ── Symbolernas värld (Steg 2) ──────────────────────────────────────────
    // Korta beskrivningar av varje symbol — visas i nederkant-bannern nar
    // anvandaren klickar ett kort. Inga kallcitat (de skulle blasa upp
    // texten + introducera kalla-styrning som hor hemma i info-panelen).
    const SYMBOL_DESCRIPTIONS = {
        strv_tryck:        'Tryckutlöst stridsvagnsmina. Vanligaste markeringen på minkartan.',
        tramp:             'Truppmina. Utlöses av tryck eller spränglina.',
        larm:              'Larmmina. Varnar utan att skada — ljud eller ljus.',
        fordonsmina:       'Fordonsmina. Verkar mot lätta fordon, mindre laddning än stridsvagnsminor.',
        fordon_sid:        'Sidverkande fordonsmina. Riktad verkan vinkelrätt mot fordonsspår.',
        forsvar:           'Försvarsladdning. Placeras manuellt och kan utlösas av egen trupp.',
        prov_rojskydd:     'Provisoriskt fordonsröjningsskydd. Försvårar mekanisk röjning av minor.',
        rojskydd:          'Röjningsskydd. Detonerar om fienden försöker röja minfältet.',
        forst_forb:        'Förberedd förstöring. Laddningar på plats men ej säkrade för avfyring.',
        forst_forb_sakrad: 'Förberedd förstöring, säkrad. Passage tillåten tills säkringen lyfts.',
        forst_utf:         'Utförd förstöring. Markerar bro, väg eller anläggning som redan sprängts.',
        forst_plan:        'Planlagd förstöring. Beslutad men ännu inte förberedd.',
        omr_verkan:        'Områdesverkande mina. Verkar över ett större område samtidigt.',
        verkansomrade:     'Verkansområde för en områdesverkande mina eller ett vapensystem.',
        minlinje:          'Minlinje. Minor utlagda i en sammanhängande linje.',
        avsparrning:       'Avspärrning, minvarning. Gränsen där minfältet börjar.',
        minruta:           'Minruta. Rektangulär minering enligt fast schema.',
        minomrade:         'Minerat område. Yta med minering — antal anges på gränsen.',
        avstand_tramp:     'Avståndslagd trampminering. Trampminor lagda på distans.',
        avstand_strv:      'Avståndslagd stridsvagnsminering. Strvminor lagda på distans, oftast via artilleri.',
        upk:               'Utgångs-Punkt-Koordinat. Bestämbar referenspunkt i terrängen — inte en mina.',
        ytter:             'Yttergränsmarkör. Styr vilken yta PNG-exporten täcker.',
        text:              'Fri text. Egen anteckning på kartan.',
        frihand:           'Fri-rita. Frihandsritad linje för skissmarkeringar.'
    };
    const ALBUM_INFO_DEFAULT = 'Klicka på ett kort för att läsa om symbolen.';

    let albumEl = null;

    function totalSymbolCount() {
        if (!window.MK_SYMBOL_GROUPS) return 0;
        let n = 0;
        window.MK_SYMBOL_GROUPS.forEach(g => { n += g.ids.length; });
        return n;
    }

    function counterText() {
        return state.discoveries.length + ' av ' + totalSymbolCount() + ' upptäckta';
    }

    function updateAlbumCounter() {
        if (!albumEl) return;
        const c = albumEl.querySelector('.mkt-album-counter');
        if (c) c.textContent = counterText();
    }

    function onAlbumKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); completeSymbolsStep(); }
    }

    // Tap-hint: stoppa pulsanimationen vid forsta beröringen av skarmen
    function stopAlbumTapHint() {
        if (!albumEl) return;
        albumEl.classList.remove('mkt-tap-hint-active');
        document.removeEventListener('pointerdown', stopAlbumTapHint, true);
    }

    function openSymbolsAlbum() {
        // Stäng ev. spotlight-overlay först
        if (overlayEl) destroyOverlay();
        renderSymbolsAlbum();
    }

    function renderSymbolsAlbum() {
        if (albumEl && albumEl.parentNode) albumEl.parentNode.removeChild(albumEl);
        if (!window.MK_SYMBOL_GROUPS || !window.MK_SYMBOLS) return;

        const groupsEl = el('div', { class: 'mkt-album-groups' });
        window.MK_SYMBOL_GROUPS.forEach(group => {
            const groupGrid = el('div', { class: 'mkt-album-group-grid' });
            group.ids.forEach(id => {
                const sym = window.MK_SYMBOLS[id];
                if (!sym) return;
                const isFound = state.discoveries.indexOf(id) !== -1;
                const card = el('button', {
                    type: 'button',
                    class: 'mkt-album-card' + (isFound ? ' discovered' : ''),
                    'data-sym-id': id,
                    'aria-label': sym.label
                }, [
                    el('div', { class: 'mkt-album-card-svg', html: sym.svg }),
                    el('div', { class: 'mkt-album-card-label', text: sym.label })
                ]);
                card.addEventListener('click', function () { onCardClick(id, card); });
                groupGrid.appendChild(card);
            });
            const groupBlock = el('div', { class: 'mkt-album-group' }, [
                el('h3', { class: 'mkt-album-group-title', text: group.title }),
                groupGrid
            ]);
            groupsEl.appendChild(groupBlock);
        });

        albumEl = el('div', { id: 'mktAlbum', role: 'dialog', 'aria-label': 'Symbolernas värld' }, [
            el('div', { class: 'mkt-album-panel' }, [
                el('div', { class: 'mkt-album-header' }, [
                    el('div', { class: 'mkt-album-title' }, [
                        el('div', { class: 'mkt-album-pre', text: 'Steg 2 av 3' }),
                        el('h2', { class: 'mkt-album-h2', text: 'Symbolernas värld' })
                    ]),
                    el('div', { class: 'mkt-album-counter', text: counterText() }),
                    el('button', {
                        class: 'mkt-album-close',
                        type: 'button',
                        'aria-label': 'Stäng',
                        text: '×',
                        onclick: completeSymbolsStep
                    })
                ]),
                el('p', { class: 'mkt-album-desc', text: 'Klicka på ett tecken för att se hur det ser ut direkt på kartan. Inget är fel — utforska i din egen takt.' }),
                el('div', { class: 'mkt-album-body' }, [groupsEl]),
                el('div', { class: 'mkt-album-info', text: ALBUM_INFO_DEFAULT }),
                el('div', { class: 'mkt-album-footer' }, [
                    el('button', { class: 'mkt-primary', type: 'button', text: 'Klar med symboler', onclick: completeSymbolsStep })
                ])
            ])
        ]);
        // Tap-hint pa kort som inte ar upptackta
        albumEl.classList.add('mkt-tap-hint-active');
        document.body.appendChild(albumEl);
        document.addEventListener('keydown', onAlbumKey);
        // Lyssna pa forsta beröringen for att stanna pulsen permanent
        document.addEventListener('pointerdown', stopAlbumTapHint, true);
    }

    function onCardClick(symId, cardEl) {
        placeDemoSymbol(symId);
        if (state.discoveries.indexOf(symId) === -1) {
            state.discoveries.push(symId);
            saveState();
        }
        cardEl.classList.add('discovered');
        cardEl.classList.remove('mkt-pop');
        // Force reflow så animationen kan retriggas vid upprepat klick
        void cardEl.offsetWidth;
        cardEl.classList.add('mkt-pop');
        updateAlbumCounter();
        updateAlbumInfo(symId);
    }

    function updateAlbumInfo(symId) {
        if (!albumEl) return;
        const info = albumEl.querySelector('.mkt-album-info');
        if (!info) return;
        info.textContent = SYMBOL_DESCRIPTIONS[symId] || ALBUM_INFO_DEFAULT;
    }

    function closeSymbolsAlbum() {
        document.removeEventListener('keydown', onAlbumKey);
        document.removeEventListener('pointerdown', stopAlbumTapHint, true);
        if (albumEl && albumEl.parentNode) albumEl.parentNode.removeChild(albumEl);
        albumEl = null;
        clearTutorialDemoLayer();
        activeStep = null;
    }

    function completeSymbolsStep() {
        markCompleted('symbols');
        closeSymbolsAlbum();
    }

    // ── Diplom (Steg 3:s avslutning) ─────────────────────────────────────────
    let diplomaEl = null;

    function onDiplomaKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); closeDiploma(); }
    }

    function showDiploma() {
        if (diplomaEl) return;
        const now = new Date();
        const dateStr = now.toLocaleDateString('sv-SE');
        const timeStr = now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
        const found = state.discoveries.length;
        const total = totalSymbolCount();

        const card = el('div', { class: 'mkt-diploma-card', role: 'document' }, [
            el('div', { class: 'mkt-diploma-stamp', text: 'MINKARTA' }),
            el('div', { class: 'mkt-diploma-pre', text: 'DIPLOM' }),
            el('h2', { class: 'mkt-diploma-title', text: 'Rundturen genomförd' }),
            el('p', { class: 'mkt-diploma-line', text: 'Härmed intygas att rundturen av MINKARTA är fullgjord.' }),
            el('div', { class: 'mkt-diploma-rows' }, [
                el('div', { class: 'mkt-diploma-row' }, [
                    el('div', { class: 'mkt-diploma-row-label', text: 'Datum' }),
                    el('div', { class: 'mkt-diploma-row-value', text: dateStr })
                ]),
                el('div', { class: 'mkt-diploma-row' }, [
                    el('div', { class: 'mkt-diploma-row-label', text: 'Klockslag' }),
                    el('div', { class: 'mkt-diploma-row-value', text: timeStr })
                ]),
                el('div', { class: 'mkt-diploma-row' }, [
                    el('div', { class: 'mkt-diploma-row-label', text: 'Symboler upptäckta' }),
                    el('div', { class: 'mkt-diploma-row-value', text: found + ' av ' + total })
                ])
            ]),
            el('div', { class: 'mkt-diploma-actions' }, [
                el('button', {
                    type: 'button',
                    class: 'mkt-ghost',
                    text: 'Spela om från början',
                    onclick: () => { closeDiploma(); reset(); start('welcome'); }
                }),
                el('button', {
                    type: 'button',
                    class: 'mkt-primary',
                    text: 'Stäng',
                    onclick: closeDiploma
                })
            ])
        ]);
        diplomaEl = el('div', {
            id: 'mktDiploma',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': 'Diplom: MINKARTA-rundturen genomförd'
        }, [card]);
        document.body.appendChild(diplomaEl);
        document.addEventListener('keydown', onDiplomaKey);
    }

    function closeDiploma() {
        document.removeEventListener('keydown', onDiplomaKey);
        if (diplomaEl && diplomaEl.parentNode) diplomaEl.parentNode.removeChild(diplomaEl);
        diplomaEl = null;
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
                    injectLauncher();
                }
            }, [el('span', { text: 'Återställ tutorial-progress' })])
        ]);
        document.body.appendChild(menuEl);

        // Position: fixed mot viewporten. Föredra under knappen, flippa över
        // om menyn inte får plats nedanför. Klampa till viewport-marginalen.
        const r = anchor.getBoundingClientRect();
        const mw = menuEl.offsetWidth;
        const mh = menuEl.offsetHeight;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const margin = 8;
        const spaceBelow = vh - r.bottom - margin;
        const spaceAbove = r.top - margin;
        let top;
        if (spaceBelow >= mh + 6) {
            top = r.bottom + 6;
        } else if (spaceAbove >= mh + 6) {
            top = r.top - mh - 6;
        } else {
            top = clamp(r.bottom + 6, margin, vh - mh - margin);
        }
        const left = clamp(r.left, margin, vw - mw - margin);
        menuEl.style.top  = top + 'px';
        menuEl.style.left = left + 'px';

        // Fördröjt globalt klick-stäng (annars triggar samma klick)
        setTimeout(() => document.addEventListener('click', onDocClickForMenu, true), 0);
    }

    function getLauncherText() {
        if (state.completed) return 'Lär dig MINKARTA igen';
        const anyStarted = state.openedFirstTime ||
            STEPS.some(k => state.steps[k].seen || state.steps[k].completed);
        if (anyStarted) return 'Fortsätt lär dig kartan';
        return 'Lär dig MINKARTA';
    }

    function injectLauncher() {
        const host = document.getElementById('mapControls');
        if (!host) return;
        const txt = getLauncherText();
        let btn = host.querySelector('.mkt-launcher');
        if (btn) {
            // Knappen finns redan — uppdatera bara texten om den ändrats
            if (btn.textContent !== txt) btn.textContent = txt;
            return;
        }
        btn = el('button', {
            type: 'button',
            class: 'mkt-launcher',
            text: txt,
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
