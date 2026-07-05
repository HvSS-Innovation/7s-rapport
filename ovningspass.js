// ovningspass.js — logik för Övningspass v2 (dokument-först, låg tröskel).
// Ingen DOM-åtkomst utöver localStorage-wrappern — allt testbart i vm-sandbox
// (verktyg/test-ovningspass.js). UI:t bor i ovningspass.html.
//
// Designprincip (Joels beslut 2026-07-05): mallen ligger FÄRDIG från start
// (45 min, standardinslag). Instruktionsbok läses in → regelstyrda FÖRSLAG
// (ingen AI, inga nätverksanrop) uppdaterar planen. Slides visar en sak i
// taget; planen syns hela tiden som redigerbar HTML-tabell.
// Verktyget är privatutvecklat och inte fastställt av Försvarsmakten.

(function (global) {
  'use strict';

  const LS_KEY = 'ovnpass_state_v2';

  // ── Standardmall: truppföringsram + två flexibla innehållsmoment = 45 min ──
  // flex-moment skalas när passets längd ändras; ramen ligger fast.
  function standardMoment() {
    return [
      { min: '', vad: 'Förberedelser', hur: 'Duka övningsplatsen enligt dukningslistan.', anm: 'Ingår ej i passets tid', flex: false, gen: false },
      { min: '1', vad: 'Tagande av befälet', hur: '"Lämna av!" — "Jag tar befälet." Presentera dig och passets längd.', anm: '', flex: false, gen: false },
      { min: '2', vad: 'Övningsgenomgång', hur: 'Delge MÅL och SYFTE ur planen.', anm: '', flex: false, gen: false },
      { min: '2', vad: 'Säkerhetsgenomgång', hur: 'Delge säkerhetsbestämmelser och hur sjukvård tillkallas (se Risk & sjukvård).', anm: '', flex: false, gen: false },
      { min: '10', vad: 'Genomgång / teori', hur: '', anm: '', flex: true, gen: false },
      { min: '25', vad: 'Praktisk övning', hur: '', anm: '', flex: true, gen: false },
      { min: '3', vad: 'Utvärdera mot målet', hur: 'Vad hände? Varför? Hur blir vi bättre? Kvittera målet.', anm: '', flex: false, gen: false },
      { min: '1', vad: 'Återlämna materiel', hur: '', anm: '', flex: false, gen: false },
      { min: '0', vad: 'Nästa plats/tid', hur: '', anm: '', flex: false, gen: false },
      { min: '1', vad: 'Återlämnande av befälet', hur: '"Gruppchefen!" — grpc tar befälet.', anm: '', flex: false, gen: false }
    ];
  }

  function standardDukning() {
    return [
      { text: 'Övningsplatsen rekad och iordningställd', vald: true, gen: false },
      { text: 'Materiel framtagen och kontrollerad', vald: true, gen: false },
      { text: 'Samband för att larma 112 kontrollerat', vald: true, gen: false }
    ];
  }

  // ── Risknivåer med åtgärdskrav (SÄkR-formuleringar) + riskfaktor-mappning.
  //    Nivån VÄLJS av användaren — verktyget hårdkodar ingen overifierad
  //    S×K-matris, bara den verifierade nivå→R- och R×T-logiken. ──
  const RISKNIVAER = [
    { namn: 'Ingen synbar risk', r: null,   krav: 'Inga åtgärder krävs.' },
    { namn: 'Låg',               r: 'R1',   krav: 'Risken bör bevakas; inga särskilda åtgärder. Orientera deltagarna.' },
    { namn: 'Måttlig',           r: 'R2',   krav: 'Bör riskhanteras. Om verksamheten bedrivs ska den övervakas och personal informeras.' },
    { namn: 'Hög',               r: 'R3',   krav: 'Ska riskhanteras så långt praktiskt möjligt. Personal ska informeras.' },
    { namn: 'Mycket hög',        r: 'STOPP', krav: 'Verksamheten får inte bedrivas som planerat — eliminera risken eller planera om.' }
  ];

  function defaultState() {
    return {
      grund: {
        namn: '', datum: '', ovning: 'Övningspass', plats: '',
        mal: '', syfte: '', krav: '-', hanvisning: '',
        ovningGen: false, hanvisningGen: false
      },
      langd: 45,
      deltagare: 8,
      moment: standardMoment(),
      utrustning: [],            // {text, vald, gen}
      dukning: standardDukning(),
      risker: [],                // {beskrivning, niva (index i RISKNIVAER), atgard}
      sjukvard: { vardcentral: '', vcMin: '', sjukhus: '', shMin: '' },
      bok: { titel: '', sidantal: 0, valda: [] }  // sidtext hålls i minnet, ej i localStorage
    };
  }

  // ── Persistens (localStorage, try/catch — privat läge kan throwa) ──
  function loadState() {
    try {
      const raw = global.localStorage.getItem(LS_KEY);
      if (!raw) return defaultState();
      const s = JSON.parse(raw);
      const d = defaultState();
      const arrObj = (a) => Array.isArray(a) ? a.filter(x => x && typeof x === 'object') : [];
      const moment = arrObj(s.moment);
      // Allowlist-kopiering per nyckel (inte Object.assign) — '__proto__' ur
      // JSON.parse skulle annars byta prototyp på delobjekten, och fel typ i
      // ett fält kan krascha .trim()-anrop senare.
      const kopiera = (mall, kalla) => {
        if (!kalla || typeof kalla !== 'object') return mall;
        Object.keys(mall).forEach(k => {
          const v = kalla[k];
          if (typeof mall[k] === 'boolean') { mall[k] = v === true; }
          else if (typeof v === 'string' || typeof v === 'number') { mall[k] = String(v); }
        });
        return mall;
      };
      const bok = kopiera({ titel: '', sidantal: '0', valda: null }, s.bok);
      return {
        grund: kopiera(d.grund, s.grund),
        langd: Number.isFinite(+s.langd) && +s.langd > 0 ? +s.langd : 45,
        deltagare: Number.isFinite(+s.deltagare) && +s.deltagare > 0 ? +s.deltagare : 8,
        moment: moment.length ? moment : d.moment,
        utrustning: arrObj(s.utrustning),
        dukning: Array.isArray(s.dukning) ? arrObj(s.dukning) : d.dukning,
        risker: arrObj(s.risker),
        sjukvard: kopiera(d.sjukvard, s.sjukvard),
        bok: {
          titel: bok.titel,
          sidantal: parseInt(bok.sidantal, 10) || 0,
          valda: (s.bok && Array.isArray(s.bok.valda))
            ? s.bok.valda.filter(x => Number.isInteger(x) && x >= 0) : []
        }
      };
    } catch (_) { return defaultState(); }
  }
  function saveState(state) {
    try { global.localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (_) {}
  }
  function clearState() {
    try { global.localStorage.removeItem(LS_KEY); } catch (_) {}
  }

  // ── Tider: ack räknas från moment 1 (Förberedelser/moment 0 ingår ej) ──
  function beraknaTider(moment) {
    let ack = 0;
    return moment.map((m, i) => {
      const min = parseInt(String(m.min).trim(), 10);
      const harTid = Number.isFinite(min) && min >= 0;
      if (i === 0) return { nr: 0, min: harTid ? min : null, ack: null };
      if (harTid) ack += min;
      return { nr: i, min: harTid ? min : null, ack: harTid ? ack : null };
    });
  }
  function totalTid(moment) {
    let max = 0;
    beraknaTider(moment).forEach(t => { if (t.nr > 0 && t.ack !== null) max = t.ack; });
    return max;
  }

  // ── Tidsskalning: flex-momenten fyller (längd − ramens fasta tid).
  //    Proportionellt mot sina basvärden; avrundningsdiff läggs på sista. ──
  function skalaMoment(moment, langd) {
    const mal = Math.max(0, parseInt(langd, 10) || 0);
    let fast = 0;
    const flexIdx = [];
    moment.forEach((m, i) => {
      if (i === 0) return;
      const min = parseInt(String(m.min).trim(), 10);
      const v = Number.isFinite(min) && min >= 0 ? min : 0;
      if (m.flex) flexIdx.push(i);
      else fast += v;
    });
    if (!flexIdx.length) return moment;
    // Löpande rest-fördelning: exakt summa garanteras (round-drift kan annars
    // överskrida potten och sista momentet klampas fel).
    let kvarPott = Math.max(0, mal - fast);
    let kvarBas = flexIdx.reduce((s, idx) => {
      const min = parseInt(String(moment[idx].min).trim(), 10);
      return s + ((Number.isFinite(min) && min >= 0 ? min : 0) || 1);
    }, 0);
    flexIdx.forEach(idx => {
      const min = parseInt(String(moment[idx].min).trim(), 10);
      const bas = (Number.isFinite(min) && min >= 0 ? min : 0) || 1;
      const del = kvarBas > 0 ? Math.min(kvarPott, Math.round(bas / kvarBas * kvarPott)) : 0;
      moment[idx].min = String(del);
      kvarPott -= del;
      kvarBas -= bas;
    });
    return moment;
  }

  // ── Risk: högsta vald nivå → riskfaktor ──
  function hogstaRiskniva(risker) {
    let max = -1;
    risker.forEach(r => {
      const n = parseInt(r.niva, 10);
      if (Number.isFinite(n) && n >= 0 && n < RISKNIVAER.length && n > max) max = n;
    });
    return max; // -1 = inga risker bedömda
  }
  function riskFaktor(nivaIdx) {
    if (nivaIdx < 0 || nivaIdx >= RISKNIVAER.length) return null;
    return RISKNIVAER[nivaIdx].r; // null | 'R1' | 'R2' | 'R3' | 'STOPP'
  }

  // ── Tidsfaktor ur restid till vård. Grov planeringshjälp — T fastställs
  //    formellt av CMA (militärt fält) eller lägst C OrgE, vilket UI:t anger. ──
  function tFaktor(vcMin, shMin) {
    const p = (v) => {
      const n = parseInt(String(v).trim(), 10);
      return Number.isFinite(n) && n >= 0 ? n : null;
    };
    const sh = p(shMin), vc = p(vcMin);
    // Kvalificerad vårdinrättning = sjukhus/akut. Vårdcentral räknas inte som
    // kvalificerad akutvård (och kan vara stängd kvällar/helger) → ger aldrig
    // T1 på egen hand.
    if (sh !== null) {
      if (sh <= 20) return 'T1';
      if (sh <= 120) return 'T2';
      return 'T3';
    }
    if (vc !== null) return vc <= 120 ? 'T2' : 'T3';
    return null;
  }

  // ── Sjukvårdsberedskap ur R × T (SÄkR kap 10-logiken) ──
  function beredskap(r, t) {
    if (r === 'STOPP') return 'Övningen får inte bedrivas som planerat vid mycket hög risknivå — planera om.';
    if (!r) return 'Ingen kvarstående personskaderisk bedömd — inget behov av sjukvårdsberedskap.';
    if (!t) return null; // T saknas ännu
    if (r === 'R1' && t === 'T1') return 'Ingen särskild sjukvårdsberedskap krävs (R1 + T1).';
    if (r === 'R3' && t === 'T3') return 'HÖJD sjukvårdsberedskap ska sättas (R3 + T3) — legitimerad sjukvårdspersonal inom övningsområdet.';
    return 'Grundberedskap sjukvård (' + r + ' + ' + t + '): iordningställd övningsplats, 112-samband, utbildning i akut omhändertagande, medförd sjukvårdsutrustning.';
  }

  // ── Regelstyrd förslags-generator (ingen AI — enkel textanalys) ──
  const LEX_UTRUSTNING = [
    'karta', 'kompass', 'radio', 'gps', 'kikare', 'ficklampa', 'pannlampa',
    'batteri', 'hörselskydd', 'skyddsglasögon', 'handskar', 'hjälm', 'väst',
    'vapen', 'magasin', 'ammunition', 'snitselband', 'sjukvårdsutrustning',
    'första förband', 'bår', 'penna', 'papper', 'anteckningsblock',
    'whiteboard', 'tavla', 'projektor', 'måltavla', 'figurer', 'slanor',
    'spade', 'yxa', 'såg', 'rep', 'presenning', 'vattenflaska', 'stoppur',
    'skrivunderlägg', 'blankett', 'skottkärra', 'multiverktyg'
  ];
  const LEX_DUKNING = [
    'station', 'tavla', 'projektor', 'duk', 'bord', 'stolar', 'avspärrning',
    'snitsla', 'markera', 'skylt', 'sandlåda', 'terrängmodell',
    'samlingsplats', 'genomgångsplats', 'materielplats', 'sjukvårdsplats',
    'startplats', 'målområde', 'lektionssal'
  ];

  function versal(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // Rubrik-heuristik: kort rad, börjar med versal/siffra, slutar inte med
  // punkt/komma, mest bokstäver, max 8 ord.
  function arRubrik(rad) {
    const r = rad.trim();
    if (r.length < 3 || r.length > 60) return false;
    if (/[.,:;]$/.test(r)) return false;
    if (!/^[A-ZÅÄÖ0-9]/.test(r)) return false;
    if (r.split(/\s+/).length > 8) return false;
    const bokstaver = (r.match(/[a-zåäöA-ZÅÄÖ]/g) || []).length;
    if (bokstaver / r.length < 0.6) return false;
    if (/^(sid|sida|kapitel \d+$|\d+$)/i.test(r)) return false;
    return true;
  }

  // sidor: array av sidtexter (redan filtrerade till valda sidor).
  // Returnerar förslag — appliceras separat med applyForslag.
  function extraheraForslag(sidor) {
    const rubriker = [];
    const sett = new Set();
    sidor.forEach(text => {
      String(text || '').split(/\n+/).forEach(rad => {
        const r = rad.trim().replace(/\s+/g, ' ');
        if (!arRubrik(r)) return;
        const nyckel = r.toLowerCase();
        if (sett.has(nyckel)) return;
        sett.add(nyckel);
        rubriker.push(r);
      });
    });

    const alltLc = sidor.join('\n').toLowerCase();
    const traff = (lex) => lex.filter(ord => alltLc.indexOf(ord) !== -1).map(versal);

    return {
      titel: rubriker.length ? rubriker[0] : '',
      momentForslag: rubriker.slice(0, 8),
      utrustning: traff(LEX_UTRUSTNING),
      dukning: traff(LEX_DUKNING)
    };
  }

  // Applicera förslag på state. Idempotent vid omkörning (sidval ändrat):
  // allt med gen:true rensas först, sedan sätts nya förslag in. Användarens
  // egna rader/moment (gen:false) röras aldrig.
  function applyForslag(state, forslag, bokTitel) {
    // 1) Rensa tidigare genererat.
    state.moment = state.moment.filter(m => !m.gen);
    state.utrustning = state.utrustning.filter(u => !u.gen);
    state.dukning = state.dukning.filter(d2 => !d2.gen);

    // 2) Övningsnamn + hänvisning. Skrivs bara över om fältet är orört ELLER
    //    själv kom från en tidigare generering (gen-flaggor) — annars äger
    //    användaren värdet.
    if (forslag.titel && (state.grund.ovning === 'Övningspass' || !state.grund.ovning.trim() || state.grund.ovningGen)) {
      state.grund.ovning = forslag.titel;
      state.grund.ovningGen = true;
    }
    if (bokTitel && (!state.grund.hanvisning.trim() || state.grund.hanvisningGen)) {
      state.grund.hanvisning = bokTitel;
      state.grund.hanvisningGen = true;
    }

    // 3) Momentförslag in som flex-moment före "Utvärdera mot målet"
    //    (orörda standard-placeholders tas bort så de inte dubblerar).
    if (forslag.momentForslag.length) {
      state.moment = state.moment.filter(m => {
        const orordPlaceholder = m.flex && !m.gen && !String(m.hur).trim() &&
          (m.vad === 'Genomgång / teori' || m.vad === 'Praktisk övning');
        return !orordPlaceholder;
      });
      let at = state.moment.findIndex(m => String(m.vad).trim() === 'Utvärdera mot målet');
      if (at === -1) at = state.moment.length;
      const nya = forslag.momentForslag.map(vad => (
        { min: '5', vad: vad, hur: '', anm: 'Förslag ur boken', flex: true, gen: true }
      ));
      state.moment.splice.apply(state.moment, [at, 0].concat(nya));
    } else if (!state.moment.some(m => m.flex)) {
      // Omgenerering som tömde alla gen-moment och inga flex-moment finns kvar
      // → återinsätt standard-placeholders så planen aldrig kollapsar till
      // enbart ramen utan väg tillbaka.
      const std = standardMoment().filter(m => m.flex);
      let at = state.moment.findIndex(m => String(m.vad).trim() === 'Utvärdera mot målet');
      if (at === -1) at = state.moment.length;
      state.moment.splice.apply(state.moment, [at, 0].concat(std));
    }
    // Skala ovillkorligt — även när gen-moment togs bort utan ersättning.
    skalaMoment(state.moment, state.langd);

    // 4) Listor (dubbletter mot befintliga hoppas över).
    const finns = (lista, text) => lista.some(x => String(x.text).toLowerCase() === text.toLowerCase());
    forslag.utrustning.forEach(text => {
      if (!finns(state.utrustning, text)) state.utrustning.push({ text: text, vald: true, gen: true });
    });
    forslag.dukning.forEach(text => {
      if (!finns(state.dukning, text)) state.dukning.push({ text: text, vald: true, gen: true });
    });
    return state;
  }

  // ── HTML-escape ──
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function escML(s) { return esc(s).replace(/\n/g, '<br>'); }

  // ── Övningsplanen som HTML-tabell. editable=true ger data-edit-attribut
  //    som UI:t gör contenteditable — print/export använder editable=false. ──
  function renderPlanTabell(state, opts) {
    const editable = !!(opts && opts.editable);
    const g = state.grund;
    const tider = beraknaTider(state.moment);
    const sum = totalTid(state.moment);
    const rIdx = hogstaRiskniva(state.risker);
    const r = riskFaktor(rIdx);
    const t = tFaktor(state.sjukvard.vcMin, state.sjukvard.shMin);
    // Fail-safe: "ingen risk BEDÖMD" (rIdx -1) får aldrig ge samma friande
    // text som "aktivt bedömd som ingen synbar risk" (rIdx 0).
    const bered = rIdx < 0
      ? 'RISKBEDÖMNING EJ GENOMFÖRD — genomför riskanalysen innan passet (mål + riskanalys är minimikravet).'
      : beredskap(r, t);

    const ed = (path, multiline) =>
      editable ? ' data-edit="' + path + '"' + (multiline ? ' data-ml="1"' : '') : '';

    let h = '<table class="op-tabell">';
    h += '<caption>ÖVNINGSPLAN' + (editable ? ' <span class="op-edithint">— klicka i en cell för att ändra</span>' : '') + '</caption>';

    // Grunddata
    const grundRader = [
      ['Namn', 'grund.namn', g.namn], ['Datum', 'grund.datum', g.datum],
      ['Övning', 'grund.ovning', g.ovning], ['Plats', 'grund.plats', g.plats],
      ['Längd', null, state.langd + ' min' + (sum !== state.langd ? ' (momenten summerar till ' + sum + ' min)' : '')],
      ['Deltagare', null, String(state.deltagare)],
      ['Hänvisning', 'grund.hanvisning', g.hanvisning]
    ];
    h += '<tbody class="op-grund">';
    grundRader.forEach(rad => {
      h += '<tr><th>' + esc(rad[0]) + '</th><td' + (rad[1] ? ed(rad[1]) : '') + '>' + escML(rad[2]) + '</td></tr>';
    });
    h += '</tbody>';

    // Mål/Syfte/Krav
    h += '<tbody class="op-mal">';
    h += '<tr><th>MÅL</th><td' + ed('grund.mal', 1) + '>' + escML(g.mal) + '</td></tr>';
    h += '<tr><th>SYFTE</th><td' + ed('grund.syfte', 1) + '>' + escML(g.syfte) + '</td></tr>';
    h += '<tr><th>KRAV</th><td' + ed('grund.krav', 1) + '>' + escML(g.krav) + '</td></tr>';
    h += '</tbody>';

    // Listor
    const lista = (arr) => arr.filter(x => x.vald).map(x => esc(x.text)).join(' · ');
    h += '<tbody class="op-listor">';
    h += '<tr><th>Utrustning</th><td>' + lista(state.utrustning) + '</td></tr>';
    h += '<tr><th>Dukning</th><td>' + lista(state.dukning) + '</td></tr>';
    h += '</tbody>';

    // Moment
    h += '<tbody class="op-moment"><tr class="op-momhead"><th>Mom/tid (ack)</th><th colspan="1">Omfattning — genomförande — anmärkning</th></tr>';
    state.moment.forEach((m, i) => {
      const ti = tider[i];
      const tid = ti.min === null ? ti.nr + '/–' :
        (ti.nr === 0 ? '0/' + ti.min : ti.nr + '/' + ti.min + ' (' + ti.ack + ')');
      h += '<tr class="op-momrad">';
      h += '<td class="op-tid"' + ed('moment.' + i + '.min') + '>' + esc(tid) + '</td>';
      h += '<td><div class="op-vad"' + ed('moment.' + i + '.vad') + '>' + escML(m.vad) + '</div>' +
        '<div class="op-hur"' + ed('moment.' + i + '.hur', 1) + '>' + escML(m.hur) + '</div>' +
        (String(m.anm).trim() || editable ? '<div class="op-anm"' + ed('moment.' + i + '.anm') + '>' + escML(m.anm) + '</div>' : '') +
        '</td></tr>';
    });
    h += '</tbody>';

    // Risk & sjukvård
    h += '<tbody class="op-risk"><tr class="op-momhead"><th colspan="2">Risk &amp; sjukvård</th></tr>';
    if (state.risker.length) {
      state.risker.forEach(risk => {
        const n = parseInt(risk.niva, 10);
        const niv = (Number.isFinite(n) && RISKNIVAER[n]) ? RISKNIVAER[n] : null;
        h += '<tr><th>' + (niv ? esc(niv.namn) : 'Ej bedömd') + '</th><td>' + escML(risk.beskrivning) +
          (String(risk.atgard).trim() ? '<br><em>Åtgärd: ' + escML(risk.atgard) + '</em>' : '') + '</td></tr>';
      });
    } else {
      h += '<tr><th>Risker</th><td>Inga risker bedömda ännu.</td></tr>';
    }
    const vard = [];
    if (String(state.sjukvard.vardcentral).trim() || String(state.sjukvard.vcMin).trim()) {
      vard.push('Vårdcentral: ' + state.sjukvard.vardcentral + (state.sjukvard.vcMin ? ' (' + state.sjukvard.vcMin + ' min)' : ''));
    }
    if (String(state.sjukvard.sjukhus).trim() || String(state.sjukvard.shMin).trim()) {
      vard.push('Sjukhus: ' + state.sjukvard.sjukhus + (state.sjukvard.shMin ? ' (' + state.sjukvard.shMin + ' min)' : ''));
    }
    h += '<tr><th>Närmaste vård</th><td>' + (vard.length ? escML(vard.join('\n')) : '—') + '</td></tr>';
    h += '<tr><th>Riskfaktor / beredskap</th><td>' +
      esc((rIdx < 0 ? 'ej bedömd' : (r || 'ingen (ingen synbar risk)')) + (t ? ' × ' + t : '')) +
      (bered ? '<br>' + escML(bered) : '') +
      '<br><em>Tidsfaktor fastställs formellt av CMA/C OrgE — värdet här är planeringshjälp.</em></td></tr>';
    h += '</tbody></table>';
    return h;
  }

  // ── Export: komplett HTML-dokument (Word öppnar .doc med HTML-innehåll) ──
  function buildDocHtml(state) {
    return '<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8">' +
      '<title>Övningsplan</title><style>' +
      'body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#000}' +
      'table{border-collapse:collapse;width:100%}caption{font-weight:bold;letter-spacing:2px;padding:6px}' +
      'th,td{border:1px solid #000;padding:5px 7px;text-align:left;vertical-align:top}' +
      'th{background:#eee;width:26%}.op-momhead th{background:#ddd}' +
      '.op-tid{white-space:nowrap;font-weight:bold}.op-vad{font-weight:bold}.op-anm{font-style:italic;font-size:9pt}' +
      '</style></head><body>' + renderPlanTabell(state, { editable: false }) + '</body></html>';
  }

  // Sätt värde via data-edit-path ('grund.namn' / 'moment.3.hur' ...).
  // Returnerar true om något ändrades. Tid-cellen tolkas som heltal minuter.
  function settViaPath(state, path, varde) {
    const delar = String(path).split('.');
    // hasOwnProperty — '__proto__' m.fl. ärvda nycklar ska avvisas.
    if (delar[0] === 'grund' && delar.length === 2 &&
        Object.prototype.hasOwnProperty.call(state.grund, delar[1])) {
      state.grund[delar[1]] = varde;
      return true;
    }
    if (delar[0] === 'moment' && delar.length === 3) {
      const i = parseInt(delar[1], 10);
      const falt = delar[2];
      if (!state.moment[i] || ['min', 'vad', 'hur', 'anm'].indexOf(falt) === -1) return false;
      if (falt === 'min') {
        // Tolerant parsning: "5/25 (40)" → 25, "15 min" → 15, "9" → 9.
        // Hittas inget tal alls behålls föregående värde (radera inte tyst).
        const s = String(varde);
        const m = s.match(/\/\s*(\d+)/) || s.match(/(\d+)/);
        if (!m) return false;
        state.moment[i].min = m[1];
      } else {
        state.moment[i][falt] = varde;
      }
      return true;
    }
    return false;
  }

  global.OvnPass = {
    LS_KEY, RISKNIVAER, LEX_UTRUSTNING, LEX_DUKNING,
    defaultState, standardMoment, standardDukning,
    loadState, saveState, clearState,
    beraknaTider, totalTid, skalaMoment,
    hogstaRiskniva, riskFaktor, tFaktor, beredskap,
    arRubrik, extraheraForslag, applyForslag,
    esc, renderPlanTabell, buildDocHtml, settViaPath
  };
}(typeof window !== 'undefined' ? window : globalThis));
