const APP_VERSION = '20260429_123501';
const APP_COMMIT = '72632d266297ece02650d4ca963fb7824f799cbc';
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
