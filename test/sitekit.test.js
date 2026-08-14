import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';

import { validateConfig } from '../src/core/config-schema.js';
import { removeInactiveModuleAssets } from '../src/core/asset-pipeline.js';
import { buildAssetCtx, resolveActiveModuleIds, validateModuleConfiguration } from '../src/core/module-loader.js';
import { validateGeneratedAssetContracts, validateModuleContent } from '../src/core/content-validation.js';
import { atomPosts, feedPosts, prepare as prepareBlog, render as renderBlog, resolveFeedUrl } from '../modules/blog/template.js';
import { gistLangMeta, normalizeDays, normalizeGists, prepare as prepareGit, render as renderGit, usernameFromProfile } from '../modules/git-contributions/template.js';
import { render as renderHeader } from '../modules/header/template.js';
import { generateAssets as generatePhotoAssets, previewPath, previewWidths } from '../modules/photo-album/template.js';
import { appManifest, generateAssets as generateAppIcons, render as renderAppIcons } from '../modules/app-icon/template.js';
import { generateAssets as generateFavicons } from '../modules/favicon/template.js';
import { GENERATED_OG_HEIGHT, GENERATED_OG_WIDTH, generateAssets as generateOgImage, render as renderOgMeta, wrapText } from '../modules/og-meta/template.js';
import { resolveThemeColorLiteral } from '../src/core/theme-tokens.js';

const baseConfig = {
    identity: { name: 'Test' },
    modules: { order: ['example'], overrides: {} },
    theme: { preset: 'default', overrides: {} },
};

test('configuration uses one ordered module list', () => {
    assert.doesNotThrow(() => validateConfig(baseConfig));
    assert.throws(() => validateConfig({ ...baseConfig, modules: { order: ['example'], enabled: ['example'] } }), /enabled was removed/);
    assert.throws(() => validateConfig({ ...baseConfig, modules: { order: ['example', 'example'] } }), /duplicate ids/);
    assert.throws(() => validateConfig({ ...baseConfig, seo: { canonicalUrl: '/relative' } }), /absolute HTTP/);
    assert.throws(() => validateConfig({ ...baseConfig, identity: { name: 'Test', shortName: '' } }), /shortName/);
});

test('header navigation keeps an accessible name when labels collapse to icons', () => {
    const rendered = renderHeader({
        content: {},
        config: { extensions: { 'dark-mode': false } },
        ctx: { sections: [{ anchor: 'writing', navLabel: 'Writing & Notes', navIcon: 'ti-writing-sign' }] },
    });
    assert.match(rendered.html, /<a href="#writing" title="Writing &amp; Notes" aria-label="Writing &amp; Notes">/);
    assert.match(rendered.html, /data-nav-icon aria-hidden="true"/);
    assert.match(rendered.html, /<span data-nav-label>Writing &amp; Notes<\/span>/);
});

test('theme colors resolve to literals for raster assets', () => {
    const colors = { '--brand': 'var(--accent)', '--accent': '#123456' };
    assert.equal(resolveThemeColorLiteral(colors['--brand'], colors, '#000000'), '#123456');
    assert.equal(resolveThemeColorLiteral('var(--missing)', colors, '#000000'), '#000000');
});

test('theme-sensitive controls preserve contrast and authored badge dimensions', () => {
    const pressCss = readFileSync(path.resolve('modules/press/styles.css'), 'utf8');
    const footerCss = readFileSync(path.resolve('modules/footer/styles.css'), 'utf8');
    assert.match(pressCss, /\.dl-dropdown \.dl-menu a \{[\s\S]*color: var\(--bg-page\)/);
    const footerBadgeRule = footerCss.match(/\.site-footer__badge img \{([^}]*)\}/)?.[1] || '';
    assert.doesNotMatch(footerBadgeRule, /(?:^|\n)\s*(?:width|height):/);
    assert.match(footerBadgeRule, /max-width: 100%/);
});

