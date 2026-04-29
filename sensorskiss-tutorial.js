// ─────────────────────────────────────────────────────────────────────────────
//  SENSORSKISS Tutorial — Mini-skola
//
//  Tre steg:
//    welcome  — Vad är sensorerna och vad ska skissen användas till
//    symbols  — Genomgång av sensortyperna (innehåll från
//               Utbildningsanvisning sensorer Hemvärn 2025 kap 2)
//    onion    — Lökprincipen (s. 67–68 fig 46) + uppmaning att fylla
//               i Beslutsstödsplan
//
//  Exponerar window.SK_TUTORIAL = { start, stop, isCompleted, reset }
//  Auto-trigger vid första laddning sker från sensorskiss.html.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
    'use strict';

    const STORAGE_KEY = 'sensorskiss_tutorial_v1';
    const STEPS = ['welcome', 'symbols', 'onion'];

    function defaultState() {
        return {
            version: 1,
            completed: false,
            skipped: false,
            steps: {
                welcome: { seen: false },
                symbols: { seen: false },
                onion:   { seen: false }
            }
        };
    }
    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return defaultState();
            const p = JSON.parse(raw);
            if (!p || p.version !== 1) return defaultState();
            const def = defaultState();
            return Object.assign(def, p, {
                steps: Object.assign(def.steps, p.steps || {})
            });
        } catch (_) { return defaultState(); }
    }
    function saveState() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
    }
    let state = loadState();

    // ── DOM-helpers ──────────────────────────────────────────────────────────
    function el(tag, attrs, children) {
        const node = document.createElement(tag);
        if (attrs) {
            for (const k in attrs) {
                if (k === 'class') node.className = attrs[k];
                else if (k === 'text') node.textContent = attrs[k];
                else if (k === 'html') node.innerHTML = attrs[k];
                else if (k.startsWith('on') && typeof attrs[k] === 'function') {
                    node.addEventListener(k.slice(2), attrs[k]);
                } else { node.setAttribute(k, attrs[k]); }
            }
        }
        if (children) {
            (Array.isArray(children) ? children : [children]).forEach(c => {
                if (c == null) return;
                node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
            });
        }
        return node;
    }

    let overlayEl = null;
    let currentStepIdx = 0;
    let demoLayer = null;

    function symbolCard(id, hint) {
        const sym = window.SK_SYMBOLS && window.SK_SYMBOLS[id];
        if (!sym) return null;
        const wrap = el('div', { class: 'sk-tut-symbol-card' });
        const svgWrap = el('div', { html: sym.svg });
        wrap.appendChild(svgWrap);
        wrap.appendChild(el('div', { class: 'name', text: sym.label }));
        if (hint) wrap.appendChild(el('div', { class: 'hint', text: hint }));
        return wrap;
    }

    // ── Steg-renderare ───────────────────────────────────────────────────────
    function renderWelcome() {
        const body = el('div');
        body.appendChild(el('p', { html:
            'Sensorerna är ett <b>komplement till trupp och hund</b>. De tre huvudkapaciteterna är:'
        }));
        body.appendChild(el('ul', null, [
            el('li', { html: '<b>Upptäcka</b> — något av intresse rör sig i området.' }),
            el('li', { html: '<b>Klassificera</b> — särskilja djur, människor och fordon.' }),
            el('li', { html: '<b>Identifiera</b> — civil eller militär; beväpnad eller obeväpnad.' })
        ]));
        body.appendChild(el('p', { html:
            'I den här tabben ritar du upp sensoruppsättningen för ett bevakningsobjekt och bygger en ' +
            '<b>beslutsstödsplan</b> för stridsledaren.'
        }));
        body.appendChild(el('p', { html:
            'Klicka <b>Nästa</b> för att gå igenom symbolerna.'
        }));
        return body;
    }

    function renderSymbols() {
        const body = el('div');
        body.appendChild(el('p', { html:
            'Symbolerna kommer från Utbildningsanvisning sensorer Hemvärn 2025 (s. 72). ' +
            'Bokstaven inuti symbolen visar typen, eller en löpande numrering (C1, C2, P1, …).'
        }));
        const grid = el('div', { class: 'sk-tut-symbol-grid' });
        const items = [
            ['cim',         'CIM 2 — bevakningssats med snubbeltråd. Upp till 4000 m DL per MGE. Upptäcker passage, klassificerar inte.'],
            ['pir',         'PIR — passiv IR. 8 m diameter detektion vid 40/80 m. Bra för att väcka kamera.'],
            ['kamera',      'EO/IR-kamera. Aktiveras av annan sensor (3–5 s uppstart). Identifierar i gråskala.'],
            ['umra',        'UMRA — seismisk + akustisk. ~50 m radie person, 100–200 m fordon, 5–8 km hkp. Klassificerar.'],
            ['larmmina',    'Larmmina 2B — ljud + ljus. Max 150 m till observatör. Snubbeltrådsutlöst.'],
            ['rpas',        'UAV06 A/T (Anafi USA GOV SE). 32 min flygtid, 4 km räckvidd, EO/IR.'],
            ['enkelpost',   'Enkelpost — mänsklig sensor. Hög uthållighet men begränsad räckvidd.'],
            ['dubbelpost',  'Dubbelpost / patrull — två soldater eller patrullslinga.'],
            ['infart',      'In/Utfartspost — kontrollerar passage in/ut ur ett område. Riktningen visar passagen.']
        ];
        items.forEach(([id, hint]) => {
            const c = symbolCard(id, hint);
            if (c) grid.appendChild(c);
        });
        body.appendChild(grid);
        body.appendChild(el('p', { html:
            '<br><b>Tips:</b> klicka en symbol i paletten och sedan på kartan för att placera. ' +
            'C/P/K/U/L numreras automatiskt.'
        }));
        return body;
    }

    function renderOnion() {
        const body = el('div');
        body.appendChild(el('p', { html:
            '<b>Lökprincipen</b> — flera sensorer i samma riktning bildar koncentriska skyddsskal ' +
            'runt objektet. Ju längre ut sensorn ligger, desto tidigare förvarning.'
        }));

        // CSS-only löksket
        const onion = el('div', { class: 'sk-tut-onion' });
        onion.appendChild(el('div', { class: 'sk-tut-onion-ring',
            style: 'width:200px;height:200px' }));
        onion.appendChild(el('div', { class: 'sk-tut-onion-ring',
            style: 'width:140px;height:140px' }));
        onion.appendChild(el('div', { class: 'sk-tut-onion-ring',
            style: 'width:80px;height:80px' }));
        onion.appendChild(el('div', { class: 'sk-tut-onion-target' }));
        // Etiketter
        onion.appendChild(el('div', { class: 'sk-tut-onion-label',
            style: 'left:50%;top:8px;transform:translateX(-50%)', text: 'UMRA — djupet (förvarning)' }));
        onion.appendChild(el('div', { class: 'sk-tut-onion-label',
            style: 'left:8px;top:50%;transform:translateY(-50%)', text: 'CIM' }));
        onion.appendChild(el('div', { class: 'sk-tut-onion-label',
            style: 'right:8px;top:50%;transform:translateY(-50%)', text: 'PIR + KAMERA' }));
        onion.appendChild(el('div', { class: 'sk-tut-onion-label',
            style: 'left:50%;bottom:8px;transform:translateX(-50%)', text: 'Larmmina (stridsavstånd)' }));
        body.appendChild(onion);

        body.appendChild(el('p', { html:
            'I exemplet detekterar PIR + KAMERA fordon på medelavstånd, UMRA klassificerar avsuten ' +
            'trupp på djupet, CIM larmar vid passage, och Larmmina bryter ut på stridsavstånd.'
        }));

        body.appendChild(el('h3', { text: 'Beslutsstödsplan' }));
        body.appendChild(el('p', { html:
            'Fyll i <b>Beslutsstödsplan</b>-panelen under kartan med beslutstillfällen (BT), ' +
            'händelser, handlingsalternativ och vem som inhämtar information. ' +
            'En genomarbetad beslutsstödsplan korter ner ledtiderna från larm till åtgärd.'
        }));
        body.appendChild(el('p', { html:
            'Klicka <b>Slutför</b> för att stänga mini-skolan.'
        }));
        return body;
    }

    const STEP_DEFS = {
        welcome: { title: 'Sensorerna i Hemvärnet', render: renderWelcome },
        symbols: { title: 'Sensortyper',            render: renderSymbols },
        onion:   { title: 'Lökprincipen',           render: renderOnion }
    };

    // ── Overlay-rendering ───────────────────────────────────────────────────
    function close() {
        if (overlayEl) { overlayEl.remove(); overlayEl = null; }
        if (demoLayer) { try { demoLayer.removeFrom(window.SK_MAP); } catch (_) {} demoLayer = null; }
    }

    function setStep(idx) {
        currentStepIdx = Math.max(0, Math.min(STEPS.length - 1, idx));
        const stepKey = STEPS[currentStepIdx];
        state.steps[stepKey].seen = true;
        saveState();
        renderOverlay();
    }

    function finish() {
        state.completed = true;
        saveState();
        close();
    }
    function skip() {
        state.skipped = true;
        saveState();
        close();
    }

    function renderOverlay() {
        if (!overlayEl) {
            overlayEl = el('div', { class: 'sk-tut-overlay' });
            // Klick utanför panelen stänger inte (för säkerhets skull)
            document.body.appendChild(overlayEl);
        }
        overlayEl.innerHTML = '';

        const stepKey = STEPS[currentStepIdx];
        const def = STEP_DEFS[stepKey];

        const panel = el('div', { class: 'sk-tut-panel' });
        const head = el('div', { class: 'sk-tut-head' });
        head.appendChild(el('div', { class: 'sk-tut-title', text: def.title }));
        head.appendChild(el('div', { class: 'sk-tut-step-pill',
            text: 'Steg ' + (currentStepIdx + 1) + ' av ' + STEPS.length }));
        panel.appendChild(head);

        const body = el('div', { class: 'sk-tut-body' });
        body.appendChild(def.render());
        panel.appendChild(body);

        const foot = el('div', { class: 'sk-tut-foot' });
        const skipBtn = el('button', { class: 'sk-tut-skip', text: 'Hoppa över', onclick: skip });
        foot.appendChild(skipBtn);

        const actions = el('div', { class: 'sk-tut-actions' });
        const prev = el('button', { class: 'sk-tut-prev', text: '← Tillbaka',
            onclick: () => setStep(currentStepIdx - 1) });
        prev.disabled = currentStepIdx === 0;
        actions.appendChild(prev);
        if (currentStepIdx < STEPS.length - 1) {
            actions.appendChild(el('button', { class: 'sk-tut-next', text: 'Nästa →',
                onclick: () => setStep(currentStepIdx + 1) }));
        } else {
            actions.appendChild(el('button', { class: 'sk-tut-finish', text: 'Slutför', onclick: finish }));
        }
        foot.appendChild(actions);
        panel.appendChild(foot);

        overlayEl.appendChild(panel);
    }

    function start(stepKey) {
        currentStepIdx = stepKey ? Math.max(0, STEPS.indexOf(stepKey)) : 0;
        renderOverlay();
    }

    function isCompleted() { return !!(state.completed || state.skipped); }
    function reset() {
        state = defaultState();
        saveState();
    }

    window.SK_TUTORIAL = { start, stop: close, isCompleted, reset };
})();
