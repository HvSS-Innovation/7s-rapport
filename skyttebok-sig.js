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
    var ROSTER_PREFIX = 'skyttebok_keys_roster_';
    var SIG_PREFIX = 'skyttebok_sig_';
    var PUBKEY_FORMAT = 'sb-pubkey-v1';
    var ROSTER_FORMAT = 'sb-roster-v1';
    var SIG_FORMAT = 'sb-sig-v1';
    // Cross-device signering (Fas 5b) — soldaten exporterar en begäran
    // och instruktören sänder tillbaka ett svar med signaturer.
    var SIGNREQ_FORMAT = 'sb-signreq-v1';
    var SIGS_RESPONSE_FORMAT = 'sb-sigs-v1';

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
        // Vitlista — bara dessa fält ingår i passHash. Att lägga till nya
        // fält här kräver bumpning av SIG_FORMAT eftersom det ändrar
        // hash-formeln och ogiltigförklarar gamla signaturer.
        //
        // 'instruktor' (Fas 5) används av säkerhetsprov-objekt — det är
        // den instruktör som administrerade provet, inte den som signerar.
        // Vanliga pass har inte fältet och påverkas inte.
        var keep = [
            'anteckning', 'datum', 'godkand', 'instruktor', 'ovningNr',
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
        // Bygg roster-id → name-map en gång så projektionen kan visa
        // "OFFICIELL: <rostername>"-badges i UI utan extra storage-läsningar.
        var rosters = listAllRostersRaw();
        var rosterNameById = {};
        rosters.forEach(function (r) { rosterNameById[r.rosterId] = r.name || ''; });

        var out = [];
        for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && k.indexOf(TRUSTED_PREFIX) === 0) {
                try {
                    var obj = JSON.parse(localStorage.getItem(k));
                    if (obj && obj.keyId) {
                        var rosterIds = Array.isArray(obj.rosterIds) ? obj.rosterIds : [];
                        var rosterNames = rosterIds.map(function (rid) {
                            return rosterNameById[rid] || '(borttagen roster)';
                        }).filter(function (n) { return !!n; });
                        out.push({
                            algo: obj.algo,
                            name: obj.name || '',
                            keyId: obj.keyId,
                            createdAt: obj.createdAt || null,
                            importedAt: obj.importedAt || null,
                            // Bakåt-kompat: gamla entries saknar
                            // manuallyImported. Tolka avsaknad som "true"
                            // eftersom de importerades innan roster-stödet.
                            manuallyImported: obj.manuallyImported !== false,
                            rosterNames: rosterNames,
                            fingerprintFormatted: formatFingerprint(obj.keyId)
                        });
                    }
                } catch (_) { /* korrupt — ignorera */ }
            }
        }
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

    // Validerar en publik-nyckel-payload (utan att skriva till storage).
    // Återanvänds av både importTrustedKey och importRosterFile (atomic
    // validering före partial skrivning).
    async function validateTrustedKeyPayload(payload) {
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
        var calc = await fingerprintFromJwkPub(payload.jwkPublic);
        if (calc !== payload.keyId) {
            throw new Error('Fingerprint i filen matchar inte den publika nyckeln.');
        }
        try {
            await crypto.subtle.importKey(
                'jwk', payload.jwkPublic,
                algoImportParams(payload.algo), true, ['verify']
            );
        } catch (e) {
            throw new Error('Den publika nyckeln kunde inte läsas in (' + e.message + ').');
        }
    }

    // Importerar en enskild publik nyckel som "manuellt importerad". Om
    // nyckeln redan finns från en roster behålls dess rosterIds — manuell
    // import är ett DELANDE av tillit, inte en ersättning.
    async function importTrustedKey(payload, opts) {
        opts = opts || {};
        await validateTrustedKeyPayload(payload);

        var existing = getTrusted(payload.keyId);
        if (existing && !opts.overwrite) {
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

        // Behåll roster-metadata om nyckeln redan kommit från en roster —
        // användaren ankrar bara nyckeln manuellt också.
        var rosterIds = (existing && Array.isArray(existing.rosterIds))
            ? existing.rosterIds.slice() : [];

        var stored = {
            algo: payload.algo,
            name: (payload.name || '').trim(),
            keyId: payload.keyId,
            jwkPublic: payload.jwkPublic,
            createdAt: payload.createdAt || null,
            importedAt: new Date().toISOString(),
            manuallyImported: true,
            rosterIds: rosterIds
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
        // Städa stale-pekare i alla rosters keyIds-listor. En tom roster
        // kan stå kvar — användaren tar bort den separat om hen vill.
        listAllRostersRaw().forEach(function (r) {
            if (Array.isArray(r.keyIds) && r.keyIds.indexOf(keyId) !== -1) {
                r.keyIds = r.keyIds.filter(function (k) { return k !== keyId; });
                localStorage.setItem(ROSTER_PREFIX + r.rosterId, JSON.stringify(r));
            }
        });
    }

    // Exportera alla trusted-keys som en array av sb-pubkey-v1-payloads.
    // Används av v2-export i skyttebok.js. Synkron — bygger bara plain
    // objekt från localStorage.
    function exportAllTrustedKeys() {
        var out = [];
        for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && k.indexOf(TRUSTED_PREFIX) === 0) {
                try {
                    var obj = JSON.parse(localStorage.getItem(k));
                    if (obj && obj.keyId && obj.jwkPublic) {
                        out.push({
                            format: PUBKEY_FORMAT,
                            algo: obj.algo,
                            name: obj.name || '',
                            keyId: obj.keyId,
                            jwkPublic: obj.jwkPublic,
                            createdAt: obj.createdAt || null
                        });
                    }
                } catch (_) { /* korrupt — ignorera */ }
            }
        }
        return out;
    }

    // ── Rosters (Fas 1.5 — bunt-import av flera publika nycklar) ───────

    // Beräknar deterministiskt rosterId från name + issuedAt. Fungerar
    // som fingerprint för rostern — två rostrar med exakt samma name +
    // issuedAt anses vara samma uppdatering. Ändras issuedAt vid omdistr.
    async function computeRosterId(name, issuedAt) {
        var canon = canonicalJson({
            name: (name || '').toString(),
            issuedAt: (issuedAt || '').toString()
        });
        var bytes = new TextEncoder().encode(canon);
        var digest = await crypto.subtle.digest('SHA-256', bytes);
        var first8 = new Uint8Array(digest).slice(0, 8);
        return bytesToHex(first8).toUpperCase();
    }

    // Intern: läs alla raw roster-entries (med keyIds-arrayen). Används av
    // listRosters (för projektion) och removeTrustedKey (för städning).
    function listAllRostersRaw() {
        var out = [];
        for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && k.indexOf(ROSTER_PREFIX) === 0) {
                try {
                    var obj = JSON.parse(localStorage.getItem(k));
                    if (obj && obj.rosterId) out.push(obj);
                } catch (_) { /* ignorera */ }
            }
        }
        return out;
    }

    function getRoster(rosterId) {
        var raw = localStorage.getItem(ROSTER_PREFIX + rosterId);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch (_) { return null; }
    }

    // Atomic import: validera ALLA nycklar först. Om en enda är dålig
    // avvisas hela rostern utan att skriva något till storage. Det
    // matchar acceptanskriteriet att tampered keyId inte ger partial.
    async function importRosterFile(payload, opts) {
        opts = opts || {};
        if (!payload || typeof payload !== 'object') {
            throw new Error('Filen är inte ett giltigt roster-objekt.');
        }
        if (payload.format !== ROSTER_FORMAT) {
            throw new Error('Okänt format ("' + (payload.format || '?') + '"). ' +
                'Förväntade "' + ROSTER_FORMAT + '".');
        }
        if (!Array.isArray(payload.keys) || payload.keys.length === 0) {
            throw new Error('Rostern saknar nycklar (keys[]).');
        }

        // Steg 1: validera alla nycklar parallellt. Atomic — fångar
        // tampering eller felaktigt format innan vi rör storage.
        try {
            await Promise.all(payload.keys.map(validateTrustedKeyPayload));
        } catch (e) {
            throw new Error('Rostern avvisades — minst en nyckel är ogiltig: ' +
                (e && e.message ? e.message : '?'));
        }

        // Steg 2: räkna rosterId och kontrollera kollision.
        var rosterId = await computeRosterId(payload.name, payload.issuedAt);
        var existing = getRoster(rosterId);
        if (existing && !opts.overwrite) {
            var err = new Error('En roster med samma namn och utgivningsdatum finns redan (' +
                (existing.name || '') + '). Bekräfta överskrivning.');
            err.code = 'ROSTER_ALREADY_EXISTS';
            err.existing = {
                rosterId: existing.rosterId,
                name: existing.name,
                issuedAt: existing.issuedAt,
                keyCount: (existing.keyIds || []).length
            };
            throw err;
        }

        // Steg 3: skriv alla nycklar. Behåll manuallyImported om det redan
        // var satt; addera rosterId till entry.rosterIds.
        var addedKeys = 0, updatedKeys = 0;
        var keyIds = [];
        for (var i = 0; i < payload.keys.length; i++) {
            var pk = payload.keys[i];
            var existingKey = getTrusted(pk.keyId);
            var rosterIds = (existingKey && Array.isArray(existingKey.rosterIds))
                ? existingKey.rosterIds.slice() : [];
            if (rosterIds.indexOf(rosterId) === -1) rosterIds.push(rosterId);
            var stored = {
                algo: pk.algo,
                name: (pk.name || '').trim(),
                keyId: pk.keyId,
                jwkPublic: pk.jwkPublic,
                createdAt: pk.createdAt || null,
                importedAt: new Date().toISOString(),
                // Manuell-flagga bevaras om den var satt; ny-imports från
                // roster sätter den till false.
                manuallyImported: !!(existingKey && existingKey.manuallyImported),
                rosterIds: rosterIds
            };
            localStorage.setItem(TRUSTED_PREFIX + pk.keyId, JSON.stringify(stored));
            keyIds.push(pk.keyId);
            if (existingKey) updatedKeys++; else addedKeys++;
        }

        // Steg 4: skriv roster-posten själv.
        var roster = {
            format: ROSTER_FORMAT,
            rosterId: rosterId,
            name: (payload.name || '').toString(),
            issuer: (payload.issuer || '').toString(),
            issuedAt: payload.issuedAt || null,
            validUntil: payload.validUntil || null,
            keyIds: keyIds,
            importedAt: new Date().toISOString()
        };
        localStorage.setItem(ROSTER_PREFIX + rosterId, JSON.stringify(roster));

        return {
            rosterId: rosterId,
            name: roster.name,
            issuer: roster.issuer,
            issuedAt: roster.issuedAt,
            validUntil: roster.validUntil,
            keyCount: keyIds.length,
            addedKeys: addedKeys,
            updatedKeys: updatedKeys
        };
    }

    // Tar bort rostern + alla nycklar som BARA hör till denna roster.
    // Nycklar som även är manuellt importerade ELLER som tillhör en annan
    // roster behålls — bara rosterId tas bort från entry.rosterIds.
    function removeRoster(rosterId) {
        var roster = getRoster(rosterId);
        if (!roster) return { removedKeys: 0, retainedKeys: 0 };

        var removedKeys = 0, retainedKeys = 0;
        (roster.keyIds || []).forEach(function (keyId) {
            var entry = getTrusted(keyId);
            if (!entry) return;
            var newRosterIds = (entry.rosterIds || []).filter(function (rid) {
                return rid !== rosterId;
            });
            if (newRosterIds.length === 0 && !entry.manuallyImported) {
                localStorage.removeItem(TRUSTED_PREFIX + keyId);
                removedKeys++;
            } else {
                entry.rosterIds = newRosterIds;
                localStorage.setItem(TRUSTED_PREFIX + keyId, JSON.stringify(entry));
                retainedKeys++;
            }
        });

        localStorage.removeItem(ROSTER_PREFIX + rosterId);
        return { removedKeys: removedKeys, retainedKeys: retainedKeys };
    }

    function listRosters() {
        return listAllRostersRaw().map(function (r) {
            return {
                rosterId: r.rosterId,
                name: r.name || '',
                issuer: r.issuer || '',
                issuedAt: r.issuedAt || null,
                validUntil: r.validUntil || null,
                keyCount: Array.isArray(r.keyIds) ? r.keyIds.length : 0,
                importedAt: r.importedAt || null
            };
        }).sort(function (a, b) {
            return (a.name || '').localeCompare(b.name || '');
        });
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

    // ── Cross-device signering (Fas 5b) ─────────────────────────────────
    // Soldat → fil → instruktör → fil → soldat. Privata nyckeln lämnar
    // aldrig instruktörens enhet. Begäran innehåller pass-data, svaret
    // innehåller sig-payloads. Båda är vanliga JSON-objekt — inga
    // vendor-lib krävs för transport (Signal/AirDrop/e-post räcker).

    function buildSignRequest(passes, opts) {
        opts = opts || {};
        if (!Array.isArray(passes)) {
            throw new Error('passes måste vara en array.');
        }
        return {
            format: SIGNREQ_FORMAT,
            createdAt: new Date().toISOString(),
            soldatNamn: (opts.soldatNamn || '').toString(),
            passes: passes.map(function (p) {
                // Strikt klon så caller inte kan smyga in extra fält som
                // sedan signeras utan att vara synliga i UI.
                return JSON.parse(JSON.stringify(p));
            })
        };
    }

    function validateSignRequest(payload) {
        if (!payload || typeof payload !== 'object') {
            throw new Error('Filen är inte ett giltigt request-objekt.');
        }
        if (payload.format !== SIGNREQ_FORMAT) {
            throw new Error('Okänt format ("' + (payload.format || '?') + '"). ' +
                'Förväntade "' + SIGNREQ_FORMAT + '".');
        }
        if (!Array.isArray(payload.passes) || payload.passes.length === 0) {
            throw new Error('Begäran saknar pass att signera.');
        }
        for (var i = 0; i < payload.passes.length; i++) {
            var p = payload.passes[i];
            if (!p || !p.id) {
                throw new Error('Pass nr ' + (i + 1) + ' saknar id.');
            }
        }
    }

    // Signerar varje pass i begäran med eget nyckelpar. Atomic — om
    // signeringen för någon pass misslyckas kastas felet och inget
    // partial-resultat returneras.
    async function signSignRequest(payload) {
        validateSignRequest(payload);
        if (!readSelf()) {
            throw new Error('Inget eget nyckelpar — generera ett först.');
        }
        var sigs = {};
        for (var i = 0; i < payload.passes.length; i++) {
            var p = payload.passes[i];
            sigs[p.id] = await signPass(p);
        }
        return {
            format: SIGS_RESPONSE_FORMAT,
            createdAt: new Date().toISOString(),
            signatures: sigs
        };
    }

    function validateSigsResponse(payload) {
        if (!payload || typeof payload !== 'object') {
            throw new Error('Filen är inte ett giltigt svar-objekt.');
        }
        if (payload.format !== SIGS_RESPONSE_FORMAT) {
            throw new Error('Okänt format ("' + (payload.format || '?') + '"). ' +
                'Förväntade "' + SIGS_RESPONSE_FORMAT + '".');
        }
        if (!payload.signatures || typeof payload.signatures !== 'object' ||
            Array.isArray(payload.signatures)) {
            throw new Error('Svaret saknar signatures-objekt.');
        }
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
        exportAllTrustedKeys: exportAllTrustedKeys,

        // Rosters (Fas 1.5 — bunt-import av flera publika nycklar)
        importRosterFile: importRosterFile,
        listRosters: listRosters,
        removeRoster: removeRoster,

        // Cross-device begäran/svar (Fas 5b)
        buildSignRequest: buildSignRequest,
        signSignRequest: signSignRequest,
        validateSignRequest: validateSignRequest,
        validateSigsResponse: validateSigsResponse,

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
