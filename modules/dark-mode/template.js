/**
 * modules/dark-mode/template.js -- an "extension" module: contributes no
 * visible markup, only:
 *   - a tiny synchronous inline <head> script that applies a stored manual
 *     theme choice (localStorage) to <html data-theme="..."> BEFORE first
 *     paint, so a returning visitor never sees a light-then-dark flash;
 *   - a <meta name="color-scheme"> hint so native UI (form controls,
 *     scrollbars) picks the right variant even before any CSS runs;
 *   - globalCss: the actual dark palette, layered after theme tokens/module
 *     styles.css (see html-shell.js's "globals" layer) so it wins by source
 *     order without !important.
 *
 * Design: rather than duplicating each theme's own light-mode values here
 * (which would require this theme-agnostic module to know every theme's
 * exact palette), the OS-preference block only applies when no manual
 * override is present (:root:not([data-theme="light"])), and the manual
 * "dark" override is a separate unconditional rule with the same
 * declarations, placed later in source so it always wins on a tie. A
 * manual "light" override needs no rule of its own: excluding it from the
 * OS-preference selector is sufficient to leave the theme's own light
 * :root{} values in effect.
 *
 * Only the alias tokens actually consumed by module CSS are overridden here
 * (the border/shadow/surface aliases added to each theme's tokens.json in
 * this same step) -- brand/accent colors intentionally are NOT overridden,
 * since a brand's hue is meant to read the same in both modes.
 */

const DARK_DECLARATIONS = `    --brand: var(--brand-light);
    --bg-page: #343434;
    --bg-panel: color-mix(in srgb, var(--brand) 6%, #343434);
    --surface-muted: rgba(255, 255, 255, .06);
    --surface-hover: rgba(255, 255, 255, .08);
    --surface-active: color-mix(in srgb, var(--brand) 20%, var(--bg-page));
    --fg-body: #EDEDED;
    --fg-muted: #A3A3A3;
    --fg-note: #A3A3A3;
    --fg-accent: var(--brand-opposite-light);
    --border-hairline: rgba(255, 255, 255, .15);
    --border-strong: rgba(255, 255, 255, .25);
    --border-dotted: rgba(255, 255, 255, .2);
    --shadow-ambient: rgba(0, 0, 0, .5);
    --surface-hover-ghost: rgba(255, 255, 255, .08);
    --scrollbar-track: rgba(255, 255, 255, .08);
    --scrollbar-thumb: rgba(255, 255, 255, .3);`;

const GLOBAL_CSS = `@media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
${DARK_DECLARATIONS}
    }
}

:root[data-theme="dark"] {
${DARK_DECLARATIONS}
}`;

const FOUC_GUARD_SCRIPT = `    <script>(function(){try{var t=localStorage.getItem('sitekit-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();</script>`;

export function render() {
    return {
        html: '',
        headExtras: [`    <meta name="color-scheme" content="light dark">`, FOUC_GUARD_SCRIPT],
        globalCss: GLOBAL_CSS,
    };
}
