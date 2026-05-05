// Smoke-test för skyttebok-sig.js. Körs utanför PWA — laddar modulen i en
// VM med Web Crypto + en localStorage-stub. Inte en del av appens runtime.
//
// Kör: `node verktyg/test-skyttebok-sig.js` från repo-roten.
//
// Verifierar Fas 1 + 2 + 3-flödet:
//   1. Generera eget nyckelpar
//   2. Exportera publik nyckel
//   3. Importera nyckeln som trusted i en "andra enhet"
//   4. Signera ett pass
//   5. Verifiera signaturen → grön (trusted)
//   6. Tampera med passet → röd (bruten signatur)
//   7. Ta bort trusted-key → gul (okänd signerare)

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SIG_JS = path.join(__dirname, '..', 'skyttebok-sig.js');

function newSandbox() {
    const ls = new Map();
    const localStorage = {
        get length() { return ls.size; },
        key(i) { return Array.from(ls.keys())[i] || null; },
        getItem(k) { return ls.has(k) ? ls.get(k) : null; },
        setItem(k, v) { ls.set(k, String(v)); },
        removeItem(k) { ls.delete(k); },
        clear() { ls.clear(); }
    };
    const sandbox = {
        crypto: globalThis.crypto,
        TextEncoder: globalThis.TextEncoder,
        TextDecoder: globalThis.TextDecoder,
        btoa: globalThis.btoa,
        atob: globalThis.atob,
        localStorage,
        console
    };
    sandbox.window = sandbox; // skyttebok-sig.js exporterar via window.SkyttebokSig
    vm.createContext(sandbox);
    const code = fs.readFileSync(SIG_JS, 'utf8');
    vm.runInContext(code, sandbox);
    return sandbox;
}

function assert(cond, msg) {
    if (!cond) throw new Error('FAIL: ' + msg);
    console.log('  OK  ' + msg);
}

