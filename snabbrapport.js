// ─────────────────────────────────────────────────────────────────────────────
//  SNABBRAPPORT — 7S
//
//  Minimalt formulär för "första kontaktrapport på under 15 sek". Fokuserar
//  på de fyra S som spelar roll i akut läge: Styrka (chips), Slag (chips +
//  textfält), Sysselsättning (kompass + chips), Ställe (GPS / textfält).
//  Övriga fält (Till/Från/Symbol/Sagesman/Sedan) defaultas från senaste
//  rapporten i localStorage; Stund autofylls till nu.
//
//  Genom att skriva till de befintliga form-id:na (#styrka, #slag, etc.) i
//  index.html återanvänder vi hela rapport-pipelinen — generator, CoT-XML,
//  data package, clipboard. Snabbrapport är en alternativ INPUT-vy, inte en
//  alternativ rapport-typ.
//
//  Roadmap-koppling: audit/roadmap.md Sväng 2.4. Mätbart mål: median ≤ 15
//  sek från knapptryck till "kopierad" i toast.
// ─────────────────────────────────────────────────────────────────────────────

(function (global) {
    'use strict';

    var STORAGE_KEY = '7s_lastReport';
    var STYLES_ID = 'snabbrapport-styles';

    function getLastReport() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (_) { return null; }
    }

    function saveLastReport(data) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) {}
    }

    function elem(id) { return document.getElementById(id); }
    function val(id) { var e = elem(id); return e ? (e.value || '').trim() : ''; }
    function setVal(id, v) { var e = elem(id); if (e) e.value = v; }

    function injectStyles() {
        if (document.getElementById(STYLES_ID)) return;
        var css =
            '.sr-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:9500;display:flex;align-items:flex-start;justify-content:center;padding:12px;overflow-y:auto}' +
            '.sr-modal{background:#1a321a;border:1px solid #2d4a2d;border-radius:8px;max-width:540px;width:100%;padding:14px 16px;color:#e8f0e8;font-family:Inter,system-ui,sans-serif;margin:auto}' +
            '.sr-modal h2{margin:0 0 4px;font-size:1.05rem;letter-spacing:0.04em;color:#c8e6c9}' +
            '.sr-modal .sr-sub{margin:0 0 12px;font-size:0.74rem;color:#8aaa8a}' +
            '.sr-section{margin-bottom:12px}' +
            '.sr-label{font-size:0.72rem;color:#8aaa8a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;font-weight:600;display:flex;align-items:center;gap:6px}' +
            '.sr-label .sr-current{color:#c8e6c9;font-weight:400;text-transform:none;letter-spacing:0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:0.78rem;margin-left:auto;text-align:right;max-width:60%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
            '.sr-chips{display:flex;flex-wrap:wrap;gap:6px}' +
            '.sr-chip{padding:7px 12px;background:#0f240f;border:1px solid #2d4a2d;color:#e8f0e8;border-radius:4px;cursor:pointer;font-size:0.86rem;font-family:inherit;min-width:38px;text-align:center}' +
            '.sr-chip:hover{background:#243d24}' +
            '.sr-chip.is-active{background:#4caf50;color:#0d1f0d;border-color:#4caf50;font-weight:600}' +
            '.sr-input,.sr-textarea{width:100%;padding:8px 10px;background:#0f240f;border:1px solid #2d4a2d;color:#e8f0e8;border-radius:4px;font-family:inherit;font-size:0.88rem;box-sizing:border-box;margin-top:6px}' +
            '.sr-textarea{resize:vertical;min-height:42px}' +
            '.sr-row{display:flex;gap:6px;align-items:stretch;margin-top:6px}' +
            '.sr-row .sr-input{margin-top:0;flex:1}' +
            '.sr-btn{padding:8px 12px;border-radius:4px;border:1px solid #2d4a2d;background:#1a321a;color:#e8f0e8;font-family:inherit;font-size:0.84rem;cursor:pointer;white-space:nowrap}' +
            '.sr-btn:hover{background:#243d24}' +
            '.sr-btn-primary{background:#4caf50;color:#0d1f0d;border-color:#4caf50;font-weight:600}' +
            '.sr-btn-primary:hover{background:#66bb6a}' +
            '.sr-btn-primary:disabled{background:#2d4a2d;color:#5a7a5a;border-color:#2d4a2d;cursor:not-allowed}' +
            '.sr-btn:disabled{opacity:0.55;cursor:not-allowed}' +
            '.sr-compass-wrap{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap}' +
            '.sr-compass{display:grid;grid-template-columns:repeat(3,34px);grid-template-rows:repeat(3,34px);gap:2px;flex-shrink:0}' +
            '.sr-compass-btn{background:#0f240f;border:1px solid #2d4a2d;color:#c8e6c9;cursor:pointer;font-size:0.78rem;font-weight:700;padding:0;border-radius:4px}' +
            '.sr-compass-btn:hover{background:#243d24}' +
            '.sr-compass-btn.is-active{background:#4caf50;color:#0d1f0d;border-color:#4caf50}' +
            '.sr-compass-clear{background:transparent;border:1px solid #2d4a2d;color:#8aaa8a;cursor:pointer;font-size:0.7rem;border-radius:4px;padding:0}' +
            '.sr-compass-clear:hover{background:#0f240f;color:#e8f0e8}' +
            '.sr-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:12px;padding-top:12px;border-top:1px solid #2d4a2d}' +
            '.sr-other{margin-top:8px;border:1px solid #2d4a2d;border-radius:4px}' +
            '.sr-other summary{cursor:pointer;padding:8px 12px;font-weight:600;color:#c8e6c9;font-size:0.8rem;list-style:none}' +
            '.sr-other summary::-webkit-details-marker{display:none}' +
            '.sr-other summary::before{content:"▸ ";margin-right:4px;display:inline-block;transition:transform 0.15s}' +
            '.sr-other[open] summary::before{transform:rotate(90deg)}' +
            '.sr-other-body{padding:0 12px 12px}' +
            '.sr-other-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px}' +
            '.sr-other-row{display:flex;flex-direction:column;gap:2px}' +
            '.sr-other-row label{font-size:0.7rem;color:#8aaa8a;text-transform:uppercase;letter-spacing:0.06em;font-weight:600}' +
            '.sr-status{padding:8px 12px;border-radius:4px;font-size:0.78rem;margin-top:8px;line-height:1.4}' +
            '.sr-status-info{background:#0f240f;border:1px solid #2d4a2d;color:#c8e6c9}' +
            '.sr-status-warn{background:#2a1a0a;border:1px solid #c8a24e;color:#c8a24e}' +
            '.sr-status-ok{background:#0f3010;border:1px solid #4caf50;color:#a6e9a8}' +
            '.sr-timer{font-family:ui-monospace,Menlo,Consolas,monospace;color:#c8a24e;font-size:0.74rem;font-weight:600;margin-left:auto}' +
            '.sr-titlebar{display:flex;align-items:center;gap:8px;margin-bottom:6px}' +
            '.sr-titlebar h2{margin:0}' +
            '.sr-close{background:transparent;border:1px solid #2d4a2d;color:#8aaa8a;cursor:pointer;border-radius:4px;width:28px;height:28px;font-size:1rem;line-height:1;padding:0}' +
            '.sr-close:hover{background:#3d1a1a;color:#ff8a8a;border-color:#c62828}';
        var style = document.createElement('style');
        style.id = STYLES_ID;
        style.textContent = css;
        document.head.appendChild(style);
    }

    var STYRKA_CHIPS = ['1','2','3','4','5','6','8','10','15','20+'];
    var SLAG_CHIPS = ['Infanteri','Civila','Stridsvagn','Lastbil','Drönare','Helikopter','MC','VOI','Personbil'];
    var SYSSEL_CHIPS = ['Spanar','Saboterar','Patrull','Rörelse','Eldgivning','Gruppering'];

    function open() {
        injectStyles();

        var t0 = Date.now();

        // Defaulta tomma fält fran senaste rapport sa anvandaren slipper
        // skriva om Till/Fran/Symbol/Sagesman/Sedan om de ar samma som
        // forra gangen. Stund auto-fylls med Nu.
        var last = getLastReport() || {};
        var DEFAULTABLES = ['till', 'fran', 'symbol', 'sagesman', 'sedan'];
        DEFAULTABLES.forEach(function (f) {
            if (!val(f) && last[f]) setVal(f, last[f]);
        });
        if (!val('stund') && typeof global.setCurrentTime === 'function') {
            try { global.setCurrentTime(); } catch (_) {}
        }

        var overlay = document.createElement('div');
        overlay.className = 'sr-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-label', 'Snabbrapport 7S');

        function chipBtns(arr, fieldId, isAdditive) {
            return arr.map(function (txt) {
                return '<button type="button" class="sr-chip" data-chip data-field="' + fieldId + '" data-value="' + txt + '" data-additive="' + (isAdditive ? '1' : '0') + '">' + txt + '</button>';
            }).join('');
        }

        overlay.innerHTML =
            '<div class="sr-modal">' +
                '<div class="sr-titlebar">' +
                    '<h2>SNABBRAPPORT — 7S</h2>' +
                    '<span class="sr-timer" id="srTimer">0 s</span>' +
                    '<button type="button" class="sr-close" id="srClose" aria-label="Stäng">×</button>' +
                '</div>' +
                '<p class="sr-sub">Mål: under 15 sek till "kopierad". Övriga fält defaultas från förra rapporten.</p>' +

                '<div class="sr-section">' +
                    '<div class="sr-label">Styrka <span class="sr-current" id="srStyrkaCur"></span></div>' +
                    '<div class="sr-chips">' + chipBtns(STYRKA_CHIPS, 'styrka', false) + '</div>' +
                    '<div class="sr-row">' +
                        '<input type="text" class="sr-input" id="srStyrkaIn" placeholder="Eller skriv antal" inputmode="numeric" autocomplete="off">' +
                    '</div>' +
                '</div>' +

                '<div class="sr-section">' +
                    '<div class="sr-label">Slag <span class="sr-current" id="srSlagCur"></span></div>' +
                    '<div class="sr-chips">' + chipBtns(SLAG_CHIPS, 'slag', true) + '</div>' +
                    '<textarea class="sr-textarea" id="srSlagIn" rows="1" placeholder="Eller skriv typ"></textarea>' +
                '</div>' +

                '<div class="sr-section">' +
                    '<div class="sr-label">Sysselsättning <span class="sr-current" id="srSysCur"></span></div>' +
                    '<div class="sr-compass-wrap">' +
                        '<div class="sr-compass">' +
                            '<span></span>' +
                            '<button type="button" class="sr-compass-btn" data-srdir="N">N</button>' +
                            '<span></span>' +
                            '<button type="button" class="sr-compass-btn" data-srdir="V">V</button>' +
                            '<button type="button" class="sr-compass-clear" id="srDirClear" title="Rensa riktning">⊕</button>' +
                            '<button type="button" class="sr-compass-btn" data-srdir="Ö">Ö</button>' +
                            '<span></span>' +
                            '<button type="button" class="sr-compass-btn" data-srdir="S">S</button>' +
                            '<span></span>' +
                        '</div>' +
                        '<div style="flex:1;min-width:160px"><div class="sr-chips">' + chipBtns(SYSSEL_CHIPS, 'sysselsattning', true) + '</div></div>' +
                    '</div>' +
                    '<textarea class="sr-textarea" id="srSysIn" rows="1" placeholder="Vad gör de?"></textarea>' +
                '</div>' +

                '<div class="sr-section">' +
                    '<div class="sr-label">Ställe <span class="sr-current" id="srStalleCur"></span></div>' +
                    '<div class="sr-row">' +
                        '<button type="button" class="sr-btn" id="srGps">📍 MGRS</button>' +
                        '<input type="text" class="sr-input" id="srStalleIn" placeholder="MGRS, t.ex. 33VWE 12345 67890" autocomplete="off">' +
                    '</div>' +
                '</div>' +

                '<details class="sr-other" id="srOther">' +
                    '<summary>Övriga fält (från förra rapporten)</summary>' +
                    '<div class="sr-other-body">' +
                        '<div class="sr-other-grid">' +
                            '<div class="sr-other-row"><label>Till</label><input type="text" class="sr-input" id="srTill" autocomplete="off"></div>' +
                            '<div class="sr-other-row"><label>Från</label><input type="text" class="sr-input" id="srFran" autocomplete="off"></div>' +
                            '<div class="sr-other-row"><label>Stund</label><input type="text" class="sr-input" id="srStund" autocomplete="off"></div>' +
                            '<div class="sr-other-row"><label>Sagesman</label><input type="text" class="sr-input" id="srSagesman" autocomplete="off"></div>' +
                            '<div class="sr-other-row" style="grid-column:1/-1"><label>Symbol</label><input type="text" class="sr-input" id="srSymbol" autocomplete="off"></div>' +
                            '<div class="sr-other-row" style="grid-column:1/-1"><label>Sedan</label><input type="text" class="sr-input" id="srSedan" autocomplete="off"></div>' +
                        '</div>' +
                    '</div>' +
                '</details>' +

                '<div id="srStatus"></div>' +

                '<div class="sr-actions">' +
                    '<button type="button" class="sr-btn" id="srCancel">Avbryt</button>' +
                    '<button type="button" class="sr-btn sr-btn-primary" id="srSubmit">Generera &amp; kopiera</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(overlay);

        var timerEl = overlay.querySelector('#srTimer');
        var timerInt = setInterval(function () {
            var s = Math.floor((Date.now() - t0) / 1000);
            timerEl.textContent = s + ' s';
            if (s >= 15) timerEl.style.color = '#c8a24e';
            if (s >= 30) timerEl.style.color = '#ff8a8a';
        }, 250);

        // ── Bind till befintliga form-fält ────────────────────────────────
        // Snabbrapport-fälten skriver direkt till index.html:s formulär.
        // "Övriga fält"-sektionen är tva-vägs-kopplad: vad användaren skriver
        // i sr-other gar till #till, #fran etc. Och initial-värden hämtas
        // därifrån. Det gör att stäng-utan-submit ändå behåller ändringarna
        // — naturligt frö för en vanlig rapport.
        function bindBidirectional(srcId, formField) {
            var src = elem(srcId);
            var dst = elem(formField);
            if (!src || !dst) return;
            src.value = dst.value || '';
            src.addEventListener('input', function () { dst.value = src.value; });
        }

        bindBidirectional('srStyrkaIn', 'styrka');
        bindBidirectional('srSlagIn', 'slag');
        bindBidirectional('srSysIn', 'sysselsattning');
        bindBidirectional('srStalleIn', 'stalle');
        bindBidirectional('srTill', 'till');
        bindBidirectional('srFran', 'fran');
        bindBidirectional('srStund', 'stund');
        bindBidirectional('srSagesman', 'sagesman');
        bindBidirectional('srSymbol', 'symbol');
        bindBidirectional('srSedan', 'sedan');

        // Visa nuvarande värden i label-headers
        function refreshCurrents() {
            var pairs = [
                ['srStyrkaCur', 'styrka'],
                ['srSlagCur', 'slag'],
                ['srSysCur', 'sysselsattning'],
                ['srStalleCur', 'stalle']
            ];
            pairs.forEach(function (p) {
                var el = overlay.querySelector('#' + p[0]);
                if (el) el.textContent = val(p[1]);
            });
        }
        refreshCurrents();
        overlay.addEventListener('input', refreshCurrents);

        // ── Chips ─────────────────────────────────────────────────────────
        // Två lägen:
        //   - additive=0 (Styrka): klick valjer ETT värde, ersätter input
        //   - additive=1 (Slag, Sysselsättning): klick lägger till i textarea,
        //     comma-separerat, tail-trim — samma mönster som befintliga
        //     appendChip() i index.html
        var chips = overlay.querySelectorAll('[data-chip]');
        chips.forEach(function (chip) {
            chip.addEventListener('click', function () {
                var field = chip.dataset.field;
                var value = chip.dataset.value;
                var additive = chip.dataset.additive === '1';
                var formEl = elem(field);
                if (!formEl) return;
                if (additive) {
                    var cur = (formEl.value || '').trim();
                    if (cur && cur.indexOf(value) === -1) {
                        formEl.value = cur.replace(/[,\s]+$/, '') + ', ' + value;
                    } else if (!cur) {
                        formEl.value = value;
                    }
                } else {
                    formEl.value = value;
                }
                // Synka tillbaka till sr-input
                var srInput = overlay.querySelector('[id^="sr"][id$="In"][data-field="' + field + '"]')
                    || (field === 'styrka' ? elem('srStyrkaIn')
                        : field === 'slag' ? elem('srSlagIn')
                        : field === 'sysselsattning' ? elem('srSysIn')
                        : null);
                if (srInput) srInput.value = formEl.value;
                // Visa aktiv state pa chips i samma grupp
                var siblings = overlay.querySelectorAll('[data-chip][data-field="' + field + '"]');
                siblings.forEach(function (c) {
                    var v = (formEl.value || '').toLowerCase();
                    var cv = c.dataset.value.toLowerCase();
                    c.classList.toggle('is-active', !!v && v.indexOf(cv) !== -1);
                });
                refreshCurrents();
            });
        });

        // ── Kompass ───────────────────────────────────────────────────────
        // Uppdaterar #sysselsattning med riktnings-tagg ("N", "NÖ", etc.).
        // Multi-select: klicka flera knappar för diagonaler. Toggle: klick
        // på aktiv knapp tar bort.
        var dirBtns = overlay.querySelectorAll('[data-srdir]');
        function getActiveDirs() {
            return Array.from(dirBtns).filter(function (b) { return b.classList.contains('is-active'); }).map(function (b) { return b.dataset.srdir; });
        }
        function setDirsInTextarea(dirs) {
            var sysEl = elem('sysselsattning');
            if (!sysEl) return;
            var cur = (sysEl.value || '').trim();
            // Strip away existing direction-prefix om det finns: "N, " / "NV, " etc.
            cur = cur.replace(/^(?:N|S|Ö|V|N[VÖ]|S[VÖ])(?:[,\s]+|$)/, '').trim();
            if (dirs.length) {
                sysEl.value = (dirs.join('') + (cur ? ', ' + cur : '')).trim();
            } else {
                sysEl.value = cur;
            }
            elem('srSysIn').value = sysEl.value;
            refreshCurrents();
        }
        dirBtns.forEach(function (b) {
            b.addEventListener('click', function () {
                b.classList.toggle('is-active');
                setDirsInTextarea(getActiveDirs());
            });
        });
        overlay.querySelector('#srDirClear').addEventListener('click', function () {
            dirBtns.forEach(function (b) { b.classList.remove('is-active'); });
            setDirsInTextarea([]);
        });

        // ── GPS ───────────────────────────────────────────────────────────
        var gpsBtn = overlay.querySelector('#srGps');
        gpsBtn.addEventListener('click', function () {
            if (!navigator.geolocation) {
                showStatus('Geolocation stöds inte i denna webbläsare.', 'warn');
                return;
            }
            gpsBtn.disabled = true;
            gpsBtn.textContent = '⏳ Hämtar…';
            // Hög noggrannhet först, fallback till lägre vid timeout — samma
            // mönster som getGPS() i index.html.
            navigator.geolocation.getCurrentPosition(
                function (pos) { applyPos(pos); },
                function (err) {
                    if (err && err.code === 3) {
                        navigator.geolocation.getCurrentPosition(applyPos, fail, { enableHighAccuracy: false, timeout: 10000 });
                    } else {
                        fail(err);
                    }
                },
                { enableHighAccuracy: true, timeout: 8000 }
            );

            function applyPos(pos) {
                try {
                    var mgrs = (typeof global.MGRS === 'object' && global.MGRS && typeof global.MGRS.forward === 'function')
                        ? global.MGRS.forward(pos.coords.latitude, pos.coords.longitude)
                        : (pos.coords.latitude.toFixed(5) + ', ' + pos.coords.longitude.toFixed(5));
                    setVal('stalle', mgrs);
                    elem('srStalleIn').value = mgrs;
                    refreshCurrents();
                    showStatus('Position hämtad.', 'ok');
                } catch (e) {
                    showStatus('Kunde inte konvertera till MGRS: ' + (e && e.message || ''), 'warn');
                }
                gpsBtn.disabled = false;
                gpsBtn.textContent = '📍 MGRS';
            }
            function fail(err) {
                gpsBtn.disabled = false;
                gpsBtn.textContent = '📍 MGRS';
                var msg = 'GPS misslyckades';
                if (err && err.code === 1) msg = 'Tillstånd nekat — tillåt platsåtkomst eller skriv manuellt.';
                else if (err && err.code === 2) msg = 'Position ej tillgänglig.';
                else if (err && err.code === 3) msg = 'Timeout — försök igen.';
                showStatus(msg, 'warn');
            }
        });

        function showStatus(msg, kind) {
            var el = overlay.querySelector('#srStatus');
            if (!el) return;
            el.innerHTML = '<div class="sr-status sr-status-' + (kind || 'info') + '">' + msg + '</div>';
        }

        // ── Stäng + Submit ────────────────────────────────────────────────
        function close() {
            clearInterval(timerInt);
            overlay.remove();
            document.removeEventListener('keydown', onEsc);
        }
        function onEsc(e) { if (e.key === 'Escape') close(); }
        document.addEventListener('keydown', onEsc);
        overlay.querySelector('#srClose').addEventListener('click', close);
        overlay.querySelector('#srCancel').addEventListener('click', close);

        var submitBtn = overlay.querySelector('#srSubmit');
        submitBtn.addEventListener('click', async function () {
            // Inga krav — operatoren kan skicka rapporten med precis sa
            // mycket information de har. Tomma falt blir "-" i utdata.

            submitBtn.disabled = true;
            submitBtn.textContent = 'Genererar…';

            try {
                if (typeof global.generateReport !== 'function') {
                    throw new Error('generateReport() finns inte — sidan inte fullt laddad?');
                }
                global.generateReport();

                // generateReport() ritar texten i #reportOutput.
                var output = elem('reportOutput');
                var txt = output ? output.textContent : '';
                if (!txt) throw new Error('Tom output');

                // Spara senaste rapport for default-fyllning nasta gang.
                saveLastReport({
                    till: val('till'),
                    fran: val('fran'),
                    symbol: val('symbol'),
                    sagesman: val('sagesman'),
                    sedan: val('sedan')
                });

                await navigator.clipboard.writeText(txt);
                var elapsed = Math.round((Date.now() - t0) / 1000);
                showStatus('Kopierat till urklipp på ' + elapsed + ' s. Klistra in i Signal nu.', 'ok');
                submitBtn.textContent = 'Klar (' + elapsed + ' s)';
                setTimeout(close, 1800);
            } catch (err) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Generera & kopiera';
                showStatus('Fel: ' + (err && err.message || 'okänt') + '. Texten finns i resultat-vyn — kopiera manuellt.', 'warn');
            }
        });
    }

    global.Snabbrapport = {
        open: open,
        saveLastReport: saveLastReport,
        getLastReport: getLastReport
    };
})(window);
