// ramsor-data.js — datakälla för RAMSOR-fliken.
//
// Datamodell (window.RAMSOR_DATA):
//   roles[]      — rollvalsalternativ. `id` används som localStorage-värde.
//   categories[] — subrubriker i listan. Ordningen styr renderingsordningen.
//                  Varje ramsa har ett `category`-fält som pekar på id här.
//                  Ramsor utan category renderas under fallback-rubriken "Övrigt".
//   placeholders — rader som visas när en rolls innehåll inte är inlagt än.
//   ramsor[]     — minnesramsorna. Varje ramsa har:
//     id          — unik ASCII-nyckel (för deep-links och DOM-ids)
//     name        — visningsnamn ("METHANE")
//     short       — en mening, vad ramsan används till (rad under namnet)
//     category    — id ur categories[] (styr vilken sektion ramsan hamnar i)
//     lines[]     — bokstav-för-bokstav. { letter, text } eller { letter, text, text2 }
//                   (text2 visas som högerkolumn — t.ex. svensk vs internationell)
//     usage       — fritextstycke om när och hur (kan vara tomt)
//     tags[]      — deskriptiva kategoritaggar (inga auktoritets-signaler)
//     roles[]     — vilka roller ramsan dyker upp för. Sätt flera för
//                   ramsor som delas mellan roller. Övriga ramsor (utanför
//                   rollen) hamnar i "Övriga ramsor"-expander.
//
// VIKTIGT:
//   Beskrivande, inte auktoritativt. Inget språk i denna fil får antyda
//   att en ramsa är "fastställd" av FM eller någon annan myndighet. Det
//   som är allmän praxis kallas "vanlig", "etablerad" eller "internationell"
//   — inte "officiell" eller "godkänd".
//
//   Source-research: Inga synliga källhänvisningar till SoldF eller
//   andra externa sajter i UI:t. Innehåll kontrolleras mot allmänt
//   tillgängliga källor men presenteras utan att låtsas certifiera.

