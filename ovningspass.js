// ovningspass.js — ren logik för Övningspass (övningsplanering för instruktörer).
// Ingen DOM-åtkomst här utöver localStorage-wrappern — allt testbart i vm-sandbox
// (se verktyg/test-ovningspass.js). UI:t bor i ovningspass.html.
//
// Terminologi ur underlaget: H UtbM 2013 (övningsplanens struktur, mål­formel,
// metodkatalog) + TU3-kurspraxis (kunskapstrappan känna till/kunna/behärska).
// Verktyget är privatutvecklat och inte fastställt av Försvarsmakten.

(function (global) {
  'use strict';

  const LS_KEY = 'ovnpass_state';

  // ── Metodkatalog (H UtbM kap 4 — namnen, definitioner kommer i senare version) ──
  const METODER = [
    'Målbildsövning', 'Förmedling', 'Visa, instruera, öva, öva, pröva', 'Drill',
    'Föreläsning', 'Föredrag', 'Förevisning', 'Studiebesök', 'Lektion',
    'Enskild övning', 'Parövning', 'Samfälld övning', 'Nätbaserad metod',
    'Självstudier', 'Bikupa', 'Grupparbete', 'Problemlösning',
    'Muntlig stridsövning (MUS)', 'Kaderövning', 'Spika, måla, reka',
    'Stationsövning', 'Kombinerad metod'
  ];

  // Kunskapstrappan är TU-kurspraxis (EJ belagd i H UtbM) — märks så i UI.
  const KUNSKAPSNIVAER = ['känna till', 'kunna', 'behärska'];

  // Token som i standardmomentens HUR ersätts med aktuellt mål+syfte vid
  // rendering — single-source-principen (förlagan upprepar orden ordagrant
  // på tre ställen).
  const MALSYFTE_TOKEN = '{{MÅL+SYFTE}}';

  // ── Standardmomentram (förlagans fasta truppföringsram, redigerbar i UI) ──
  function standardMoment() {
    return [
      { min: '', vad: 'Förberedelser', hur: '', anm: 'Räknas inte in i passets tid', metod: '' },
      { min: '1', vad: 'Tagande av befälet', hur: '"Gruppchefen!" — grpc ställer upp gruppen.\n"Lämna av!"\n"Jag tar befälet." — "Manöver!"\nPresentera dig och passets längd.', anm: '', metod: '' },
      { min: '0', vad: 'Övningsgenomgång', hur: MALSYFTE_TOKEN, anm: 'Mål och syfte fylls i automatiskt', metod: '' },
      { min: '0', vad: 'Säkerhetsgenomgång', hur: '', anm: '', metod: '' },
      { min: '1', vad: 'Utvärdera övn. / Målet', hur: MALSYFTE_TOKEN + '\nKvittera mot målet — är det uppfyllt?', anm: 'Mål och syfte fylls i automatiskt', metod: '' },
      { min: '1', vad: 'Återlämna materiel', hur: 'Kontrollera skräp, återställ platsen.', anm: '', metod: '' },
      { min: '0', vad: 'Nästa plats/tid', hur: 'Delge nästa tid, plats och instruktör.', anm: '', metod: '' },
      { min: '1', vad: 'Återlämnande av befälet', hur: '"Gruppchefen!" — grpc tar befälet och genomför fortsatt verksamhet.', anm: '', metod: '' }
    ];
  }

  // Index (0-baserat i momentlistan) där egna moment infogas som default:
  // efter Säkerhetsgenomgång, före Utvärdera-blocket.
  const INSERT_BEFORE_VAD = 'Utvärdera övn. / Målet';

  function defaultState() {
    return {
      grund: {
        namn: '', datum: '',       // sidhuvud (datum default sätts av UI till idag)
        ovning: '', omfattning: '',
        ovningsledare: '', mobil: '', handledare: '',
        trupp: '', tidStart: '', tidSlut: '', duration: '',
        plats: '', utrustning: '', standpunkt: '',
        utvarderingsmetoder: '', bestammelser: '', bitrade: '',
        hanvisning: '', ovrigt: ''
      },
      mal: [{ vem: 'Eleven', forhallanden: '', niva: 'kunna', prestation: '', kriterium: '', tillampning: '' }],
      syfte: '',
      krav: '',
      moment: standardMoment()
    };
  }

  // ── State-persistens (localStorage med try/catch — privat läge kan throwa) ──
  function loadState() {
    try {
      const raw = global.localStorage.getItem(LS_KEY);
      if (!raw) return defaultState();
      const s = JSON.parse(raw);
      // Grunda ihop med default så nya fält i framtida versioner inte saknas.
      // Filtrera bort poster som inte är objekt (versionsdrift/korrupt state)
      // så init-renderingen aldrig kastar och låser hela sidan.
      const d = defaultState();
      const arrObj = (a) => Array.isArray(a) ? a.filter(x => x && typeof x === 'object') : [];
      const mal = arrObj(s.mal);
      const moment = arrObj(s.moment);
      return {
        grund: Object.assign(d.grund, s.grund || {}),
        mal: mal.length ? mal : d.mal,
        syfte: typeof s.syfte === 'string' ? s.syfte : '',
        krav: typeof s.krav === 'string' ? s.krav : '',
        moment: moment.length ? moment : d.moment
      };
    } catch (_) { return defaultState(); }
  }
  function saveState(state) {
    try { global.localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (_) {}
  }
  function clearState() {
    try { global.localStorage.removeItem(LS_KEY); } catch (_) {}
  }

  // ── Målformeln: [Vem] ska [förhållanden] [nivå] [prestation] [kriterium]
  //    för att [tillämpning]. Tomma led hoppas över, dubbla mellanslag städas. ──
  function buildMalMening(mal) {
    const t = (s) => String(s || '').trim();
    // Utan prestation finns inget mål — annars blir default-statet
    // nonsensmeningen "Eleven ska kunna." i utskriften.
    if (!t(mal.prestation)) return '';
    const delar = [];
    if (t(mal.vem)) delar.push(t(mal.vem), 'ska');
    if (t(mal.forhallanden)) delar.push(t(mal.forhallanden));
    if (t(mal.niva)) delar.push(t(mal.niva));
    if (t(mal.prestation)) delar.push(t(mal.prestation));
    if (t(mal.kriterium)) delar.push(t(mal.kriterium));
    if (t(mal.tillampning)) delar.push('för att', t(mal.tillampning));
    if (!delar.length) return '';
    let mening = delar.join(' ').replace(/\s+/g, ' ').trim();
    if (!/[.!?]$/.test(mening)) mening += '.';
    return mening;
  }

  function buildMalText(state) {
    return state.mal.map(buildMalMening).filter(Boolean).join('\n');
  }

  // Text som ersätter MALSYFTE_TOKEN i moment-HUR.
  function buildMalSyfteText(state) {
    const mal = buildMalText(state);
    const syfte = String(state.syfte || '').trim();
    const rader = [];
    if (mal) rader.push('MÅL: ' + mal);
    if (syfte) rader.push('SYFTE: ' + syfte);
    return rader.join('\n');
  }

  // ── Tidsberäkning: ack-tid per moment. Moment 0 (Förberedelser) räknas
  //    inte in — förlagans '(3)' efter mom 1+2+3+4 bekräftar det. ──
  function beraknaTider(moment) {
    let ack = 0;
    return moment.map((m, i) => {
      const min = parseInt(String(m.min).trim(), 10);
      const harTid = Number.isFinite(min) && min >= 0;
      if (i === 0) {
        return { nr: 0, min: harTid ? min : null, ack: null };
      }
      if (harTid) ack += min;
      return { nr: i, min: harTid ? min : null, ack: harTid ? ack : null };
    });
  }

  function totalTid(moment) {
    const tider = beraknaTider(moment);
    let max = 0;
    tider.forEach(t => { if (t.nr > 0 && t.ack !== null) max = t.ack; });
    return max;
  }

  // ── Disposition: numrerad lista ur momentens VAD (moment 0 utelämnas,
  //    som i förlagan där dispositionen börjar på Tagande av befälet). ──
  function buildDisposition(moment) {
    return moment
      .map((m, i) => ({ i, vad: String(m.vad || '').trim() }))
      .filter(x => x.i > 0 && x.vad)
      .map((x, ordning) => (ordning + 1) + '. ' + x.vad);
  }

  // ── DTG DDHHMM: parsning + duration. Returnerar null vid ogiltigt format. ──
  function parseDtg(s) {
    const m = /^(\d{2})(\d{2})(\d{2})$/.exec(String(s || '').trim());
    if (!m) return null;
    const dag = +m[1], h = +m[2], min = +m[3];
    if (dag < 1 || dag > 31 || h > 23 || min > 59) return null;
    return dag * 1440 + h * 60 + min;
  }

  // Duration i minuter mellan två DTG (antar samma månad; slut >= start).
  function dtgDuration(start, slut) {
    const a = parseDtg(start), b = parseDtg(slut);
    if (a === null || b === null) return null;
    const diff = b - a;
    return diff >= 0 ? diff : null;
  }

  // Konsistenscheck: momentsumma vs angiven duration vs DTG-intervall.
  // Returnerar lista av varningstexter (tom = allt ok).
  function validera(state) {
    const varningar = [];
    const g = state.grund;
    const sum = totalTid(state.moment);
    const dur = parseInt(String(g.duration).trim(), 10);

    if (Number.isFinite(dur) && sum > 0 && sum !== dur) {
      varningar.push('Momenten summerar till ' + sum + ' min men passets längd är satt till ' + dur + ' min.');
    }
    // DTG-varningar först när båda fälten är kompletta (6 tecken) — annars
    // blinkar formatfelet på varje tangenttryck under inmatning.
    const tsKlar = String(g.tidStart || '').trim().length === 6;
    const teKlar = String(g.tidSlut || '').trim().length === 6;
    if (tsKlar && teKlar) {
      const d = dtgDuration(g.tidStart, g.tidSlut);
      if (d === null) {
        varningar.push('Tid: kunde inte tolka DTG-intervallet (format DDHHMM, slut efter start).');
      } else if (Number.isFinite(dur) && d !== dur) {
        varningar.push('DTG-intervallet är ' + d + ' min men passets längd är satt till ' + dur + ' min.');
      }
    }
    const sakerhets = state.moment.find(m => /^säkerhetsgenomgång/i.test(String(m.vad).trim()));
    if (sakerhets && !String(sakerhets.hur).trim()) {
      varningar.push('Säkerhetsgenomgången är tom — delge säkerhetsbestämmelser och hur sjukvård tillkallas (SÄkR-krav).');
    }
    if (!buildMalText(state)) {
      varningar.push('Inget mål formulerat — mål + riskanalys är minimikravet även vid kort förberedelsetid (H UtbM).');
    }
    return varningar;
  }

  // Autofyll av "Utbildningsmetoder" (sida 1) ur momentens metodval.
  function metoderIMoment(moment) {
    const set = [];
    moment.forEach(m => {
      const v = String(m.metod || '').trim();
      if (v && set.indexOf(v) === -1) set.push(v);
    });
    return set;
  }

  // ── HTML-escape för all användardata i print-rendering ──
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function escMultiline(s) {
    return esc(s).replace(/\n/g, '<br>');
  }

  // ── Print-rendering: bygger övningsplanens HTML (sidhuvud + faktaruta +
  //    mål/syfte/disposition + momenttabell). Bilagor kommer i v0.2. ──
  function renderPlanHtml(state) {
    const g = state.grund;
    const malSyfte = buildMalSyfteText(state);
    const tider = beraknaTider(state.moment);
    const metoder = metoderIMoment(state.moment);

    const fakta = [
      ['Övning', g.ovning],
      ['Omfattning', g.omfattning],
      ['Övningsledare', [g.ovningsledare, g.mobil && ('mobil ' + g.mobil)].filter(Boolean).join(' ')],
      ['Handledare', g.handledare],
      ['Övningstrupp', g.trupp],
      ['Tid', [g.tidStart, g.tidSlut].filter(Boolean).join('–') + (g.duration ? ' (' + g.duration + ' min)' : '')],
      ['Plats', g.plats],
      ['Utrustning', g.utrustning],
      ['Utbildningsståndpunkt', g.standpunkt],
      ['Utbildningsmetoder', metoder.join(' / ')],
      ['Utvärderingsmetoder', g.utvarderingsmetoder],
      ['Riskhantering', ''],
      ['Övnings- och säkerhetsbestämmelser', g.bestammelser],
      ['Order till biträdet', g.bitrade],
      ['Hänvisning', g.hanvisning],
      ['Övrigt', g.ovrigt]
    ];

    let html = '';
    // Sidhuvud (utan FM-vapen — medvetet beslut, skyddat statsemblem).
    html += '<div class="pp-head"><span>Namn ' + esc(g.namn) + '</span><span class="pp-head-title">ÖVNINGSPLAN</span><span>Datum ' + esc(g.datum) + '</span></div>';

    html += '<table class="pp-fakta"><tbody>';
    fakta.forEach(row => {
      html += '<tr><th>' + esc(row[0]) + '</th><td>' + escMultiline(row[1]) + '</td></tr>';
    });
    html += '</tbody></table>';

    html += '<table class="pp-malruta"><tbody>';
    html += '<tr><th>MÅL</th><td>' + escMultiline(buildMalText(state)) + '</td></tr>';
    html += '<tr><th>SYFTE</th><td>' + escMultiline(state.syfte) + '</td></tr>';
    html += '<tr><th>KRAV</th><td>' + escMultiline(state.krav || '-') + '</td></tr>';
    html += '</tbody></table>';

    const dispo = buildDisposition(state.moment);
    html += '<div class="pp-dispo"><h3>Disposition</h3><ol>' +
      dispo.map(d => '<li>' + esc(d.replace(/^\d+\.\s*/, '')) + '</li>').join('') +
      '</ol></div>';

    html += '<table class="pp-moment"><thead><tr><th>Mom./Tid (total)</th><th>Omfattning (VAD)</th><th>Genomförande (HUR)</th><th>Anmärkningar</th></tr></thead><tbody>';
    state.moment.forEach((m, i) => {
      const t = tider[i];
      const tidCell = t.min === null ? String(t.nr) + '/' :
        t.nr === 0 ? '0/' + t.min : t.nr + '/' + t.min + '<br>(' + t.ack + ')';
      const hur = String(m.hur || '').split(MALSYFTE_TOKEN).map(esc).join(escMultiline(malSyfte)).replace(/\n/g, '<br>');
      html += '<tr><td class="pp-tid">' + tidCell + '</td><td>' + escMultiline(m.vad) + '</td><td>' + hur + '</td><td>' + escMultiline(m.anm) + '</td></tr>';
    });
    html += '</tbody></table>';

    return html;
  }

  const api = {
    LS_KEY, METODER, KUNSKAPSNIVAER, MALSYFTE_TOKEN, INSERT_BEFORE_VAD,
    defaultState, standardMoment, loadState, saveState, clearState,
    buildMalMening, buildMalText, buildMalSyfteText,
    beraknaTider, totalTid, buildDisposition,
    parseDtg, dtgDuration, validera, metoderIMoment,
    esc, renderPlanHtml
  };

  global.OvnPass = api;
}(typeof window !== 'undefined' ? window : globalThis));
