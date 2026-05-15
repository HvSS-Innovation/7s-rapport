/* SIGSKYDD-data — minneskort + provfrågor.
   Källa: FRO Minneskort Signalskydd v1.0 (sida 1 & 2).
   Inte fastställt av FM. Repetitions-/utbildningssyfte.
*/
window.SIGSKYDD_DATA = {
  meta: {
    title: 'Signalskydd',
    subtitle: 'Minneskort & repetitionsprov',
    source: 'FRO Minneskort Signalskydd v1.0'
  },

  cards: [
    /* ─── Skyddsnivåer ─── */
    { id: 'sg-ts',  category: 'Skyddsnivåer', front: 'SG TS', back: 'Top Secret\n\nGodkänt som skydd för:\nKvalificerat hemlig (KH)' },
    { id: 'sg-s',   category: 'Skyddsnivåer', front: 'SG S',  back: 'Secret\n\nGodkänt som skydd för:\nHemlig (H)' },
    { id: 'sg-c',   category: 'Skyddsnivåer', front: 'SG C',  back: 'Confidential\n\nGodkänt som skydd för:\nKonfidentiell (K)' },
    { id: 'sg-r',   category: 'Skyddsnivåer', front: 'SG R',  back: 'Restricted\n\nGodkänt som skydd för:\nBegränsat hemlig (BH)' },
    { id: 'sg-trf', category: 'Skyddsnivåer', front: 'SG TRF', back: 'Trafikskydd\n\nSkyddar mot trafikanalys, störsändning och falsksignalering.\n\nEJ för skydd av säkerhetsskyddsklassificerade uppgifter.' },

    /* ─── Förvaring ─── */
    { id: 'forv-ts-c', category: 'Förvaring', front: 'Förvaring SG TS / SG S / SG C', back: 'Under kontroll\neller\nI godkänt säkskåp.' },
    { id: 'forv-r-trf', category: 'Förvaring', front: 'Förvaring SG R / SG TRF', back: 'Under kontroll, inlåsta, eller i lokal där endast behöriga har tillträde.' },

    /* ─── Hantering ─── */
    { id: 'hantera', category: 'Hantering', front: 'Vem får hantera signalskyddsmateriel?', back: 'Den som:\n• Har behov för sitt arbete\n• Är pålitlig ur säkerhetssynpunkt\n• Har tillräcklig kunskap om säkerhetsskydd\n• Är placerad i lägst säkerhetsklass 3 (eller motsv.)\n• Genomgått nödvändig utbildning i signalskydd' },
    { id: 'markning', category: 'Hantering', front: 'Märkning av signalskyddsmateriel', back: 'Märkt SWE CCI eller SWE CI.\n\nFörseglad — kontrollera plombering.\n\nBeakta RÖS-risken.' },

    /* ─── Aktiva kort ─── */
    { id: 'kort-tak',  category: 'Aktiva kort & certifikat', front: 'TAK (blått kort)',  back: 'Autentisering (KH)\nSignering\nNyckelbärare' },
    { id: 'kort-teid', category: 'Aktiva kort & certifikat', front: 'TEID (grönt kort)', back: 'Autentisering\nSignering' },
    { id: 'kort-nbk',  category: 'Aktiva kort & certifikat', front: 'NBK (rött kort)',   back: 'Nyckelbärare' },
    { id: 'kort-cek',  category: 'Aktiva kort & certifikat', front: 'CEK (svart kort)',  back: 'Nyckelbärare (krypterade nycklar)' },
    { id: 'kort-dbk',  category: 'Aktiva kort & certifikat', front: 'DBK (gult kort)',   back: 'Databärare (systemkonfigurationer)' },

    /* ─── Incidenter ─── */
    { id: 'inc-nyckel', category: 'Incidenter', front: 'Nyckelincident', back: 'En signalskyddsnyckel saknas, har kommit till obehörigs kännedom, eller kan antas ha gjort det.' },
    { id: 'inc-mtrl',   category: 'Incidenter', front: 'Materielincident', back: 'Signalskyddsmateriel saknas, eller kan antas ha manipulerats eller utsatts för annan åverkan.' },
    { id: 'inc-kort',   category: 'Incidenter', front: 'Incident med aktivt kort eller certifikat', back: 'Aktivt kort eller lagringsmedium för mjukt certifikat saknas, kan antas ha manipulerats, eller obehörig kan antas ha haft tillgång.' },
    { id: 'inc-direkt', category: 'Incidenter', front: 'Vid signalskyddsincident — vad gör du först?', back: '1. Ta omedelbart materielen / kortet / certifikatet ur drift.\n2. Anmäl omedelbart enligt rutiner i lokal signalskyddsinstruktion.' },

    /* ─── Förstöring ─── */
    { id: 'forst-papper', category: 'Förstöring', front: 'Förstöring — papper', back: 'Destruktör:\nSpån < 2 × 2 mm\neller\n< 15 × 1,2 mm' },
    { id: 'forst-eld',    category: 'Förstöring', front: 'Förstöring — eldning', back: 'Tills endast omrörd aska återstår.' },
    { id: 'forst-cd',     category: 'Förstöring', front: 'Förstöring — CD/optiska media', back: 'Slipning tills informationsskiktet blivit damm.' },
    { id: 'forst-krav',   category: 'Förstöring', front: 'Krav vid förstöring', back: 'Utförs av signalskyddsutbildad person.\n\nSka dokumenteras.' },
    { id: 'forst-tid',    category: 'Förstöring', front: 'Förvaringstid förstörelseliggare', back: '10 år\n\nSG TS: 25 år' },
    { id: 'forst-total',  category: 'Förstöring', front: 'Total förstöring', back: 'Beordras av myndighets-/förbandschef i kris eller krig.\n\nRadera alla nycklar — gör därefter materielen obrukbar.' },

    /* ─── Delgivning ─── */
    { id: 'delg-krav',    category: 'Delgivning', front: 'Vem delges signalskyddsnycklar?', back: 'Samma 5 krav som hantering:\n• Behov\n• Pålitlig\n• Kunskap om säkerhetsskydd\n• Säkerhetsklass 3 eller motsv.\n• Utbildning i signalskydd' },
    { id: 'delg-fortec',  category: 'Delgivning', front: 'Hur dokumenteras delgivning?', back: 'Signalskyddspersonal med tillgång till nycklar förtecknas.\n\nÖvriga kvitterar.' },
    { id: 'delg-tid',     category: 'Delgivning', front: 'Förvaringstid förteckningar & kvittenser', back: '10 år\n\nSG TS: 25 år' },

    /* ─── Publikationer ─── */
    { id: 'pub-ffs',  category: 'Publikationer', front: 'FFS 2021:1', back: 'Försvarsmaktens föreskrifter om signalskyddstjänsten.' },
    { id: 'pub-smk',  category: 'Publikationer', front: 'SMK Nycklar', back: 'Säkerhetsmässiga krav för signalskyddsnycklar (2010).' },
    { id: 'pub-htst', category: 'Publikationer', front: 'H TST Grunder', back: 'Handbok totalförsvarets signalskyddstjänst (2007).' }
  ],

  exam: [
    { q: 'Vilken signalskyddsgrad är godkänd som skydd för Hemlig (H)?',
      options: ['SG TS', 'SG S', 'SG C', 'SG R'], correct: 1 },
    { q: 'Vilken signalskyddsgrad är godkänd som skydd för Kvalificerat hemlig (KH)?',
      options: ['SG TS', 'SG S', 'SG C', 'SG TRF'], correct: 0 },
    { q: 'Vad skyddar SG TRF mot?',
      options: ['Säkerhetsskyddsklassificerade uppgifter', 'Trafikanalys, störsändning och falsksignalering', 'Endast störsändning', 'RÖS-läckage'], correct: 1 },
    { q: 'Hur ska SG TS / SG S / SG C-nycklar förvaras?',
      options: ['I valfritt skåp', 'Under kontroll eller i godkänt säkskåp', 'I lokal där behöriga har tillträde', 'På arbetsplatsen utan särskilt skydd'], correct: 1 },
    { q: 'Vilken kortfärg har TAK?',
      options: ['Grön', 'Röd', 'Blå', 'Svart'], correct: 2 },
    { q: 'Vilken kortfärg har NBK?',
      options: ['Röd', 'Gul', 'Svart', 'Grön'], correct: 0 },
    { q: 'Vilket kort används som databärare för systemkonfigurationer?',
      options: ['TAK', 'TEID', 'CEK', 'DBK'], correct: 3 },
    { q: 'Vilket kort är nyckelbärare för krypterade nycklar?',
      options: ['CEK', 'TAK', 'NBK', 'DBK'], correct: 0 },
    { q: 'Vad är minsta tillåtna säkerhetsklass för att hantera signalskyddsmateriel?',
      options: ['Säkerhetsklass 1', 'Säkerhetsklass 2', 'Säkerhetsklass 3 eller motsv.', 'Ingen särskild klass krävs'], correct: 2 },
    { q: 'Vilken märkning ska godkänd signalskyddsmateriel ha?',
      options: ['SWE-FM', 'SWE CCI eller SWE CI', 'NATO RESTRICTED', 'Endast plombering räcker'], correct: 1 },
    { q: 'Vad är det första du gör vid en signalskyddsincident?',
      options: ['Ringer signalskyddschef', 'Skriver rapport', 'Tar omedelbart materielen ur drift', 'Försöker återställa funktionen'], correct: 2 },
    { q: 'Vad räknas som nyckelincident?',
      options: ['Att nyckeln är slut på batteri', 'När materielens kåpa är skadad', 'När en nyckel saknas eller kan antas ha kommit till obehörig', 'När en användare bytt lösenord'], correct: 2 },
    { q: 'Vilken sönderdelning krävs av destruktör för papper?',
      options: ['< 5 × 5 mm', '< 2 × 2 mm (alt. < 15 × 1,2 mm)', '< 10 × 10 mm', 'Valfri storlek'], correct: 1 },
    { q: 'Vad gäller vid förstöring genom eldning?',
      options: ['Tills lågorna slocknat', 'Tills röken upphört', 'Tills endast omrörd aska återstår', 'Minst 30 minuter brinntid'], correct: 2 },
    { q: 'Hur förstörs en CD med signalskyddsdata?',
      options: ['Brytning i två delar', 'Slipning tills informationsskiktet blivit damm', 'Klippning med sax', 'Magnetisering'], correct: 1 },
    { q: 'Vem får utföra förstöring?',
      options: ['Vilken anställd som helst', 'Signalskyddsutbildad person', 'Endast signalskyddschef', 'Extern destruktionsfirma'], correct: 1 },
    { q: 'Hur länge förvaras förstörelseliggare för SG TS?',
      options: ['5 år', '10 år', '15 år', '25 år'], correct: 3 },
    { q: 'Vem kan beordra total förstöring?',
      options: ['Gruppchef', 'Plutonchef', 'Myndighets-/förbandschef i kris eller krig', 'Vilken signalskyddsutbildad som helst'], correct: 2 },
    { q: 'Vilken publikation reglerar signalskyddstjänsten i Försvarsmakten?',
      options: ['FFS 2021:1', 'SMK Nycklar', 'H TST Grunder', 'OSF'], correct: 0 },
    { q: 'Vad står H TST Grunder för?',
      options: ['Handbok totalförsvarets signalskyddstjänst', 'Handbok teknisk signal-tjänst', 'Handbok telekommunikation', 'Handbok taktisk stridsledning'], correct: 0 }
  ]
};
