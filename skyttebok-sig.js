// skyttebok-sig.js — kryptografiska instruktörssignaturer för SKYTTEBOK.
//
// Syfte: en hemvärnsinstruktör kan generera ett nyckelpar i appen och
// signera provresultat. Soldaten kan sedan verifiera signaturen lokalt
// mot en publik nyckel som förts in manuellt (trust-on-import). Allt
// sker via Web Crypto API — inga externa anrop, inga servrar.
//
// LocalStorage-layout:
//   skyttebok_keys_self                — eget nyckelpar (JWK, JSON)
//   skyttebok_keys_trusted_<keyId>     — annan instruktörs publika nyckel
//   skyttebok_sig_<passId>             — signatur-payload för ett pass
//
// Hela `skyttebok_*`-prefixet rensas av befintliga OPSEC-flödet
// (`opsec.html` → `localStorage.clear()`).
//
// Algoritm-val:
//   - Primärt: Ed25519 (stöd: Chrome 113+, Firefox 130+, Safari 17+).
//   - Fallback: ECDSA P-256 + SHA-256 (universellt stöd).
//   Detekteras vid första `generateSelfKey()` och låses i nyckel-objektet.
//
// API exponeras som `window.SkyttebokSig`. Alla nyckel-funktioner är
// async eftersom Web Crypto är promise-baserad.

