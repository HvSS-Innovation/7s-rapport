const APP_VERSION = '20260504_192524';
const APP_COMMIT = '793d5979b41c6dda2bb49bb1586beebcab74cbdc';
document.addEventListener('DOMContentLoaded', () => {
    const el = document.createElement('div');
    el.style.cssText = 'text-align:center;padding:8px 0 16px;font-size:0.65rem;color:#3a5a3a;font-family:monospace';
    let verHtml;
    if (APP_COMMIT) {
        const short = APP_COMMIT.slice(0, 7);
        verHtml = APP_VERSION + ' &middot; <a href="https://github.com/gitjoda71/7s-rapport/tree/' + APP_COMMIT + '" target="_blank" rel="noopener" style="color:#4a7c4a;text-decoration:underline" title="Verifiera kallkoden pa GitHub" aria-label="Verifiera kallkod pa GitHub for version ' + short + '">' + short + '</a>';
    } else {
        verHtml = APP_VERSION;
    }
    // Opsec-länk är samma origin; ingen extern fetch.
    const opsecHtml = ' &middot; <a href="opsec.html" style="color:#4a7c4a;text-decoration:underline" title="Rensa all lokal data fran enheten" aria-label="Glom enheten — rensa all lokal data fran denna enhet">Glom enheten</a>';
    el.innerHTML = verHtml + opsecHtml;
    const c = document.querySelector('.container');
    if (c) c.appendChild(el);
});
