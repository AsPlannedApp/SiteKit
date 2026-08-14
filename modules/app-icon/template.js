import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

import { escapeHtml } from '../../src/core/html-util.js';
import { resolveThemeColorLiteral } from '../../src/core/theme-tokens.js';

export function appManifest(config, themeColors = {}) {
    const name = config.identity?.name || 'My Site';
    return {
        id: '../../',
        name,
        short_name: config.identity?.shortName || name,
        description: config.seo?.description || config.identity?.tagline || '',
        start_url: '../../',
        scope: '../../',
        display: 'standalone',
        background_color: resolveThemeColorLiteral(themeColors['--bg-page'], themeColors, '#ffffff'),
        theme_color: resolveThemeColorLiteral(themeColors['--brand'], themeColors, '#005f6a'),
        icons: [
            { src: 'app-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'app-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'app-icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
    };
}

export async function generateAssets({ config, moduleDir, outputDir, themeColors = {} }) {
    const source = path.join(moduleDir, 'assets', 'app-icon-source.png');
    await Promise.all([
        sharp(source).resize(192, 192, { fit: 'cover' }).png({ compressionLevel: 9 }).toFile(path.join(outputDir, 'app-icon-192.png')),
        sharp(source).resize(512, 512, { fit: 'cover' }).png({ compressionLevel: 9 }).toFile(path.join(outputDir, 'app-icon-512.png')),
        sharp(source).resize(512, 512, { fit: 'cover' }).png({ compressionLevel: 9 }).toFile(path.join(outputDir, 'app-icon-maskable-512.png')),
        sharp(source).resize(180, 180, { fit: 'cover' }).png({ compressionLevel: 9 }).toFile(path.join(outputDir, 'apple-touch-icon.png')),
        writeFile(path.join(outputDir, 'site.webmanifest'), `${JSON.stringify(appManifest(config, themeColors), null, 2)}\n`),
    ]);
}

export function render({ ctx, themeColors = {} }) {
    const manifest = ctx.generatedAsset('site.webmanifest');
    const appleIcon = ctx.generatedAsset('apple-touch-icon.png');
    ctx.generatedAsset('app-icon-192.png');
    ctx.generatedAsset('app-icon-512.png');
    ctx.generatedAsset('app-icon-maskable-512.png');
    return {
        html: '',
        headExtras: [
            `    <link rel="manifest" href="${manifest}">`,
            `    <link rel="apple-touch-icon" sizes="180x180" href="${appleIcon}">`,
            `    <meta name="theme-color" content="${escapeHtml(resolveThemeColorLiteral(themeColors['--brand'], themeColors, '#005f6a'))}">`,
        ],
    };
}