window.RAMSOR_DATA = {

  roles: [
    { id: 'soldat',name: 'Soldat',desc: 'Basroll' },
    { id: 'sjv',   name: 'Sjv',   desc: 'Sjukvårdare' },
    { id: 'sig',   name: 'Sig',   desc: 'Signalist' },
    { id: 'grpc',  name: 'GrpC',  desc: 'Gruppchef' },
    { id: 'plutc', name: 'PlutC', desc: 'Plutonchef' },
    { id: 'forare',name: 'Förare',desc: 'Fordonsförare' }
  ],

  // Ordning bestämmer sektionsordningen i UI:t.
  categories: [
    // Sjukvård
    { id: 'bedomning',    name: 'Bedömning' },
    { id: 'overlamning',  name: 'Överlämning' },
    { id: 'evakuering',   name: 'Evakuering' },
    // Samband
    { id: 'procedur',     name: 'Sambandsprocedur' },
    { id: 'materiel-sig', name: 'Sambandsmateriel' },
    // Stridsteknik & taktik
    { id: 'planering',    name: 'Planering & order' },
    { id: 'stridsstallning', name: 'Stridsställning' },
    { id: 'strid',        name: 'Strid & skytte' },
    { id: 'patrull',      name: 'Patrull & säkring' },
    { id: 'materielvard', name: 'Materielvård' },
    // Allmänt
    { id: 'fm-allmant',   name: 'Försvarsmakten — allmänt' }
  ],

  // Visas när en roll inte har egna ramsor inlagda (eller bara har "Övriga
  // ramsor"). Detta är medvetet rakt språk — användaren ska veta att det
  // inte är en bugg utan att innehåll kommer i en kommande version.
  placeholders: {
    forare:'Innehåll för förar-specifika ramsor håller på att samlas in. Generella ramsor (handtecken, kolonn) finns under övriga roller. Hör av dig via feedback-länken längst ner om du vill bidra.'
  },

  ramsor: [

    // ── SJUKVÅRD ─────────────────────────────────────────────────────
    {
      id: 'methane',
      name: 'METHANE',
      category: 'bedomning',
      short: 'Rapportstruktur vid masskadehändelse / större incident.',
      lines: [
        { letter: 'M', text: 'Major incident — bekräfta eller stand-by.' },
        { letter: 'E', text: 'Exact location — koordinat eller adress.' },
        { letter: 'T', text: 'Type of incident — vad har hänt.' },
        { letter: 'H', text: 'Hazards — pågående och potentiella faror.' },
        { letter: 'A', text: 'Access — säkra in- och utfartsvägar.' },
        { letter: 'N', text: 'Number of casualties — antal skadade och svårighetsgrad.' },
        { letter: 'E', text: 'Emergency services — vad finns på plats, vad behövs.' }
      ],
      usage: 'Används vid första anmälan från skadeplats vid större incidenter. Internationellt etablerat inom prehospital vård och räddningstjänst.',
      tags: ['Sjukvård', 'Internationellt'],
      roles: ['sjv']
    },

    {
      id: 'safe',
      name: 'SAFE',
      category: 'bedomning',
      short: 'Säkerhetsbedömning innan man närmar sig en skadeplats.',
      lines: [
        { letter: 'S', text: 'Shout / Stop — bedöm scenen, ropa upp om hjälp.' },
        { letter: 'A', text: 'Approach with care — gå försiktigt och kontrollerat.' },
        { letter: 'F', text: 'Free from danger — säkra att området är fritt från fara.' },
        { letter: 'E', text: 'Evaluate the casualty — gå sedan över till primärbedömning.' }
      ],
      usage: 'Användbar checklista innan man börjar arbeta med en skadad. Tanken är att hjälparen själv inte ska bli nästa skadefall.',
      tags: ['Sjukvård', 'Internationellt'],
      roles: ['sjv']
    },

    {
      id: 'cabcde',
      name: 'C-ABCDE',
      category: 'bedomning',
      short: 'Primärbedömning av skadad — letar livshotande tillstånd i prioritetsordning.',
      lines: [
        { letter: 'C', text: 'Catastrophic bleeding — stoppa livshotande blödning direkt.' },
        { letter: 'A', text: 'Airway — fri luftväg, halsryggsskydd om relevant.' },
        { letter: 'B', text: 'Breathing — andning, andningsljud, eventuell pneumothorax.' },
        { letter: 'C', text: 'Circulation — puls, hudfärg, blödningar.' },
        { letter: 'D', text: 'Disability — medvetandegrad, pupillreaktion, neurologi.' },
        { letter: 'E', text: 'Exposure / Environment — undersök hela kroppen, skydda mot kyla.' }
      ],
      usage: 'Etablerad primärbedömning inom traumavård (PHTLS, TCCC m.fl.). C-prefixet (Catastrophic bleeding) lyfts fram först vid trauma med risk för stor yttre blödning.',
      tags: ['Sjukvård', 'Internationellt'],
      roles: ['sjv']
    },

    {
      id: '4b',
      name: '4B',
      category: 'bedomning',
      short: 'Skadesvep efter tecken på inre blödning — del av lilla c i C-ABCDE.',
      lines: [
        { letter: 'B', text: 'Bröstkorg — palpera revben, leta instabilitet, smärta, andningspåverkan.' },
        { letter: 'B', text: 'Buk — palpera kvadranter, leta defense, distension, smärta vid tryck.' },
        { letter: 'B', text: 'Bäcken — kontrollera stabilitet (en gång, försiktigt — komprimera ej upprepat).' },
        { letter: 'B', text: 'Ben — låren först (femurfraktur kan dölja stor inre blödning), sedan underben.' }
      ],
      usage: 'Inom TCCC används 4B som del av skadesvepet vid lilla c i (C)ABCDE — undersöker fyra områden där stor inre blödning kan döljas utan synligt yttre tecken. Snabb minnesregel för att inte missa något av de stora "blödningsrummen".',
      tags: ['Sjukvård', 'Internationellt'],
      roles: ['sjv']
    },

    {
      id: 'acvpu',
      name: 'ACVPU',
      category: 'bedomning',
      short: 'Snabb skattning av medvetandegrad — del av (C)ABCDE och TCCC.',
      lines: [
        { letter: 'A', text: 'Alert — vaken, orienterad, öppnar ögon spontant och reagerar adekvat på tilltal.' },
        { letter: 'C', text: 'Confusion — vaken men nytillkommen eller förvärrad förvirring/desorientering.' },
        { letter: 'V', text: 'Verbal — reagerar enbart på tilltal (öppnar ögon eller svarar med ljud när du pratar).' },
        { letter: 'P', text: 'Pain — okontaktbar via tal, reagerar på smärtstimulering (rycker undan lem, stönar).' },
        { letter: 'U', text: 'Unresponsive — medvetslös, ingen reaktion på vare sig tilltal eller smärta.' }
      ],
      usage: 'Internationell skala för att snabbt bedöma och övervaka medvetandegrad. Används inom TCCC och som del av D i (C)ABCDE. Ingår i Casualty Card-dokumentationen (DD Form 1380 m.fl.). Ersätter ofta tidigare AVPU genom att lägga till "C" (Confusion) — en nytillkommen förvirring fångas tidigare än om man bara skiljer på vaken/röst/smärta/medvetslös.',
      tags: ['Sjukvård', 'Internationellt'],
      roles: ['sjv']
    },

    {
      id: 'gcs',
      name: 'GCS — Glasgow Coma Scale',
      category: 'bedomning',
      short: 'Internationell poängskala för medvetandegrad (3–15 p) över tre tester.',
      lines: [
        { letter: 'E', text: 'Ögonöppning (1–4): 4 spontant · 3 vid tilltal · 2 vid smärta · 1 ingen reaktion.' },
        { letter: 'V', text: 'Verbalt svar (1–5): 5 fullt orienterad · 4 desorienterad/konfusionell · 3 enstaka ord · 2 oartikulerat ljud · 1 ingen reaktion.' },
        { letter: 'M', text: 'Motorisk reaktion (1–6): 6 lyder uppmaning · 5 lokaliserar smärta · 4 drar undan armen · 3 flexion i armbåge · 2 extension · 1 ingen reaktion.' }
      ],
      usage: 'Summera de tre delpoängen. Max 15 p = helt vaken patient. Komatös patient får minst 3 p. Skalan är internationellt etablerad. I Sverige (särskilt västra) används parallellt den svenska RLS-85.',
      tags: ['Sjukvård', 'Internationellt'],
      roles: ['sjv']
    },

    {
      id: 'triagering',
      name: 'Triagering — T0–T4',
      category: 'bedomning',
      short: 'Prioriteringskategorier vid masskadehändelse — färg, brådska, åtgärdsfönster.',
      lines: [
        { letter: 'T1', text: 'Röd · Omedelbar — skadade som kräver omedelbara livräddande åtgärder.' },
        { letter: 'T2', text: 'Gul · Brådskande — kräver kirurgiska/medicinska åtgärder inom 2–4 h.' },
        { letter: 'T3', text: 'Grön · Ej brådskande — lättare skadade, behandling kan dröja >4 h utan medicinsk risk.' },
        { letter: 'T4', text: 'Blå · Expektans — mycket svårt skadade med små möjligheter till överlevnad.' },
        { letter: 'T0', text: 'Svart · Död/Livlös — utan egenandning trots säkerställd fri luftväg.' }
      ],
      usage: 'Expektans-kategorin (T4) används sällan men kan bli aktuell vid MASCAL (mass casualty) då antalet skadade överstiger tillgängliga behandlings- och evakueringsresurser. Stabsläkare deklarerar MASCAL.',
      tags: ['Sjukvård', 'Triage'],
      roles: ['sjv']
    },

    {
      id: 'at-mist',
      name: 'AT-MIST',
      category: 'overlamning',
      short: 'Strukturerad överlämning av skadad till nästa vårdnivå.',
      lines: [
        { letter: 'A', text: 'Age — patientens ålder och kön (eller bedömd ålder och kön om okänd, ange då bedömt läge).' },
        { letter: 'T', text: 'Time — tidpunkt för skadan (eller bedömd tid om okänd).' },
        { letter: 'M', text: 'Mechanism — skademekanism (vad orsakade skadan).' },
        { letter: 'I', text: 'Injuries — funna och misstänkta skador.' },
        { letter: 'S', text: 'Signs / Symptoms — vitalparametrar, smärta, medvetande.' },
        { letter: 'T', text: 'Treatment — vad har gjorts (förband, tourniquet, smärtlindring).' }
      ],
      usage: 'Vanlig överlämningsstruktur från fältsjukvårdare till sjukhus eller högre vårdnivå. AT-MIST är den variant som lärs ut på TOS/TCCC idag — Age och Time of injury läggs till framför MIST. Internationellt etablerad.',
      tags: ['Sjukvård', 'Internationellt'],
      roles: ['sjv']
    },

    {
      id: '9line-medevac',
      name: '9-LINE MEDEVAC',
      category: 'evakuering',
      short: 'Strukturerad begäran om medicinsk evakuering.',
      lines: [
        { letter: '1', text: 'Plats för upptag (koordinat).' },
        { letter: '2', text: 'Radio och anropssignal på upptagsplats.' },
        { letter: '3', text: 'Antal skadade per prioritet (A urgent, B priority, C routine).' },
        { letter: '4', text: 'Specialutrustning som behövs (ventilator, blod, extrak­tion).' },
        { letter: '5', text: 'Antal skadade per bårtyp (liggande / sittande).' },
        { letter: '6', text: 'Säkerhetsläge på upptagsplats (fientlig kontakt eller ej).' },
        { letter: '7', text: 'Markering av upptagsplats (rök, panel, lampa, IR).' },
        { letter: '8', text: 'Nationalitet och status (egen, civil, krigsfånge).' },
        { letter: '9', text: 'NBC-/terräng-/väderinformation som påverkar landning.' }
      ],
      usage: 'Internationellt format för evakueringsbegäran. Detaljer i rad 6 och 8 varierar något mellan länder och förband.',
      tags: ['Sjukvård', 'Internationellt'],
      roles: ['sjv']
    },

    {
      id: 'casevac-medevac',
      name: 'CASEVAC vs MEDEVAC',
      category: 'evakuering',
      short: 'Två typer av evakuering — med eller utan medicinsk personal ombord.',
      lines: [
        { letter: 'C', text: 'CASEVAC — Casualty Evacuation. Icke-medicinsk transport av skadad/sjuk. Börjar på skadeplats; genomförs utan medicinsk personal och utan medicinsk utrustning ombord.' },
        { letter: 'M', text: 'MEDEVAC — Medical Evacuation. Transport med fortsatt behandling, från skadeplats till kvalificerad vårdplats (eller mellan vårdenheter). Besättning inkluderar legitimerad sjukvårdspersonal med medicinsk utrustning.' }
      ],
      usage: 'Skillnaden är avgörande för rapporteringsformat och för vad mottagaren förväntar sig — en CASEVAC kan vara närmaste tillgängliga fordon, en MEDEVAC är en specifikt utrustad resurs. Begreppen används internationellt och inom svensk fältsjukvård.',
      tags: ['Sjukvård', 'Internationellt'],
      roles: ['sjv']
    },

    // ── SIGNALIST ────────────────────────────────────────────────────
    {
      id: 'talgruppsbyte',
      name: 'Talgruppsbyte',
      category: 'procedur',
      short: 'Procedur för att byta talgrupp och kvittera när man kommit över.',
      lines: [
        { letter: '1', text: 'Anropa mottagare i nuvarande talgrupp och meddela byte.' },
        { letter: '2', text: 'Meddela vilken talgrupp som byts till samt anledning om relevant.' },
        { letter: '3', text: 'Invänta kvittens på att mottagaren förstått och är beredd.' },
        { letter: '4', text: 'Byt manuellt till ny talgrupp på radion.' },
        { letter: '5', text: 'Anropa direkt i nya talgruppen och vänta på kvittens.' },
        { letter: '6', text: 'Om inget svar inom rimlig tid — gå tillbaka till tidigare talgrupp och försök igen.' }
      ],
      usage: 'Allmän procedur för planerade byten mellan talgrupper. Detaljer kan variera mellan radiomateriel och förband — följ alltid lokala instruktioner.',
      tags: ['Signalist', 'Generellt'],
      roles: ['sig']
    },

    {
      id: 'passningsalternativ',
      name: 'Passningsalternativ',
      category: 'procedur',
      short: 'Passningsschema för sambandssystem — när och hur ofta radion ska passas.',
      lines: [
        { letter: '1', text: 'Alltid — kontinuerlig passning.' },
        { letter: '2', text: '5 min varje 15 min.' },
        { letter: '3', text: '5 min varje 30 min.' },
        { letter: '4', text: '10 min varje 60 min.' }
      ],
      usage: 'Kom överens om från NÄR passningen ska börja. Undvik hela siffror som 00, 15, 30, 45 — välj en udda starttid så att flera enheter inte hamnar synkat på samma minut. Exempel: "Från kl 13.48. Passalt 3." → radion passas i 5 min varje xx.48 och xx.18.',
      tags: ['Signalist', 'Generellt'],
      roles: ['sig']
    },

    {
      id: 'bokstavering',
      name: 'Bokstavering — svensk + internationell',
      category: 'procedur',
      short: 'Bokstavering och siffer-uttal: svensk standard (vänster) och NATO/ICAO (höger).',
      columns: ['Svensk', 'Internationell'],
      lines: [
        { letter: 'A', text: 'Adam',     text2: 'Alpha' },
        { letter: 'B', text: 'Bertil',   text2: 'Bravo' },
        { letter: 'C', text: 'Cesar',    text2: 'Charlie' },
        { letter: 'D', text: 'David',    text2: 'Delta' },
        { letter: 'E', text: 'Erik',     text2: 'Echo' },
        { letter: 'F', text: 'Filip',    text2: 'Foxtrot' },
        { letter: 'G', text: 'Gustav',   text2: 'Golf' },
        { letter: 'H', text: 'Helge',    text2: 'Hotel' },
        { letter: 'I', text: 'Ivar',     text2: 'India' },
        { letter: 'J', text: 'Johan',    text2: 'Juliet' },
        { letter: 'K', text: 'Kalle',    text2: 'Kilo' },
        { letter: 'L', text: 'Ludvig',   text2: 'Lima' },
        { letter: 'M', text: 'Martin',   text2: 'Mike' },
        { letter: 'N', text: 'Niklas',   text2: 'November' },
        { letter: 'O', text: 'Olof',     text2: 'Oscar' },
        { letter: 'P', text: 'Petter',   text2: 'Papa' },
        { letter: 'Q', text: 'Quintus',  text2: 'Quebec' },
        { letter: 'R', text: 'Rikard',   text2: 'Romeo' },
        { letter: 'S', text: 'Sigurd',   text2: 'Sierra' },
        { letter: 'T', text: 'Tore',     text2: 'Tango' },
        { letter: 'U', text: 'Urban',    text2: 'Uniform' },
        { letter: 'V', text: 'Viktor',   text2: 'Victor' },
        { letter: 'W', text: 'Wilhelm',  text2: 'Whiskey' },
        { letter: 'X', text: 'Xerxes',   text2: 'X-ray' },
        { letter: 'Y', text: 'Yngve',    text2: 'Yankee' },
        { letter: 'Z', text: 'Zäta',     text2: 'Zulu' },
        { letter: 'Å', text: 'Åke',      text2: '-' },
        { letter: 'Ä', text: 'Ärlig',    text2: '-' },
        { letter: 'Ö', text: 'Östen',    text2: '-' },
        { letter: '0', text: 'Nolla',    text2: 'ZERO' },
        { letter: '1', text: 'Ett',      text2: 'ONE' },
        { letter: '2', text: 'Tvåa',     text2: 'TWO' },
        { letter: '3', text: 'Trea',     text2: 'THREE' },
        { letter: '4', text: 'Fyra',     text2: 'FOUR' },
        { letter: '5', text: 'Femma',    text2: 'FIVE' },
        { letter: '6', text: 'Sexa',     text2: 'SIX' },
        { letter: '7', text: 'Sju',      text2: 'SEVEN' },
        { letter: '8', text: 'Åtta',     text2: 'EIGHT' },
        { letter: '9', text: 'Nia',      text2: 'NINER' },
        { letter: ',', text: 'Komma',    text2: 'DECIMAL' },
        { letter: '.', text: 'Punkt',    text2: 'STOP' }
      ],
      usage: 'Svenska bokstaverings­alfabetet används i nationell radio­trafik. NATO-alfabetet (ICAO Phonetic) används i internationella sammanhang och i samband med utländska enheter. Å, Ä, Ö saknas internationellt — bokstaveras då som AA, AE respektive OE (Alfa-Alfa, Alfa-Echo, Oscar-Echo). NINER används istället för NINE för att undvika sammanblandning med tyska "nein".',
      tags: ['Signalist', 'Internationellt'],
      roles: ['sig']
    },

    {
      id: 'ra1444-handhavande',
      name: 'RA 1444 — handhavande',
      category: 'materiel-sig',
      short: 'Snabb påminnelse om RA 1444 / 180 (handburen radio) — användning på fältet.',
      lines: [
        { letter: '·', text: 'Strömknappen (vrid medurs) sätter igång radion och styr volymen.' },
        { letter: '·', text: 'Talgrupp väljs med kanalväljaren — bekräfta i displayen.' },
        { letter: '·', text: 'PTT-knappen på sidan (eller på headsetet) trycks in vid sändning, släpps direkt efter.' },
        { letter: '·', text: 'Korta, tydliga meddelanden. Vänta 1 sekund efter PTT innan du börjar tala — undvik att tappa de första orden.' },
        { letter: '·', text: 'Antennen ska peka uppåt — inte mot kroppen — för bästa räckvidd.' }
      ],
      usage: 'Mycket förenklad påminnelse. Detaljerade handhavande-instruktioner och felsökning kommer i en senare version — hör av dig om du har konkreta önskemål.',
      tags: ['Signalist', 'Materiel'],
      roles: ['sig']
    },

    {
      id: 'ra180-1247-eff',
      name: 'RA 180 — 1-2-4-7-Effekt',
      category: 'materiel-sig',
      short: 'Felsökning och upprättning av RA 180 — knapparna att kontrollera i ordning.',
      lines: [
        { letter: '1', text: 'Tid — kontrollera att radion har rätt tid.' },
        { letter: '2', text: 'Nätdata — verifiera att rätt nät är inläst.' },
        { letter: '4', text: 'Kryptonycklar — kontrollera att nycklar finns laddade.' },
        { letter: '7', text: 'Rätt nyckel aktiverad — verifiera att rätt nyckel är vald.' },
        { letter: 'Eff', text: 'Effekt-knappen i rätt läge — NORM vid normal användning. Kolla även att radion inte fastnat i dataläge (DDA), samt att antenn och kablage är hela och fastskruvade.' }
      ],
      usage: 'Vid sambandsavbrott: tryck metodiskt på knapparna 1, 2, 4, 7 i tur och ordning för att verifiera tid, nätdata, nycklar och aktiv nyckel. Kontrollera sedan Effekt-läget. Ett vanligt fel är att RA 180 står i låg-läge (avsett för att minska röjande signal/spara batteri vid korta avstånd) när det är svårt att få samband.',
      tags: ['Signalist', 'Materiel'],
      roles: ['sig']
    },

    // ── STRIDSTEKNIK & TAKTIK ────────────────────────────────────────
    {
      id: 'ufetass',
      name: 'UFETÅSS',
      category: 'planering',
      short: 'Planeringsstöd inför stridsuppgift — grpc-nivå.',
      lines: [
        { letter: 'U', text: 'Uppgift — vad ska enheten göra.' },
        { letter: 'F', text: 'Framryckning — hur tar man sig till målet.' },
        { letter: 'E', text: 'Eld — hur används eld; egen och understödjande.' },
        { letter: 'T', text: 'Tillbaka — hur sker tillbakaryckning/återgång.' },
        { letter: 'Å', text: 'ÅSA 1, 2, 3… — återsamlingsplatser, i ordning.' },
        { letter: 'S', text: 'Stril — stridsledning, vem leder vad.' },
        { letter: 'S', text: 'Samband — radio, signal, alternativ.' },
        { letter: 'S', text: 'Sjv — sjukvårdsplan; tourniquet, samlingsplats skadade, evakuering.' }
      ],
      usage: 'Planeringsstöd under förberedelsearbetet inför att en enhet går ut på stridsuppgifter (t.ex. eldöverfall, anfall). UFETÅSSSO är en utbyggd variant på plutonnivå.',
      tags: ['Stridsteknik', 'Planering'],
      roles: ['grpc', 'plutc', 'soldat']
    },

    {
      id: 'ufetassso',
      name: 'UFETÅSSSO',
      category: 'planering',
      short: 'Utbyggd planering inför stridsuppgift — plutonnivå.',
      lines: [
        { letter: 'U', text: 'Uppgift — vad ska enheten göra.' },
        { letter: 'F', text: 'Framryckning — hur tar man sig till målet.' },
        { letter: 'E', text: 'Eld — hur används eld; egen och understödjande.' },
        { letter: 'T', text: 'Tillbakaryckning — hur sker återgång.' },
        { letter: 'Å', text: 'Återsamling — platser i ordning.' },
        { letter: 'S', text: 'Sjukvård — sjukvårdsplan; tourniquet, samlingsplats, evakuering.' },
        { letter: 'S', text: 'Stridsledning — vem leder vad, var sitter chef.' },
        { letter: 'S', text: 'Samband — radio, signal, alternativ.' },
        { letter: 'O', text: 'Omfall — vad gör vi om planen inte håller.' }
      ],
      usage: 'Planeringsstöd under förberedelsearbetet inför stridsuppgift. Skiljer sig från UFETÅSS genom det extra "O" för omfall (plan B) — viktigt på plutonnivå där fler delkrafter ska samordnas.',
      tags: ['Stridsteknik', 'Planering'],
      roles: ['grpc', 'plutc']
    },

    {
      id: 'obk',
      name: 'OBK',
      category: 'planering',
      short: 'Snabb ordergivning med direkt verkställighet.',
      lines: [
        { letter: 'O', text: 'Orientering — kort lägesbild.' },
        { letter: 'B', text: 'Beslut — vad ska göras.' },
        { letter: 'K', text: 'Kommando — verkställs direkt.' }
      ],
      usage: 'Skiljer sig från OBO genom att avslutas med Kommando — beslutet verkställs direkt utan att gå via "Order". Används när tempo är viktigare än att fördela detaljer.',
      tags: ['Stridsteknik', 'Order'],
      roles: ['grpc', 'plutc']
    },

    {
      id: '8f',
      name: '8F',
      category: 'stridsstallning',
      short: 'Kriterier för en bra stridsställning — eller egen check av befintlig.',
      lines: [
        { letter: 'F', text: 'Frontalt skydd — mot förväntad hotriktning.' },
        { letter: 'F', text: 'Flankerande skjutriktning — kan ge eld utanför egen front.' },
        { letter: 'F', text: 'Försvarbara skjutavstånd — vapnets effektiva räckvidd matchar.' },
        { letter: 'F', text: 'Fritt skottfält — sikt och skjutbana utan hinder.' },
        { letter: 'F', text: 'Fly skogsbryn — undvik tydliga konturer mot ljusare bakgrund.' },
        { letter: 'F', text: 'Flygskydd — skydd uppåt och döljd mot UAV/luftspaning.' },
        { letter: 'F', text: 'Fältarbeten underlättas — markens beskaffenhet tillåter värnbygge.' },
        { letter: 'F', text: 'Fria omgrupperingsvägar — vägar in och ut utan att exponeras.' }
      ],
      usage: 'Används av grpc för att välja en bra stridsställning eller av enskild soldat för att kontrollera den egna ställningen.',
      tags: ['Stridsteknik', 'Ställning'],
      roles: ['grpc', 'plutc', 'soldat']
    },

    {
      id: 'eker',
      name: 'EKER',
      category: 'stridsstallning',
      short: 'Åtgärder för att uppnå eldberedd ställning.',
      lines: [
        { letter: 'E', text: 'Eldställning här — markera position.' },
        { letter: 'K', text: 'Klockan tolv är över — referenspunkt rakt fram.' },
        { letter: 'E', text: 'Eld mellan … och … — höger och vänster gräns för skjutfält.' },
        { letter: 'R', text: 'Rapportera eldberedd — när allt är klart.' }
      ],
      usage: 'Används vid intagande av eldställning — chef ger kort instruktion, skytt verifierar och rapporterar.',
      tags: ['Stridsteknik', 'Ställning'],
      roles: ['grpc', 'plutc', 'soldat']
    },

    {
      id: 'nuhkk',
      name: 'NUHKK',
      category: 'strid',
      short: 'Efter eldgivning — kontrollera resultat och omgivning innan ny aktion.',
      lines: [
        { letter: 'N', text: 'Nedkämpad — målet i skydd; träffade jag målet?' },
        { letter: 'U', text: 'Utslagen — är målet utslaget eller behöver jag fortsätta bekämpning?' },
        { letter: 'H', text: 'Hot — finns det fler hot i målterrängen?' },
        { letter: 'K', text: 'Kontroll — vapenkontroll (säkring, magasin, eventuell omladdning).' },
        { letter: 'K', text: 'Kontroll — flanker och bakåt; ny lägesbild.' }
      ],
      usage: 'Används av enskild soldat direkt efter eldgivning för att inte fastna i tunnelseende på ett enskilt mål.',
      tags: ['Stridsteknik', 'Skytte'],
      roles: ['soldat', 'grpc', 'plutc']
    },

    {
      id: '4s3v',
      name: '4S3V',
      category: 'strid',
      short: 'Vid kommando "Förflyttning!" — kontroll innan rörelse.',
      lines: [
        { letter: 'S', text: 'Sluta — skjut. Stoppa eldgivning.' },
        { letter: 'S', text: 'Säkra — vapnet, säkringen på.' },
        { letter: 'S', text: 'Skydd — har jag täckning under förflyttning.' },
        { letter: 'S', text: 'Sikte — är siktet i utgångsläge.' },
        { letter: 'V', text: 'Vapen — fattat, hållet i transportgrepp.' },
        { letter: 'V', text: 'Väska — packad och med.' },
        { letter: 'V', text: 'Verktyg — övrig utrustning (spade, kniv etc) med.' }
      ],
      usage: 'Som ramsa: "Sluta – skjut. Säkra – skydd. Sikte – väska – verktyg." Snabb mental check innan man reser sig och förflyttar sig.',
      tags: ['Stridsteknik', 'Förflyttning'],
      roles: ['soldat', 'grpc', 'plutc']
    },

    {
      id: 'vapenkontroll',
      name: 'Vapenkontroll',
      category: 'strid',
      short: 'Systematisk kontroll av eget vapen och tillbehör — 10 punkter.',
      lines: [
        { letter: '1',  text: 'Patron ur.' },
        { letter: '2',  text: 'Kontrollera lopp och patronläge, okulärbesiktiga.' },
        { letter: '3',  text: 'Smörjmedel — mängd, typ och placering.' },
        { letter: '4',  text: 'Stomme och mantel — kontrollera genom mekanismrörelse.' },
        { letter: '5',  text: 'Avtryckarsäkring — kontrollera att det inte går att avlossa i säkrat läge.' },
        { letter: '6',  text: 'Blindavfyra i säker riktning.' },
        { letter: '7',  text: 'Riktmedel — grundsikte, rödpunkt styrka, linsskydd avtagna.' },
        { letter: '8',  text: 'Tillbehör — reservpipa, reservdelar, vapenvårdsetui, benstöd, mono.' },
        { letter: '9',  text: 'Magasin / band — fungerar, hela, rena. Fyll på vid behov.' },
        { letter: '10', text: 'Hölster, magasinhållare, väskor, fickor m.m.' }
      ],
      usage: 'Genomförs regelbundet och innan uppgift. Listan följer en logisk ordning från säkerhet (patron ur) via funktion (mekanism, avtryckare) till tillbehör.',
      tags: ['Stridsteknik', 'Vapen'],
      roles: ['soldat', 'grpc', 'plutc', 'forare']
    },

    {
      id: 'smuvs',
      name: 'SMUVS',
      category: 'patrull',
      short: 'Mental check för enskild post innan postgång.',
      lines: [
        { letter: 'S', text: 'Skydda — vad och hur skyddar jag.' },
        { letter: 'M', text: 'Misstänksamhet — utgå från att något kan hända.' },
        { letter: 'U', text: 'Uthållighet — kläder, vatten, mat, vila kan jag hålla ut.' },
        { letter: 'V', text: 'Vaksamhet — håll uppmärksamheten uppe.' },
        { letter: 'S', text: 'Stridsberedd — vapen, ammunition, larm-procedur klar.' }
      ],
      usage: 'Används för enskild soldat som ska gå post — säkerställer att den fått all nödvändig information. Kompletterar OBSLÖSA och BSÖ.',
      tags: ['Stridsteknik', 'Post'],
      roles: ['soldat', 'grpc']
    },

    {
      id: 'solo',
      name: 'SOLO',
      category: 'patrull',
      short: 'Paus och avläsning under patrull — ge sensorerna en chans.',
      lines: [
        { letter: 'S', text: 'Stanna — gör halt.' },
        { letter: 'O', text: 'Observera — sök av terräng visuellt, kikare, UAV.' },
        { letter: 'L', text: 'Lyssna — tyst, hör motorer, röster, djurens reaktion.' },
        { letter: 'O', text: 'Ofta — upprepa under patrullen, inte bara en gång.' }
      ],
      usage: 'Används ute på patrull, särskilt vid hundtjänst. Ger sensorn (kikare, UAV, hund) tid att fånga upp signaler som missas i rörelse.',
      tags: ['Stridsteknik', 'Patrull'],
      roles: ['soldat', 'grpc']
    },

    {
      id: 'stop',
      name: 'STOP',
      category: 'patrull',
      short: 'Paus för att ompröva ett beslut — oavsett miljö.',
      lines: [
        { letter: 'S', text: 'Stanna — bryt det pågående.' },
        { letter: 'T', text: 'Tänk — bedöm vad som faktiskt händer.' },
        { letter: 'O', text: 'Orientera — vad vet jag, vad kan jag se.' },
        { letter: 'P', text: 'Planera — välj nästa åtgärd medvetet.' }
      ],
      usage: 'Används för att ta en paus och ompröva ett beslut, oavsett om det är på kontoret eller i en stridsställning. Kort minnesregel mot tunnelseende och förhastat agerande.',
      tags: ['Stridsteknik', 'Beslutsstöd'],
      roles: ['soldat', 'grpc', 'plutc']
    },

    {
      id: 'felrapport',
      name: 'Felrapport — fält',
      category: 'materielvard',
      short: 'Strukturerad felrapport på materiel — fältformulär.',
      lines: [
        { letter: '·', text: 'Förband — vilken enhet.' },
        { letter: '·', text: 'Anbringad av — vem anmäler felet.' },
        { letter: '·', text: 'Datum — när upptäcktes felet.' },
        { letter: '·', text: 'Materialslag — vad är felet på.' },
        { letter: '·', text: 'Individnummer — specifik enhet av materielen.' },
        { letter: '·', text: 'Fel / Brist / m-nr — kort beskrivning av problemet.' }
      ],
      usage: 'Strukturen för en felrapport som följer materielen vid inlämning. Fyll i alla fält så att den som tar emot kan spåra och åtgärda — vag rapport = försenad reparation.',
      tags: ['Materielvård', 'Rapport'],
      roles: ['soldat', 'grpc', 'plutc', 'forare']
    },

    // ── FÖRSVARSMAKTEN — ALLMÄNT ─────────────────────────────────────
    {
      id: 'befalsordning',
      name: 'Befälsordning — NATO-koder',
      category: 'fm-allmant',
      short: 'Grader och NATO-koder för armén och flottan — i fallande ordning.',
      columns: ['Armén', 'Flottan'],
      lines: [
        { letter: 'OF-9', text: 'General',            text2: 'Amiral' },
        { letter: 'OF-8', text: 'Generallöjtnant',    text2: 'Viceamiral' },
        { letter: 'OF-7', text: 'Generalmajor',       text2: 'Konteramiral' },
        { letter: 'OF-6', text: 'Brigadgeneral',      text2: 'Flottiljamiral' },
        { letter: 'OF-5', text: 'Överste',            text2: 'Kommendör' },
        { letter: 'OF-4', text: 'Överstelöjtnant',    text2: 'Kommendörkapten' },
        { letter: 'OF-3', text: 'Major',              text2: 'Örlogskapten' },
        { letter: 'OF-2', text: 'Kapten',             text2: 'Kapten' },
        { letter: 'OF-1', text: 'Löjtnant',           text2: 'Löjtnant' },
        { letter: 'OF-1', text: 'Fänrik',             text2: 'Fänrik' },
        { letter: 'OR-9', text: 'Regementsförvaltare',text2: 'Flottiljförvaltare' },
        { letter: 'OR-8', text: 'Förvaltare',         text2: 'Förvaltare' },
        { letter: 'OR-7', text: 'Överfanjunkare',     text2: 'Överfanjunkare' },
        { letter: 'OR-7', text: 'Fanjunkare',         text2: 'Fanjunkare' },
        { letter: 'OR-6', text: 'Översergeant',       text2: 'Översergeant' },
        { letter: 'OR-6', text: 'Sergeant',           text2: 'Sergeant' },
        { letter: 'OR-4', text: 'Överfurir',          text2: 'Överfurir' },
        { letter: 'OR-3', text: 'Furir',              text2: 'Furir' },
        { letter: 'OR-2', text: 'Korpral',            text2: 'Korpral' },
        { letter: 'OR-1', text: 'Menig',              text2: 'Menig / Sjöman' }
      ],
      usage: 'OF = officerare, OR = övriga (gruppbefäl, specialistofficerare, soldater). NATO-koderna används för att översätta grader mellan länder. Generalspersoner = OF-6 och uppåt; officerare = OF-1 till OF-5; specialistofficerare = OR-5 till OR-9; gruppbefäl = OR-2 till OR-4; soldater/sjömän = OR-1.',
      tags: ['Försvarsmakten', 'Grader'],
      roles: ['soldat', 'sjv', 'sig', 'grpc', 'plutc', 'forare']
    },

    {
      id: 'gradbeteckningar',
      name: 'Gradbeteckningar — kategorier',
      category: 'fm-allmant',
      short: 'Översikt av grader grupperade i kategorier (armén och hemvärnet).',
      lines: [
        { letter: '1', text: 'Generalspersoner: General · Generallöjtnant · Generalmajor · Brigadgeneral.' },
        { letter: '2', text: 'Officerare: Kadett · Fänrik · Löjtnant · Kapten · Major · Överstelöjtnant · Överste.' },
        { letter: '3', text: 'Specialistofficerare: Sergeant · Översergeant · Fanjunkare · Överfanjunkare · Förvaltare · Regementsförvaltare.' },
        { letter: '4', text: 'Gruppbefäl: Korpral · Furir · Överfurir.' },
        { letter: '5', text: 'Soldater: Menig · Menig 1 · Menig 2 · Menig 3 · Menig 4 · Vicekorpral.' }
      ],
      usage: 'Översikt i text — kategorierna är samma för armén och hemvärnet. Flottan har egna grad­namn för motsvarande nivåer (se "Befälsordning" för översättning). Visuella gradbeteckningar för parad­uniform respektive fältuniform skiljer sig åt; för bilder hänvisas till officiellt material.',
      tags: ['Försvarsmakten', 'Grader'],
      roles: ['soldat', 'sjv', 'sig', 'grpc', 'plutc', 'forare']
    }

    // Skippade i denna iteration:
    //  - Handtecken (issues #52, #53, #54): kräver bildmaterial. Vi länkar inte
    //    till rustadsoldat.se-bildkällor (CDN, deras rättigheter). Kommer som
    //    egen ramsa med egna SVG eller textbeskrivningar i kommande version.
    //  - AVPU → ACVPU (issues #50, #51): redan implementerat i v0.2.4.

  ]
};
