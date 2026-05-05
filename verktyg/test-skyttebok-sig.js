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

    console.log('\nALLA TESTER OK');
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
