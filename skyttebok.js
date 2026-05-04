// skyttebok.js — render-, persist- och event-logik för SKYTTEBOK-fliken.
//
// Datastruktur i localStorage:
//   skyttebok_pass_<uuid>          — JSON-objekt för ett pass
//   skyttebok_settings_displayname — sträng (visningsnamn)
//
// Pass-objekt:
//   { id, ovningNr, datum, skott, traff, godkand, anteckning, skapad }
//
// Hela `skyttebok_*`-prefixet rensas vid `localStorage.clear()`
// (anropas av opsec.html-flödet).

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

    // Pending-confirm callback. Sätts av showConfirm(), nollställs efter klick.
    var pendingConfirm = null;

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

    document.getElementById('confirmOk').addEventListener('click', function () {
        var fn = pendingConfirm;
        pendingConfirm = null;
        document.getElementById('confirmOverlay').classList.remove('open');
        if (fn) fn();
    });

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

        document.getElementById('btnRensaAlla').addEventListener('click', function () {
            var all = loadAllPass();
            if (all.length === 0) {
                showConfirm('Inget att rensa',
                    'Skjutboken är redan tom på den här enheten.',
                    function () { /* no-op */ });
                return;
            }
            showConfirm(
                'Rensa hela skjutboken',
                'Tar bort alla ' + all.length + ' pass från den här enheten. ' +
                'Visningsnamnet bevaras. Åtgärden kan inte ångras.',
                function () {
                    all.forEach(function (p) { deletePass(p.id); });
                    render();
                }
            );
        });
    }

    // ── Init ────────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        initSettings();
        render();
    });
})();
