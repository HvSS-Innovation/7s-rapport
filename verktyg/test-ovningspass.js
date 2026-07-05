// Smoke-test för ovningspass.js (v2 — dokument-först). Körs utanför PWA —
// laddar modulen i en VM med localStorage-stub.
//
// Kör: `node verktyg/test-ovningspass.js` från repo-roten.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..', 'ovningspass.js');

function newSandbox() {
  const ls = new Map();
  const localStorage = {
    getItem(k) { return ls.has(k) ? ls.get(k) : null; },
    setItem(k, v) { ls.set(k, String(v)); },
    removeItem(k) { ls.delete(k); },
    clear() { ls.clear(); }
  };
  const sandbox = { localStorage, console };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(SRC, 'utf8'), sandbox, { filename: 'ovningspass.js' });
  return sandbox;
}

let pass = 0, fail = 0;
function check(namn, ok, detalj) {
  if (ok) { pass++; console.log('  ✓ ' + namn); }
  else { fail++; console.error('  ✗ ' + namn + (detalj ? ' — ' + detalj : '')); }
}

const sb = newSandbox();
const OP = sb.OvnPass;

console.log('1. Standardmall');
const d = OP.defaultState();
check('mall finns färdig direkt', d.moment.length === 10 && d.langd === 45);
check('standardmomenten summerar till exakt 45 min', OP.totalTid(d.moment) === 45, 'fick ' + OP.totalTid(d.moment));
check('standarddukning förifylld och vald', d.dukning.length === 3 && d.dukning.every(x => x.vald));
check('risknivåskalan har 5 steg', OP.RISKNIVAER.length === 5);

console.log('2. Persistens');
d.grund.ovning = 'Terrängmodeller';
OP.saveState(d);
check('save/load-roundtrip', OP.loadState().grund.ovning === 'Terrängmodeller');
OP.clearState();
check('clearState nollställer', OP.loadState().grund.ovning === 'Övningspass');
sb.localStorage.setItem(OP.LS_KEY, '{trasig json');
check('trasig JSON ger default', OP.loadState().moment.length === 10);
sb.localStorage.setItem(OP.LS_KEY, JSON.stringify({ moment: [null, 'x'], risker: ['y'], langd: -5 }));
const korrupt = OP.loadState();
check('korrupta element filtreras, ogiltig längd → 45',
  korrupt.moment.length === 10 && korrupt.risker.length === 0 && korrupt.langd === 45);
sb.localStorage.setItem(OP.LS_KEY, JSON.stringify({ grund: JSON.parse('{"__proto__":{"x":1},"ovning":42,"namn":{"a":1}}'), bok: { valda: [1, 'x', -2, 3] } }));
const gift = OP.loadState();
check('allowlist-merge: __proto__ förgiftar inte, fel typ ignoreras/strängas',
  !('x' in gift.grund) && gift.grund.ovning === '42' && gift.grund.namn === '' &&
  JSON.stringify(gift.bok.valda) === '[1,3]');
OP.clearState();

console.log('3. Tider & skalning');
const st = OP.defaultState();
const tider = OP.beraknaTider(st.moment);
check('moment 0 utan ack', tider[0].ack === null);
check('ack löper från moment 1', tider[1].ack === 1 && tider[3].ack === 5);
OP.skalaMoment(st.moment, 90);
check('skalning till 90 min ger momentsumma 90', OP.totalTid(st.moment) === 90, 'fick ' + OP.totalTid(st.moment));
check('ramen ligger fast vid skalning', st.moment[1].min === '1' && st.moment[6].min === '3');
OP.skalaMoment(st.moment, 45);
check('skalning tillbaka till 45', OP.totalTid(st.moment) === 45, 'fick ' + OP.totalTid(st.moment));
OP.skalaMoment(st.moment, 5); // mindre än ramens fasta tid
check('för kort pass klampar flex till 0 (ingen negativ tid)',
  st.moment.filter(m => m.flex).every(m => parseInt(m.min, 10) === 0));
// Avrundningsfälla: flex-baser 3,3,3,1 med liten pott får inte överskrida summan.
const savr = { moment: [
  { min: '', vad: 'F', flex: false }, { min: '5', vad: 'fast', flex: false },
  { min: '3', vad: 'a', flex: true }, { min: '3', vad: 'b', flex: true },
  { min: '3', vad: 'c', flex: true }, { min: '1', vad: 'd', flex: true }
] };
OP.skalaMoment(savr.moment, 10); // pott = 5
check('skalning ger exakt summa även vid avrundningsdrift', OP.totalTid(savr.moment) === 10, 'fick ' + OP.totalTid(savr.moment));