(function () {
    'use strict';

    var SELF_KEY = 'skyttebok_keys_self';
    var TRUSTED_PREFIX = 'skyttebok_keys_trusted_';
    var SIG_PREFIX = 'skyttebok_sig_';
    var PUBKEY_FORMAT = 'sb-pubkey-v1';
    var SIG_FORMAT = 'sb-sig-v1';

    // ── Algoritm-parametrar ─────────────────────────────────────────────
    // sign-anropet behöver olika params per algoritm. Ed25519 är enkelt
    // (string), ECDSA kräver en hash-spec.
    function algoSignParams(algo) {
        if (algo === 'Ed25519') return { name: 'Ed25519' };
        if (algo === 'ECDSA-P256') return { name: 'ECDSA', hash: 'SHA-256' };
        throw new Error('Okänd algoritm: ' + algo);
    }

    function algoImportParams(algo) {
        if (algo === 'Ed25519') return { name: 'Ed25519' };
        if (algo === 'ECDSA-P256') return { name: 'ECDSA', namedCurve: 'P-256' };
        throw new Error('Okänd algoritm: ' + algo);
    }

    function algoGenerateParams(algo) {
        if (algo === 'Ed25519') return { name: 'Ed25519' };
        if (algo === 'ECDSA-P256') return { name: 'ECDSA', namedCurve: 'P-256' };
        throw new Error('Okänd algoritm: ' + algo);
    }

    // ── Bytes/base64/hex ────────────────────────────────────────────────
    function bytesToBase64(bytes) {
        var bin = '';
        for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return btoa(bin);
    }

    function base64ToBytes(b64) {
        var bin = atob(b64);
        var out = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
    }

    function bytesToHex(bytes) {
        var out = '';
        for (var i = 0; i < bytes.length; i++) {
            var h = bytes[i].toString(16);
            if (h.length === 1) h = '0' + h;
            out += h;
        }
        return out;
    }

    // ── Canonical JSON ──────────────────────────────────────────────────
    // Sorterar nycklar alfabetiskt i alla nivåer och stringifies utan
    // whitespace. Ger deterministisk hash oavsett insättningsordning.
    // Stödjer object/array/sträng/number/bool/null. Klassiska JSON-typer
    // räcker för pass-objekt — vi har inga Date/Map/Set där.
    function canonicalJson(value) {
        if (value === null || typeof value !== 'object') {
            return JSON.stringify(value);
        }
        if (Array.isArray(value)) {
            return '[' + value.map(canonicalJson).join(',') + ']';
        }
        var keys = Object.keys(value).sort();
        var parts = keys.map(function (k) {
            return JSON.stringify(k) + ':' + canonicalJson(value[k]);
        });
        return '{' + parts.join(',') + '}';
    }

    // ── Pass-hash ───────────────────────────────────────────────────────
    // Vilka fält som ingår i hashen är ett HÅRT KONTRAKT — om det ändras
    // bumpas SIG_FORMAT till sb-sig-v2 och båda måste stötas en period.
    //
    // Fält som ingår: datum, ovningNr, skott, traff, godkand, anteckning,
    // traffar (om finns), samt KP-BAS-specifika tid/poangSumma/poangKvot.
    // Fält som EJ ingår: id, skapad, sparad — dessa är mutable metadata
    // som inte påverkar provresultatets innehåll. Det innebär att
    // signaturen följer med passet vid id-byte (t.ex. import-merge).
    function buildHashableObject(pass) {
        var keep = [
            'anteckning', 'datum', 'godkand', 'ovningNr',
            'poangKvot', 'poangSumma', 'skott', 'tid', 'traff', 'traffar'
        ];
        var out = {};
        keep.forEach(function (k) {
            if (pass[k] !== undefined && pass[k] !== null) out[k] = pass[k];
        });
        return out;
    }

    async function hashPass(pass) {
        var canon = canonicalJson(buildHashableObject(pass));
        var bytes = new TextEncoder().encode(canon);
        var digest = await crypto.subtle.digest('SHA-256', bytes);
        return bytesToBase64(new Uint8Array(digest));
    }

    // ── Fingerprint ─────────────────────────────────────────────────────
    // Beräknas på ett canonical-format av JWK utan privat-delen `d`.
    // Detta fungerar oavsett algoritm (Ed25519 raw är 32 bytes, ECDSA
    // raw är 65 bytes — fingerprint från JWK är konsekvent).
    // SHA-256 → första 8 bytes → 16 hex-tecken, formaterat med space
    // var 4:e tecken för läsbarhet ("AB12 34CD 56EF 7890").
    async function fingerprintFromJwkPub(jwkPub) {
        var pub = {};
        ['kty', 'crv', 'x', 'y'].forEach(function (k) {
            if (jwkPub[k] !== undefined) pub[k] = jwkPub[k];
        });
        var canon = canonicalJson(pub);
        var bytes = new TextEncoder().encode(canon);
        var digest = await crypto.subtle.digest('SHA-256', bytes);
        var first8 = new Uint8Array(digest).slice(0, 8);
        return bytesToHex(first8).toUpperCase();
    }

    function formatFingerprint(hex16) {
        return hex16.match(/.{1,4}/g).join(' ');
    }

    // ── Algoritm-detektering ────────────────────────────────────────────
    // Kallas första gången användaren genererar en nyckel. Försöker
    // Ed25519 (snabbare, kortare nycklar). Om browsern saknar stöd
    // faller vi tillbaka till ECDSA P-256.
    async function detectAlgo() {
        try {
            var pair = await crypto.subtle.generateKey(
                { name: 'Ed25519' }, true, ['sign', 'verify']
            );
            // Lyckades — kasta nyckeln, vi vill bara kolla support.
            // pair används inte vidare, GC tar hand om det.
            return 'Ed25519';
        } catch (_) {
            return 'ECDSA-P256';
        }
    }

    // ── Self-key (eget nyckelpar) ───────────────────────────────────────
    function readSelf() {
        var raw = localStorage.getItem(SELF_KEY);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch (_) { return null; }
    }

    function writeSelf(obj) {
        if (obj) localStorage.setItem(SELF_KEY, JSON.stringify(obj));
        else localStorage.removeItem(SELF_KEY);
    }

    async function getSelf() {
        return readSelf();
    }

    async function hasSelf() {
        return !!readSelf();
    }

    async function generateSelfKey(name) {
        var algo = await detectAlgo();
        var pair = await crypto.subtle.generateKey(
            algoGenerateParams(algo),
            true,
            ['sign', 'verify']
        );
        var jwkPub = await crypto.subtle.exportKey('jwk', pair.publicKey);
        var jwkPriv = await crypto.subtle.exportKey('jwk', pair.privateKey);
        var keyId = await fingerprintFromJwkPub(jwkPub);
        var selfObj = {
            algo: algo,
            name: (name || '').trim(),
            keyId: keyId,
            jwkPublic: jwkPub,
            jwkPrivate: jwkPriv,
            createdAt: new Date().toISOString()
        };
        writeSelf(selfObj);
        return publicProjection(selfObj);
    }

    async function setSelfName(name) {
        var s = readSelf();
        if (!s) return null;
        s.name = (name || '').trim();
        writeSelf(s);
        return publicProjection(s);
    }

    async function deleteSelfKey() {
        writeSelf(null);
    }

    // Exponera bara icke-känsliga fält i UI/list-context.
    function publicProjection(s) {
        return {
            algo: s.algo,
            name: s.name,
            keyId: s.keyId,
            createdAt: s.createdAt,
            fingerprintFormatted: formatFingerprint(s.keyId)
        };
    }

    async function exportSelfPublicKeyPayload() {
        var s = readSelf();
        if (!s) return null;
        return {
            format: PUBKEY_FORMAT,
            algo: s.algo,
            name: s.name,
            keyId: s.keyId,
            jwkPublic: s.jwkPublic,
            createdAt: s.createdAt,
            exportedAt: new Date().toISOString()
        };
    }

    // ── Trusted keys ────────────────────────────────────────────────────
    function listTrusted() {
        var out = [];
        for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && k.indexOf(TRUSTED_PREFIX) === 0) {
                try {
                    var obj = JSON.parse(localStorage.getItem(k));
                    if (obj && obj.keyId) {
                        out.push({
                            algo: obj.algo,
                            name: obj.name || '',
                            keyId: obj.keyId,
                            createdAt: obj.createdAt || null,
                            importedAt: obj.importedAt || null,
                            fingerprintFormatted: formatFingerprint(obj.keyId)
                        });
                    }
                } catch (_) { /* korrupt — ignorera */ }
            }
        }
        // Sortera alfabetiskt på namn, sekundärt på keyId.
        out.sort(function (a, b) {
            var n = (a.name || '').localeCompare(b.name || '');
            if (n !== 0) return n;
            return a.keyId.localeCompare(b.keyId);
        });
        return out;
    }

    function getTrusted(keyId) {
        var raw = localStorage.getItem(TRUSTED_PREFIX + keyId);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch (_) { return null; }
    }

    // Validerar och importerar en publik-nyckel-payload (från export-JSON
    // eller v2-import). Returnerar den importerade nyckeln som projektion,
    // eller kastar Error med svensk meddelande vid fel.
    async function importTrustedKey(payload, opts) {
        opts = opts || {};
        if (!payload || typeof payload !== 'object') {
            throw new Error('Filen är inte ett giltigt nyckel-objekt.');
        }
        if (payload.format !== PUBKEY_FORMAT) {
            throw new Error('Okänt format ("' + (payload.format || '?') + '"). ' +
                'Förväntade "' + PUBKEY_FORMAT + '".');
        }
        if (!payload.algo || !payload.jwkPublic || !payload.keyId) {
            throw new Error('Nyckel-objektet saknar nödvändiga fält (algo, jwkPublic, keyId).');
        }
        // Verifiera att fingerprint matchar — annars är keyId fejkad.
        var calc = await fingerprintFromJwkPub(payload.jwkPublic);
        if (calc !== payload.keyId) {
            throw new Error('Fingerprint i filen matchar inte den publika nyckeln.');
        }
        // Verifiera att nyckeln går att importera till CryptoKey.
        try {
            await crypto.subtle.importKey(
                'jwk', payload.jwkPublic,
                algoImportParams(payload.algo), true, ['verify']
            );
        } catch (e) {
            throw new Error('Den publika nyckeln kunde inte läsas in (' + e.message + ').');
        }

        var existing = getTrusted(payload.keyId);
        if (existing && !opts.overwrite) {
            // Caller måste bekräfta överskrivning.
            var err = new Error('En nyckel med denna fingerprint finns redan (' +
                (existing.name || 'utan namn') + '). Bekräfta överskrivning.');
            err.code = 'ALREADY_EXISTS';
            err.existing = {
                algo: existing.algo,
                name: existing.name,
                keyId: existing.keyId,
                fingerprintFormatted: formatFingerprint(existing.keyId)
            };
            throw err;
        }

        var stored = {
            algo: payload.algo,
            name: (payload.name || '').trim(),
            keyId: payload.keyId,
            jwkPublic: payload.jwkPublic,
            createdAt: payload.createdAt || null,
            importedAt: new Date().toISOString()
        };
        localStorage.setItem(TRUSTED_PREFIX + payload.keyId, JSON.stringify(stored));
        return {
            algo: stored.algo,
            name: stored.name,
            keyId: stored.keyId,
            fingerprintFormatted: formatFingerprint(stored.keyId)
        };
    }

    function removeTrustedKey(keyId) {
        localStorage.removeItem(TRUSTED_PREFIX + keyId);
    }

    // ── Signatur (Fas 2 — färdigt API-skelett, används från Fas 2) ─────
    async function signPass(pass) {
        var s = readSelf();
        if (!s) throw new Error('Inget eget nyckelpar — generera ett först.');
        var privKey = await crypto.subtle.importKey(
            'jwk', s.jwkPrivate, algoImportParams(s.algo), false, ['sign']
        );
        var passHash = await hashPass(pass);
        // Vi signerar EXPLICIT canonicalJson av sig-headern (utan `sig`)
        // för att skydda hela payloaden från tampering, inte bara hashen.
        var header = {
            sigVer: SIG_FORMAT,
            passId: pass.id,
            passHash: passHash,
            signedAt: new Date().toISOString(),
            signer: { name: s.name || '', pubKeyId: s.keyId }
        };
        var bytes = new TextEncoder().encode(canonicalJson(header));
        var sigBuf = await crypto.subtle.sign(algoSignParams(s.algo), privKey, bytes);
        return Object.assign({}, header, {
            sig: bytesToBase64(new Uint8Array(sigBuf))
        });
    }

    // Verifierar mot trusted-key. Returnerar:
    //   { valid: true,  trusted: true,  signerName: '...' }      grön
    //   { valid: true,  trusted: false, signerName: '...' }      gul
    //   { valid: false, reason: 'Bruten signatur'|'Hash matchar inte'|... }
    async function verifySignature(sigPayload, pass) {
        if (!sigPayload || sigPayload.sigVer !== SIG_FORMAT) {
            return { valid: false, reason: 'Okänd signatur-version' };
        }
        var calcHash = await hashPass(pass);
        if (calcHash !== sigPayload.passHash) {
            return { valid: false, reason: 'Pass har ändrats efter signering' };
        }
        var keyId = sigPayload.signer && sigPayload.signer.pubKeyId;
        if (!keyId) return { valid: false, reason: 'Saknar nyckel-id' };
        var trusted = getTrusted(keyId);
        var algo, jwkPublic;
        if (trusted) {
            algo = trusted.algo;
            jwkPublic = trusted.jwkPublic;
        } else {
            // Det kan vara vår egen nyckel — vi vill verifiera även egna
            // signaturer (för att kunna visa sin egen sign-status korrekt).
            var self = readSelf();
            if (self && self.keyId === keyId) {
                algo = self.algo;
                jwkPublic = self.jwkPublic;
            } else {
                return { valid: false, reason: 'Okänd signerare', keyId: keyId };
            }
        }
        var pubKey;
        try {
            pubKey = await crypto.subtle.importKey(
                'jwk', jwkPublic, algoImportParams(algo), true, ['verify']
            );
        } catch (e) {
            return { valid: false, reason: 'Publik nyckel går inte att läsa' };
        }
        var header = {
            sigVer: sigPayload.sigVer,
            passId: sigPayload.passId,
            passHash: sigPayload.passHash,
            signedAt: sigPayload.signedAt,
            signer: sigPayload.signer
        };
        var bytes = new TextEncoder().encode(canonicalJson(header));
        var sigBytes = base64ToBytes(sigPayload.sig);
        var ok = false;
        try {
            ok = await crypto.subtle.verify(
                algoSignParams(algo), pubKey, sigBytes, bytes
            );
        } catch (_) {
            ok = false;
        }
        if (!ok) return { valid: false, reason: 'Felaktig signatur' };
        return {
            valid: true,
            trusted: !!trusted,
            signerName: (sigPayload.signer && sigPayload.signer.name) || '',
            keyId: keyId
        };
    }

    function readSig(passId) {
        var raw = localStorage.getItem(SIG_PREFIX + passId);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch (_) { return null; }
    }

    function writeSig(passId, sigPayload) {
        if (sigPayload) localStorage.setItem(SIG_PREFIX + passId, JSON.stringify(sigPayload));
        else localStorage.removeItem(SIG_PREFIX + passId);
    }

    function listAllSigs() {
        var out = {};
        for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && k.indexOf(SIG_PREFIX) === 0) {
                try {
                    var obj = JSON.parse(localStorage.getItem(k));
                    var passId = k.substring(SIG_PREFIX.length);
                    if (obj && passId) out[passId] = obj;
                } catch (_) { /* ignore */ }
            }
        }
        return out;
    }

    // ── Public API ──────────────────────────────────────────────────────
    window.SkyttebokSig = {
        // Konstanter
        PUBKEY_FORMAT: PUBKEY_FORMAT,
        SIG_FORMAT: SIG_FORMAT,

        // Self-key (eget nyckelpar — instruktör)
        hasSelf: hasSelf,
        getSelf: function () {
            var s = readSelf();
            return s ? publicProjection(s) : null;
        },
        generateSelfKey: generateSelfKey,
        setSelfName: setSelfName,
        deleteSelfKey: deleteSelfKey,
        exportSelfPublicKeyPayload: exportSelfPublicKeyPayload,

        // Trusted keys (andra instruktörers publika nycklar)
        listTrusted: listTrusted,
        importTrustedKey: importTrustedKey,
        removeTrustedKey: removeTrustedKey,

        // Signering / verifiering (Fas 2-3)
        signPass: signPass,
        verifySignature: verifySignature,
        readSig: readSig,
        writeSig: writeSig,
        listAllSigs: listAllSigs,

        // Hjälpare exponerade för UI-felmeddelanden / tester
        formatFingerprint: formatFingerprint,
        canonicalJson: canonicalJson,
        hashPass: hashPass
    };
})();
