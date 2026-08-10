/**
 * Turns a theme's merged font config (tokens.fonts, shallow-merged with
 * config.theme.fontOverrides -- see generate.js) into the <head> tags and
 * theme-owned @font-face CSS needed to actually load it, per provider:
 *
 *   - "system"      no network request at all; the alias (--font-body etc.)
 *                   already resolves to a system font stack in tokens.colors.
 *   - "self-hosted" @font-face rules with a *relative* baseUrl (same-origin,
 *                   file://-safe, no preconnect needed) + a preload hint for
 *                   the body-regular weight to avoid FOIT.
 *   - "link"        same @font-face shape, but baseUrl is an *absolute*
 *                   origin (e.g. a font CDN) -- adds a preconnect hint.
 *                   This is the code path a site's own config.theme.
 *                   fontOverrides would use to point at a provider like
 *                   Google Fonts or a private CDN, without forking the
 *                   theme that declares which families/weights exist.
 *
 * `families` shape: { <role>: { family: '<css font-family value>', files: [
 *   { file: '<name>.woff2', weight: 400, style: 'normal' }, ... ] } }
 */
export function buildFontTags(fonts) {
    const provider = fonts?.provider || 'system';

    if (provider === 'system' || !fonts) {
        return { headExtras: [], themeFontFaceCss: '' };
    }

    const baseUrl = (fonts.baseUrl || '').replace(/\/+$/, '');
    const families = fonts.families || {};
    const isAbsolute = /^https?:\/\//i.test(baseUrl);

    const faceRules = [];
    const preloadTags = [];
    let firstFileSeen = false;

    for (const [role, def] of Object.entries(families)) {
        const familyCssName = (def.family || '').split(',')[0].trim().replace(/^['"]|['"]$/g, '');
        for (const entry of def.files || []) {
            const url = baseUrl ? `${baseUrl}/${entry.file}` : entry.file;
            const weight = entry.weight || 400;
            const style = entry.style || 'normal';
            faceRules.push(
                `@font-face {\n` +
                    `    font-family: '${familyCssName}';\n` +
                    `    src: url('${url}') format('woff2');\n` +
                    `    font-weight: ${weight};\n` +
                    `    font-style: ${style};\n` +
                    `    font-display: swap;\n` +
                    `}`
            );

            // Preload just the first file we encounter (by convention, a
            // theme should list its body-regular weight first) -- preloading
            // every weight would itself become a render-blocking-adjacent
            // performance regression.
            if (!firstFileSeen) {
                preloadTags.push(`    <link rel="preload" href="${url}" as="font" type="font/woff2" crossorigin>`);
                firstFileSeen = true;
            }
        }
    }

    const headExtras = [];
    if (provider === 'link' && isAbsolute) {
        const origin = new URL(baseUrl).origin;
        headExtras.push(`    <link rel="preconnect" href="${origin}" crossorigin>`);
    }
    headExtras.push(...preloadTags);

    return {
        headExtras,
        themeFontFaceCss: faceRules.join('\n\n'),
    };
}
