/**
 * modules/dark-mode/client.js -- exposes the manual light/dark override
 * hook. This step ships the mechanism only; wiring a visible toggle control
 * into header/footer chrome is a fast follow-on once a chrome module wants
 * one -- any future button just needs `data-theme-toggle` on itself (auto
 * wired below) or to call `window.sitekitSetTheme(theme)` directly.
 */
(function () {
    function setTheme(theme) {
        var root = document.documentElement;
        if (theme === 'light' || theme === 'dark') {
            try {
                localStorage.setItem('sitekit-theme', theme);
            } catch (e) {
                /* localStorage unavailable (private mode, etc.) -- degrade to session-only */
            }
            root.setAttribute('data-theme', theme);
        } else {
            try {
                localStorage.removeItem('sitekit-theme');
            } catch (e) {
                /* ignore */
            }
            root.removeAttribute('data-theme');
        }
    }

    function currentTheme() {
        var attr = document.documentElement.getAttribute('data-theme');
        if (attr === 'light' || attr === 'dark') return attr;
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    window.sitekitSetTheme = setTheme;

    document.querySelectorAll('[data-theme-toggle]').forEach(function (el) {
        el.addEventListener('click', function () {
            setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
        });
    });
})();
