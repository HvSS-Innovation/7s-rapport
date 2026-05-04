// skyttebok.js — render-, persist- och event-logik för SKYTTEBOK-fliken.
//
// Datastruktur i localStorage:
//   skyttebok_pass_<uuid>          — JSON-objekt för ett pass
//   skyttebok_settings_displayname — sträng (visningsnamn)
//   skyttebok_sakerhetsprov        — JSON-objekt för säkerhetsprov BAS
//
// Pass-objekt:
//   { id, ovningNr, datum, skott, traff, godkand, anteckning, skapad,
//     traffar?: [{x: 0-100, y: 0-200, zon: 'H'|'A'|'B'|'C'|'D'|'utanför'}] }
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

    // Träffmarkeringar i öppna pass-formulär — keyed på ovningNr.
    // Lever utanför DOM eftersom render() river/återskapar formuläret.
    // Töms när användaren klickar "Spara pass" eller stänger formuläret
    // (vi behåller datan öppet/stängt-tillstånd ignorerat).
    var formMarks = {};

    // Poäng per träffzon enligt H SKJUTB AK 2021 kap 1.3.1, Helfigur 2020.
    // X-zonen finns i reglementet (2 p) men är ej tecknad i vår SVG-
    // approximation — skytten kan inte markera X i Fas 4.
    // De 9 bästa träffarna räknas vid kompetensprov BAS.
    var ZON_POANG = { H: 1, A: 5, X: 2, B: 4, C: 3, D: 3, 'utanför': 0 };

    // Timer-state för Kompetensprov BAS. Lever i modul-scope så att
    // sidans render() inte nollställer pågående mätning.
    var kpTimerState = {
        startedAt: null,    // ms timestamp vid START
        finishedAt: null,   // ms timestamp vid SISTA SKOTT
        intervalId: null    // setInterval-handle för live-display
    };

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

    // Filter (BAS / TILLÄGG / Båda) — persistent val via settings.
    function getFilter() {
        var v = getSetting('visa');
        return (v === 'tillagg' || v === 'bada') ? v : 'bas';
    }

    function setFilter(v) {
        setSetting('visa', v);
    }

    window.skyttebokSetFilter = function (v) {
        setFilter(v);
        renderAll();
    };

    function isDelmomentInFilter(dmNr, filter) {
        if (filter === 'bada') return true;
        if (filter === 'bas') return dmNr <= 12;
        if (filter === 'tillagg') return dmNr >= 13;
        return true;
    }

    function syncFilterButtons() {
        var f = getFilter();
        var buttons = document.querySelectorAll('#filterBar [data-filter]');
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].classList.toggle('is-active', buttons[i].getAttribute('data-filter') === f);
        }
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

        // Kompetensprov BAS — eget flöde med timer + poängkvot (Fas 4).
        if (ovningNr === 'kp_bas') {
            html += renderKpBasForm(pass || []);
        } else {
            html += renderPassForm(ovningNr);
        }

        if (pass && pass.length > 0) {
            html += '<div class="pass-list">' +
                '<div class="pass-list-title">Sparade pass (' + pass.length + ')</div>' +
                pass.map(renderPassRow).join('') +
            '</div>';
        }

        return html;
    }

    // ── 1/1-figur (rektangulär approximation av FM helfigur 2020) ──────
    // viewBox 0..100 horisontellt, 0..200 vertikalt. Zoner ritas från
    // ytterst (D) till innerst (A) + huvud (H) separat.
    //
    // TODO: bekräfta exakta proportioner mot Reglemente Skjutning Ak.
    // Vi använder approximationer som är tillräckliga för att skytten
    // ska kunna markera och se var träffen hamnade.
    //
    // Klick på en zon → mark sparas med zon-bokstaven.
    // Klick på en befintlig mark → marken tas bort.

    function zoneAt(x, y) {
        // H: huvud-cirkel (50, 22) r=12
        var dxH = x - 50, dyH = y - 22;
        if (dxH * dxH + dyH * dyH <= 144) return 'H';
        // A: bröst-cirkel (50, 100) r=7
        var dxA = x - 50, dyA = y - 100;
        if (dxA * dxA + dyA * dyA <= 49) return 'A';
        // B: bröst-rektangel (38..62, 75..130)
        if (x >= 38 && x <= 62 && y >= 75 && y <= 130) return 'B';
        // C: trapets (28,50) - (72,50) - (68,180) - (32,180)
        if (y >= 50 && y <= 180) {
            var hwC = 22 + (18 - 22) * (y - 50) / 130;
            if (Math.abs(x - 50) <= hwC) return 'C';
        }
        // D: trapets (20,38) - (80,38) - (75,195) - (25,195)
        if (y >= 38 && y <= 195) {
            var hwD = 30 + (25 - 30) * (y - 38) / 157;
            if (Math.abs(x - 50) <= hwD) return 'D';
        }
        return 'utanför';
    }

    function buildFigureSvg(svgId, marks, interactive) {
        var ro = interactive ? '' : ' readonly';
        var clickAttr = interactive
            ? ' onclick="skyttebokFigureClick(this, event)"'
            : '';
        var svg = '<svg id="' + svgId + '"' + clickAttr +
            ' class="figure-svg' + ro + '" viewBox="0 0 100 200" ' +
            'xmlns="http://www.w3.org/2000/svg" aria-label="1/1-figur med träffzoner">';
        svg += '<rect class="z-bg" data-zon="utanför" x="0" y="0" width="100" height="200"/>';
        // Kropp: D yttersta, sedan C, B, A; huvud H sist (på topp men
        // separat geometriskt).
        svg += '<polygon class="z-d" data-zon="D" points="20,38 80,38 75,195 25,195"/>';
        svg += '<polygon class="z-c" data-zon="C" points="28,50 72,50 68,180 32,180"/>';
        svg += '<rect class="z-b" data-zon="B" x="38" y="75" width="24" height="55"/>';
        svg += '<circle class="z-a" data-zon="A" cx="50" cy="100" r="7"/>';
        svg += '<circle class="z-h" data-zon="H" cx="50" cy="22" r="12"/>';
        // Etiketter
        svg += '<text class="z-label" x="50" y="22">H</text>';
        svg += '<text class="z-label" x="50" y="55">D</text>';
        svg += '<text class="z-label" x="50" y="170">C</text>';
        svg += '<text class="z-label" x="44" y="80">B</text>';
        svg += '<text class="z-label" x="50" y="100">A</text>';
        // Marks
        (marks || []).forEach(function (m, idx) {
            svg += '<circle class="mark" data-mark-idx="' + idx + '" cx="' +
                m.x + '" cy="' + m.y + '" r="3"/>';
        });
        svg += '</svg>';
        return svg;
    }

    // Inline onclick-handler från SVG:n. Hittar ovningNr från SVG-id.
    window.skyttebokFigureClick = function (svgEl, event) {
        // svg-id: "fig-svg-<ovningNr>"
        var m = svgEl.id.match(/^fig-svg-(.+)$/);
        if (!m) return;
        var ovningNr = m[1];

        var target = event.target;

        // Klick på existerande mark → ta bort.
        if (target && target.classList && target.classList.contains('mark')) {
            var idx = parseInt(target.getAttribute('data-mark-idx'), 10);
            if (!isNaN(idx) && formMarks[ovningNr]) {
                formMarks[ovningNr].splice(idx, 1);
                refreshAfterFigureChange(ovningNr);
            }
            return;
        }

        // Annars — lägg ny mark vid klickposition.
        var pt = svgEl.createSVGPoint();
        pt.x = event.clientX;
        pt.y = event.clientY;
        var ctm = svgEl.getScreenCTM();
        if (!ctm) return;
        var loc = pt.matrixTransform(ctm.inverse());
        var x = Math.max(0, Math.min(100, loc.x));
        var y = Math.max(0, Math.min(200, loc.y));
        var zon = (target && target.getAttribute && target.getAttribute('data-zon')) || zoneAt(x, y);

        if (!formMarks[ovningNr]) formMarks[ovningNr] = [];
        formMarks[ovningNr].push({
            x: Math.round(x * 10) / 10,
            y: Math.round(y * 10) / 10,
            zon: zon
        });
        refreshAfterFigureChange(ovningNr);
    };

    // KP-BAS-formuläret innehåller poängkvots-display som måste räkna om
    // efter varje markförändring. Övriga övningar nöjer sig med att SVG:n
    // och meta-raden uppdateras lätt.
    function refreshAfterFigureChange(ovningNr) {
        if (ovningNr === 'kp_bas') {
            var card = document.querySelector('.ovning-card[data-ovning="kp_bas"]');
            var wasOpen = card && card.classList.contains('open');
            render();
            if (wasOpen) {
                var c = document.querySelector('.ovning-card[data-ovning="kp_bas"]');
                if (c) c.classList.add('open');
            }
        } else {
            refreshFigureForOvning(ovningNr);
        }
    }

    window.skyttebokRensaMarks = function (ovningNr) {
        formMarks[ovningNr] = [];
        refreshAfterFigureChange(ovningNr);
    };

    function refreshFigureForOvning(ovningNr) {
        var marks = formMarks[ovningNr] || [];
        var wrap = document.getElementById('fig-wrap-' + ovningNr);
        if (wrap) wrap.innerHTML = buildFigureSvg('fig-svg-' + ovningNr, marks, true);
        var meta = document.getElementById('fig-meta-' + ovningNr);
        if (meta) {
            var zonCount = {};
            marks.forEach(function (mk) {
                zonCount[mk.zon] = (zonCount[mk.zon] || 0) + 1;
            });
            var byZon = ['H', 'A', 'B', 'C', 'D', 'utanför']
                .filter(function (z) { return zonCount[z]; })
                .map(function (z) { return zonCount[z] + '×' + z; })
                .join(' · ');
            meta.innerHTML = '<strong>' + marks.length + '</strong> markerade' +
                (byZon ? ' — ' + byZon : '');
        }
    }

    function buildFigureSection(ovningNr) {
        // ovningNr kan vara number eller 'kp_bas'. För DOM-id används det
        // som det är (kp_bas blir 'fig-svg-kp_bas' osv).
        var marks = formMarks[ovningNr] || [];
        return '' +
            '<details class="figure-section">' +
                '<summary>Markera träffar (frivilligt)</summary>' +
                '<div class="figure-body">' +
                    '<div class="figure-wrap">' +
                        '<div id="fig-wrap-' + ovningNr + '">' +
                            buildFigureSvg('fig-svg-' + ovningNr, marks, true) +
                        '</div>' +
                        '<div class="figure-meta" id="fig-meta-' + ovningNr + '"><strong>' +
                            marks.length + '</strong> markerade</div>' +
                        '<div class="figure-actions">' +
                            '<button class="btn btn-sm btn-secondary" type="button" ' +
                                'onclick="skyttebokRensaMarks(\'' + ovningNr + '\')">Rensa markeringar</button>' +
                        '</div>' +
                        '<div class="figure-hint">Tryck på figuren för att lägga till en träff. ' +
                            'Tryck på en befintlig mark för att ta bort den.<br>' +
                            'Markeringar är ett komplement till siffran ovan, inte krav.</div>' +
                    '</div>' +
                '</div>' +
            '</details>';
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
                buildFigureSection(ovningNr) +
                '<button class="btn btn-primary" type="button" ' +
                    'onclick="skyttebokSparaPass(\'' + ovningNr + '\')">Spara pass</button>' +
            '</div>';
    }

    // ── Kompetensprov BAS — Fas 4 ───────────────────────────────────────
    // Tar emot historik (alla tidigare kp_bas-pass) för att visa
    // försök-idag-räknare och 3-försök-varning.

    function getKpElapsed() {
        if (!kpTimerState.startedAt) return 0;
        var end = kpTimerState.finishedAt || Date.now();
        return (end - kpTimerState.startedAt) / 1000;
    }

    // De 9 bästa träffarna räknas. Sortera traffar fallande efter zon-poäng,
    // ta de 9 första, summera. Returnerar { sum, kept, all }.
    function topNineScore(traffar) {
        var poangs = (traffar || []).map(function (m) {
            return ZON_POANG[m.zon] !== undefined ? ZON_POANG[m.zon] : 0;
        });
        poangs.sort(function (a, b) { return b - a; });
        var kept = poangs.slice(0, 9);
        var sum = kept.reduce(function (a, b) { return a + b; }, 0);
        return { sum: sum, kept: kept.length, all: poangs.length };
    }

    function kpForsokIdag(history) {
        var today = todayIso();
        return history.filter(function (p) { return p.datum === today; }).length;
    }

    function renderKpBasForm(history) {
        var marks = formMarks['kp_bas'] || [];
        var elapsed = getKpElapsed();
        var running = !!kpTimerState.startedAt && !kpTimerState.finishedAt;
        var done = !!kpTimerState.finishedAt;

        var score = topNineScore(marks);
        var pk = elapsed > 0 ? (score.sum / elapsed) : 0;
        var godkand = (marks.length >= 9 && pk >= 1.0 && elapsed > 0);

        // Timer-knappar
        var timerControls;
        if (!kpTimerState.startedAt) {
            timerControls = '<button class="btn btn-primary" type="button" onclick="skyttebokKpStart()">START</button>';
        } else if (running) {
            timerControls = '<button class="btn btn-primary" type="button" style="background:var(--danger)" onclick="skyttebokKpStop()">SISTA SKOTT</button>';
        } else {
            timerControls = '<button class="btn btn-secondary" type="button" onclick="skyttebokKpReset()">Återställ timer</button>';
        }

        var forsok = kpForsokIdag(history);
        var forsokText = forsok === 0
            ? 'Inga försök idag.'
            : ('Försök idag: <strong>' + forsok + '</strong> / 3');
        var forsokClass = forsok >= 3 ? ' kp-forsok-warn' : '';

        var datumDefault = todayIso();

        return '' +
            '<div class="kp-form">' +
                '<div class="kp-meta' + forsokClass + '">' + forsokText +
                    (forsok >= 3 ? ' — fler tillåts men dokumenteras enligt regelverk' : '') +
                '</div>' +

                '<div class="pass-form-row" style="margin-top:10px">' +
                    '<div>' +
                        '<label for="kp-datum">Datum</label>' +
                        '<input type="date" id="kp-datum" value="' + datumDefault + '">' +
                    '</div>' +
                    '<div>' +
                        '<label>Tid</label>' +
                        '<div class="kp-timer">' +
                            '<span class="kp-timer-display" id="kp-timer-display">' +
                                elapsed.toFixed(1) + ' s' +
                            '</span>' +
                            timerControls +
                        '</div>' +
                    '</div>' +
                '</div>' +

                '<div class="kp-figure-wrap">' +
                    '<div id="fig-wrap-kp_bas">' +
                        buildFigureSvg('fig-svg-kp_bas', marks, true) +
                    '</div>' +
                    '<div class="figure-meta" id="fig-meta-kp_bas"><strong>' +
                        marks.length + '</strong> markerade</div>' +
                    '<div class="figure-hint">Tryck på figuren för varje träff. ' +
                        'De 9 bästa räknas vid bättringar.</div>' +
                    '<button class="btn btn-sm btn-secondary" type="button" ' +
                        'onclick="skyttebokRensaMarks(\'kp_bas\')" style="width:auto">Rensa markeringar</button>' +
                '</div>' +

                '<div class="kp-result' + (godkand ? ' godkand' : (marks.length || elapsed ? ' ovissa' : '')) + '" id="kp-result">' +
                    '<div class="kp-result-row">' +
                        '<span class="kp-result-label">Träff</span>' +
                        '<span class="kp-result-value">' + marks.length + ' (' +
                            (marks.length >= 9 ? '9 räknas' : 'minst 9 krävs') + ')</span>' +
                    '</div>' +
                    '<div class="kp-result-row">' +
                        '<span class="kp-result-label">Poäng</span>' +
                        '<span class="kp-result-value">' + score.sum +
                            ' p</span>' +
                    '</div>' +
                    '<div class="kp-result-row">' +
                        '<span class="kp-result-label">Poängkvot</span>' +
                        '<span class="kp-result-value">' +
                            (elapsed > 0 ? pk.toFixed(2) : '—') +
                            ' <small>(krav ≥ 1,00)</small></span>' +
                    '</div>' +
                    '<div class="kp-result-row">' +
                        '<span class="kp-result-label">Status</span>' +
                        '<span class="kp-result-value kp-status ' +
                            (godkand ? 'ok' : 'ej') + '">' +
                            (godkand ? 'GODKÄND' : 'EJ KLAR') +
                        '</span>' +
                    '</div>' +
                '</div>' +

                '<div style="margin-top:10px">' +
                    '<label for="kp-anteckning">Anteckning (frivilligt)</label>' +
                    '<textarea id="kp-anteckning" rows="2" placeholder="T.ex. instruktör, vapen, vapen-individ"></textarea>' +
                '</div>' +

                '<button class="btn btn-primary" type="button" ' +
                    (done && marks.length > 0
                        ? 'onclick="skyttebokSparaKpBas()"'
                        : 'disabled style="opacity:0.55;cursor:not-allowed"') +
                    '>' +
                    (done ? 'Spara prov' : 'Spara prov (kräver tid + minst 1 träff)') +
                '</button>' +
            '</div>';
    }

    window.skyttebokKpStart = function () {
        kpTimerState.startedAt = Date.now();
        kpTimerState.finishedAt = null;
        if (kpTimerState.intervalId) clearInterval(kpTimerState.intervalId);
        kpTimerState.intervalId = setInterval(updateKpTimerDisplay, 100);
        // Töm marks vid start så användaren börjar rent. Bekräfta om något fanns.
        if ((formMarks.kp_bas || []).length > 0) {
            // Tyst rensning vid start — användaren har precis tryckt på timer.
            // Antag att tidigare markeringar var test/felklick.
            formMarks.kp_bas = [];
        }
        // Re-render för att byta knappläge
        var card = document.querySelector('.ovning-card[data-ovning="kp_bas"]');
        var wasOpen = card && card.classList.contains('open');
        render();
        if (wasOpen) {
            var c = document.querySelector('.ovning-card[data-ovning="kp_bas"]');
            if (c) c.classList.add('open');
        }
    };

    window.skyttebokKpStop = function () {
        if (!kpTimerState.startedAt || kpTimerState.finishedAt) return;
        kpTimerState.finishedAt = Date.now();
        if (kpTimerState.intervalId) {
            clearInterval(kpTimerState.intervalId);
            kpTimerState.intervalId = null;
        }
        var card = document.querySelector('.ovning-card[data-ovning="kp_bas"]');
        var wasOpen = card && card.classList.contains('open');
        render();
        if (wasOpen) {
            var c = document.querySelector('.ovning-card[data-ovning="kp_bas"]');
            if (c) c.classList.add('open');
        }
    };

    window.skyttebokKpReset = function () {
        kpTimerState.startedAt = null;
        kpTimerState.finishedAt = null;
        if (kpTimerState.intervalId) {
            clearInterval(kpTimerState.intervalId);
            kpTimerState.intervalId = null;
        }
        formMarks.kp_bas = [];
        var card = document.querySelector('.ovning-card[data-ovning="kp_bas"]');
        var wasOpen = card && card.classList.contains('open');
        render();
        if (wasOpen) {
            var c = document.querySelector('.ovning-card[data-ovning="kp_bas"]');
            if (c) c.classList.add('open');
        }
    };

    function updateKpTimerDisplay() {
        var el = document.getElementById('kp-timer-display');
        if (el) el.textContent = getKpElapsed().toFixed(1) + ' s';
    }

    window.skyttebokSparaKpBas = function () {
        var datum = (document.getElementById('kp-datum') || {}).value || todayIso();
        var anteckning = (document.getElementById('kp-anteckning') || {}).value || '';
        anteckning = anteckning.trim();
        var marks = formMarks.kp_bas || [];
        var elapsed = getKpElapsed();
        if (!kpTimerState.finishedAt || marks.length === 0) {
            showConfirm('Ej klart',
                'Provet behöver minst 1 träff och en stoppad timer innan det kan sparas.',
                function () { /* no-op */ });
            return;
        }
        var score = topNineScore(marks);
        var pk = elapsed > 0 ? Math.round((score.sum / elapsed) * 100) / 100 : 0;
        var godkand = (marks.length >= 9 && pk >= 1.0);

        var pass = {
            id: uuid(),
            ovningNr: 'kp_bas',
            datum: datum,
            tid: Math.round(elapsed * 10) / 10,
            traffar: marks.slice(),
            poangSumma: score.sum,
            poangKvot: pk,
            godkand: godkand,
            anteckning: anteckning,
            // Bevarar bakåtkompat med pass-listan: skott=traffar.length som
            // ett rimligt approxvärde, träff=räknade.
            skott: marks.length,
            traff: Math.min(marks.length, 9),
            skapad: Date.now()
        };
        savePass(pass);

        // Nollställ allt — nästa försök börjar rent.
        formMarks.kp_bas = [];
        kpTimerState.startedAt = null;
        kpTimerState.finishedAt = null;
        if (kpTimerState.intervalId) {
            clearInterval(kpTimerState.intervalId);
            kpTimerState.intervalId = null;
        }

        render();
        var c = document.querySelector('.ovning-card[data-ovning="kp_bas"]');
        if (c) {
            c.classList.add('open');
            c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    };

    function renderPassRow(p) {
        var statusClass = p.godkand ? 'ok' : 'ej';
        var statusText = p.godkand ? 'GODKÄND' : 'EJ GODK.';
        var rowClass = p.godkand ? 'godkand' : 'underkand';

        // KP-BAS-pass har egen resultat-format (tid + PK), regular pass
        // använder skott/träff/%.
        var resultatText;
        if (p.ovningNr === 'kp_bas' && p.tid !== undefined) {
            resultatText = (p.traffar ? p.traffar.length : 0) + ' träff · ' +
                p.tid.toFixed(1) + ' s · PK ' +
                (p.poangKvot !== undefined ? p.poangKvot.toFixed(2) : '?');
        } else {
            var pct = p.skott > 0 ? Math.round(100 * p.traff / p.skott) : 0;
            resultatText = (p.traff || 0) + '/' + (p.skott || 0) +
                (p.skott > 0 ? ' (' + pct + '%)' : '');
        }

        // Mini-figur om träffmarkeringar finns. Read-only, ingen klick.
        var figureHtml = '';
        if (p.traffar && p.traffar.length > 0) {
            var zonCount = {};
            p.traffar.forEach(function (mk) {
                zonCount[mk.zon] = (zonCount[mk.zon] || 0) + 1;
            });
            var byZon = ['H', 'A', 'B', 'C', 'D', 'utanför']
                .filter(function (z) { return zonCount[z]; })
                .map(function (z) { return zonCount[z] + '×' + z; })
                .join(' · ');
            // Eget svg-id med pass-id för att undvika DOM-kollision.
            var svgId = 'fig-pass-' + p.id;
            figureHtml = '<div class="pass-row-figure">' +
                buildFigureSvg(svgId, p.traffar, false) +
                '<span class="pass-zon-summary">' +
                    p.traffar.length + ' träff markerade<br>' +
                    escapeHtml(byZon) +
                '</span>' +
            '</div>';
        }

        return '<div class="pass-row ' + rowClass + '" data-pass="' + p.id + '">' +
            '<span class="pass-datum">' + escapeHtml(p.datum || '') + '</span>' +
            '<span class="pass-resultat">' + resultatText + '</span>' +
            '<span class="pass-status ' + statusClass + '">' + statusText + '</span>' +
            '<button class="pass-delete" type="button" title="Ta bort pass" ' +
                'onclick="skyttebokRaderaPass(\'' + p.id + '\')">×</button>' +
            (p.anteckning ? '<div class="pass-anteckning">' + escapeHtml(p.anteckning) + '</div>' : '') +
            figureHtml +
        '</div>';
    }

    function render() {
        var byNr = passByOvning();
        renderSummary(byNr);

        var filter = getFilter();
        var root = document.getElementById('ovningarRoot');
        var html = '';
        DATA.delmoment.forEach(function (dm) {
            if (!isDelmomentInFilter(dm.nr, filter)) return;
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
        var root = document.getElementById('sakerhetsprovRoot');
        if (!root) return;
        // Säkerhetsprov BAS hör till BAS — döljs i ren TILLÄGG-vy.
        if (getFilter() === 'tillagg') {
            root.innerHTML = '';
            return;
        }
        var sp = loadSakerhetsprov();

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

        // Träffmarkeringar (frivilliga). Tas bara med om något markerats.
        var marks = formMarks[ovningNr] || [];

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
        if (marks.length > 0) pass.traffar = marks.slice();
        savePass(pass);

        // Töm form-state efter sparat pass — nästa pass börjar tomt.
        delete formMarks[ovningNr];

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
        syncFilterButtons();
        renderSakerhetsprov();
        render();
    }

    // ── Init ────────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        initSettings();
        renderAll();
    });
})();
