import { escapeHtml } from '../../src/core/html-util.js';

/**
 * modules/og-meta/template.js -- an "extension" module: contributes only
 * <head> meta tags (OpenGraph + Twitter card mirror), never visible markup.
 * Reads config.seo/config.identity directly; has no own content.json.
 *
 * og:image is the one sanctioned exception to "assets are always relative"
 * (module-loader.js's ctx.asset() contract): the OpenGraph spec requires an
 * absolute image URL, so it's only emitted when config.seo.canonicalUrl is
 * also set, resolving config.seo.ogImage (a site-root-relative path, e.g.
 * "images/open-graph-preview.png") against it. Without a canonicalUrl,
 * og:image is omitted entirely rather than emitting a broken relative URL.
 */
export function render(content, config) {
    const seo = config.seo || {};
    const identity = config.identity || {};

    const title = seo.title || identity.name || '';
    const description = seo.description || '';
    const locale = seo.locale || 'en_US';

    const tags = [];
    tags.push(`    <meta property="og:type" content="website">`);
    if (seo.canonicalUrl) tags.push(`    <meta property="og:url" content="${escapeHtml(seo.canonicalUrl)}">`);
    if (identity.name) tags.push(`    <meta property="og:site_name" content="${escapeHtml(identity.name)}">`);
    tags.push(`    <meta property="og:locale" content="${escapeHtml(locale)}">`);
    if (title) tags.push(`    <meta property="og:title" content="${escapeHtml(title)}">`);
    if (description) tags.push(`    <meta property="og:description" content="${escapeHtml(description)}">`);

    let ogImageUrl = null;
    if (seo.canonicalUrl && seo.ogImage) {
        try {
            ogImageUrl = new URL(seo.ogImage, seo.canonicalUrl).href;
        } catch {
            ogImageUrl = null;
        }
    }
    if (ogImageUrl) {
        tags.push(`    <meta property="og:image" content="${escapeHtml(ogImageUrl)}">`);
        if (seo.ogImageWidth) tags.push(`    <meta property="og:image:width" content="${escapeHtml(seo.ogImageWidth)}">`);
        if (seo.ogImageHeight) tags.push(`    <meta property="og:image:height" content="${escapeHtml(seo.ogImageHeight)}">`);
    }

    tags.push(`    <meta name="twitter:card" content="summary_large_image">`);
    if (title) tags.push(`    <meta name="twitter:title" content="${escapeHtml(title)}">`);
    if (description) tags.push(`    <meta name="twitter:description" content="${escapeHtml(description)}">`);
    if (ogImageUrl) tags.push(`    <meta name="twitter:image" content="${escapeHtml(ogImageUrl)}">`);

    return { html: '', headExtras: tags };
}
