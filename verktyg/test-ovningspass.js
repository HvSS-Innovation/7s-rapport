// Smoke-test för ovningspass.js. Körs utanför PWA — laddar modulen i en VM
// med localStorage-stub. Inte en del av appens runtime.
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

console.log('1. Grundläggande API');
check('OvnPass exponeras', !!OP);
check('22 metoder i katalogen', OP.METODER.length === 22, 'fick ' + OP.METODER.length);
check('kunskapstrappan har 3 nivåer', OP.KUNSKAPSNIVAER.length === 3);

console.log('2. State-persistens');
const d = OP.defaultState();
check('defaultState har standardram', d.moment.length === 8);
check('tom localStorage ger default', OP.loadState().moment.length === 8);
d.grund.ovning = 'Terrängmodeller';
OP.saveState(d);
check('save/load-roundtrip', OP.loadState().grund.ovning === 'Terrängmodeller');
OP.clearState();
check('clearState nollställer', OP.loadState().grund.ovning === '');
const trasig = '{invalid json';
sb.localStorage.setItem(OP.LS_KEY, trasig);
check('trasig JSON ger default (ingen throw)', OP.loadState().moment.length === 8);
sb.localStorage.setItem(OP.LS_KEY, JSON.stringify({ mal: [null, 'x'], moment: ['y'] }));
const korrupt = OP.loadState();
check('korrupta list-element filtreras (sidan låser sig inte)',
  korrupt.mal.length === 1 && typeof korrupt.mal[0] === 'object' && korrupt.moment.length === 8);
OP.clearState();

console.log('3. Målformeln');
const mal = { vem: 'Eleven', forhallanden: 'i grupp', niva: 'kunna', prestation: 'bygga en terrängmodell', kriterium: 'med minst två UPK', tillampning: 'kunna nyttja den som gruppchef' };
check('förlagans mål återskapas',
  OP.buildMalMening(mal) === 'Eleven ska i grupp kunna bygga en terrängmodell med minst två UPK för att kunna nyttja den som gruppchef.',
  OP.buildMalMening(mal));
check('tomt mål ger tom sträng', OP.buildMalMening({}) === '');
check('default-målet (vem+nivå utan prestation) ger tom sträng — ingen "Eleven ska kunna."',
  OP.buildMalMening(OP.defaultState().mal[0]) === '');
check('whitespace trimmas', OP.buildMalMening({ vem: '  Soldaten  ', niva: ' kunna ', prestation: ' larma ' }) === 'Soldaten ska kunna larma.');
const st = OP.defaultState();
st.mal = [mal];
st.syfte = 'För att underlätta ordergivning.';
check('mål+syfte-text byggs', OP.buildMalSyfteText(st).indexOf('MÅL: Eleven ska') === 0 && OP.buildMalSyfteText(st).indexOf('SYFTE: För att') > 0);

console.log('4. Tidsberäkning (förlagans mönster)');
const moment = [
  { min: '30', vad: 'Förberedelser', hur: '', anm: '', metod: '' },
  { min: '1', vad: 'Tagande av befälet', hur: '', anm: '', metod: '' },
  { min: '0', vad: 'Övningsgenomgång', hur: '', anm: '', metod: '' },
  { min: '0', vad: 'Säkerhetsgenomgång', hur: 'Delge bestämmelser', anm: '', metod: '' },
  { min: '2', vad: 'Målbild', hur: '', anm: '', metod: '' },
  { min: '', vad: 'Omfall', hur: '', anm: '', metod: '' },
  { min: '25', vad: 'Grupparbete', hur: '', anm: '', metod: 'Grupparbete' }
];
const tider = OP.beraknaTider(moment);
check('moment 0 utan ack', tider[0].ack === null && tider[0].min === 30);
check('mom 4 ack = 3 (förlagans "(3)")', tider[4].ack === 3, 'fick ' + tider[4].ack);
check('moment utan tid → ack null', tider[5].ack === null && tider[5].min === null);
check('ack fortsätter efter tomt moment', tider[6].ack === 28, 'fick ' + tider[6].ack);
check('totalTid exkluderar mom 0', OP.totalTid(moment) === 28, 'fick ' + OP.totalTid(moment));

