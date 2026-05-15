/* APP-6 data — minneskort + provfrågor för militära symboler enligt APP-6B/C.
   Källa: Lathund symboler på lägeskarta (APP-6B/C, MIL-STD-2525).
   Inte fastställt av FM. Repetitions-/utbildningssyfte.
   Komplement till befintliga minkarta-verktyget.
*/
window.APP6_DATA = {
  meta: {
    title: 'APP-6',
    subtitle: 'Militära symboler — minneskort & prov',
    source: 'NATO APP-6B/C, US MIL-STD-2525'
  },

  cards: [
    /* ─── Symbolens grunder ─── */
    { id: 'delar', category: 'Grunder', front: 'En APP-6-symbols tre delar', back: '1. Ramen (Frame)\n2. Ikonen (Icon)\n3. Tilläggsinformation (Modifiers)' },
    { id: 'battle-dim', category: 'Grunder', front: 'Battle Dimension', back: 'Fysiska domäner där symbolerna grupperas:\n• Air (luft)\n• Ground (mark)\n• Sea Surface (sjö)\n• Sea Subsurface (undervatten)\n• Equipment (materiel)' },
    { id: 'affiliation', category: 'Grunder', front: 'Affiliation', back: 'Relationen till oss:\n• Vän (Friend)\n• Fiende (Hostile)\n• Neutral (Neutral)\n• Okänd (Unknown)' },
    { id: 'tumregel-luft', category: 'Grunder', front: 'Tumregel — ramens form', back: 'Öppen nertill = i luften\nÖppen upptill = under vattenytan' },

    /* ─── Affiliation & färg ─── */
    { id: 'van-farg', category: 'Affiliation & färg', front: 'Vän (Friend) — färg', back: 'Blå' },
    { id: 'fiende-farg', category: 'Affiliation & färg', front: 'Fiende (Hostile) — färg', back: 'Röd' },
    { id: 'neutral-farg', category: 'Affiliation & färg', front: 'Neutral (Neutral) — färg', back: 'Grön' },
    { id: 'okand-farg', category: 'Affiliation & färg', front: 'Okänd (Unknown) — färg', back: 'Gul' },

    /* ─── Ram-former ─── */
    { id: 'ram-van-luft', category: 'Ramens form', front: 'Vän + Luft', back: 'Blå, halvcirkel öppen nertill' },
    { id: 'ram-fiende-luft', category: 'Ramens form', front: 'Fiende + Luft', back: 'Röd, "hus"-form (rektangel med trekantigt tak), öppen nertill' },
    { id: 'ram-van-mark', category: 'Ramens form', front: 'Vän + Mark', back: 'Blå, rektangel' },
    { id: 'ram-fiende-mark', category: 'Ramens form', front: 'Fiende + Mark', back: 'Röd, romb (diamond)' },
    { id: 'ram-neutral', category: 'Ramens form', front: 'Neutral — alla domäner', back: 'Grön, kvadrat' },
    { id: 'ram-okand', category: 'Ramens form', front: 'Okänd — alla domäner', back: 'Gul, "moln"/fyrklöver-form' },
    { id: 'ram-van-sjo', category: 'Ramens form', front: 'Vän + Sjö (yta)', back: 'Blå, cirkel' },
    { id: 'ram-fiende-sjo', category: 'Ramens form', front: 'Fiende + Sjö (yta)', back: 'Röd, romb' },
    { id: 'ram-van-uv', category: 'Ramens form', front: 'Vän + Undervatten', back: 'Blå, halvcirkel öppen upptill' },
    { id: 'ram-van-mtrl', category: 'Ramens form', front: 'Vän + Materiel', back: 'Blå, cirkel' },

    /* ─── Status (linje) ─── */
    { id: 'heldragen', category: 'Status', front: 'Heldragen linje — vad betyder?', back: 'Befintlig (Present) / Bekräftad (Confirmed)' },
    { id: 'streckad', category: 'Status', front: 'Streckad linje — vad betyder?', back: 'Planerad (Planned), Misstänkt (Suspect),\nAntagen (Assumed) eller Förväntad (Anticipated)' },

    /* ─── Förbandsstorlek ─── */
    { id: 'fs-omgang', category: 'Förbandsstorlek', front: 'Ø (cirkel med streck)', back: 'Omgång / besättning (Team / Crew)' },
    { id: 'fs-grupp', category: 'Förbandsstorlek', front: '● (en prick)', back: 'Grupp (Squad)' },
    { id: 'fs-tropp', category: 'Förbandsstorlek', front: '●● (två prickar)', back: 'Tropp (Section)' },
    { id: 'fs-pluton', category: 'Förbandsstorlek', front: '●●● (tre prickar)', back: 'Pluton (Platoon)' },
    { id: 'fs-komp', category: 'Förbandsstorlek', front: '| (ett streck)', back: 'Kompani (Company)' },
    { id: 'fs-bat', category: 'Förbandsstorlek', front: '|| (två streck)', back: 'Bataljon (Battalion)' },
    { id: 'fs-reg', category: 'Förbandsstorlek', front: '||| (tre streck)', back: 'Regemente (Regiment)' },
    { id: 'fs-brig', category: 'Förbandsstorlek', front: 'X', back: 'Brigad (Brigade)' },
    { id: 'fs-div', category: 'Förbandsstorlek', front: 'XX', back: 'Division (Division)' },
    { id: 'fs-kar', category: 'Förbandsstorlek', front: 'XXX', back: 'Kår (Corps)' },
    { id: 'fs-arme', category: 'Förbandsstorlek', front: 'XXXX', back: 'Armé (Army)' },
    { id: 'fs-armegrp', category: 'Förbandsstorlek', front: 'XXXXX', back: 'Armégrupp (Army Group)' },

    /* ─── Transportsätt (materiel) ─── */
    { id: 'tp-hjul-vag', category: 'Transportsätt', front: 'Hjul (väg) — symbol', back: 'Liten cirkel + streck under ramen (WHEELED / LIMITED)' },
    { id: 'tp-band', category: 'Transportsätt', front: 'Band', back: 'Streck under ramen (TRACKED)' },
    { id: 'tp-dragen', category: 'Transportsätt', front: 'Dragen', back: 'TOWED — pil/krok under ramen' },
    { id: 'tp-jarnvag', category: 'Transportsätt', front: 'Järnväg', back: 'RAIL — räls-symbol under ramen' },
    { id: 'tp-snovag', category: 'Transportsätt', front: 'Översnö', back: 'OVER THE SNOW — våg-/skidsymbol' },

    /* ─── Stab ─── */
    { id: 'stab', category: 'Stab', front: 'Hur markeras en stab/högkvarter?', back: 'Symbolen får en stolpe (flagga). Positionen är vid stolpens startpunkt — INTE i symbolens centrum.' },

    /* ─── Placering på kartan ─── */
    { id: 'placering', category: 'Placering', front: 'Var i symbolen sitter exakta positionen?', back: 'Mitt i symbolens centrum.\n\nUndantag: stab — vid stolpens startpunkt.' },
    { id: 'offset', category: 'Placering', front: 'Offset indicator', back: 'Om det inte finns plats: använd linje från symbolen till verklig position.' },

    /* ─── Vanliga ikoner: luft ─── */
    { id: 'ikon-jakt', category: 'Vanliga ikoner — Luft', front: 'F (i luftsymbol)', back: 'Jakt / Fighter\n(Note: F kan även vara Fixed Wing-bokstav när rolldetalj saknas)' },
    { id: 'ikon-bomb', category: 'Vanliga ikoner — Luft', front: 'B (i luftsymbol)', back: 'Bomb / Bomber' },
    { id: 'ikon-attack', category: 'Vanliga ikoner — Luft', front: 'A (i luftsymbol)', back: 'Attack / Strike' },
    { id: 'ikon-transport', category: 'Vanliga ikoner — Luft', front: 'C (i luftsymbol)', back: 'Transport / Cargo Airlift' },
    { id: 'ikon-medevac', category: 'Vanliga ikoner — Luft', front: '+ (i luftsymbol)', back: 'Sjuktransport (Medevac)' },
    { id: 'ikon-spaning-luft', category: 'Vanliga ikoner — Luft', front: 'R (i luftsymbol)', back: 'Spaning (Reconnaissance)' },
    { id: 'ikon-uav', category: 'Vanliga ikoner — Luft', front: 'UAV — symbol', back: 'Drone / Unmanned Aerial Vehicle\n(Bog-/fluga-form i luftramen)' },

    /* ─── Vanliga ikoner: mark ─── */
    { id: 'ikon-inf', category: 'Vanliga ikoner — Mark', front: 'X (kryss i mark-rektangel)', back: 'Infanteri (Infantry)' },
    { id: 'ikon-pansar', category: 'Vanliga ikoner — Mark', front: 'Oval i mark-rektangel', back: 'Pansar (Armor)' },
    { id: 'ikon-mekinf', category: 'Vanliga ikoner — Mark', front: 'X + oval = ?', back: 'Mekaniserat infanteri (Mechanized Infantry)' },
    { id: 'ikon-pv', category: 'Vanliga ikoner — Mark', front: 'Triangel i mark-rektangel', back: 'Pansarvärn (Antiarmor)' },
    { id: 'ikon-art', category: 'Vanliga ikoner — Mark', front: '● (fylld prick) i mark-rektangel', back: 'Artilleri (Field Artillery)' },
    { id: 'ikon-grk', category: 'Vanliga ikoner — Mark', front: '↑ (uppåtpil) i mark-rektangel', back: 'Granatkastare (Mortar)' },
    { id: 'ikon-lv', category: 'Vanliga ikoner — Mark', front: 'Halvcirkel/båge i mark-rektangel', back: 'Luftvärn (Air Defense)' },
    { id: 'ikon-ing', category: 'Vanliga ikoner — Mark', front: 'E / "fyrkant" i mark-rektangel', back: 'Ingenjör (Engineer)' },
    { id: 'ikon-spaning-mark', category: 'Vanliga ikoner — Mark', front: 'Diagonalt streck i mark-rektangel', back: 'Spaning (Reconnaissance)' },
    { id: 'ikon-sjv', category: 'Vanliga ikoner — Mark', front: '+ (kors) i mark-rektangel', back: 'Sjukvård (Medical)' },

    /* ─── Text-placering ─── */
    { id: 'text-W', category: 'Text-placering (Mark)', front: 'Bokstav W', back: 'Tidsangivelse' },
    { id: 'text-T', category: 'Text-placering (Mark)', front: 'Bokstav T', back: 'Förbandsbeteckning' },
    { id: 'text-M', category: 'Text-placering (Mark)', front: 'Bokstav M', back: 'Högre chef' },
    { id: 'text-Z', category: 'Text-placering (Mark)', front: 'Bokstav Z', back: 'Hastighet' },
    { id: 'text-X-Y', category: 'Text-placering (Mark)', front: 'X / Y', back: 'Höjd / Position' }
  ],

  exam: [
    { q: 'Vilka tre delar har en APP-6-symbol?',
      options: ['Ram, ikon, tilläggsinformation', 'Färg, form, storlek', 'Position, riktning, hastighet', 'Vän/fiende, mark/luft, storlek'], correct: 0 },
    { q: 'Vilken färg använder Vän (Friend)?',
      options: ['Blå', 'Grön', 'Röd', 'Gul'], correct: 0 },
    { q: 'Vilken färg använder Fiende (Hostile)?',
      options: ['Blå', 'Grön', 'Röd', 'Gul'], correct: 2 },
    { q: 'Vilken färg använder Neutral?',
      options: ['Blå', 'Grön', 'Röd', 'Gul'], correct: 1 },
    { q: 'Vilken färg använder Okänd (Unknown)?',
      options: ['Blå', 'Grön', 'Röd', 'Gul'], correct: 3 },
    { q: 'Vilken form har "Vän + Mark"?',
      options: ['Halvcirkel öppen nertill', 'Romb', 'Rektangel', 'Cirkel'], correct: 2 },
    { q: 'Vilken form har "Fiende + Mark"?',
      options: ['Hus-form', 'Romb', 'Rektangel', 'Halvcirkel öppen upptill'], correct: 1 },
    { q: 'Vad betyder heldragen linje runt en symbol?',
      options: ['Planerad', 'Misstänkt', 'Befintlig / Bekräftad', 'Förstörd'], correct: 2 },
    { q: 'Vad betyder streckad linje runt en symbol?',
      options: ['Befintlig / Bekräftad', 'Planerad / Misstänkt / Antagen / Förväntad', 'Förstörd', 'Stab'], correct: 1 },
    { q: 'Vad betyder "Öppen nertill" på ramen?',
      options: ['I luften', 'Under vatten', 'På marken', 'Stab'], correct: 0 },
    { q: 'Vad betyder "Öppen upptill" på ramen?',
      options: ['I luften', 'Under vatten', 'På marken', 'Stab'], correct: 1 },
    { q: 'Förbandsstorlek "XX" — vilken nivå?',
      options: ['Brigad', 'Division', 'Kår', 'Armé'], correct: 1 },
    { q: 'Förbandsstorlek "|||" — vilken nivå?',
      options: ['Kompani', 'Bataljon', 'Regemente', 'Brigad'], correct: 2 },
    { q: 'Förbandsstorlek tre prickar ●●● — vilken nivå?',
      options: ['Grupp', 'Tropp', 'Pluton', 'Kompani'], correct: 2 },
    { q: 'Förbandsstorlek "|" — vilken nivå?',
      options: ['Pluton', 'Kompani', 'Bataljon', 'Regemente'], correct: 1 },
    { q: 'Hur markeras en stab?',
      options: ['Med en stjärna i mitten', 'Med en stolpe — flagga', 'Med dubbla streck', 'Med kryss över symbolen'], correct: 1 },
    { q: 'Var sitter den exakta positionen för en stab på kartan?',
      options: ['Mitt i symbolen', 'Vid stolpens startpunkt', 'Övre vänstra hörnet', 'Längst ner på flaggan'], correct: 1 },
    { q: 'Vad är "Mekaniserat infanteri" som kombination?',
      options: ['Pansar (oval) + Infanteri (X)', 'Pansar + Pansarvärn', 'Infanteri + Granatkastare', 'Spaning + Pansar'], correct: 0 },
    { q: 'Vilken bokstav i lufttsymbol betyder "Sjuktransport"?',
      options: ['B', 'A', 'C', '+'], correct: 3 },
    { q: 'Bokstavsplacering "W" i markförbandsymbol?',
      options: ['Tidsangivelse', 'Förbandsbeteckning', 'Hastighet', 'Höjd'], correct: 0 }
  ]
};