console.log('4. Risk / T / beredskap');
check('högsta risknivå av flera', OP.hogstaRiskniva([{ niva: '1' }, { niva: '3' }, { niva: '0' }]) === 3);
check('inga risker → -1', OP.hogstaRiskniva([]) === -1);
check('nivå→R-mappning (verifierade ändpunkter)',
  OP.riskFaktor(0) === null && OP.riskFaktor(1) === 'R1' && OP.riskFaktor(3) === 'R3' && OP.riskFaktor(4) === 'STOPP');
check('T1 kräver sjukhus ≤20 min', OP.tFaktor('', '15') === 'T1');
check('sjukhus styr T — nära vårdcentral ger inte T1', OP.tFaktor('15', '45') === 'T2');
check('T2 vid sjukhus ≤120 min', OP.tFaktor('', '90') === 'T2');
check('T3 därutöver', OP.tFaktor('180', '240') === 'T3');
check('enbart vårdcentral ger aldrig bättre än T2', OP.tFaktor('10', '') === 'T2');
check('ingen restid → null', OP.tFaktor('', '') === null);
check('R1+T1 → ingen beredskap', OP.beredskap('R1', 'T1').indexOf('Ingen särskild') === 0);
check('R3+T3 → höjd', OP.beredskap('R3', 'T3').indexOf('HÖJD') === 0);
check('R2+T1 → grundberedskap', OP.beredskap('R2', 'T1').indexOf('Grundberedskap') === 0);
check('STOPP blockerar', OP.beredskap('STOPP', 'T1').indexOf('får inte bedrivas') !== -1);

console.log('5. Generator (regelstyrd)');
const boktext = 'TERRÄNGMODELLER\nEn handledning för instruktörer.\nBygga grunden\n' +
  'Använd karta och kompass för orientering. Snitselband markerar vatten.\n' +
  'Terrängbyggnad\nMossa blir skog. Använd sandlåda vid genomgångsplats och tavla.\n' +
  'sid 12\n1943\nDetta är en väldigt lång rad som absolut inte ska tolkas som någon rubrik eftersom den har alldeles för många ord i sig.';
const forslag = OP.extraheraForslag([boktext]);
check('titel = första rubriken', forslag.titel === 'TERRÄNGMODELLER', forslag.titel);
check('rubriker hittas', forslag.momentForslag.indexOf('Bygga grunden') !== -1 && forslag.momentForslag.indexOf('Terrängbyggnad') !== -1);
check('sidnummer/årtal/långa rader är inte rubriker',
  forslag.momentForslag.indexOf('sid 12') === -1 && forslag.momentForslag.indexOf('1943') === -1 &&
  forslag.momentForslag.every(r => r.split(/\s+/).length <= 8));
check('utrustning ur lexikon', forslag.utrustning.indexOf('Karta') !== -1 && forslag.utrustning.indexOf('Kompass') !== -1 && forslag.utrustning.indexOf('Snitselband') !== -1);
check('dukning ur lexikon', forslag.dukning.indexOf('Sandlåda') !== -1 && forslag.dukning.indexOf('Tavla') !== -1);

console.log('6. applyForslag (idempotent vid omgenerering)');
const s2 = OP.defaultState();
s2.utrustning.push({ text: 'Egen grej', vald: true, gen: false });
OP.applyForslag(s2, forslag, 'Handbok Terräng');
check('övningsnamn från titeln', s2.grund.ovning === 'TERRÄNGMODELLER');
check('hänvisning = bokens titel', s2.grund.hanvisning === 'Handbok Terräng');
check('genererade moment inlagda före Utvärdera',
  s2.moment.some(m => m.gen && m.vad === 'Bygga grunden') &&
  s2.moment.findIndex(m => m.vad === 'Bygga grunden') < s2.moment.findIndex(m => m.vad === 'Utvärdera mot målet'));
check('orörda flex-placeholders borttagna', !s2.moment.some(m => m.vad === 'Genomgång / teori'));
check('momentsumman håller passlängden efter generering', OP.totalTid(s2.moment) === 45, 'fick ' + OP.totalTid(s2.moment));
const antalMoment = s2.moment.length;
const antalUtr = s2.utrustning.length;
OP.applyForslag(s2, forslag, 'Handbok Terräng');
check('omgenerering dubblerar inget', s2.moment.length === antalMoment && s2.utrustning.length === antalUtr);
check('egna rader överlever omgenerering', s2.utrustning.some(u => u.text === 'Egen grej'));
const tomt = OP.extraheraForslag(['']);
OP.applyForslag(s2, tomt, '');
check('tomt sidval rensar genererat men rör inte ramen',
  !s2.moment.some(m => m.gen) && s2.moment.some(m => m.vad === 'Tagande av befälet') && s2.utrustning.some(u => u.text === 'Egen grej'));
