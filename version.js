const APP_VERSION = '20260327_151500';
document.addEventListener('DOMContentLoaded', () => {
    const el = document.createElement('div');
    el.textContent = APP_VERSION;
    el.style.cssText = 'text-align:center;padding:8px 0 16px;font-size:0.65rem;color:#3a5a3a;font-family:monospace';
    const c = document.querySelector('.container');
    if (c) c.appendChild(el);
});
