import { rm } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

import { escapeHtml } from '../../src/core/html-util.js';
import { resolveThemeColorLiteral } from '../../src/core/theme-tokens.js';

export const GENERATED_OG_IMAGE = 'open-graph-preview.png';
export const GENERATED_OG_WIDTH = 1200;
export const GENERATED_OG_HEIGHT = 630;

function escapeXml(value) {
    return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

export function wrapText(value, maxChars, maxLines) {
    const normalized = String(value || '').trim().replace(/\s+/g, ' ');
    const words = normalized.split(' ').filter(Boolean);
    const lines = [];
    let current = '';
    let truncated = false;
    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length <= maxChars) current = candidate;
        else if (!current) {
            lines.push(`${word.slice(0, Math.max(1, maxChars - 1))}…`);
            truncated = true;
        }
        else {
            lines.push(current);
            current = word.length > maxChars ? `${word.slice(0, Math.max(1, maxChars - 1))}…` : word;
            if (word.length > maxChars) truncated = true;
        }
        if (lines.length === maxLines) {
            truncated = true;
            break;
        }
    }
    if (lines.length < maxLines && current) lines.push(current);
    if (lines.join(' ').length < normalized.length) truncated = true;
    if (truncated && lines.length && !lines.at(-1).endsWith('…')) {
        lines[lines.length - 1] = `${lines.at(-1).slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
    }
    return lines.slice(0, maxLines);
}

function textLines(lines, x, y, lineHeight, attrs) {
    return lines.map((line, index) => `<text x="${x}" y="${y + (index * lineHeight)}" ${attrs}>${escapeXml(line)}</text>`).join('');
}

export function ogCardSvg(config, themeColors = {}) {
    const identity = config.identity || {};
    const seo = config.seo || {};
    const background = resolveThemeColorLiteral(themeColors['--bg-page'], themeColors, '#fff9f1');
    const heading = resolveThemeColorLiteral(themeColors['--fg-body'], themeColors, '#1a1a1a');
    const brand = resolveThemeColorLiteral(themeColors['--brand'], themeColors, '#005f6a');
    const accent = resolveThemeColorLiteral(themeColors['--brand-opposite'], themeColors, '#e45c3a');
    const fill = resolveThemeColorLiteral(themeColors['--brand-fill'], themeColors, '#eac871');
    const name = wrapText(identity.name || seo.title || 'My Site', 24, 2);
    const tagline = wrapText(identity.tagline || '', 38, 1);
    const description = wrapText(seo.description || '', 46, 2);
    let hostname = '';
    try { hostname = new URL(seo.canonicalUrl).hostname; } catch { /* optional during local authoring */ }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="${escapeXml(background)}"/>
<path d="M920 0h280v630H760c30-112 94-167 191-208 116-49 150-151 166-262 8-58 37-111 83-160Z" fill="${escapeXml(brand)}" opacity=".11"/>
<circle cx="1080" cy="112" r="74" fill="${escapeXml(fill)}" opacity=".72"/>
<rect x="76" y="82" width="12" height="132" rx="6" fill="${escapeXml(accent)}"/>
${textLines(name, 118, 166, 82, `fill="${escapeXml(heading)}" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="700"`)}
${textLines(tagline, 120, 294, 42, `fill="${escapeXml(brand)}" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="700"`)}
<rect x="120" y="336" width="52" height="6" rx="3" fill="${escapeXml(accent)}"/>
${textLines(description, 120, 408, 46, `fill="${escapeXml(heading)}" font-family="Arial, Helvetica, sans-serif" font-size="35" font-weight="600"`)}
<text x="120" y="558" fill="${escapeXml(brand)}" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="700">${escapeXml(hostname)}</text>
</svg>`;
}

export async function generateAssets({ config, outputDir, themeColors = {} }) {
    if (config.seo?.ogImage) {
        await rm(path.join(outputDir, GENERATED_OG_IMAGE), { force: true });
        return;
    }
    await sharp(Buffer.from(ogCardSvg(config, themeColors))).png({ compressionLevel: 9 }).toFile(path.join(outputDir, GENERATED_OG_IMAGE));
}

export function render({ config, ctx }) {
    const seo = config.seo || {};
    const identity = config.identity || {};
    const title = seo.title || identity.name || '';
    const description = seo.description || '';
    const locale = seo.locale || 'en_US';
    const generatedImage = !seo.ogImage;
    const imagePath = seo.ogImage || ctx.generatedAsset(GENERATED_OG_IMAGE);
    let imageUrl = null;
    if (seo.canonicalUrl && imagePath) {
        try { imageUrl = new URL(imagePath, seo.canonicalUrl).href; } catch { imageUrl = null; }
    }

    const tags = [
        '    <meta property="og:type" content="website">',
        ...(seo.canonicalUrl ? [`    <meta property="og:url" content="${escapeHtml(seo.canonicalUrl)}">`] : []),
        ...(identity.name ? [`    <meta property="og:site_name" content="${escapeHtml(identity.name)}">`] : []),
        `    <meta property="og:locale" content="${escapeHtml(locale)}">`,
        ...(title ? [`    <meta property="og:title" content="${escapeHtml(title)}">`] : []),
        ...(description ? [`    <meta property="og:description" content="${escapeHtml(description)}">`] : []),
    ];
    if (imageUrl) {
        tags.push(`    <meta property="og:image" content="${escapeHtml(imageUrl)}">`);
        if (generatedImage) tags.push('    <meta property="og:image:type" content="image/png">');
        const width = generatedImage ? GENERATED_OG_WIDTH : seo.ogImageWidth;
        const height = generatedImage ? GENERATED_OG_HEIGHT : seo.ogImageHeight;
        if (width) tags.push(`    <meta property="og:image:width" content="${escapeHtml(width)}">`);
        if (height) tags.push(`    <meta property="og:image:height" content="${escapeHtml(height)}">`);
        tags.push(`    <meta property="og:image:alt" content="${escapeHtml(seo.ogImageAlt || title)}">`);
    }
    tags.push('    <meta name="twitter:card" content="summary_large_image">');
    if (title) tags.push(`    <meta name="twitter:title" content="${escapeHtml(title)}">`);
    if (description) tags.push(`    <meta name="twitter:description" content="${escapeHtml(description)}">`);
    if (imageUrl) {
        tags.push(`    <meta name="twitter:image" content="${escapeHtml(imageUrl)}">`);
        tags.push(`    <meta name="twitter:image:alt" content="${escapeHtml(seo.ogImageAlt || title)}">`);
    }
    return { html: '', headExtras: tags };
}