test('Open Graph metadata uses generated defaults and preserves authored overrides', () => {
    const config = { ...baseConfig, identity: { name: 'Alex & Morgan', tagline: 'Developer' }, seo: { title: 'A title', description: 'A description', canonicalUrl: 'https://example.test/' } };
    const generatedCtx = buildAssetCtx('og-meta');
    const generated = renderOgMeta({ config, ctx: generatedCtx });
    assert.match(generated.headExtras.join('\n'), /https:\/\/example\.test\/assets\/og-meta\/open-graph-preview\.png/);
    assert.match(generated.headExtras.join('\n'), /og:image:width" content="1200/);
    assert.match(generated.headExtras.join('\n'), /og:image:alt" content="A title/);
    assert.deepEqual([...generatedCtx.referencedGeneratedAssets], ['open-graph-preview.png']);

    const authoredCtx = buildAssetCtx('og-meta');
    const authored = renderOgMeta({ config: { ...config, seo: { ...config.seo, ogImage: '/social/custom.jpg', ogImageWidth: 1600, ogImageHeight: 900 } }, ctx: authoredCtx });
    assert.match(authored.headExtras.join('\n'), /https:\/\/example\.test\/social\/custom\.jpg/);
    assert.match(authored.headExtras.join('\n'), /content="1600/);
    assert.equal(authoredCtx.referencedGeneratedAssets.size, 0);

    const local = renderOgMeta({ config: { ...config, seo: { title: 'Local' } }, ctx: buildAssetCtx('og-meta') });
    assert.doesNotMatch(local.headExtras.join('\n'), /property="og:image"/);
    assert.equal(wrapText('one two three four five six', 8, 2).length, 2);
});

test('favicon, app icons, manifest, and Open Graph card generate at exact dimensions', async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'sitekit-icons-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    const faviconOut = path.join(root, 'favicon');
    const appOut = path.join(root, 'app-icon');
    const ogOut = path.join(root, 'og-meta');
    await Promise.all([mkdir(faviconOut), mkdir(appOut), mkdir(ogOut)]);

    const themeColors = { '--brand': 'var(--accent)', '--accent': '#005f6a', '--bg-page': '#ffffff' };
    const config = { ...baseConfig, identity: { name: 'Alex Morgan', shortName: 'Alex', tagline: 'Developer' }, seo: { description: 'Portfolio', canonicalUrl: 'https://example.test/' } };
    await Promise.all([
        generateFavicons({ moduleDir: path.resolve('modules/favicon'), outputDir: faviconOut }),
        generateAppIcons({ config, moduleDir: path.resolve('modules/app-icon'), outputDir: appOut, themeColors }),
        generateOgImage({ config, outputDir: ogOut, themeColors }),
    ]);

    for (const size of [16, 32, 48]) assert.deepEqual(await sharp(path.join(faviconOut, `favicon-${size}.png`)).metadata().then(({ width, height }) => [width, height]), [size, size]);
    for (const [file, size] of [['app-icon-192.png', 192], ['app-icon-512.png', 512], ['app-icon-maskable-512.png', 512], ['apple-touch-icon.png', 180]]) {
        assert.deepEqual(await sharp(path.join(appOut, file)).metadata().then(({ width, height }) => [width, height]), [size, size]);
    }
    assert.deepEqual(await sharp(path.join(ogOut, 'open-graph-preview.png')).metadata().then(({ width, height }) => [width, height]), [GENERATED_OG_WIDTH, GENERATED_OG_HEIGHT]);
    const manifest = JSON.parse(await readFile(path.join(appOut, 'site.webmanifest'), 'utf8'));
    assert.equal(manifest.short_name, 'Alex');
    assert.equal(manifest.start_url, '../../');
    assert.equal(manifest.icons.find(({ purpose }) => purpose === 'maskable').sizes, '512x512');
});

test('app icon head metadata registers every generated asset', () => {
    const ctx = buildAssetCtx('app-icon');
    const result = renderAppIcons({ ctx, themeColors: { '--brand': '#123456' } });
    assert.match(result.headExtras.join('\n'), /site\.webmanifest/);
    assert.match(result.headExtras.join('\n'), /theme-color" content="#123456/);
    assert.equal(ctx.referencedGeneratedAssets.size, 5);
    assert.equal(appManifest({ identity: { name: 'Long Name' }, seo: {} }).short_name, 'Long Name');
});

test('disabling an extension removes only its stale generated directory', async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'sitekit-disabled-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    await Promise.all([
        mkdir(path.join(root, 'assets', 'favicon'), { recursive: true }),
        mkdir(path.join(root, 'assets', 'app-icon'), { recursive: true }),
    ]);
    const manifests = new Map([['favicon', {}], ['app-icon', {}]]);
    assert.deepEqual(removeInactiveModuleAssets(manifests, ['app-icon'], root), ['favicon']);
    assert.equal(existsSync(path.join(root, 'assets', 'favicon')), false);
    assert.equal(existsSync(path.join(root, 'assets', 'app-icon')), true);
});