check('tomt sidval återinsätter placeholders — planen kollapsar aldrig till bara ramen',
  s2.moment.some(m => m.flex) && OP.totalTid(s2.moment) === 45, 'fick ' + OP.totalTid(s2.moment));
const s2b = OP.defaultState();
OP.applyForslag(s2b, forslag, 'Bok A');
const forslagB = OP.extraheraForslag(['NY RUBRIK B\nInnehåll om karta.']);
OP.applyForslag(s2b, forslagB, 'Bok B');
check('genererad titel/hänvisning följer nytt sidval',
  s2b.grund.ovning === 'NY RUBRIK B' && s2b.grund.hanvisning === 'Bok B');
s2b.grund.ovning = 'Mitt eget namn'; s2b.grund.ovningGen = false;
OP.applyForslag(s2b, forslagB, 'Bok B');
check('användarsatt övningsnamn skrivs inte över', s2b.grund.ovning === 'Mitt eget namn');

console.log('7. Tabellrendering & export');
const s3 = OP.defaultState();
s3.grund.namn = 'Anders Andersson';
s3.grund.ovning = '<script>alert(1)</script>';
s3.grund.mal = 'Eleven ska i grupp kunna bygga en terrängmodell.';
s3.risker.push({ beskrivning: 'Joggare på spåret', niva: '1', atgard: 'Bevaka' });
s3.sjukvard = { vardcentral: 'VC', vcMin: '10', sjukhus: 'SjH', shMin: '35' };
const html = OP.renderPlanTabell(s3, { editable: true });
check('XSS escapas', html.indexOf('<script>alert') === -1 && html.indexOf('&lt;script&gt;') !== -1);
check('editable ger data-edit', html.indexOf('data-edit="grund.mal"') !== -1);
check('print-läget saknar data-edit', OP.renderPlanTabell(s3, { editable: false }).indexOf('data-edit') === -1);
check('risk + R×T in i planen', html.indexOf('R1 × T2') !== -1 && html.indexOf('Joggare') !== -1);
const htmlOrord = OP.renderPlanTabell(OP.defaultState(), { editable: false });
check('orörd riskbedömning ger fail-safe-varning, inte friande text',
  htmlOrord.indexOf('RISKBEDÖMNING EJ GENOMFÖRD') !== -1 && htmlOrord.indexOf('inget behov av sjukvårdsberedskap') === -1);
check('vald utrustning/dukning visas', html.indexOf('Materiel framtagen och kontrollerad') !== -1);
const doc = OP.buildDocHtml(s3);
check('Word-dokumentet är komplett HTML', doc.indexOf('<!DOCTYPE html>') === 0 && doc.indexOf('ÖVNINGSPLAN') !== -1);

console.log('8. settViaPath (redigerbara celler)');
const s4 = OP.defaultState();
check('grund-fält', OP.settViaPath(s4, 'grund.namn', 'Bengt Bengtsson') && s4.grund.namn === 'Bengt Bengtsson');
check('moment-hur', OP.settViaPath(s4, 'moment.2.hur', 'Nytt manus') && s4.moment[2].hur === 'Nytt manus');
check('tid-cell "4/7 (12)" tolkas som 7 min', OP.settViaPath(s4, 'moment.4.min', '4/7 (12)') && s4.moment[4].min === '7');
check('tid-cell "9" tolkas som 9 min', OP.settViaPath(s4, 'moment.5.min', '9') && s4.moment[5].min === '9');
check('tid-cell "15 min" tolkas som 15', OP.settViaPath(s4, 'moment.5.min', '15 min') && s4.moment[5].min === '15');
check('tid-cell utan siffror behåller gamla värdet', !OP.settViaPath(s4, 'moment.5.min', 'abc') && s4.moment[5].min === '15');
check('okänd path avvisas', !OP.settViaPath(s4, 'grund.__proto__', 'x') && !OP.settViaPath(s4, 'moment.99.vad', 'x'));

console.log('');
console.log(pass + ' godkända, ' + fail + ' underkända');
process.exit(fail ? 1 : 0);