(async () => {
    console.log('— Test 1: instruktör genererar nyckelpar —');
    const instruktor = newSandbox();
    const Sig = instruktor.SkyttebokSig;

    const self = await Sig.generateSelfKey('Sgt Andersson');
    assert(self.keyId.length === 16, 'keyId är 16 hex-tecken');
    assert(self.fingerprintFormatted.includes(' '), 'fingerprint är formaterad');
    assert(['Ed25519', 'ECDSA-P256'].includes(self.algo), 'algo är Ed25519 eller ECDSA-P256');
    console.log('  -> algo=' + self.algo + ', fingerprint=' + self.fingerprintFormatted);

    const reread = Sig.getSelf();
    assert(reread.keyId === self.keyId, 'getSelf() returnerar samma keyId');
    assert(reread.name === 'Sgt Andersson', 'visningsnamn lagrat');

    console.log('— Test 2: exportera publik nyckel —');
    const exported = await Sig.exportSelfPublicKeyPayload();
    assert(exported.format === 'sb-pubkey-v1', 'export-format korrekt');
    assert(exported.keyId === self.keyId, 'exporterad keyId matchar');
    assert(!exported.jwkPrivate, 'privata nyckeln läcker INTE i export');

    console.log('— Test 3: soldatens enhet importerar publik nyckel —');
    const soldat = newSandbox();
    const SigS = soldat.SkyttebokSig;
    const imported = await SigS.importTrustedKey(exported);
    assert(imported.keyId === self.keyId, 'importerad keyId matchar');
    const trusted = SigS.listTrusted();
    assert(trusted.length === 1, 'trusted-listan har 1 nyckel');

    console.log('— Test 3b: import med tamprad keyId måste avvisas —');
    const tampered = JSON.parse(JSON.stringify(exported));
    tampered.keyId = '0000000000000000';
    let threw = false;
    try { await SigS.importTrustedKey(tampered, { overwrite: true }); }
    catch (e) { threw = true; assert(/matchar inte/i.test(e.message), 'fel om fingerprint inte stämmer'); }
    assert(threw, 'import med fel fingerprint kastas');

    console.log('— Test 3c: dubbel-import utan overwrite kastar ALREADY_EXISTS —');
    let collisionErr = null;
    try { await SigS.importTrustedKey(exported); }
    catch (e) { collisionErr = e; }
    assert(collisionErr && collisionErr.code === 'ALREADY_EXISTS', 'kollisionsfel har code=ALREADY_EXISTS');
    assert(collisionErr.existing && collisionErr.existing.keyId === self.keyId, 'kollisionsfel har existing-info');

    console.log('— Test 4: instruktören signerar ett pass —');
    const pass = {
        id: 'pass-uuid-123',
        ovningNr: 5,
        datum: '2026-05-05',
        skott: 6,
        traff: 5,
        godkand: true,
        anteckning: 'Bra ställning',
        skapad: 1715000000000
    };
    const sigPayload = await Sig.signPass(pass);
    assert(sigPayload.sigVer === 'sb-sig-v1', 'sigVer korrekt');
    assert(sigPayload.signer.pubKeyId === self.keyId, 'signerns keyId i payload');
    assert(typeof sigPayload.sig === 'string' && sigPayload.sig.length > 40, 'sig är base64-sträng');

    console.log('— Test 5: soldatens enhet verifierar grön signatur —');
    const verifyOk = await SigS.verifySignature(sigPayload, pass);
    assert(verifyOk.valid === true, 'signatur är giltig');
    assert(verifyOk.trusted === true, 'signatur kommer från trusted-key (grön)');
    assert(verifyOk.signerName === 'Sgt Andersson', 'signerns namn återges');

    console.log('— Test 6: tampered pass → bruten signatur (röd) —');
    const tamperedPass = Object.assign({}, pass, { traff: 6 }); // 5 → 6
    const verifyTamper = await SigS.verifySignature(sigPayload, tamperedPass);
    assert(verifyTamper.valid === false, 'tampered pass: invalid');
    assert(/ändrats/.test(verifyTamper.reason), 'rätt felmeddelande för tampering');

    console.log('— Test 7: ta bort trusted → okänd signerare (gul) —');
    SigS.removeTrustedKey(self.keyId);
    assert(SigS.listTrusted().length === 0, 'trusted-listan tom efter remove');
    const verifyUnknown = await SigS.verifySignature(sigPayload, pass);
    assert(verifyUnknown.valid === false, 'utan trusted-key: invalid');
    assert(/Okänd signerare/.test(verifyUnknown.reason), 'rätt reason för okänd signerare');

    console.log('— Test 8: instruktören kan verifiera SIN EGEN signatur (självkontroll) —');
    const verifySelf = await Sig.verifySignature(sigPayload, pass);
    assert(verifySelf.valid === true, 'egen signatur är giltig');

    console.log('— Test 9: canonical JSON är deterministisk över key-ordning —');
    const a = Sig.canonicalJson({ b: 2, a: 1, c: { z: 9, a: 1 } });
    const b = Sig.canonicalJson({ c: { a: 1, z: 9 }, a: 1, b: 2 });
    assert(a === b, 'canonical-json sorterar nycklar konsekvent');
    assert(a === '{"a":1,"b":2,"c":{"a":1,"z":9}}', 'canonical-form matchar förväntat');

    console.log('— Test 10: exportAllTrustedKeys returnerar serialiserbara payloads —');
    // Använd soldat-sandboxen som har 0 keys efter Test 7-removal — importera om.
    await SigS.importTrustedKey(exported);
    const allKeys = SigS.exportAllTrustedKeys();
    assert(Array.isArray(allKeys), 'exportAllTrustedKeys returnerar array');
    assert(allKeys.length === 1, 'array har en post efter en import');
    assert(allKeys[0].format === 'sb-pubkey-v1', 'första posten har korrekt format');
    assert(allKeys[0].keyId === self.keyId, 'keyId matchar');
    assert(!allKeys[0].jwkPrivate, 'privata nyckeln läcker INTE');

    console.log('— Test 11: Fas 4 v2 round-trip — sig + trusted reser via export/import —');
    // Simulera: instruktör har genererat nyckel, signerat ett pass.
    // Soldatens enhet har importerat instruktörens publika nyckel.
    // Soldaten exporterar v2 → importerar på en annan enhet → samma badge-status.
    const sigPayloadFasFyra = await Sig.signPass(pass);
    // Simulera "soldatens enhet" med pass + sig + trusted-key.
    const enhet1 = newSandbox();
    const Sig1 = enhet1.SkyttebokSig;
    enhet1.localStorage.setItem('skyttebok_pass_' + pass.id, JSON.stringify(pass));
    Sig1.writeSig(pass.id, sigPayloadFasFyra);
    await Sig1.importTrustedKey(exported);

    const sigsBefore = Sig1.listAllSigs();
    const keysBefore = Sig1.exportAllTrustedKeys();
    assert(Object.keys(sigsBefore).length === 1, 'enhet1 har 1 sig');
    assert(keysBefore.length === 1, 'enhet1 har 1 trusted-key');

    // Bygg en mock-export från enhet1:s storage. (skyttebok.js
    // buildExportPayload är inte här, så vi gör det själva för test.)
    const exportV2 = {
        format: 'skyttebok-v2',
        exportedAt: new Date().toISOString(),
        displayName: null,
        pass: [pass],
        sakerhetsprov: null,
        signatures: sigsBefore,
        trustedKeys: keysBefore
    };

    // "Ny enhet" — tom soldat-sandbox.
    const enhet2 = newSandbox();
    const Sig2 = enhet2.SkyttebokSig;
    assert(enhet2.localStorage.length === 0, 'enhet2 är tom innan import');

    // Simulera importens kärna: pass + sig + trusted.
    enhet2.localStorage.setItem('skyttebok_pass_' + pass.id, JSON.stringify(exportV2.pass[0]));
    Sig2.writeSig(pass.id, exportV2.signatures[pass.id]);
    for (const pk of exportV2.trustedKeys) {
        await Sig2.importTrustedKey(pk, { overwrite: true });
    }

    // Verifiera på enhet2: ska bli giltig + trusted = grön badge.
    const sigOnE2 = Sig2.readSig(pass.id);
    const verifyE2 = await Sig2.verifySignature(sigOnE2, pass);
    assert(verifyE2.valid === true, 'sig är giltig på enhet2 efter v2-import');
    assert(verifyE2.trusted === true, 'trusted-key reste med — grön badge på enhet2');
    assert(verifyE2.signerName === 'Sgt Andersson', 'signerns namn återges på enhet2');

    console.log('— Test 12: Fas 5 — säkerhetsprov-signering & "officiellt godkänd" —');
    // Säkerhetsprov-objektet har inget id-fält. UI-koden bygger ett
    // signable {id: 'sp_bas', datum, godkand, instruktor, anteckning}.
    // Hashen ska bli stabil över anrop.
    const spSignable = {
        id: 'sp_bas',
        datum: '2026-05-01',
        godkand: true,
        instruktor: 'Lt Bergström',
        anteckning: 'Genomförde alla 15 moment'
    };
    const spSig = await Sig.signPass(spSignable);
    assert(spSig.passId === 'sp_bas', 'sp-sig har passId=sp_bas');
    assert(spSig.signer.name === 'Sgt Andersson', 'signerns namn matchar');

    // Verifiera på enhet med trusted-key (soldat-sandbox med imported pubkey).
    const enhet3 = newSandbox();
    const Sig3 = enhet3.SkyttebokSig;
    await Sig3.importTrustedKey(exported);
    const spVerify = await Sig3.verifySignature(spSig, spSignable);
    assert(spVerify.valid === true, 'sp-sig giltig');
    assert(spVerify.trusted === true, 'sp-sig från trusted-key (= OFFICIELLT GODKÄND)');

    // Tampera med 'instruktor' (Fas 5 lade till det i hashable-listan).
    const spTampered = Object.assign({}, spSignable, { instruktor: 'Annat namn' });
    const spVerifyTamper = await Sig3.verifySignature(spSig, spTampered);
    assert(spVerifyTamper.valid === false,
        'tampering med instruktor-fältet bryter signaturen');

    // Tampera med 'godkand' (kritiskt fält — omöjligt att uppgradera EJ→G).
    const spTampered2 = Object.assign({}, spSignable, { godkand: false });
    const spVerifyTamper2 = await Sig3.verifySignature(spSig, spTampered2);
    assert(spVerifyTamper2.valid === false,
        'tampering med godkand-fältet bryter signaturen');

    console.log('— Test 13: Fas 1.5 — roster-import (bunt-import av flera nycklar) —');
    // Skapa två separata instruktörs-nyckelpar för att kunna testa
    // multi-key roster-flöde.
    const inst1 = newSandbox();
    const inst2 = newSandbox();
    const inst1Self = await inst1.SkyttebokSig.generateSelfKey('Sgt Andersson');
    const inst2Self = await inst2.SkyttebokSig.generateSelfKey('Lt Bergström');
    const inst1Pub = await inst1.SkyttebokSig.exportSelfPublicKeyPayload();
    const inst2Pub = await inst2.SkyttebokSig.exportSelfPublicKeyPayload();

    // Kompani-utgivare bygger en roster-fil med båda nycklarna.
    const rosterPayload = {
        format: 'sb-roster-v1',
        name: 'Kompani 3 / VT26',
        issuer: 'Cap N. Eriksson',
        issuedAt: '2026-01-15T08:00:00Z',
        validUntil: '2026-12-31T23:59:59Z',
        keys: [inst1Pub, inst2Pub]
    };

    // Soldatens enhet importerar rostern.
    const soldat2 = newSandbox();
    const SS = soldat2.SkyttebokSig;
    const rosterRes = await SS.importRosterFile(rosterPayload);
    assert(rosterRes.keyCount === 2, 'roster importerar 2 nycklar');
    assert(rosterRes.addedKeys === 2, 'båda är nya på enheten');
    assert(rosterRes.updatedKeys === 0, 'inga uppdaterades');

    const tList = SS.listTrusted();
    assert(tList.length === 2, 'trusted-listan har 2 nycklar efter roster-import');
    const inst1Entry = tList.filter(t => t.keyId === inst1Self.keyId)[0];
    assert(inst1Entry, 'instruktör 1:s nyckel finns i trusted-listan');
    assert(inst1Entry.rosterNames.includes('Kompani 3 / VT26'), 'rosterName finns');
    assert(inst1Entry.manuallyImported === false, 'roster-importerad nyckel är inte manuell');

    const rList = SS.listRosters();
    assert(rList.length === 1, 'listRosters returnerar 1 roster');
    assert(rList[0].keyCount === 2, 'roster-projektion visar 2 nycklar');
    assert(rList[0].validUntil === '2026-12-31T23:59:59Z', 'validUntil bevaras');

    console.log('— Test 14: Fas 1.5 — manuell import ovanpå roster bevarar rosterIds —');
    // Soldaten importerar inst1:s nyckel manuellt också (utöver rostern).
    await SS.importTrustedKey(inst1Pub, { overwrite: true });
    const tListAfter = SS.listTrusted();
    const inst1AfterManual = tListAfter.filter(t => t.keyId === inst1Self.keyId)[0];
    assert(inst1AfterManual.manuallyImported === true, 'manuell-flagga sätts');
    assert(inst1AfterManual.rosterNames.includes('Kompani 3 / VT26'),
        'rosterName behålls vid manuell import');

    console.log('— Test 15: Fas 1.5 — atomic import: tampered nyckel avvisar HELA rostern —');
    const rosterTampered = JSON.parse(JSON.stringify(rosterPayload));
    rosterTampered.keys[1].keyId = '0000000000000000'; // tamper
    rosterTampered.name = 'Skadad roster'; // ändra namn så ny rosterId
    rosterTampered.issuedAt = '2026-02-01T00:00:00Z';
    let rosterErr = null;
    try { await SS.importRosterFile(rosterTampered); }
    catch (e) { rosterErr = e; }
    assert(rosterErr, 'tampered roster avvisades');
    assert(/avvisades/.test(rosterErr.message), 'rätt felmeddelande');
    // Bekräfta att INGA av de nya nycklarna landade i storage.
    const rListAfterTamper = SS.listRosters();
    assert(rListAfterTamper.length === 1, 'fortfarande bara den första rostern');

    console.log('— Test 16: Fas 1.5 — removeRoster tar bort BARA rena roster-nycklar —');
    // Inst2:s nyckel är rena roster-nyckel (inte manuellt importerad).
    // Inst1:s nyckel är både roster + manuell (från Test 14).
    const removeRes = SS.removeRoster(rList[0].rosterId);
    assert(removeRes.removedKeys === 1, 'inst2:s nyckel togs bort (bara roster)');
    assert(removeRes.retainedKeys === 1, 'inst1:s nyckel behölls (även manuell)');
    const tListAfterRemove = SS.listTrusted();
    assert(tListAfterRemove.length === 1, '1 nyckel kvar i trusted-listan');
    assert(tListAfterRemove[0].keyId === inst1Self.keyId, 'kvarvarande är inst1');
    assert(tListAfterRemove[0].rosterNames.length === 0,
        'rosterName rensad efter removeRoster');
    assert(SS.listRosters().length === 0, 'rostrar är tomma');

    console.log('\nALLA TESTER OK');
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
