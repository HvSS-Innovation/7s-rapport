// ─────────────────────────────────────────────────────────────────────────────
//  MAP-HARDAT-MODAL — Härdat läge-ingång för rapportfilers kartmodal
//
//  Används av rapportfilerna (index.html, ah.html, obslosa.html, scrim.html,
//  what.html, weft.html). Bygger på pmtiles-layer.js + dess
//  PMTilesHardening.createController(map, baseLayer).
//
//  Ingången är VARNINGSRADEN ovanför kartan (decorateWarning), i tre lägen:
//    - av:   orange varning + "Slå på Härdat läge"
//    - på:   grön bekräftelse + "Ändra…" (öppnar landskaps-väljaren, där
//            av-slag finns; utan väljare = stäng av)
//    - fel:  röd rad med orsaken + "Försök igen" och, när kartan lämnats tom
//            efter en misslyckad boot-aktivering, "Visa online-karta (nät)"
//  Header-knappen "HÄRDAT" som fanns tidigare är borttagen (2026-08-30): den
//  lästes som en statusbricka "härdat är på" samtidigt som raden under sa
//  att bakgrunden hämtas externt — två kontroller och två budskap för samma
//  sak på en telefonskärm.
//
//  STATE-DELNING: createController läser/skriver localStorage["pmtiles.hardening"]
//  vilket är samma key som minkarta.html använder. Slå på i 7S → öppna minkarta
//  → är redan på där. Och tvärtom.
//
//  Singleton URL: PMTILES_URL definieras på en plats — pmtiles-layer.js
//  som SVERIGE_PMTILES_URL, exponerad via window.PMTilesPrefetch.SVERIGE_URL.
// ─────────────────────────────────────────────────────────────────────────────

