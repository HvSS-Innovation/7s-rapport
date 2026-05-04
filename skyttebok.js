// skyttebok.js — render-, persist- och event-logik för SKYTTEBOK-fliken.
//
// Datastruktur i localStorage:
//   skyttebok_pass_<uuid>          — JSON-objekt för ett pass
//   skyttebok_settings_displayname — sträng (visningsnamn)
//   skyttebok_sakerhetsprov        — JSON-objekt för säkerhetsprov BAS
//
// Pass-objekt:
//   { id, ovningNr, datum, skott, traff, godkand, anteckning, skapad }
//
// Säkerhetsprov-objekt:
//   { datum, instruktor, anteckning, godkand, sparad }
//
// Hela `skyttebok_*`-prefixet rensas vid `localStorage.clear()`
// (anropas av opsec.html-flödet).
//
// Export/import-format ('skyttebok-v1'):
//   { format, exportedAt, displayName, pass: [...], sakerhetsprov: {...}|null }

(function () {
    'use strict';

    var DATA = window.SKYTTEBOK_DATA;
    if (!DATA) {
        document.getElementById('ovningarRoot').innerHTML =
            '<div class="empty-state">Kunde inte ladda övningsdata. ' +
            'Ladda om sidan eller rapportera felet.</div>';
        return;
    }

    var PASS_PREFIX = 'skyttebok_pass_';
    var SETTING_PREFIX = 'skyttebok_settings_';
    var SAKERHETSPROV_KEY = 'skyttebok_sakerhetsprov';
    var EXPORT_FORMAT = 'skyttebok-v1';

    // Pending-confirm callback. Sätts av showConfirm(), nollställs efter klick.
    var pendingConfirm = null;

    // Säkerhetsprov BAS — hand-curerad referens från H SKJUTB AK 2021,
    // Bilaga 1 (sid 121–122). Skytten loggar EN status (godkänd/ej godk.)
    // för hela provet. Momenttexterna visas som info så soldaten ser vad
    // som testas.
    var SAKERHETSPROV_MOMENT = [
        { nr: 1,  txt: 'Redogör för de fyra grundläggande säkerhetsreglerna för vapenhantering' },
        { nr: 2,  txt: 'Beskriv begreppet "ofarlig riktning"' },
        { nr: 3,  txt: 'Beskriv vad som gäller för överlämning av vapen' },
        { nr: 4,  txt: 'Redogör för när hörselskydd och skyddsglasögon ska bäras' },
        { nr: 5,  txt: 'Skilj på laddblind, skarp, spårljus- och lös patron' },
        { nr: 6,  txt: 'Ladda vapnet enligt manual på kommando "Ladda"' },
        { nr: 7,  txt: 'Inta färdigställning på kommando "Färdigställning"' },
        { nr: 8,  txt: 'Inta anläggning på kommando "Anläggning"' },
        { nr: 9,  txt: 'Inta grundställning på kommando "Grundställning"' },
        { nr: 10, txt: 'Genomför patron ur enligt manual på kommando "Patron ur"' },
        { nr: 11, txt: 'Ange vapnets riskområde (tryck, riskvinkel V/Q)' },
        { nr: 12, txt: 'Beskriv begreppen "skjutgräns" och "eldområde"' },
        { nr: 13, txt: 'Redogör för när vapnet får vara osäkrat' },
        { nr: 14, txt: 'Ange hur många skott som får skjutas i snabb följd' },
        { nr: 15, txt: 'Ange kortaste avstånd till ammunition vid öppen eld/rökning' }
    ];

    // ── Storage ─────────────────────────────────────────────────────────
    function loadAllPass() {
        var out = [];
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (key && key.indexOf(PASS_PREFIX) === 0) {
                try {
                    var p = JSON.parse(localStorage.getItem(key));
                    if (p && p.id) out.push(p);
                } catch (_) { /* korrupt — ignorera */ }
            }
        }
        return out;
    }

    function savePass(pass) {
        localStorage.setItem(PASS_PREFIX + pass.id, JSON.stringify(pass));
    }

    function deletePass(id) {
        localStorage.removeItem(PASS_PREFIX + id);
    }

    function getSetting(name) {
        return localStorage.getItem(SETTING_PREFIX + name) || '';
    }

    function setSetting(name, value) {
        if (value) localStorage.setItem(SETTING_PREFIX + name, value);
        else localStorage.removeItem(SETTING_PREFIX + name);
    }

    function loadSakerhetsprov() {
        var raw = localStorage.getItem(SAKERHETSPROV_KEY);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch (_) { return null; }
    }

    function saveSakerhetsprov(sp) {
        if (sp) localStorage.setItem(SAKERHETSPROV_KEY, JSON.stringify(sp));
        else localStorage.removeItem(SAKERHETSPROV_KEY);
    }

    // ── Hjälpare ────────────────────────────────────────────────────────
    function uuid() {
        if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
        // Enkel fallback om randomUUID saknas (ej i prod-browsers).
        return 'p-' + Date.now().toString(36) + '-' +
            Math.random().toString(36).slice(2, 10);
    }

    function todayIso() {
        var d = new Date();
        var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function ovningKey(nr) {
        // skyttebok-data.js har sträng-nycklar pga JSON.stringify, så
        // numeriska id måste castas till sträng vid lookup.
        return String(nr);
    }

    function getOvning(nr) {
        return DATA.ovningar[ovningKey(nr)];
    }

    // ── Bekräftelsedialog ───────────────────────────────────────────────
    function showConfirm(title, message, onOk) {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        pendingConfirm = onOk;
        document.getElementById('confirmOverlay').classList.add('open');
    }

    window.skyttebokCancelConfirm = function () {
        pendingConfirm = null;
        document.getElementById('confirmOverlay').classList.remove('open');
    };

    function confirmOkHandler() {
        var fn = pendingConfirm;
        pendingConfirm = null;
        document.getElementById('confirmOverlay').classList.remove('open');
        if (fn) fn();
    }
    document.getElementById('confirmOk').addEventListener('click', confirmOkHandler);

    // ── Render ──────────────────────────────────────────────────────────
    function passByOvning() {
        var byNr = {};
        loadAllPass().forEach(function (p) {
            var k = ovningKey(p.ovningNr);
            (byNr[k] = byNr[k] || []).push(p);
        });
        Object.keys(byNr).forEach(function (k) {
            byNr[k].sort(function (a, b) { return b.skapad - a.skapad; });
        });
        return byNr;
    }

    function renderSummary(byNr) {
        var totalPass = 0, totalGodkand = 0, totalSkott = 0, totalTraff = 0;
        Object.keys(byNr).forEach(function (k) {
            byNr[k].forEach(function (p) {
                totalPass++;
                if (p.godkand) totalGodkand++;
                totalSkott += +p.skott || 0;
                totalTraff += +p.traff || 0;
            });
        });
        document.getElementById('statPass').textContent = totalPass;
        document.getElementById('statGodkanda').textContent = totalGodkand;
        var pct = totalSkott > 0 ? Math.round(100 * totalTraff / totalSkott) : 0;
        document.getElementById('statTraff').textContent = pct + '%';
    }

    function renderOvningCard(ovningNr, pass) {
        var ov = getOvning(ovningNr);
        if (!ov) return ''; // fallback om datafil saknar id (skall ej hända)

        var hasPass = pass && pass.length > 0;
        var anyGodkand = hasPass && pass.some(function (p) { return p.godkand; });
        var nrLabel = ovningNr === 'kp_bas' ? 'KP' : ovningNr;
        var titel = ov.titel || ('Övning ' + ovningNr);

        var metaParts = [];
        if (ov.avstand) metaParts.push(ov.avstand);
        if (ov.antal) metaParts.push(ov.antal);
        var meta = metaParts.join(' · ');

        var badge = '';
        if (hasPass) {
            badge = '<span class="ovning-badge ' + (anyGodkand ? 'ok' : '') + '">' +
                pass.length + ' pass' + '</span>';
        }

        return '' +
            '<div class="ovning-card' + (hasPass ? ' has-pass' : '') + '" data-ovning="' + ovningNr + '">' +
                '<button class="ovning-summary" type="button" onclick="skyttebokToggleOvning(\'' + ovningNr + '\')">' +
                    '<span class="ovning-nr">' + nrLabel + '</span>' +
                    '<span style="flex:1;min-width:0">' +
                        '<span class="ovning-titel">' + escapeHtml(titel) + '</span>' +
                        (meta ? '<div class="ovning-meta">' + escapeHtml(meta) + '</div>' : '') +
                    '</span>' +
                    badge +
                    '<span class="ovning-toggle">›</span>' +
                '</button>' +
                '<div class="ovning-body">' + renderOvningBody(ovningNr, ov, pass) + '</div>' +
            '</div>';
    }

    function fakta(label, val) {
        if (!val) return '<dt>' + label + '</dt><dd class="empty">—</dd>';
        return '<dt>' + label + '</dt><dd>' + escapeHtml(val) + '</dd>';
    }

    function renderOvningBody(ovningNr, ov, pass) {
        var hasFakta = ov.avstand || ov.mal || ov.stallning || ov.antal ||
                       ov.traffkrav || ov.krav || ov.malyta || ov.fokus;

        var html = '';

        if (hasFakta) {
            html += '<dl class="fakta-grid">' +
                fakta('Avstånd', ov.avstand) +
                fakta('Mål', ov.mal) +
                fakta('Ställning', ov.stallning) +
                fakta('Antal', ov.antal) +
                fakta('Träffkrav', ov.traffkrav || ov.krav) +
                fakta('Målyta', ov.malyta) +
                fakta('Fokus', ov.fokus) +
            '</dl>';
        }

        if (ov.genomforande) {
            html += '<button class="raw-toggle" type="button" ' +
                'onclick="skyttebokToggleRaw(\'' + ovningNr + '\')">' +
                'Visa genomförandetext ▾</button>' +
                '<div class="raw-block" id="raw-' + ovningNr + '">' +
                escapeHtml(ov.genomforande) + '</div>';
        }

        // Övning 1 (Målbildsförevisning) är instruktörsmoment — ingen pass-form.
        if (ovningNr === 1 || ovningNr === '1') {
            html += '<p class="field-hint" style="margin-top:12px">' +
                'Målbildsförevisning är ett instruktörsmoment. Inga individuella pass loggas.' +
                '</p>';
            return html;
        }

        html += renderPassForm(ovningNr);

        if (pass && pass.length > 0) {
            html += '<div class="pass-list">' +
                '<div class="pass-list-title">Sparade pass (' + pass.length + ')</div>' +
                pass.map(renderPassRow).join('') +
            '</div>';
        }

        return html;
    }

    function renderPassForm(ovningNr) {
        var today = todayIso();
        var formId = 'form-' + ovningNr;
        return '' +
            '<div class="pass-form" id="' + formId + '">' +
                '<div class="pass-form-title">Logga nytt pass</div>' +
                '<div class="pass-form-row">' +
                    '<div>' +
                        '<label for="' + formId + '-datum">Datum</label>' +
                        '<input type="date" id="' + formId + '-datum" value="' + today + '">' +
                    '</div>' +
                    '<div>' +
                        '<label for="' + formId + '-skott">Skott</label>' +
                        '<input type="number" id="' + formId + '-skott" inputmode="numeric" min="0" max="999" placeholder="0">' +
                    '</div>' +
                '</div>' +
                '<div class="pass-form-row">' +
                    '<div>' +
                        '<label for="' + formId + '-traff">Träff</label>' +
                        '<input type="number" id="' + formId + '-traff" inputmode="numeric" min="0" max="999" placeholder="0">' +
                    '</div>' +
                    '<div>' +
                        '<label>Resultat</label>' +
                        '<div class="chip-group" data-chip-group="' + formId + '-godkand">' +
                            '<button type="button" class="chip godkand" data-value="true" onclick="skyttebokSetChip(this)">Godkänd</button>' +
                            '<button type="button" class="chip underkand" data-value="false" onclick="skyttebokSetChip(this)">Ej godk.</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div>' +
                    '<label for="' + formId + '-anteckning">Anteckning (frivilligt)</label>' +
                    '<textarea id="' + formId + '-anteckning" rows="2" placeholder="T.ex. ställning, riktpunkt, väder…"></textarea>' +
                '</div>' +
                '<button class="btn btn-primary" type="button" ' +
                    'onclick="skyttebokSparaPass(\'' + ovningNr + '\')">Spara pass</button>' +
            '</div>';
    }

    function renderPassRow(p) {
        var pct = p.skott > 0 ? Math.round(100 * p.traff / p.skott) : 0;
        var statusClass = p.godkand ? 'ok' : 'ej';
        var statusText = p.godkand ? 'GODKÄND' : 'EJ GODK.';
        var rowClass = p.godkand ? 'godkand' : 'underkand';
        var resultatText = (p.traff || 0) + '/' + (p.skott || 0) +
            (p.skott > 0 ? ' (' + pct + '%)' : '');

        return '<div class="pass-row ' + rowClass + '" data-pass="' + p.id + '">' +
            '<span class="pass-datum">' + escapeHtml(p.datum || '') + '</span>' +
            '<span class="pass-resultat">' + resultatText + '</span>' +
            '<span class="pass-status ' + statusClass + '">' + statusText + '</span>' +
            '<button class="pass-delete" type="button" title="Ta bort pass" ' +
                'onclick="skyttebokRaderaPass(\'' + p.id + '\')">×</button>' +
            (p.anteckning ? '<div class="pass-anteckning">' + escapeHtml(p.anteckning) + '</div>' : '') +
        '</div>';
    }

    function render() {
        var byNr = passByOvning();
        renderSummary(byNr);

        var root = document.getElementById('ovningarRoot');
        var html = '';
        DATA.delmoment.forEach(function (dm) {
            // Antal pass i delmomentet (för rubrik-summa)
            var passISummering = 0;
            dm.ovningar.forEach(function (nr) {
                var arr = byNr[ovningKey(nr)] || [];
                passISummering += arr.length;
            });

            html += '<div class="delmoment-group">' +
                '<div class="delmoment-header">' +
                    '<span class="delmoment-nr">DM ' + dm.nr + '</span>' +
                    '<span class="delmoment-namn">' + escapeHtml(dm.namn) + '</span>' +
                    (passISummering > 0
                        ? '<span class="delmoment-summa">' + passISummering + ' pass</span>'
                        : '') +
                '</div>';

            // Övning 1 (Målbildsförevisning) ligger som DM 1 utan ovningar-array.
            // Visa rubriken ändå med ett pseudo-kort.
            if (dm.ovningar.length === 0 && dm.nr === 1) {
                html += renderOvningCard(1, []);
            } else {
                dm.ovningar.forEach(function (nr) {
                    html += renderOvningCard(nr, byNr[ovningKey(nr)] || []);
                });
            }
            html += '</div>';
        });
        root.innerHTML = html;
    }

    // ── Säkerhetsprov ───────────────────────────────────────────────────
    function renderSakerhetsprov() {
        var sp = loadSakerhetsprov();
        var root = document.getElementById('sakerhetsprovRoot');
        if (!root) return;

        var statusClass, statusText, cardClass;
        if (!sp) {
            statusClass = 'tom';
            statusText = 'EJ LOGGAT';
            cardClass = '';
        } else if (sp.godkand) {
            statusClass = 'ok';
            statusText = 'GODKÄND';
            cardClass = 'godkand';
        } else {
            statusClass = 'ej';
            statusText = 'EJ GODK.';
            cardClass = 'underkand';
        }

        var current = '';
        if (sp) {
            current = '<dl class="sp-current">' +
                '<dt>Datum</dt><dd>' + escapeHtml(sp.datum || '') + '</dd>' +
                (sp.instruktor ? '<dt>Instruktör</dt><dd>' + escapeHtml(sp.instruktor) + '</dd>' : '') +
                (sp.anteckning ? '<dt>Anteckning</dt><dd>' + escapeHtml(sp.anteckning) + '</dd>' : '') +
            '</dl>';
        }

        var momentList = SAKERHETSPROV_MOMENT.map(function (m) {
            return '<li>' + escapeHtml(m.txt) + '</li>';
        }).join('');

        var today = sp && sp.datum ? sp.datum : todayIso();
        var instr = sp && sp.instruktor ? escapeHtml(sp.instruktor) : '';
        var ant = sp && sp.anteckning ? escapeHtml(sp.anteckning) : '';
        var godkandClass = sp && sp.godkand === true ? ' is-active' : '';
        var underkandClass = sp && sp.godkand === false ? ' is-active' : '';

        root.innerHTML = '' +
            '<div class="sp-card ' + cardClass + '" id="spCard">' +
                '<button class="sp-summary" type="button" onclick="skyttebokToggleSakerhetsprov()">' +
                    '<div class="sp-titel">Säkerhetsprov BAS<small>Bilaga 1, H SKJUTB AK 2021</small></div>' +
                    '<span class="sp-status ' + statusClass + '">' + statusText + '</span>' +
                    '<span class="sp-toggle">›</span>' +
                '</button>' +
                '<div class="sp-body">' +
                    current +
                    '<div class="pass-form" style="margin-top:12px">' +
                        '<div class="pass-form-title">' + (sp ? 'Uppdatera prov' : 'Logga prov') + '</div>' +
                        '<div class="pass-form-row">' +
                            '<div>' +
                                '<label for="sp-datum">Datum</label>' +
                                '<input type="date" id="sp-datum" value="' + today + '">' +
                            '</div>' +
                            '<div>' +
                                '<label>Resultat</label>' +
                                '<div class="chip-group" data-chip-group="sp-godkand">' +
                                    '<button type="button" class="chip godkand' + godkandClass + '" data-value="true" onclick="skyttebokSetChip(this)">Godkänd</button>' +
                                    '<button type="button" class="chip underkand' + underkandClass + '" data-value="false" onclick="skyttebokSetChip(this)">Ej godk.</button>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                        '<div>' +
                            '<label for="sp-instruktor">Instruktör (frivilligt)</label>' +
                            '<input type="text" id="sp-instruktor" autocomplete="off" maxlength="60" value="' + instr + '" placeholder="T.ex. namn eller signatur">' +
                        '</div>' +
                        '<div style="margin-top:8px">' +
                            '<label for="sp-anteckning">Anteckning</label>' +
                            '<textarea id="sp-anteckning" rows="2" placeholder="Anteckningar till provet">' + ant + '</textarea>' +
                        '</div>' +
                        '<button class="btn btn-primary" type="button" onclick="skyttebokSparaSakerhetsprov()">Spara prov</button>' +
                        (sp ? '<button class="btn btn-sm btn-danger" type="button" style="width:100%;margin-top:6px" onclick="skyttebokRaderaSakerhetsprov()">Ta bort logg</button>' : '') +
                    '</div>' +
                    '<div class="sp-moment-list">' +
                        '<strong>Provet omfattar 15 moment</strong> ' +
                        '<em>(referens från PDF):</em>' +
                        '<ol>' + momentList + '</ol>' +
                    '</div>' +
                '</div>' +
            '</div>';
    }

    window.skyttebokToggleSakerhetsprov = function () {
        var card = document.getElementById('spCard');
        if (card) card.classList.toggle('open');
    };

    window.skyttebokSparaSakerhetsprov = function () {
        var datum = document.getElementById('sp-datum').value || todayIso();
        var instruktor = document.getElementById('sp-instruktor').value.trim();
        var anteckning = document.getElementById('sp-anteckning').value.trim();
        var chip = document.querySelector('[data-chip-group="sp-godkand"] .chip.is-active');
        if (!chip) {
            showConfirm('Välj resultat',
                'Markera Godkänd eller Ej godk. innan du sparar.',
                function () { /* no-op — bara info */ });
            return;
        }
        var godkand = chip.getAttribute('data-value') === 'true';
        saveSakerhetsprov({
            datum: datum,
            instruktor: instruktor,
            anteckning: anteckning,
            godkand: godkand,
            sparad: Date.now()
        });
        renderSakerhetsprov();
        var card = document.getElementById('spCard');
        if (card) card.classList.add('open');
    };

    window.skyttebokRaderaSakerhetsprov = function () {
        showConfirm(
            'Ta bort säkerhetsprov',
            'Tar bort den loggade säkerhetsprovs-statusen. Åtgärden kan inte ångras.',
            function () {
                saveSakerhetsprov(null);
                renderSakerhetsprov();
            }
        );
    };

    // ── Event-handlers (globala — anropas från inline onclick) ─────────
    window.skyttebokToggleOvning = function (ovningNr) {
        var card = document.querySelector('.ovning-card[data-ovning="' + ovningNr + '"]');
        if (card) card.classList.toggle('open');
    };

    window.skyttebokToggleRaw = function (ovningNr) {
        var box = document.getElementById('raw-' + ovningNr);
        if (box) box.classList.toggle('show');
    };

    window.skyttebokSetChip = function (btn) {
        var group = btn.parentNode;
        var chips = group.querySelectorAll('.chip');
        for (var i = 0; i < chips.length; i++) chips[i].classList.remove('is-active');
        btn.classList.add('is-active');
    };

    window.skyttebokSparaPass = function (ovningNr) {
        var formId = 'form-' + ovningNr;
        var datum = document.getElementById(formId + '-datum').value || todayIso();
        var skott = parseInt(document.getElementById(formId + '-skott').value, 10);
        var traff = parseInt(document.getElementById(formId + '-traff').value, 10);
        var anteckning = document.getElementById(formId + '-anteckning').value.trim();

        if (isNaN(skott) || skott < 0) skott = 0;
        if (isNaN(traff) || traff < 0) traff = 0;
        if (traff > skott) traff = skott;

        var godkandChip = document.querySelector(
            '[data-chip-group="' + formId + '-godkand"] .chip.is-active'
        );
        // Default: ej godkänt om inget val gjorts (säkrare).
        var godkand = godkandChip ? godkandChip.getAttribute('data-value') === 'true' : false;

        // Numeriskt id sparas som number, sträng-id (kp_bas) som sträng.
        var nr = ovningNr === 'kp_bas' ? 'kp_bas' : parseInt(ovningNr, 10);

        var pass = {
            id: uuid(),
            ovningNr: nr,
            datum: datum,
            skott: skott,
            traff: traff,
            godkand: godkand,
            anteckning: anteckning,
            skapad: Date.now()
        };
        savePass(pass);

        // Behåll öppet kort efter render
        var wasOpen = true;
        render();
        if (wasOpen) {
            var card = document.querySelector('.ovning-card[data-ovning="' + ovningNr + '"]');
            if (card) {
                card.classList.add('open');
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    };

    window.skyttebokRaderaPass = function (id) {
        showConfirm(
            'Ta bort pass',
            'Är du säker på att du vill ta bort det här passet? Åtgärden kan inte ångras.',
            function () {
                deletePass(id);
                render();
            }
        );
    };

    // ── Export / Import ─────────────────────────────────────────────────
    // Format: alla `skyttebok_*`-data + visningsnamn paketerat med en
    // version-stämpel. Importen kan därför migrera bakåt-kompatibelt om
    // formatet ändras senare.
    function buildExportPayload() {
        return {
            format: EXPORT_FORMAT,
            exportedAt: new Date().toISOString(),
            displayName: getSetting('displayname') || null,
            pass: loadAllPass(),
            sakerhetsprov: loadSakerhetsprov()
        };
    }

    function exportToFile() {
        var payload = buildExportPayload();
        var json = JSON.stringify(payload, null, 2);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'skyttebok-' + todayIso() + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Frigör objekt-URL efter en kort fördröjning så browsern hinner
        // initiera nedladdningen innan vi släpper referensen.
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    function validateImportPayload(p) {
        if (!p || typeof p !== 'object') return 'Filen är inte giltig JSON-data.';
        if (p.format !== EXPORT_FORMAT) {
            return 'Okänt format ("' + (p.format || '?') + '"). Förväntade "' +
                EXPORT_FORMAT + '".';
        }
        if (!Array.isArray(p.pass)) return 'Saknar pass-lista.';
        for (var i = 0; i < p.pass.length; i++) {
            var pp = p.pass[i];
            if (!pp || !pp.id || (pp.ovningNr === undefined || pp.ovningNr === null)) {
                return 'Pass nr ' + (i + 1) + ' saknar id eller ovningNr.';
            }
        }
        return null;
    }

    function applyImport(payload, mode) {
        // mode: 'merge' (lägg till nya, behåll befintliga med samma id)
        //       'replace' (rensa allt befintligt först)
        if (mode === 'replace') {
            loadAllPass().forEach(function (p) { deletePass(p.id); });
            saveSakerhetsprov(null);
            // displayName lämnas — den ärvs nedan om export hade ett.
        }

        var existingIds = {};
        loadAllPass().forEach(function (p) { existingIds[p.id] = true; });

        var added = 0, skipped = 0;
        payload.pass.forEach(function (pp) {
            if (existingIds[pp.id]) { skipped++; return; }
            // Numeriska ovningNr i JSON återställs som number; sträng-id
            // (kp_bas) bevaras.
            savePass(pp);
            added++;
        });

        if (payload.sakerhetsprov) saveSakerhetsprov(payload.sakerhetsprov);
        if (payload.displayName) setSetting('displayname', payload.displayName);

        return { added: added, skipped: skipped };
    }

    function importFromFile(file) {
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
            var payload;
            try { payload = JSON.parse(reader.result); }
            catch (_) {
                showConfirm('Importfel',
                    'Kunde inte tolka filen som JSON.',
                    function () { /* no-op */ });
                return;
            }
            var err = validateImportPayload(payload);
            if (err) {
                showConfirm('Importfel', err, function () { /* no-op */ });
                return;
            }
            // Bekräftelse + val: merge (default) eller replace.
            var nNytt = payload.pass.length;
            var nFinns = loadAllPass().length;
            var msg = 'Filen innehåller ' + nNytt + ' pass' +
                (payload.sakerhetsprov ? ' + säkerhetsprov-logg' : '') +
                (payload.displayName ? ' (visningsnamn: ' + payload.displayName + ')' : '') +
                '. Du har ' + nFinns + ' pass på enheten.\n\n' +
                'Välj sammanslagning eller ersätt.';
            showImportChoice(msg, function (mode) {
                var res = applyImport(payload, mode);
                renderAll();
                showConfirm('Klart',
                    'Importerade ' + res.added + ' pass' +
                    (res.skipped ? ' (' + res.skipped + ' redan befintliga ignorerade)' : '') + '.',
                    function () { /* no-op */ });
            });
        };
        reader.onerror = function () {
            showConfirm('Importfel', 'Kunde inte läsa filen.', function () { /* no-op */ });
        };
        reader.readAsText(file);
    }

    // Tre-knappars-bekräftelse: "Slå ihop" / "Ersätt" / "Avbryt".
    // Bygger på samma overlay som showConfirm men injicerar två primär-knappar.
    function showImportChoice(message, onChoice) {
        document.getElementById('confirmTitle').textContent = 'Importera skjutbok';
        document.getElementById('confirmMessage').textContent = message;

        var actions = document.querySelector('#confirmOverlay .confirm-actions');
        // Spara originalknappar för återställning
        var orig = actions.innerHTML;

        actions.innerHTML = '';
        var btnAvbryt = document.createElement('button');
        btnAvbryt.className = 'btn btn-secondary';
        btnAvbryt.textContent = 'Avbryt';
        btnAvbryt.onclick = function () { close(); };

        var btnMerge = document.createElement('button');
        btnMerge.className = 'btn btn-primary';
        btnMerge.style.flex = '1';
        btnMerge.style.minHeight = '44px';
        btnMerge.style.marginTop = '0';
        btnMerge.textContent = 'Slå ihop';
        btnMerge.onclick = function () { close(); onChoice('merge'); };

        var btnReplace = document.createElement('button');
        btnReplace.className = 'btn btn-danger';
        btnReplace.textContent = 'Ersätt allt';
        btnReplace.onclick = function () { close(); onChoice('replace'); };

        actions.appendChild(btnAvbryt);
        actions.appendChild(btnMerge);
        actions.appendChild(btnReplace);

        document.getElementById('confirmOverlay').classList.add('open');

        function close() {
            document.getElementById('confirmOverlay').classList.remove('open');
            // Återställ original-knappar för framtida showConfirm-anrop.
            actions.innerHTML = orig;
            // Återbinda click-handler på återställd OK-knapp.
            document.getElementById('confirmOk').addEventListener('click', confirmOkHandler);
        }
    }

    // ── Settings ────────────────────────────────────────────────────────
    function initSettings() {
        var input = document.getElementById('displayName');
        input.value = getSetting('displayname');
        input.addEventListener('change', function () {
            setSetting('displayname', input.value.trim());
        });
        input.addEventListener('blur', function () {
            setSetting('displayname', input.value.trim());
        });

        document.getElementById('btnExport').addEventListener('click', function () {
            var nPass = loadAllPass().length;
            var hasSp = !!loadSakerhetsprov();
            if (nPass === 0 && !hasSp) {
                showConfirm('Inget att exportera',
                    'Skjutboken är tom. Logga ett pass eller säkerhetsprov först.',
                    function () { /* no-op */ });
                return;
            }
            exportToFile();
        });

        var importFileEl = document.getElementById('importFile');
        document.getElementById('btnImport').addEventListener('click', function () {
            importFileEl.value = '';
            importFileEl.click();
        });
        importFileEl.addEventListener('change', function () {
            if (importFileEl.files && importFileEl.files[0]) {
                importFromFile(importFileEl.files[0]);
            }
        });

        document.getElementById('btnRensaAlla').addEventListener('click', function () {
            var all = loadAllPass();
            var sp = loadSakerhetsprov();
            if (all.length === 0 && !sp) {
                showConfirm('Inget att rensa',
                    'Skjutboken är redan tom på den här enheten.',
                    function () { /* no-op */ });
                return;
            }
            var parts = [];
            if (all.length) parts.push(all.length + ' pass');
            if (sp) parts.push('säkerhetsprov-logg');
            showConfirm(
                'Rensa hela skjutboken',
                'Tar bort ' + parts.join(' + ') + ' från den här enheten. ' +
                'Visningsnamnet bevaras. Åtgärden kan inte ångras.',
                function () {
                    all.forEach(function (p) { deletePass(p.id); });
                    saveSakerhetsprov(null);
                    renderAll();
                }
            );
        });
    }

    // ── Render-helper som täcker både övningar och säkerhetsprov ───────
    function renderAll() {
        renderSakerhetsprov();
        render();
    }

    // ── Init ────────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        initSettings();
        renderAll();
    });
})();