test('active module resolution auto-loads system modules and orders sections', () => {
    const manifests = new Map([
        ['core', { kind: 'infra' }], ['header', { kind: 'chrome' }], ['dark', { kind: 'extension' }], ['example', { kind: 'content-section' }],
    ]);
    assert.deepEqual(resolveActiveModuleIds(manifests, baseConfig), ['core', 'header', 'dark', 'example']);
    assert.deepEqual(resolveActiveModuleIds(manifests, { ...baseConfig, extensions: { dark: false } }), ['core', 'header', 'example']);
});

test('module configuration rejects unknown extensions, slots, and unsafe assets', () => {
    const manifests = new Map([
        ['example', { kind: 'content-section', themable: ['panelFill'] }],
        ['dark', { kind: 'extension' }],
    ]);
    assert.doesNotThrow(() => validateModuleConfiguration(manifests, { ...baseConfig, extensions: { dark: true }, modules: { order: ['example'], overrides: { example: { colors: { panelFill: '#fff' } } } } }));
    assert.throws(() => validateModuleConfiguration(manifests, { ...baseConfig, extensions: { missing: true } }), /unknown module/);
    assert.throws(() => validateModuleConfiguration(manifests, { ...baseConfig, modules: { order: ['example'], overrides: { example: { colors: { unknown: '#fff' } } } } }), /not declared/);
    assert.throws(() => buildAssetCtx('example').asset('../secret.txt'), /unsafe asset path/);
    assert.throws(() => buildAssetCtx('example').generatedAsset('../secret.webp'), /unsafe asset path/);
});

test('generated assets require a module generator', () => {
    const ctx = buildAssetCtx('example');
    assert.equal(ctx.generatedAsset('previews/card.webp'), 'assets/example/previews/card.webp');
    assert.match(validateGeneratedAssetContracts([{ id: 'example', ctx, template: {} }])[0], /does not export generateAssets/);
    assert.deepEqual(validateGeneratedAssetContracts([{ id: 'example', ctx, template: { generateAssets() {} } }]), []);
});

test('photo preview widths follow the configured grid', () => {
    assert.deepEqual(previewWidths(1), [320, 640, 960, 1920]);
    assert.deepEqual(previewWidths(2), [320, 640, 960]);
    assert.deepEqual(previewWidths(3), [320, 640, 720]);
    assert.deepEqual(previewWidths(5), [320, 640, 720]);
});

test('photo album accepts PNG and JPEG sources but rejects unsupported formats', () => {
    const contentSchema = JSON.parse(readFileSync(new URL('../modules/photo-album/content.schema.json', import.meta.url), 'utf8'));
    const module = (file) => ({
        id: 'photo-album',
        contentSchema,
        content: { heading: 'Photos', columns: 3, photos: [{ file, label: 'Example', alt: 'Example photograph' }] },
    });
    for (const file of ['photos/example.png', 'photos/example.jpg', 'photos/example.jpeg']) {
        assert.deepEqual(validateModuleContent([module(file)]), []);
    }
    assert.match(validateModuleContent([module('photos/example.webp')])[0], /must match pattern/);
});

test('photo preview paths preserve PNG URLs and avoid JPEG stem collisions', () => {
    assert.equal(previewPath('photos/example.png', 640), 'previews/example-640.webp');
    assert.equal(previewPath('photos/example.jpg', 640), 'previews/example-jpg-640.webp');
    assert.equal(previewPath('photos/example.jpeg', 640), 'previews/example-jpeg-640.webp');
});

