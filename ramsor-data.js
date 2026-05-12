// ramsor-data.js — datakälla för RAMSOR-fliken.
//
// Datamodell (window.RAMSOR_DATA):
//   roles[]      — rollvalsalternativ. `id` används som localStorage-värde.
//   placeholders — rader som visas när en rolls innehåll inte är inlagt än.
//   ramsor[]     — minnesramsorna. Varje ramsa har:
//     id          — unik ASCII-nyckel (för deep-links och DOM-ids)
//     name        — visningsnamn ("METHANE")
//     short       — en mening, vad ramsan används till (rad under namnet)
//     lines[]     — bokstav-för-bokstav. { letter, text } eller { letter, text, sv }
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
    { id: 'sjv',   name: 'Sjv',   desc: 'Sjukvårdare' },
    { id: 'sig',   name: 'Sig',   desc: 'Signalist' },
    { id: 'grpc',  name: 'GrpC',  desc: 'Gruppchef' },
    { id: 'plutc', name: 'PlutC', desc: 'Plutonchef' },
    { id: 'forare',name: 'Förare',desc: 'Fordonsförare' }
  ],

  // Visas när en roll inte har egna ramsor inlagda (eller bara har "Övriga
  // ramsor"). Detta är medvetet rakt språk — användaren ska veta att det
  // inte är en bugg utan att innehåll kommer i en kommande version.
  placeholders: {
    grpc:  'Innehåll för gruppchefsramsor håller på att samlas in. Hör av dig via feedback-länken längst ner om du vill bidra eller har önskemål.',
    plutc: 'Innehåll för plutonchefsramsor håller på att samlas in. Hör av dig via feedback-länken längst ner om du vill bidra.',
    forare:'Innehåll för förare-ramsor håller på att samlas in. Hör av dig via feedback-länken längst ner om du vill bidra.'
  },

  ramsor: [

    // ── SJUKVÅRD ─────────────────────────────────────────────────────
    {
      id: 'methane',
      name: 'METHANE',
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
      id: 'mist',
      name: 'MIST',
      short: 'Strukturerad överlämning av skadad till nästa vårdnivå.',
      lines: [
        { letter: 'M', text: 'Mechanism — skademekanism (vad orsakade skadan).' },
        { letter: 'I', text: 'Injuries — funna och misstänkta skador.' },
        { letter: 'S', text: 'Signs / Symptoms — vitalparametrar, smärta, medvetande.' },
        { letter: 'T', text: 'Treatment — vad har gjorts (förband, tourniquet, smärtlindring).' }
      ],
      usage: 'Vanlig överlämningsstruktur från fältsjukvårdare till sjukhus eller högre vårdnivå. Internationellt etablerad.',
      tags: ['Sjukvård', 'Internationellt'],
      roles: ['sjv']
    },

    {
      id: '9line-medevac',
      name: '9-LINE MEDEVAC',
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

    // TOS — avvaktar specifikation från användare. Visas inte i UI:t men
    // ligger som markör för v0.2.x när specifikationen kommer in.
    // TODO: lägg in TOS-ramsa när användaren preciserat vad som avses.

    // ── SIGNALIST ────────────────────────────────────────────────────
    {
      id: 'talgruppsbyte',
      name: 'Talgruppsbyte',
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
      id: 'ra1444-handhavande',
      name: 'RA 1444 — handhavande',
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
      id: '1227',
      name: '1227-tabell',
      short: 'Bokstaverings­tabell för att stava ord tydligt över radio.',
      lines: [
        { letter: '·', text: 'Används för att eliminera missförstånd vid stavning av namn, koordinater, anropssignaler.' },
        { letter: '·', text: 'En bokstav i taget — uttala hela kodordet tydligt.' },
        { letter: '·', text: 'Detaljerad tabell (A=Adam, B=Bertil osv.) kommer som referenskort i en senare version.' }
      ],
      usage: 'Den fullständiga 1227-tabellen läggs in som referensblock när nästa innehållsuppdatering rullar. Tills dess: använd tabellen som finns i lokala signalsystem-instruktioner.',
      tags: ['Signalist', 'Referens'],
      roles: ['sig']
    }

    // GrpC, PlutC, Förare: se placeholders ovan. Innehåll läggs in i v0.2.x
    // när research mot säkra källor kunnat verifieras — inte uppfunnet.

  ]
};
