// ─────────────────────────────────────────────────────────────────────────────
//  MAP-HARDAT-MODAL — kompakt Härdat läge-toggle för rapportfilers kartmodal
//
//  Används av rapportfilerna (index.html, ah.html, obslosa.html, scrim.html,
//  what.html, weft.html). Bygger på pmtiles-layer.js + dess
//  PMTilesHardening.createController(map, baseLayer).
//
//  Skillnad mot minkarta.html: rapportfilerna har en mycket enklare modal
//  (bara "Karta"-knapp som öppnar modal med L.tileLayer mot OTM). De behöver
//  inte stil-dropdown eller pre-download-knapp i modal-headern — bara en
//  toggle. Pre-download görs på minkarta-sidan (Min Karta).
//
//  STATE-DELNING: createController läser/skriver localStorage["pmtiles.hardening"]
//  vilket är samma key som minkarta.html använder. Slå på i 7S → öppna minkarta
//  → är redan på där. Och tvärtom.
//
//  Singleton URL: PMTILES_URL definieras på en plats — pmtiles-layer.js:87
//  som SVERIGE_PMTILES_URL, exponerad via window.PMTilesPrefetch.SVERIGE_URL.
//  Denna helper duplicerar inte URL:en utan läser den vid behov för
//  pre-download-check.
// ─────────────────────────────────────────────────────────────────────────────

(function (global) {
    'use strict';

    function buildToggleButton() {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'map-modal-harden';
        btn.setAttribute('aria-pressed', 'false');
        btn.title = 'Använd lokalt cachad PMTiles-fil istället för OpenTopoMap. Kräver att kartan laddats ner via Min Karta.';
        // Kompakt stil — passar in i .map-modal-header utan att tränga
        // titeln eller close-knappen även på 375 px viewport.
        btn.style.background = 'transparent';
        btn.style.border = '1px solid var(--border, #2d4a2d)';
        btn.style.color = 'var(--text-muted, #5a7a5a)';
        btn.style.fontSize = '0.72rem';
        btn.style.fontWeight = '600';
        btn.style.letterSpacing = '0.04em';
        btn.style.textTransform = 'uppercase';
        btn.style.padding = '4px 10px';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';
        btn.style.marginRight = '8px';
        btn.textContent = 'Härdat';
        return btn;
    }

    function dimWarning(warningEl, hardened) {
        if (!warningEl) return;
        if (hardened) {
            warningEl.style.opacity = '0.35';
            warningEl.style.transition = 'opacity 0.18s';
        } else {
            warningEl.style.opacity = '';
        }
    }

    function setActiveStyle(btn, active) {
        if (active) {
            btn.style.background = 'var(--accent-dim, #1e3d1e)';
            btn.style.borderColor = 'var(--accent, #4caf50)';
            btn.style.color = 'var(--accent, #4caf50)';
            btn.textContent = 'Härdat: PÅ';
            btn.setAttribute('aria-pressed', 'true');
        } else {
            btn.style.background = 'transparent';
            btn.style.borderColor = 'var(--border, #2d4a2d)';
            btn.style.color = 'var(--text-muted, #5a7a5a)';
            btn.textContent = 'Härdat';
            btn.setAttribute('aria-pressed', 'false');
        }
    }

    function setupController(opts) {
        var map = opts.map;
        var baseLayer = opts.baseLayer;
        var headerEl = opts.headerEl;
        var warningEl = opts.warningEl || null;

        // Idempotens: om redan attachad till denna karta, gör inget.
        if (map.__hardenCtrl) return map.__hardenCtrl;

        var ctrl = global.PMTilesHardening.createController(map, baseLayer);
        map.__hardenCtrl = ctrl;

        var btn = buildToggleButton();
        // Lägg knappen som första barn så den hamnar mellan titeln och
        // close-knappen i en flex-row med justify-content:space-between.
        // Close-knappen (X) ligger sist; titeln är första span.
        // Vi vill ha: [title] ... [Härdat] [X]
        var closeBtn = headerEl.querySelector('.map-modal-close');
        if (closeBtn) {
            headerEl.insertBefore(btn, closeBtn);
        } else {
            headerEl.appendChild(btn);
        }

        function refresh() {
            var active = ctrl.isActive();
            setActiveStyle(btn, active);
            dimWarning(warningEl, active);
        }
        ctrl.onChange(refresh);
        refresh();

        btn.addEventListener('click', async function () {
            // Om användaren slår PÅ utan pre-downloadad fil: varna att
            // första request:en kommer synas hos R2-hosten. Avgöra med
            // checkPrefetched() mot aktuell controller-URL.
            if (!ctrl.isActive()) {
                try {
                    var cached = await ctrl.checkPrefetched();
                    if (!cached) {
                        var ok = window.confirm(
                            'Härdat läge kräver att kartan laddats ner via Min Karta-sidan.\n\n' +
                            'Slå på ändå? Då hämtas kart-tiles on-demand från R2 — ' +
                            'din IP + visat område kan synas hos hosting-servern första gången.\n\n' +
                            'OK = aktivera ändå. Avbryt = behåll OpenTopoMap.'
                        );
                        if (!ok) return;
                    }
                } catch (_) { /* check misslyckades — låt toggle gå igenom */ }
            }
            await ctrl.toggle();
        });

        return ctrl;
    }

    // Publik API: vänta in PMTilesHardening:ready om modulen ännu inte
    // är laddad. Modulen dispatchar eventet på sista raden i
    // pmtiles-layer.js. Returnerar en Promise som löser med controllern.
    function attach(opts) {
        if (!opts || !opts.map || !opts.baseLayer || !opts.headerEl) {
            console.error('[map-hardat-modal] attach: map/baseLayer/headerEl krävs');
            return Promise.resolve(null);
        }
        if (global.PMTilesHardening && typeof global.PMTilesHardening.createController === 'function') {
            return Promise.resolve(setupController(opts));
        }
        return new Promise(function (resolve) {
            global.addEventListener('PMTilesHardening:ready', function () {
                resolve(setupController(opts));
            }, { once: true });
        });
    }

    global.MapHardatModal = { attach: attach };

})(window);
