// Hämta alla ortnamn från Lantmäteriet — kör: node fetch-ortnamn.js
const https = require('https');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Ange Geotorget-lösenord: ', (pass) => {
    rl.close();
    process.stdout.write('\n');
    const auth = Buffer.from('nijoda@gmail.com:' + pass).toString('base64');

    const searches = [
        // Sjöar
        { prefix: 'sjo', namn: 'sjö', typ: 'Hav och sjö' },
        { prefix: 'sjo_vatten', namn: 'vatten', typ: 'Hav och sjö' },
        { prefix: 'sjo_trask', namn: 'träsk', typ: 'Hav och sjö' },
        { prefix: 'sjo_tjarn', namn: 'tjärn', typ: 'Hav och sjö' },
        { prefix: 'sjo_vik', namn: 'vik', typ: 'Hav och sjö' },
        { prefix: 'sjo_fjard', namn: 'fjärd', typ: 'Hav och sjö' },
        { prefix: 'sjo_sund', namn: 'sund', typ: 'Hav och sjö' },
        { prefix: 'sjo_damm', namn: 'damm', typ: 'Hav och sjö' },
        { prefix: 'sjo_gol', namn: 'göl', typ: 'Hav och sjö' },
        // Öar
        { prefix: 'oar_on', namn: 'ön', typ: 'Natur- och terrängnamn' },
        { prefix: 'oar_holme', namn: 'holme', typ: 'Natur- och terrängnamn' },
        { prefix: 'oar_skar', namn: 'skär', typ: 'Natur- och terrängnamn' },
        { prefix: 'oar_grund', namn: 'grund', typ: 'Natur- och terrängnamn' },
        { prefix: 'oar_kobbe', namn: 'kobbe', typ: 'Natur- och terrängnamn' },
        { prefix: 'oar_udde', namn: 'udde', typ: 'Natur- och terrängnamn' },
        { prefix: 'oar_land', namn: 'land', typ: 'Natur- och terrängnamn' },
        // Berg och höjder
        { prefix: 'berg_berg', namn: 'berg', typ: 'Natur- och terrängnamn' },
        { prefix: 'berg_as', namn: 'ås', typ: 'Natur- och terrängnamn' },
        { prefix: 'berg_kulle', namn: 'kulle', typ: 'Natur- och terrängnamn' },
        { prefix: 'berg_hojd', namn: 'höjd', typ: 'Natur- och terrängnamn' },
        { prefix: 'berg_fjall', namn: 'fjäll', typ: 'Natur- och terrängnamn' },
        { prefix: 'berg_topp', namn: 'topp', typ: 'Natur- och terrängnamn' },
        { prefix: 'berg_klint', namn: 'klint', typ: 'Natur- och terrängnamn' },
        { prefix: 'berg_knalle', namn: 'knalle', typ: 'Natur- och terrängnamn' },
        { prefix: 'berg_klev', namn: 'klev', typ: 'Natur- och terrängnamn' },
        { prefix: 'berg_brant', namn: 'brant', typ: 'Natur- och terrängnamn' },
        { prefix: 'berg_klippa', namn: 'klippa', typ: 'Natur- och terrängnamn' },
    ];

    if (!fs.existsSync('raw')) fs.mkdirSync('raw');

    let searchIdx = 0;

    function fetchPage(search, offset) {
        const params = new URLSearchParams({
            namn: search.namn,
            match: 'contains',
            namntyp: search.typ,
            maxHits: '400',
            offset: String(offset)
        });
        const url = `/distribution/produkter/ortnamn/v2.2/kriterier?${params}`;

        const opts = {
            hostname: 'api.lantmateriet.se',
            path: url,
            headers: {
                'Authorization': 'Basic ' + auth,
                'Accept': 'application/xml'
            }
        };

        https.get(opts, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                const file = `raw/${search.prefix}_${offset}.xml`;
                fs.writeFileSync(file, data);

                // Count matches
                const count = (data.match(/<OrtnamnMember>/g) || []).length;
                const total = (data.match(/totaltAntal="(\d+)"/) || [])[1] || '?';
                console.log(`  ${search.prefix} offset=${offset} -> ${count} (totalt: ${total})`);

                if (count >= 400) {
                    setTimeout(() => fetchPage(search, offset + 400), 300);
                } else {
                    searchIdx++;
                    if (searchIdx < searches.length) {
                        console.log(`\n[${searchIdx + 1}/${searches.length}] Söker "${searches[searchIdx].namn}" (${searches[searchIdx].typ})`);
                        setTimeout(() => fetchPage(searches[searchIdx], 0), 300);
                    } else {
                        console.log('\nKlart! Kör nu: node parse-ortnamn-all.js');
                    }
                }
            });
        }).on('error', (e) => {
            console.error('Fel:', e.message);
            process.exit(1);
        });
    }

    // Test connection first
    const testParams = new URLSearchParams({ namn: 'Stockholm', maxHits: '1' });
    https.get({
        hostname: 'api.lantmateriet.se',
        path: `/distribution/produkter/ortnamn/v2.2/kriterier?${testParams}`,
        headers: { 'Authorization': 'Basic ' + auth, 'Accept': 'application/xml' }
    }, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
            if (d.includes('Fault') || d.includes('Invalid')) {
                console.error('Autentisering misslyckades!');
                process.exit(1);
            }
            console.log('Anslutning OK!\n');
            console.log(`[1/${searches.length}] Söker "${searches[0].namn}" (${searches[0].typ})`);
            fetchPage(searches[0], 0);
        });
    });
});
