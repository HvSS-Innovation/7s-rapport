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

    // Gemensam aktiveringsväg: landskaps-väljaren om den finns på sidan,
    // annars direkt-toggle med OPSEC-confirm (samma logik som knappen).
    async function activateFlow(ctrl, map) {
        if (global.LandskapOffline && typeof global.LandskapOffline.open === 'function') {
            global.LandskapOffline.open({ ctrl: ctrl, map: map });
            return;
        }
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
            await ctrl.toggle();
        }
    }

    // Gör varningsraden ("kartbakgrunden laddas från extern server…") till en
    // väg IN i Härdat läge i stället för bara en varning: i oläge får den en
    // "Slå på Härdat läge"-knapp, i påläge byts den till en grön bekräftelse.
    // Pedagogiken: användaren som öppnar kartan för en koordinat ska se att
    // skyddat läge finns — inte behöva hitta en liten knapp i headern.
    function decorateWarning(warningEl, ctrl, map) {
        if (!warningEl || !ctrl) return;
        if (warningEl.__hardatDecorated) return;
        warningEl.__hardatDecorated = true;

        var originalText = warningEl.textContent;

        function render() {
            var active = ctrl.isActive();
            warningEl.innerHTML = '';
            if (active) {
                warningEl.style.background = '#10240f';
                warningEl.style.borderBottom = '1px solid #4caf50';
                warningEl.style.color = '#9ed99e';
                warningEl.textContent =
                    '✓ Härdat läge PÅ — kartbakgrunden ritas lokalt, inga externa kart-anrop.';
                return;
            }
            warningEl.style.background = '#2a1a0a';
            warningEl.style.borderBottom = '1px solid #c8a24e';
            warningEl.style.color = '#c8a24e';
            var span = document.createElement('span');
            span.textContent = originalText + ' ';
            warningEl.appendChild(span);
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = 'Slå på Härdat läge';
            btn.title = 'Ladda ner kartan i förväg och rita den lokalt — inga utgående kart-anrop.';
            btn.style.background = 'var(--accent, #4caf50)';
            btn.style.color = '#0d1f0d';
            btn.style.border = 'none';
            btn.style.borderRadius = '4px';
            btn.style.padding = '3px 10px';
            btn.style.marginLeft = '8px';
            btn.style.font = 'inherit';
            btn.style.fontWeight = '700';
            btn.style.cursor = 'pointer';
            btn.style.whiteSpace = 'nowrap';
            btn.addEventListener('click', function () { activateFlow(ctrl, map); });
            warningEl.appendChild(btn);
        }
        ctrl.onChange(render);
        render();
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
        // Loading-spinnern (#mapSpinner) i rapportfilernas modal döljs annars
        // ENBART av OTM-baslagrets 'load'-event. När härdat läge auto-aktiverar
        // vid sid-omladdning rivs OTM-lagret innan det hinner 'load':a → eventet
        // fyrar aldrig → den opaka spinnern täcker den färdigrenderade PMTiles-
        // kartan i evighet. Dölj därför spinnern även när härdat blir aktivt.
        var spinnerEl = opts.spinnerEl || document.getElementById('mapSpinner') || null;
        // Behåll map i closure så Härdat-knappen kan öppna landskaps-väljaren
        // (shared/landskap-offline.js) och panna kartan efter aktivering.

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
            // Härdat aktivt → PMTiles-lagret ligger redan på kartan; lås upp vyn
            // genom att dölja spinnern (OTM:s 'load' kommer aldrig fyra här).
            if (active && spinnerEl) spinnerEl.classList.add('hidden');
        }
        ctrl.onChange(refresh);
        refresh();
        decorateWarning(warningEl, ctrl, map);

        btn.addEventListener('click', async function () {
            // Landskaps-väljaren är den nya ingången: klick öppnar väljaren
            // där operatören laddar ner landskap offline och slår på/av härdat
            // läge per landskap. När härdat redan är på öppnas väljaren också
            // (avstängning görs där inne). Sidor utan landskap-offline.js får
            // fallback-toggle med OPSEC-confirm via activateFlow.
            if (ctrl.isActive() && !(global.LandskapOffline && global.LandskapOffline.open)) {
                await ctrl.toggle();
                return;
            }
            await activateFlow(ctrl, map);
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

    // Namnger vad Härdat läge faktiskt ritar, för statusrader ("z 9 — Härdat:
    // Estland"). Utan denna sa statusraden "OpenTopoMap" även när kartan kom
    // ur en lokal PMTiles-fil — felaktig lägesbild för en operatör som
    // kontrollerar sin isolering (SECURITY_BACKLOG 2026-07-28).
    // Returnerar null när härdat är av → anroparen behåller sin OTM/OSM-etikett.
    function hardenedSourceLabel(ctrl) {
        if (!ctrl || !ctrl.isActive || !ctrl.isActive()) return null;
        var url = (ctrl.getUrl && ctrl.getUrl()) || '';
        var name = null;
        if (global.PMTilesPrefetch && url === global.PMTilesPrefetch.SVERIGE_URL) {
            name = 'Sverige';
        }
        if (!name && global.HVCountries && global.HVCountries.pmtilesPresets) {
            var cp = global.HVCountries.pmtilesPresets;
            for (var code in cp) {
                if (cp[code].pmtiles && cp[code].pmtiles.url === url) { name = cp[code].label; break; }
            }
        }
        if (!name && global.HVLandskap && global.HVLandskap.presets) {
            var lp = global.HVLandskap.presets;
            for (var id in lp) {
                if (lp[id].pmtiles && lp[id].pmtiles.url === url) { name = lp[id].namn; break; }
            }
        }
        return name ? 'Härdat: ' + name : 'Härdat (PMTiles)';
    }

    // decorateWarning + hardenedSourceLabel exponeras separat för sidor med
    // inline-karta (minkarta, sensorskiss) som har egna kontroller men samma
    // varningsrad ovanför kartan och samma statusrad under den.
    global.MapHardatModal = {
        attach: attach,
        decorateWarning: decorateWarning,
        hardenedSourceLabel: hardenedSourceLabel
    };

})(window);