(function (global) {
    'use strict';

    // Gemensam aktiveringsväg: landskaps-väljaren om den finns på sidan,
    // annars direkt-toggle med OPSEC-confirm (samma logik som knappen).
    async function activateFlow(ctrl, map) {
        if (global.LandskapOffline && typeof global.LandskapOffline.open === 'function') {
            global.LandskapOffline.open({ ctrl: ctrl, map: map });
            return;
        }
        if (!ctrl.isActive()) {
            // Fas 1.4: inget "slå på ändå" — härdat utan komplett lokalt paket
            // skulle range-hämta on-demand från R2 medan UI:t påstår isolering.
            // Controllern (pmtiles-layer.js activate) upprätthåller samma krav;
            // detta ger bara ett vänligare besked innan.
            try {
                var cached = await ctrl.checkPrefetched();
                if (!cached) {
                    window.alert(
                        'Härdat läge kräver att kartan laddats ner i förväg.\n\n' +
                        'Öppna Min Karta → "Ladda ner offline" och hämta ditt område ' +
                        '(kräver nät), aktivera sedan härdat läge.'
                    );
                    return;
                }
            } catch (_) { /* check misslyckades — activate() gör samma kontroll fail-closed */ }
            await ctrl.toggle();
        }
    }

    // I påläge: väljaren är platsen för byte av landskap och för av-slag.
    // Sidor utan väljare får direkt av-slag.
    async function andraFlow(ctrl, map) {
        if (global.LandskapOffline && typeof global.LandskapOffline.open === 'function') {
            global.LandskapOffline.open({ ctrl: ctrl, map: map });
            return;
        }
        if (ctrl.isActive()) await ctrl.toggle();
    }

    function knapp(text, primar, title) {
        var btn = document.createElement('button');
        btn.type = 'button';
        // .hardat-cta: ljust tema byter textfärg till vit (theme-toggle.css)
        // — hårdkodad mörk text klarar inte AA mot ljus-temats accent.
        btn.className = primar ? 'hardat-cta' : 'hardat-cta-ghost';
        btn.textContent = text;
        if (title) btn.title = title;
        btn.style.border = primar ? 'none' : '1px solid currentColor';
        btn.style.background = primar ? 'var(--accent, #4caf50)' : 'transparent';
        if (!primar) btn.style.color = 'inherit';
        btn.style.borderRadius = '4px';
        btn.style.padding = '3px 10px';
        btn.style.marginLeft = '8px';
        btn.style.marginTop = '2px';
        btn.style.font = 'inherit';
        btn.style.fontWeight = '700';
        btn.style.cursor = 'pointer';
        btn.style.whiteSpace = 'nowrap';
        return btn;
    }

    // Gör varningsraden ("kartbakgrunden laddas från extern server…") till
    // ingången till Härdat läge: i oläge en "Slå på Härdat läge"-knapp, i
    // påläge en grön bekräftelse med "Ändra…", i felläge en röd rad som
    // säger VARFÖR aktiveringen misslyckades — så en tom karta aldrig står
    // oförklarad bakom en spinner.
    function decorateWarning(warningEl, ctrl, map) {
        if (!warningEl || !ctrl) return;
        if (warningEl.__hardatDecorated) return;
        warningEl.__hardatDecorated = true;

        // Basfärg för CTA-knappen som CSS-regel (inte inline) så ljus-temats
        // override i shared/theme-toggle.css kan vinna på sidor med toggle.
        if (!document.getElementById('hardatCtaStyle')) {
            var st = document.createElement('style');
            st.id = 'hardatCtaStyle';
            st.textContent = '.hardat-cta{color:#0d1f0d}';
            document.head.appendChild(st);
        }

        var originalText = warningEl.textContent;

        function render() {
            var active = ctrl.isActive();
            var fel = (typeof ctrl.getFel === 'function') ? ctrl.getFel() : null;
            warningEl.innerHTML = '';
            var span = document.createElement('span');

            if (active) {
                warningEl.style.background = '#10240f';
                warningEl.style.borderBottom = '1px solid #4caf50';
                warningEl.style.color = '#9ed99e';
                span.textContent = '✓ Härdat läge PÅ — kartbakgrunden ritas lokalt, inga externa kart-anrop. ';
                warningEl.appendChild(span);
                var andra = knapp('Ändra…', false, 'Byt landskap eller stäng av härdat läge');
                andra.addEventListener('click', function () { andraFlow(ctrl, map); });
                warningEl.appendChild(andra);
                return;
            }

            if (fel) {
                warningEl.style.background = '#3a1818';
                warningEl.style.borderBottom = '1px solid #c62828';
                warningEl.style.color = '#ffd1d1';
                span.textContent = 'Härdat läge kunde inte aktiveras: ' + fel.text + '.' +
                    (fel.kartaDold ? ' Kartan är dold — inga kart-anrop har gjorts. ' : ' ');
                warningEl.appendChild(span);
                var igen = knapp('Försök igen', true, 'Försök aktivera härdat läge på nytt');
                igen.addEventListener('click', function () { activateFlow(ctrl, map); });
                warningEl.appendChild(igen);
                if (fel.kartaDold && typeof ctrl.visaNormal === 'function') {
                    var online = knapp('Visa online-karta (nät)', false,
                        'Hämtar kartbakgrund från extern server som ser IP och visat område');
                    online.addEventListener('click', function () { ctrl.visaNormal(); });
                    warningEl.appendChild(online);
                }
                return;
            }

            warningEl.style.background = '#2a1a0a';
            warningEl.style.borderBottom = '1px solid #c8a24e';
            warningEl.style.color = '#c8a24e';
            span.textContent = originalText + ' ';
            warningEl.appendChild(span);
            var pa = knapp('Slå på Härdat läge', true,
                'Ladda ner kartan i förväg och rita den lokalt — inga utgående kart-anrop.');
            pa.addEventListener('click', function () { activateFlow(ctrl, map); });
            warningEl.appendChild(pa);
        }
        ctrl.onChange(render);
        render();
    }

    function setupController(opts) {
        var map = opts.map;
        var baseLayer = opts.baseLayer;
        var warningEl = opts.warningEl || null;
        // Loading-spinnern (#mapSpinner) i rapportfilernas modal döljs annars
        // ENBART av OTM-baslagrets 'load'-event. När härdat läge auto-aktiverar
        // vid sid-omladdning läggs OTM-lagret aldrig på → eventet fyrar aldrig
        // → den opaka spinnern täcker den färdigrenderade PMTiles-kartan i
        // evighet. Dölj därför spinnern när härdat blir aktivt — OCH när
        // aktiveringen misslyckats (kartan är då tom med besked i raden; en
        // spinner ovanpå skulle dölja beskedet).
        var spinnerEl = opts.spinnerEl || document.getElementById('mapSpinner') || null;

        // Idempotens: om redan attachad till denna karta, gör inget.
        if (map.__hardenCtrl) return map.__hardenCtrl;

        var ctrl = global.PMTilesHardening.createController(map, baseLayer);
        map.__hardenCtrl = ctrl;

        function refresh() {
            var active = ctrl.isActive();
            var fel = (typeof ctrl.getFel === 'function') ? ctrl.getFel() : null;
            if ((active || fel) && spinnerEl) spinnerEl.classList.add('hidden');
        }
        ctrl.onChange(refresh);
        refresh();
        decorateWarning(warningEl, ctrl, map);

        return ctrl;
    }

    // Publik API: vänta in PMTilesHardening:ready om modulen ännu inte
    // är laddad. Modulen dispatchar eventet på sista raden i
    // pmtiles-layer.js. Returnerar en Promise som löser med controllern.
    // `headerEl` accepteras fortfarande (anroparna skickar det) men används
    // inte längre — ingången är varningsraden.
    function attach(opts) {
        if (!opts || !opts.map || !opts.baseLayer) {
            console.error('[map-hardat-modal] attach: map/baseLayer krävs');
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
