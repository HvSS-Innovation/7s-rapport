/* RA763-data — minneskort + provfrågor för upprättning av RA763 (telefoni + swALE).
   Källa: FRO Checklista RA763_swALE v1.0.
   Inte fastställt av FM. Repetitions-/utbildningssyfte.
*/
window.RA763_DATA = {
  meta: {
    title: 'RA763',
    subtitle: 'Upprätta & bryt — rattvärden & sekvens',
    source: 'FRO Checklista RA763_swALE v1.0'
  },

  cards: [
    /* ─── Vredinställningar (start) ─── */
    { id: 'sql', category: 'Vredinställningar', front: 'SQL-vred — startläge', back: 'Längst till vänster' },
    { id: 'vol', category: 'Vredinställningar', front: 'VOL-vred — startläge', back: 'Ca 35 %' },
    { id: 'rit', category: 'Vredinställningar', front: 'RIT-vred — startläge', back: 'Mitten' },
    { id: 'mic', category: 'Vredinställningar', front: 'MIC-vred — startläge', back: 'Mitten' },
    { id: 'rfpwr', category: 'Vredinställningar', front: 'RF PWR — startläge', back: 'Längst till vänster\n\n(Vi använder alltid minsta möjliga effekt för att nå tänkt motstation.)' },
    { id: 'mick-kanslighet', category: 'Vredinställningar', front: 'Mikrofon-känslighet (vred under mick)', back: 'Mitten' },

    /* ─── Menyer ─── */
    { id: 'meny5', category: 'Menyer', front: 'MENY 5 (CIV-AD)', back: '3EH AD\n\n(Tryck TS för att byta meny.)' },
    { id: 'meny6', category: 'Menyer', front: 'MENY 6 (Baudrate)', back: '9600' },

    /* ─── Display vid telefoni ─── */
    { id: 'disp-rit', category: 'Display — telefoni', front: 'Display: RIT', back: 'AV' },
    { id: 'disp-mode', category: 'Display — telefoni', front: 'Display: MODE', back: 'USB' },
    { id: 'disp-nb', category: 'Display — telefoni', front: 'Display: NB', back: 'AV' },
    { id: 'disp-preamp', category: 'Display — telefoni', front: 'Display: PRE AMP', back: 'AV' },
    { id: 'disp-att', category: 'Display — telefoni', front: 'Display: ATT', back: 'AV' },

    /* ─── Uppstart-sekvens ─── */
    { id: 'uppstart-strom', category: 'Uppstart', front: 'Vad kontrolleras AVSTÄNGT innan något ansluts?', back: '1. Strömställare PSU\n2. Strömställare RADIO' },
    { id: 'uppstart-anslut', category: 'Uppstart', front: 'Anslutningsordning (efter avstängningskontroll)', back: '1. Antennkabel från antennen\n2. PSU strömkabel i radion\n3. Strömkabel till PSU i eluttag\n4. Mikrofon' },
    { id: 'uppstart-pa-ordning', category: 'Uppstart', front: 'Påslagning — i vilken ordning?', back: '1. Strömställare PSU: PÅ\n2. TS+LOCK intryckt, sedan Strömställare RADIO: PÅ' },
    { id: 'oras', category: 'Uppstart', front: 'O.R.A.S.', back: 'Ordning – Reda – Ansvar – Stil' },

    /* ─── Bryt-sekvens ─── */
    { id: 'bryt-strom', category: 'Bryt', front: 'Bryt — strömställarnas avstängningsordning', back: '1. Strömställare RA763: AV\n2. Strömställare PSU: AV' },
    { id: 'bryt-koppla', category: 'Bryt', front: 'Bryt — kabel-bortkopplingsordning', back: '1. Strömkabel till PSU\n2. PSU strömkabel i radion\n3. Mikrofon\n4. Antennkabel från radion\n5. Antenn + antennkabel' },

    /* ─── Uthämtning & återlämning ─── */
    { id: 'uthamtning', category: 'Materielhantering', front: 'Vid uthämtning materiel', back: '1. Inventera lådan enligt packplan\n2. Rapportera/ersätt fel & saknad mtrl' },
    { id: 'aterlamning', category: 'Materielhantering', front: 'Vid återlämning materiel', back: '1. Skriv & applicera felrapport\n2. Rapportera till högre chef' },
    { id: 'rfpwr-anv', category: 'Materielhantering', front: 'RF PWR vid användning', back: 'Justera enligt behov/order.\n\nKontrollera på display vid sändning: uteffekt som förväntad.' },

    /* ─── swALE ─── */
    { id: 'swale-koppla', category: 'swALE', front: 'swALE — kablage 3.5 mm tele kopplas till radion på?', back: 'HÖGER TELE / REMOTE' },
    { id: 'swale-din', category: 'swALE', front: 'swALE — DIN-plugg kopplas till radion på?', back: 'HÖGER DIN / ACC 1' },
    { id: 'swale-mick', category: 'swALE', front: 'swALE — vad görs med mikrofonen?', back: 'Kopplas bort innan swALE-kablage ansluts.' },
    { id: 'swale-dda', category: 'swALE', front: 'swALE — DDA-DART konfiguration', back: 'Anropssignal' },
    { id: 'swale-anslutningar', category: 'swALE', front: 'swALE — DDA Anslutningar', back: 'SWALE\n+ korrekt komport' },
    { id: 'swale-txtune', category: 'swALE', front: 'swALE — TX TUNE TIME', back: '500 ms' },
    { id: 'swale-wait', category: 'swALE', front: 'swALE — WAIT FOR REPLY TIME', back: '2000 ms' },
    { id: 'swale-sounding', category: 'swALE', front: 'swALE — SOUNDING INTERVAL', back: 'EJ IKRYSSAD' },
    { id: 'swale-amd', category: 'swALE', front: 'swALE — RESPOND TO AMD HANDSHAKES', back: 'EJ IKRYSSAD' },
    { id: 'swale-detection', category: 'swALE', front: 'swALE — ALE DETECTION', back: 'IGNORE CALLS TO OTHER STATIONS' },
    { id: 'swale-propagation', category: 'swALE', front: 'swALE — PROPAGATION', back: 'UPPDATERADE MUF FQ' },
    { id: 'swale-radiotype', category: 'swALE', front: 'swALE — RADIO TYPE', back: 'RA763' },
    { id: 'swale-autofill', category: 'swALE', front: 'swALE — AUTOFIL RECEIVED STATIONS', back: 'EJ IKRYSSAD' }
  ],

  exam: [
    { q: 'Vilket startläge ska SQL-vredet ha?',
      options: ['Mitten', 'Längst till vänster', 'Längst till höger', 'Ca 35 %'], correct: 1 },
    { q: 'Vilket startläge ska VOL-vredet ha?',
      options: ['Längst till vänster', 'Mitten', 'Ca 35 %', 'Längst till höger'], correct: 2 },
    { q: 'Vilket startläge ska RIT-vredet ha?',
      options: ['Längst till vänster', 'Mitten', 'Längst till höger', 'AV'], correct: 1 },
    { q: 'RF PWR — startläge vid upprättande?',
      options: ['Längst till vänster', 'Mitten', 'Ca 50 %', 'Längst till höger'], correct: 0 },
    { q: 'Vilket värde ska MENY 5 (CIV-AD) ha?',
      options: ['1EH AD', '3EH AD', '9600', 'USB'], correct: 1 },
    { q: 'Vilken baudrate ska MENY 6 visa?',
      options: ['1200', '2400', '4800', '9600'], correct: 3 },
    { q: 'Vilket MODE ska displayen visa vid telefoni?',
      options: ['LSB', 'USB', 'AM', 'CW'], correct: 1 },
    { q: 'Vad ska kontrolleras AVSTÄNGT innan något ansluts?',
      options: ['Bara PSU', 'Bara radio', 'PSU och radio', 'Ingen kontroll behövs'], correct: 2 },
    { q: 'I vilken ordning slås strömmen på?',
      options: ['Radio först, sedan PSU', 'PSU först, sedan radio (med TS+LOCK intryckt)', 'Samtidigt', 'Spelar ingen roll'], correct: 1 },
    { q: 'Vad står O.R.A.S. för?',
      options: ['Ordning – Reda – Ansvar – Stil', 'Order – Rapport – Avbryt – Stopp', 'Observera – Rapportera – Agera – Säkra', 'Operativ – Rörlig – Aktiv – Stridsklar'], correct: 0 },
    { q: 'Vid bryt — i vilken ordning slås strömställarna AV?',
      options: ['PSU först, sedan radio', 'Radio (RA763) först, sedan PSU', 'Samtidigt', 'Bara PSU räcker'], correct: 1 },
    { q: 'swALE-kablagets 3.5 mm tele kopplas till radion på vilken port?',
      options: ['VÄNSTER TELE / REMOTE', 'HÖGER TELE / REMOTE', 'VÄNSTER DIN / ACC 2', 'HÖGER DIN / ACC 1'], correct: 1 },
    { q: 'swALE-kablagets DIN-plugg kopplas till radion på vilken port?',
      options: ['HÖGER TELE / REMOTE', 'VÄNSTER DIN / ACC 1', 'HÖGER DIN / ACC 1', 'VÄNSTER TELE / REMOTE'], correct: 2 },
    { q: 'Vad görs med mikrofonen innan swALE kopplas in?',
      options: ['Kopplas bort', 'Lämnas ansluten', 'Bytas mot ett headset', 'Vridas av med vredet'], correct: 0 },
    { q: 'swALE — TX TUNE TIME?',
      options: ['200 ms', '500 ms', '1000 ms', '2000 ms'], correct: 1 },
    { q: 'swALE — WAIT FOR REPLY TIME?',
      options: ['500 ms', '1000 ms', '2000 ms', '5000 ms'], correct: 2 },
    { q: 'swALE — SOUNDING INTERVAL?',
      options: ['Ikryssad, 5 min', 'Ikryssad, 15 min', 'EJ IKRYSSAD', 'Ikryssad, 60 min'], correct: 2 },
    { q: 'swALE — ALE DETECTION ska stå på?',
      options: ['ACCEPT ALL CALLS', 'IGNORE CALLS TO OTHER STATIONS', 'DETECT ONLY OWN', 'OFF'], correct: 1 },
    { q: 'Vad är principen för uteffekt (RF PWR) vid användning?',
      options: ['Alltid full effekt för säker kontakt', 'Minsta möjliga effekt för att nå motstationen', 'Halv effekt som standard', 'Effekten styrs av swALE automatiskt'], correct: 1 },
    { q: 'Vad görs vid uthämtning av materiel?',
      options: ['Inventera enligt packplan + rapportera fel/saknad', 'Bara lägga radion i bilen', 'Direkt påslagning för funktionstest', 'Skicka materiel till verkstad'], correct: 0 }
  ]
};
