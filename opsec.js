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
window.parseTnrToISO = function (tnr) {
  if (!tnr || tnr === '-') return new Date().toISOString();
  var now = new Date();
  var dd = parseInt(tnr.slice(0, 2));
  var hh = parseInt(tnr.slice(2, 4));
  var mm = parseInt(tnr.slice(4, 6));
  var year = now.getFullYear();
  var month = now.getMonth();
  if (tnr.length > 6) {
    var months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    var mi = months.indexOf(tnr.slice(7, 10).toUpperCase());
    if (mi >= 0) month = mi;
    if (tnr.length >= 14) year = parseInt(tnr.slice(10, 14));
  }
  var d = new Date(Date.UTC(year, month, dd, hh, mm, 0));
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
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