test('photo album generates WebP previews from a JPEG original', async (t) => {
    const moduleDir = await mkdtemp(path.join(os.tmpdir(), 'sitekit-photo-jpeg-'));
    t.after(() => rm(moduleDir, { recursive: true, force: true }));
    const photosDir = path.join(moduleDir, 'assets', 'photos');
    const outputDir = path.join(moduleDir, 'output');
    await Promise.all([mkdir(photosDir, { recursive: true }), mkdir(outputDir)]);
    await sharp({ create: { width: 800, height: 500, channels: 3, background: '#336699' } })
        .jpeg()
        .toFile(path.join(photosDir, 'source.jpg'));

    await generatePhotoAssets({
        content: { columns: 3, photos: [{ file: 'photos/source.jpg', label: 'Source', alt: 'JPEG source' }] },
        moduleDir,
        outputDir,
    });

    const metadata = await sharp(path.join(outputDir, 'previews', 'source-jpg-320.webp')).metadata();
    assert.equal(metadata.format, 'webp');
    assert.equal(metadata.width, 320);
});

test('Atom fixture is normalized into static posts', () => {
    const fixture = readFileSync(new URL('./fixtures/blog.atom.xml', import.meta.url), 'utf8');
    const posts = atomPosts(fixture, 3);
    assert.equal(posts.length, 2);
    assert.equal(posts[0].title, 'A useful first post');
    assert.equal(posts[0].url, 'https://example.test/posts/first');
    assert.equal(posts[0].excerpt, 'A concise fixture excerpt.');
    assert.equal(posts[0].image, 'https://images.example.test/first.webp');
});

test('RSS fixture is normalized with descriptions and image fallbacks', () => {
    const fixture = readFileSync(new URL('./fixtures/blog.rss.xml', import.meta.url), 'utf8');
    const posts = feedPosts(fixture, 2);
    assert.equal(posts.length, 2);
    assert.equal(posts[0].title, 'A useful RSS post');
    assert.equal(posts[0].url, 'https://example.test/posts/rss-first');
    assert.equal(posts[0].date, 'August 13, 2026');
    assert.equal(posts[0].excerpt, 'A concise RSS fixture excerpt.');
    assert.equal(posts[0].image, 'https://images.example.test/enclosure.jpg');
    assert.equal(posts[1].image, 'https://images.example.test/rss-second.jpg');
});

test('feed parser rejects unusable and malformed feed shapes cleanly', () => {
    assert.deepEqual(feedPosts('<rss><channel><item><title>No link</title></item></channel></rss>', 3), []);
    assert.deepEqual(feedPosts('<not-a-feed/>', 3), []);
});

test('blog preparation falls back without throwing when a source fails', async () => {
    const fallback = [{ title: 'Saved', url: 'https://example.test/saved', excerpt: 'Available offline.' }];
    const result = await prepareBlog({
        content: { source: { url: 'https://feed.invalid', limit: 3 }, fallback },
        fetch: async () => { throw new Error('offline'); },
    });
    assert.equal(result.content.sourceStatus, 'fallback');
    assert.deepEqual(result.content.posts, fallback);
    assert.equal(result.warnings.length, 1);
});

test('blog feed URLs support same-origin runtime paths and generation-time resolution', () => {
    assert.equal(resolveFeedUrl('/blog/feed', { seo: { canonicalUrl: 'https://example.test/site/' } }), 'https://example.test/blog/feed');
    assert.equal(resolveFeedUrl('/blog/feed', {}), '');
});

test('blog renders baked posts with safe runtime refresh configuration', () => {
    const rendered = renderBlog({
        content: {
            heading: 'Blog',
            source: { url: '/blog/feed?<unsafe>', limit: 4 },
            sourceStatus: 'fallback',
            fallbackNotice: 'Showing saved posts.',
            fallback: [{ title: 'Saved', url: 'https://example.test/saved', excerpt: 'Saved excerpt.' }],
        },
    });
    assert.match(rendered.html, /data-blog-grid/);
    assert.match(rendered.html, /data-blog-notice/);
    assert.match(rendered.html, /<script type="application\/json" data-blog-source>/);
    assert.match(rendered.html, /"url":"\/blog\/feed\?\\u003cunsafe\\u003e"/);
    assert.doesNotMatch(rendered.html, /<unsafe>/);
});

