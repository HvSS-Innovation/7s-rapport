const APP_VERSION = '20260408_123113';
const APP_COMMIT = '9628d3ca39551bbeaa4e1b10d62e273297d051f9';
document.addEventListener('DOMContentLoaded', () => {
    const el = document.createElement('div');
    el.style.cssText = 'text-align:center;padding:8px 0 16px;font-size:0.65rem;color:#3a5a3a;font-family:monospace';
    if (APP_COMMIT) {
        const short = APP_COMMIT.slice(0, 7);
        el.innerHTML = APP_VERSION + ' &middot; <a href="https://github.com/gitjoda71/7s-rapport/tree/' + APP_COMMIT + '" target="_blank" rel="noopener" style="color:#4a7c4a;text-decoration:underline" title="Verifiera kallkoden pa GitHub">' + short + '</a>';
    } else {
        el.textContent = APP_VERSION;
    }
    const c = document.querySelector('.container');
    if (c) c.appendChild(el);
});
