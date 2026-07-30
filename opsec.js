// OPSEC-sweep — körs på alla rapportsidor.
//
// Hindrar webbläsaren och password managers från att föreslå att spara,
// auto-fylla, stavnings-rätta eller auto-versalisera taktiska fält.
// Kör vid DOMContentLoaded och igen vid varje nytt DOM-tillägg
// (för dynamiskt skapade inputs i kart-modaler, sliders, etc).
//
// Påverkar inte type=file/submit/button/checkbox/radio/range/color/hidden.

// ── Global XML-escape ───────────────────────────────────────────────────────
// Används av CoT-XML-genereringen i index/ah/scrim/what/weft. Tidigare fanns
// fem identiska inline-kopior; konsoliderat hit för att ha en sanning. Sätts
// synkront vid script-load så generateCoTXML() (kallad via knapp-klick efter
// DOMContentLoaded) alltid har den tillgänglig.
window.escapeXml = function (s) {
  return String(s == null ? '' : s).replace(/[<>&"']/g, function (c) {
    return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c];
  });
};

// ── Global TNR → ISO-stämpel ────────────────────────────────────────────────
// TNR är hemvärnets tids-format: DDHHMM (kort) eller DDHHMM[ ]MMM[YYYY] (lång).
// Returnerar en UTC ISO-sträng. Tomt/'-'/ogiltigt input → nu (ISO).
// Tidigare fanns fem identiska inline-kopior i CoT-sidorna; en sanning här.
// TNR → ISO. Returnerar null när stämpeln inte går att tolka som ett VERKLIGT
// datum — anroparen måste hantera det, aldrig exportera en gissad tid.
//
// Tidigare kontrollerades bara isNaN, men Date.UTC NORMALISERAR i stället för
// att avvisa: Date.UTC(2025, 1, 30) blir 2 mars. "30 FEB" gav alltså en fullt
// giltig CoT-tidsstämpel för fel dygn, och fuzztestet hade kodifierat det som
// förväntat beteende. I ett fältverktyg är 30 februari inte ett alternativt
// sätt att skriva 2 mars. Round-trip-kontrollen nedan fångar det.
window.parseTnrToISO = function (tnr) {
  var iso = window.parseTnrStrict(tnr);
  return iso === null ? new Date().toISOString() : iso;
};

// Strikt variant: null = ogiltig stämpel. Använd denna där ett fel värde är
// farligare än ett avbrutet flöde (CoT-export).
window.parseTnrStrict = function (tnr) {
  if (!tnr || tnr === '-') return new Date().toISOString();
  if (!/^\d{6}/.test(tnr)) return null;
  var now = new Date();
  var dd = parseInt(tnr.slice(0, 2), 10);
  var hh = parseInt(tnr.slice(2, 4), 10);
  var mm = parseInt(tnr.slice(4, 6), 10);
  var year = now.getFullYear();
  var month = now.getMonth();
  if (tnr.length > 6) {
    var months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    var mi = months.indexOf(tnr.slice(7, 10).toUpperCase());
    if (mi >= 0) month = mi;
    if (tnr.length >= 14) {
      var y = parseInt(tnr.slice(10, 14), 10);
      if (!isFinite(y)) return null;
      year = y;
    }
  }
  if (!isFinite(dd) || !isFinite(hh) || !isFinite(mm)) return null;
  if (hh > 23 || mm > 59 || dd < 1 || dd > 31) return null;
  var d = new Date(Date.UTC(year, month, dd, hh, mm, 0));
  if (isNaN(d.getTime())) return null;
  // Round-trip: normaliserade Date.UTC bort ett omöjligt datum? Då är stämpeln
  // ogiltig, inte "tolkad".
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month ||
      d.getUTCDate() !== dd || d.getUTCHours() !== hh || d.getUTCMinutes() !== mm) {
    return null;
  }
  return d.toISOString();
};

