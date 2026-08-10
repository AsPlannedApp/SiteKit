/**
 * modules/core-assets/template.js
 *
 * core-assets has no on-page markup of its own (html: '') -- its only job
 * here is to link the Tabler icon-font stylesheet into <head>. That CSS
 * can't be folded into the page's own inline <style> block: its @font-face
 * url(...) is relative to the CSS file's own location (assets/core-assets/
 * fonts/), not to the page, so it must stay a real, separately-served file
 * and be loaded via <link>.
 *
 * A plain, synchronous <link rel="stylesheet"> -- not the classic
 * preload-as-style-then-swap-rel-onload trick. That trick was ported from
 * asplanned-fabrizio (a real HTTPS-served site) to defer a genuinely large
 * font-adjacent CSS fetch off the critical render path; it's also known to
 * be unreliable over file:// in several browsers (the preload's onload
 * doesn't fire the same way for local files, silently leaving the
 * stylesheet in "preload, never applied" state -- icons downloaded but
 * invisible). Now that icon-subset.js (Step 7) actually shrinks the font to
 * only the glyphs used (single-digit KB, not hundreds), the async trick's
 * original justification is gone, so the plain, universally-reliable
 * synchronous link wins -- correctness over a now-negligible render delay.
 * This also means no <noscript> fallback is needed: a stylesheet link never
 * depended on JS in the first place.
 *
 * The linked file (fonts/tabler-icons-subset.min.css) is generated fresh by
 * src/core/icon-subset.js on every "npm run generate" -- it isn't committed
 * source, it's build output written straight into the gitignored assets/
 * folder, scanned from whichever .ti-* classes actually appear on the page.
 * See assets/fonts/{tabler-icons-full.woff2,tabler-icons-map.json} (the
 * vendored build inputs, excluded from the copied output via this module's
 * assetsExclude) for the full glyph set icon-subset.js draws from.
 */

export function summary() {
    return null;
}

export function render(content, config, mode, ctx) {
    const href = ctx.asset('fonts/tabler-icons-subset.min.css');

    return {
        html: '',
        headExtras: [`<link rel="stylesheet" href="${href}">`],
    };
}
