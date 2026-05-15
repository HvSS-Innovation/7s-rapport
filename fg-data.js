/* FG-data — minneskort + prov för farligt gods enligt ADR.
   Källa: Skriftliga Instruktioner enligt ADR, FRO Märkning drivmedelsdunk,
   Ordningsbotskatalog Farligt gods, MSB ADR-S.
   Inte fastställt av FM. Repetitions-/utbildningssyfte.
*/
window.FG_DATA = {
  meta: {
    title: 'FG',
    subtitle: 'Farligt gods — minneskort & prov',
    source: 'ADR-S 2025–26 · FM Skriftliga Instruktioner · Märkning drivmedelsdunk'
  },

  cards: [
    /* ─── Klasser ─── */
    { id: 'klass-1', category: 'Klasser', front: 'Klass 1', back: 'Explosiva ämnen och föremål.\n\nKänsliga för stötar, slag och/eller värme.\nKlassdelning 1.1–1.6.' },
    { id: 'klass-2-1', category: 'Klasser', front: 'Klass 2.1', back: 'Brandfarliga gaser.\n\nRisk för brand, explosion, kvävning, bränn-/köldskador.\nKan vara trycksatt.' },
    { id: 'klass-2-2', category: 'Klasser', front: 'Klass 2.2', back: 'Ej brandfarliga, ej giftiga gaser.\n\nRisk för kvävning, köldskador.\nKan vara trycksatt.' },
    { id: 'klass-2-3', category: 'Klasser', front: 'Klass 2.3', back: 'Giftiga gaser.\n\nRisk för förgiftning.\nAnvänd flyktutrustning.' },
    { id: 'klass-3', category: 'Klasser', front: 'Klass 3', back: 'Brandfarliga vätskor.\n\nT.ex. bensin (UN 1203), diesel (UN 1202), alkylat.\nEtikett nr 3.' },
    { id: 'klass-4-1', category: 'Klasser', front: 'Klass 4.1', back: 'Brandfarliga fasta ämnen, självreaktiva ämnen, polymeriserande ämnen och fasta okänsliggjorda explosivämnen.' },
    { id: 'klass-4-2', category: 'Klasser', front: 'Klass 4.2', back: 'Självantändande ämnen.\n\nRisk för brand vid skadat kolli eller utspillt innehåll.' },
    { id: 'klass-4-3', category: 'Klasser', front: 'Klass 4.3', back: 'Ämnen som utvecklar brandfarlig gas vid kontakt med vatten.\n\nÅtgärd: håll torrt — täck över utläckt ämne.' },
    { id: 'klass-5-1', category: 'Klasser', front: 'Klass 5.1', back: 'Oxiderande ämnen.\n\nRisk för häftig reaktion vid kontakt med brännbara/brandfarliga ämnen.\nUndvik blandning med t.ex. sågspån.' },
    { id: 'klass-5-2', category: 'Klasser', front: 'Klass 5.2', back: 'Organiska peroxider.\n\nRisk för sönderfall under värmeutveckling.\nUndvik blandning med brännbara.' },
    { id: 'klass-6-1', category: 'Klasser', front: 'Klass 6.1', back: 'Giftiga ämnen.\n\nRisk vid inandning, hudkontakt eller förtäring.\nAnvänd flyktutrustning.' },
    { id: 'klass-6-2', category: 'Klasser', front: 'Klass 6.2', back: 'Smittförande ämnen.\n\nKan orsaka allvarlig sjukdom hos människor eller djur.' },
    { id: 'klass-7', category: 'Klasser', front: 'Klass 7', back: 'Radioaktiva ämnen (7A, 7B, 7C, 7D) + Fissila ämnen (7E).\n\nÅtgärd: begränsa exponeringstiden.' },
    { id: 'klass-8', category: 'Klasser', front: 'Klass 8', back: 'Frätande ämnen.\n\nRisk för frätskador.\nKan reagera häftigt med varandra, vatten och andra ämnen.' },
    { id: 'klass-9', category: 'Klasser', front: 'Klass 9', back: 'Övriga farliga ämnen och föremål (9, 9A).\n\nT.ex. miljöfarliga ämnen, litiumbatterier.' },

    /* ─── Åtgärder vid olycka (Skriftliga Instruktioner) ─── */
    { id: 'atg-broms', category: 'Vid olycka', front: 'Första åtgärd vid olycka/tillbud', back: 'Ansätt parkeringsbromsen,\nstäng av motorn,\nbryt strömmen från batteriet med huvudströmbrytaren.' },
    { id: 'atg-tand', category: 'Vid olycka', front: 'Antändningskällor — vad gäller?', back: 'Undvik alla antändningskällor:\n• rökning\n• elektroniska cigaretter\n• elektrisk utrustning får inte startas' },
    { id: 'atg-info', category: 'Vid olycka', front: 'Information till räddningstjänst', back: 'Informera berörd räddningstjänst.\nLämna så mycket upplysningar som möjligt om olyckan och särskilt om de inblandade ämnena.' },
    { id: 'atg-vast', category: 'Vid olycka', front: 'Synlighet vid olycka', back: 'Ta på varningsvästen.\nPlacera ut de fristående varningsanordningarna på lämpligt sätt.' },
    { id: 'atg-godsdek', category: 'Vid olycka', front: 'Godsdeklarationer — hantering', back: 'Håll godsdeklarationerna lätt tillgängliga när räddningspersonal anländer.' },
    { id: 'atg-utspilld', category: 'Vid olycka', front: 'Utspillda ämnen', back: 'Gå inte i och vidrör inte utspillda ämnen.\nUndvik att andas in gaser, rök, damm och ångor — vistas inte på läsidan.' },
    { id: 'atg-brand-dack', category: 'Vid olycka', front: 'Brand i däck, bromsar, motor', back: 'Använd brandsläckarna — förutsatt att det är lämpligt och säkert.' },
    { id: 'atg-brand-last', category: 'Vid olycka', front: 'Brand i lastutrymmet', back: 'Ska INTE bekämpas av medlemmar i fordonsbesättningen.' },

    /* ─── Utrustning på transportenheten ─── */
    { id: 'utr-fordon', category: 'Utrustning', front: 'Utrustning per fordon', back: '• Stoppklots (storlek anpassad efter totalvikt och hjuldiameter)\n• Två fristående varningsanordningar\n• Vätska för ögonsköljning*\n\n* Krävs inte för etikettförlagorna 1, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3' },
    { id: 'utr-besattning', category: 'Utrustning', front: 'Utrustning per besättningsmedlem', back: '• Varningsväst\n• Bärbar ljuskälla\n• Ett par skyddshandskar\n• Ögonskydd' },
    { id: 'utr-flykt', category: 'Utrustning', front: 'Flyktutrustning — när krävs?', back: 'För varje besättningsmedlem vid transport av etikettförlagorna 2.3 (giftig gas) eller 6.1 (giftiga ämnen).' },
    { id: 'utr-skyffel', category: 'Utrustning', front: 'Skyffel, brunnstätning, uppsamlingskärl — när krävs?', back: 'Endast för fasta ämnen och vätskor med etikettförlagorna 3, 4.1, 4.3, 8 eller 9.' },

    /* ─── Drivmedelsdunk ─── */
    { id: 'dunk-60l', category: 'Drivmedelsdunk', front: 'Hur mycket drivmedel får jag som FM-förare medföra?', back: '60 liter i bärbara bränslebehållare (t.ex. dunk).\n\nGäller efter fordonsutbildning. Inkluderar drivmedel till t.ex. motorsågar.\n\nMer kräver FMFG1000 eller ADR.' },
    { id: 'dunk-krav', category: 'Drivmedelsdunk', front: 'Drivmedelsdunkar ska alltid vara?', back: 'A) Typgodkända\nB) Etiketterade\nC) Märkta\n\nSamtliga krav ska uppfyllas.' },
    { id: 'dunk-godkand', category: 'Drivmedelsdunk', front: 'Typgodkänd dunk — vad letar man efter?', back: 'UN-godkännandemärkning. Inleds med "Un"-symbolen någonstans på dunken.' },
    { id: 'dunk-etikett', category: 'Drivmedelsdunk', front: 'Etikett på drivmedelsdunk', back: 'Etikett nr 3 — för brandfarliga vätskor.' },
    { id: 'dunk-markbricka', category: 'Drivmedelsdunk', front: 'Märkbricka — vad ska den innehålla?', back: 'UN-nummer + ämnesnamn.\n\nPetroleumprodukter ska även vara märkta med "fisken & trädet" (miljöfarligt).' },
    { id: 'dunk-sluten', category: 'Drivmedelsdunk', front: 'Hur ska dunken vara försluten?', back: 'Enligt tillverkarens anvisning — "sprinten" på.' },
    { id: 'dunk-bensin', category: 'Drivmedelsdunk', front: 'UN-nummer för bensin', back: 'UN 1203 — Petrol / Bensin\n\nKlass 3 (brandfarlig vätska).' },
    { id: 'dunk-diesel', category: 'Drivmedelsdunk', front: 'UN-nummer för diesel', back: 'UN 1202 — Diesel\n\nKlass 3 (brandfarlig vätska).' },

    /* ─── Ansvarskoder & dokumentation ─── */
    { id: 'ansvar-koder', category: 'Ansvar & dokumentation', front: 'Ansvarskoder enligt ADR-S', back: 'A — Avsändare\nB — Transportör / åkeri\nC — Förare\nD — Mottagare\nE — Annan besättningsmedlem\nF — Annan delaktig (lastare, förpackare, fyllare, lossare)' },
    { id: 'godsdek-innehall', category: 'Ansvar & dokumentation', front: 'Godsdeklaration — obligatoriska uppgifter', back: '• UN-nummer\n• Officiell transportbenämning\n• Etikettförlaga/or\n• Förpackningsgrupp\n• Nettovikt (klass 1)\n• Ev. kontroll-/nödlägestemperatur\n• Ev. tunnelrestriktionskod' },
    { id: 'godsdek-saknas', category: 'Ansvar & dokumentation', front: 'Godsdeklaration saknas — vad blir botskostnaden?', back: 'Förare (C): 4 000 kr\nAnnan delaktig (F): 4 000 kr' },
    { id: 'godsdek-brist', category: 'Ansvar & dokumentation', front: 'Godsdeklaration bristfällig (3+ brister i obligatoriska uppgifter)', back: 'Förare (C): 4 000 kr\nAnnan delaktig (F): 4 000 kr' },

    /* ─── Allmänna åtgärder ─── */
    { id: 'tagskydd', category: 'Allmänna åtgärder', front: 'När gäller "Ta skydd"?', back: 'Klasser 1, 1.4, 2.1, 2.2, 2.3 och 3.\n\nVid explosiva ämnen (1.5/1.6): stå inte nära fönster.' },
    { id: 'lagomraden', category: 'Allmänna åtgärder', front: 'När gäller "Undvik lågt belägna områden"?', back: 'Klasser 2.1 (brandfarlig gas), 2.2, 2.3 (giftig gas) och 3 (brandfarlig vätska).\n\nÅngor är tyngre än luft.' }
  ],

  exam: [
    { q: 'Vilken klass är "Brandfarliga vätskor"?',
      options: ['Klass 2', 'Klass 3', 'Klass 4.1', 'Klass 8'], correct: 1 },
    { q: 'Vilken klass är "Giftiga gaser"?',
      options: ['Klass 2.1', 'Klass 2.2', 'Klass 2.3', 'Klass 6.1'], correct: 2 },
    { q: 'Vilken klass är "Frätande ämnen"?',
      options: ['Klass 5.1', 'Klass 7', 'Klass 8', 'Klass 9'], correct: 2 },
    { q: 'UN-nummer 1203 — vilket ämne?',
      options: ['Diesel', 'Bensin (petrol)', 'Fotogen', 'Etanol'], correct: 1 },
    { q: 'UN-nummer 1202 — vilket ämne?',
      options: ['Bensin', 'Diesel', 'Lättolja', 'Alkylat'], correct: 1 },
    { q: 'Vilken etikett gäller för en drivmedelsdunk med bensin?',
      options: ['Etikett nr 2', 'Etikett nr 3', 'Etikett nr 4', 'Etikett nr 8'], correct: 1 },
    { q: 'Hur mycket drivmedel får en fordonsutbildad FM-förare medföra i dunkar?',
      options: ['30 liter', '60 liter', '120 liter', 'Obegränsat'], correct: 1 },
    { q: 'Vad är de tre A/B/C-kraven på en drivmedelsdunk?',
      options: ['Typgodkänd, etiketterad, märkt', 'Tom, ren, märkt', 'Plomberad, etiketterad, säkrad', 'Typgodkänd, ren, dokumenterad'], correct: 0 },
    { q: 'Vad är den första åtgärden vid olycka med farligt gods?',
      options: ['Ringa polisen', 'Ansätt parkeringsbromsen, stäng av motorn och bryt strömmen', 'Försök släcka direkt', 'Lasta om godset'], correct: 1 },
    { q: 'Brand i lastutrymmet — vad gör fordonsbesättningen?',
      options: ['Använder brandsläckarna direkt', 'Försöker släcka tills räddningstjänst kommer', 'Ska INTE bekämpa branden', 'Tar ut godset först'], correct: 2 },
    { q: 'Brand i däck, bromsar eller motor — vad gäller?',
      options: ['Försök släcka med brandsläckarna om lämpligt och säkert', 'Lämna fordonet omedelbart', 'Vänta på räddningstjänst', 'Häll vatten över'], correct: 0 },
    { q: 'Vilken utrustning krävs per besättningsmedlem?',
      options: ['Varningsväst, ficklampa, handskar, ögonskydd', 'Bara varningsväst', 'Skyddsmask + handskar', 'Hjälm + bälte'], correct: 0 },
    { q: 'När krävs flyktutrustning för varje besättningsmedlem?',
      options: ['Alltid', 'Vid klass 3 och 8', 'Vid etikettförlagorna 2.3 eller 6.1', 'Vid klass 1'], correct: 2 },
    { q: 'Vid en olycka med klass 2.1 (brandfarlig gas) — vad gäller utöver "Ta skydd"?',
      options: ['Stanna kvar i fordonet', 'Undvik lågt belägna områden', 'Häll vatten på behållaren', 'Vänta på vinden'], correct: 1 },
    { q: 'Vid utspillt ämne — vad gäller?',
      options: ['Försök samla upp med händerna', 'Gå inte i och vidrör inte; vistas ej på läsidan', 'Spola direkt med vatten', 'Sprid med skyffel'], correct: 1 },
    { q: 'Vilken ansvarskod står "C" för?',
      options: ['Avsändare', 'Transportör/åkeri', 'Förare', 'Mottagare'], correct: 2 },
    { q: 'Vilken ansvarskod står "A" för?',
      options: ['Avsändare', 'Annan besättningsmedlem', 'Mottagare', 'Lossare'], correct: 0 },
    { q: 'Godsdeklaration saknas — vilken bot för förare (C)?',
      options: ['1 000 kr', '2 000 kr', '3 000 kr', '4 000 kr'], correct: 3 },
    { q: 'Vilken klass är "Oxiderande ämnen"?',
      options: ['Klass 4.2', 'Klass 5.1', 'Klass 5.2', 'Klass 6.1'], correct: 1 },
    { q: 'Vilken klass är "Smittförande ämnen"?',
      options: ['Klass 6.1', 'Klass 6.2', 'Klass 7', 'Klass 9'], correct: 1 },
    { q: 'Vad gäller för klass 4.3 vid läckage?',
      options: ['Spola med vatten', 'Håll torrt — täck över ämnet', 'Bränn upp', 'Späd med syra'], correct: 1 },
    { q: 'Klass 7 — radioaktiva ämnen — vilken tilläggsanvisning gäller?',
      options: ['Använd flyktutrustning', 'Ta skydd', 'Begränsa exponeringstiden', 'Undvik blandning med sågspån'], correct: 2 },
    { q: 'Vilka klasser kräver "vätska för ögonsköljning" på fordonet?',
      options: ['Alla utom 1, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3', 'Endast klass 8', 'Alla klasser', 'Endast klass 3'], correct: 0 },
    { q: 'Vad ska godsdeklarationen vara när räddningspersonal anländer?',
      options: ['Insamlad och bortskickad', 'Lätt tillgänglig', 'Förseglad', 'I bagaget'], correct: 1 },
    { q: 'Vid antändningskällor — vad gäller?',
      options: ['Undvik rökning och elektronisk utrustning som inte är på', 'Bara cigaretter är okej', 'Det räcker att stå utomhus', 'Inga restriktioner'], correct: 0 }
  ]
};