// STÄLLE-fältet → {lat, lon} eller null. Fältet tillåter uttryckligen
// "MGRS-koordinater, platsnamn eller beskrivning", och kartväljaren skriver
// dessutom "MGRS, adress" när reverse-geokodningen hittat en gata. Tidigare
// kördes hela strängen genom MGRS.inverse, som kastar på allt utom en ren
// MGRS — och anroparen föll då tillbaka på lat/lon = 0, alltså en giltig
// CoT-punkt i Guineabukten. Det drabbade HUVUDFLÖDET: välj på kartan med nätet
// på → adress fylls i → 0,0. Här plockas koordinaten ut robust i stället, och
// null betyder null.
window.parseStalleToLatLon = function (str) {
  if (!str) return null;
  var s = String(str).trim();
  if (!s || s === '-') return null;

  function mgrs(kandidat) {
    if (!kandidat || typeof MGRS === 'undefined' || !MGRS.inverse) return null;
    var ren = kandidat.replace(/\s+/g, '').toUpperCase();
    // Giltig MGRS har ett JÄMNT antal siffror efter rutbokstäverna (easting och
    // northing lika långa). Biblioteket accepterar udda antal och returnerar en
    // koordinat ändå — en avhuggen inmatning som "33VWF999" blev då en
    // trovärdig men felaktig position. I ett fältverktyg är ett tyst fel värde
    // farligare än ett avvisat.
    var m = ren.match(/^(\d{1,2}[C-X])([A-HJ-NP-Z]{2})(\d*)$/);
    if (m && m[3].length % 2 !== 0) return null;
    try {
      var c = MGRS.inverse(ren);
      if (c && isFinite(c[0]) && isFinite(c[1])) return { lat: c[0], lon: c[1] };
    } catch (e) {}
    return null;
  }

  // 1) Hela strängen som MGRS.
  var träff = mgrs(s);
  if (träff) return träff;

  // 2) Delen före första kommat — "33VWF1234567890, Storgatan 4".
  if (s.indexOf(',') > 0) {
    träff = mgrs(s.split(',')[0]);
    if (träff) return träff;
  }

  // 3) MGRS var som helst i strängen (zon + 2 bokstäver + jämnt antal siffror).
  var m = s.match(/\b\d{1,2}[C-X]\s*[A-HJ-NP-Z]{2}\s*\d{2,10}\b/i);
  if (m) {
    träff = mgrs(m[0]);
    if (träff) return träff;
  }

  // 4) Decimalgrader: "59.3293 18.0686" / "59.32, 18.07" / "59.32 N 18.07 E".
  var dd = s.match(/(-?\d+[.,]\d+)\s*[°\s,NS]*\s*(-?\d+[.,]\d+)/i);
  if (dd) {
    var la = parseFloat(dd[1].replace(',', '.'));
    var lo = parseFloat(dd[2].replace(',', '.'));
    if (isFinite(la) && isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180) {
      return { lat: la, lon: lo };
    }
  }
  return null;
};

(function () {
  'use strict';

  var SKIP_TYPES = new Set([
    'file', 'submit', 'button', 'reset',
    'checkbox', 'radio', 'range', 'color', 'hidden', 'image'
  ]);

  function harden(el) {
    if (!el || el.dataset.opsecHardened === '1') return;
    if (el.tagName === 'INPUT' && SKIP_TYPES.has((el.type || '').toLowerCase())) {
      el.dataset.opsecHardened = '1';
      return;
    }

    if (!el.hasAttribute('autocomplete')) el.setAttribute('autocomplete', 'off');
    // spellcheck/autocorrect/autocapitalize gör inget på <select> men skadar inte;
    // sätts ändå för konsistens.
    if (!el.hasAttribute('spellcheck')) el.setAttribute('spellcheck', 'false');
    if (!el.hasAttribute('autocorrect')) el.setAttribute('autocorrect', 'off');
    if (!el.hasAttribute('autocapitalize')) el.setAttribute('autocapitalize', 'off');
    if (!el.hasAttribute('data-1p-ignore')) el.setAttribute('data-1p-ignore', '');
    if (!el.hasAttribute('data-bwignore')) el.setAttribute('data-bwignore', '');
    if (!el.hasAttribute('data-lpignore')) el.setAttribute('data-lpignore', 'true');
    if (!el.hasAttribute('data-form-type')) el.setAttribute('data-form-type', 'other');

    el.dataset.opsecHardened = '1';
  }

  function sweep(root) {
    var nodes = (root || document).querySelectorAll('input,textarea,select');
    for (var i = 0; i < nodes.length; i++) harden(nodes[i]);
  }

  function start() {
    sweep(document);

    if (typeof MutationObserver === 'undefined') return;
    var obs = new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var added = records[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeType !== 1) continue;
          if (n.tagName === 'INPUT' || n.tagName === 'TEXTAREA' || n.tagName === 'SELECT') harden(n);
          else if (n.querySelectorAll) sweep(n);
        }
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