console.log('5. Disposition');
const dispo = OP.buildDisposition(moment);
check('mom 0 utelämnas', dispo[0] === '1. Tagande av befälet', dispo[0]);
check('rätt antal rader', dispo.length === 6, 'fick ' + dispo.length);
check('tomt VAD hoppas över', OP.buildDisposition([{ vad: 'Förb' }, { vad: '' }, { vad: 'A' }]).length === 1);

console.log('6. DTG');
check('giltig DTG parsas', OP.parseDtg('221700') === 22 * 1440 + 17 * 60);
check('ogiltig DTG → null', OP.parseDtg('229900') === null && OP.parseDtg('abc') === null && OP.parseDtg('') === null);
check('duration 221700→221745 = 45', OP.dtgDuration('221700', '221745') === 45);
check('duration över dygnsgräns', OP.dtgDuration('222300', '230100') === 120);
check('negativ duration → null', OP.dtgDuration('221745', '221700') === null);

console.log('7. Validering');
const vs = OP.defaultState();
vs.mal = [{}];
vs.moment = moment.map(m => Object.assign({}, m));
vs.grund.duration = '45';
vs.grund.tidStart = '221700';
vs.grund.tidSlut = '221745';
let w = OP.validera(vs);
check('varnar: momentsumma ≠ duration', w.some(x => x.indexOf('summerar till 28') !== -1), JSON.stringify(w));
check('varnar: inget mål', w.some(x => x.indexOf('Inget mål') !== -1));
check('varnar INTE på ifylld säkerhetsgenomgång', !w.some(x => x.indexOf('Säkerhetsgenomgången') !== -1));
vs.moment[3].hur = '';
vs.mal = [{ vem: 'Eleven', niva: 'kunna', prestation: 'x' }];
vs.grund.duration = '28';
vs.grund.tidSlut = '221728';
w = OP.validera(vs);
check('ok state ger inga mål/summa-varningar men flaggar tom säkerhetsgenomgång',
  w.length === 1 && w[0].indexOf('Säkerhetsgenomgången') !== -1, JSON.stringify(w));
vs.grund.tidSlut = '99';
w = OP.validera(vs);
check('ingen DTG-varning under pågående inmatning (<6 tecken)', !w.some(x => x.indexOf('tolka DTG') !== -1));
vs.grund.tidSlut = '229999';
w = OP.validera(vs);
check('varnar: otolkbar komplett DTG', w.some(x => x.indexOf('tolka DTG') !== -1));

console.log('8. Metoder ur moment');
check('dedupe + ordning', JSON.stringify(OP.metoderIMoment([
  { metod: 'Bikupa' }, { metod: '' }, { metod: 'Grupparbete' }, { metod: 'Bikupa' }
])) === JSON.stringify(['Bikupa', 'Grupparbete']));

console.log('9. Rendering (print)');
const rs = OP.defaultState();
rs.grund.namn = 'Anders Andersson';
rs.grund.ovning = '<script>alert(1)</script>';
rs.mal = [mal];
rs.syfte = 'För att underlätta ordergivning.';
const html = OP.renderPlanHtml(rs);
check('XSS escapas', html.indexOf('<script>alert') === -1 && html.indexOf('&lt;script&gt;') !== -1);
check('sidhuvud med namn', html.indexOf('Namn Anders Andersson') !== -1);
check('MÅL+SYFTE-token ersätts i moment', html.indexOf(OP.MALSYFTE_TOKEN) === -1 && html.split('MÅL: Eleven ska').length >= 3);
check('momenttabell med thead', html.indexOf('Genomförande (HUR)') !== -1);
check('ingen verktygs-metatext i utskriften', html.indexOf('kommer i nästa version') === -1);
check('metoder autofylls i faktarutan', OP.renderPlanHtml(Object.assign({}, rs, { moment: [{ min: '', vad: 'x', hur: '', anm: '', metod: 'Bikupa' }] })).indexOf('Bikupa') !== -1);

console.log('');
console.log(pass + ' godkända, ' + fail + ' underkända');
process.exit(fail ? 1 : 0);
