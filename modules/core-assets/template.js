/**
 * modules/core-assets/template.js
 *
 * core-assets has no on-page markup of its own (html: '') -- its only job
 * here is to link the Tabler icon-font stylesheet into <head>. That CSS
 * can't be folded into the page's own inline <style> block: its @font-face
 * `url("./tabler-icons.woff2")` is relative to the CSS file's own location
 * (assets/core-assets/fonts/), not to the page, so it must stay a real,
 * separately-served file and be loaded via <link>. Ported from
 * asplanned-fabrizio's preload+onload swap (with a <noscript> fallback so
 * icons still render with JS disabled).
 */

export function summary() {
    return null;
}

export function render(content, config, mode, ctx) {
    const href = ctx.asset('fonts/tabler-icons-subset.min.css');

    return {
        html: '',
        headExtras: [
            `<link rel="preload" href="${href}" as="style" onload="this.rel='stylesheet'">`,
            `<noscript><link rel="stylesheet" href="${href}"></noscript>`,
        ],
    };
}