test('git adapters normalize common provider shapes', () => {
    assert.equal(usernameFromProfile('https://github.com/octocat/'), 'octocat');
    assert.deepEqual(normalizeDays({ contributions: [{ date: '2026-01-01', count: 4, level: 2 }] }), [{ date: '2026-01-01', count: 4 }]);
    assert.deepEqual(normalizeDays({ '2026-01-02': 3 }), [{ date: '2026-01-02', count: 3 }]);
    assert.deepEqual(normalizeGists([{ description: 'Snippet', url: 'https://api.gist.test/1', html_url: 'https://gist.test/1', files: { a: { language: 'JavaScript' } } }], 2), [
        { title: 'Snippet', url: 'https://gist.test/1', language: 'JavaScript' },
    ]);
});

test('gist languages use the homepage badge metadata', () => {
    assert.deepEqual(gistLangMeta.JavaScript, { code: 'js', label: 'JS' });
    assert.deepEqual(gistLangMeta.Dockerfile, { code: 'docker', label: 'Docker' });
    assert.equal(gistLangMeta.Rust, undefined);
});

test('git contribution calendar renders inside its responsive centering wrapper', () => {
    const ctx = buildAssetCtx('git-contributions');
    const rendered = renderGit({
        content: {
            heading: 'Code',
            sources: {
                github: { label: 'GitHub', profileUrl: '', contributionsUrl: '' },
                gitlab: { label: 'Work <Git>', profileUrl: '', contributionsFile: 'contribution.json' },
                gists: { url: '', limit: 3 },
            },
            fallback: { github: [], gitlab: [], gists: [] },
            repos: [],
        },
        ctx,
    });
    assert.match(rendered.html, /<div class="chart-card-wrap">\s*<div class="contribution-panel">/);
    assert.match(rendered.html, /class="contribution-scroll"[^>]*tabindex="0"/);
    assert.match(rendered.html, /Work &lt;Git&gt;/);
    assert.match(rendered.html, /data-contribution-sources/);
    assert.match(rendered.html, /data-date="\d{4}-\d{2}-\d{2}"/);
    assert.match(rendered.html, /"contributions":\[/);
    assert.match(rendered.html, /"gists":\{/);
    assert.match(rendered.html, /data-gist-list/);
    assert.match(rendered.html, /assets\/git-contributions\/contribution\.json/);
    assert.deepEqual([...ctx.referencedAssets], ['contribution.json']);
});

test('git preparation reads a labeled module-relative contribution file', async (t) => {
    const moduleDir = await mkdtemp(path.join(os.tmpdir(), 'sitekit-contributions-'));
    t.after(() => rm(moduleDir, { recursive: true, force: true }));
    await mkdir(path.join(moduleDir, 'assets'));
    await writeFile(path.join(moduleDir, 'assets', 'contribution.json'), JSON.stringify({ '2026-08-01': 4, '2026-08-02': 7 }));
    const content = {
        sources: {
            github: { label: 'GitHub', profileUrl: '', contributionsUrl: '' },
            gitlab: { label: 'Work', profileUrl: '', contributionsFile: 'contribution.json' },
            gists: { url: '', limit: 3 },
        },
        fallback: { github: [], gitlab: [{ date: '2026-01-01', count: 1 }], gists: [] },
    };
    const result = await prepareGit({ content, moduleDir, fetch: async () => { throw new Error('unexpected fetch'); } });
    assert.deepEqual(result.content.resolved.gitlab, [{ date: '2026-08-01', count: 4 }, { date: '2026-08-02', count: 7 }]);
    assert.deepEqual(result.warnings, []);
});

test('git preparation isolates provider failures', async () => {
    const content = {
        sources: {
            github: { label: 'GitHub', profileUrl: '', contributionsUrl: 'https://data.test/github' },
            gitlab: { label: 'GitLab', profileUrl: '', contributionsUrl: 'https://data.test/gitlab' },
            gists: { url: '', limit: 3 },
        },
        fallback: { github: [{ date: '2026-01-01', count: 1 }], gitlab: [{ date: '2026-01-02', count: 2 }], gists: [] },
    };
    const result = await prepareGit({ content, fetch: async (url) => {
        if (url.endsWith('/github')) return { ok: true, json: async () => ({ contributions: [{ date: '2026-02-01', count: 8 }] }) };
        throw new Error('GitLab offline');
    } });
    assert.deepEqual(result.content.resolved.github, [{ date: '2026-02-01', count: 8 }]);
    assert.deepEqual(result.content.resolved.gitlab, content.fallback.gitlab);
    assert.equal(result.warnings.length, 1);
});
