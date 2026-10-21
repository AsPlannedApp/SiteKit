import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { render } from '../modules/hero/template.js';
import { buildAssetCtx } from '../src/core/module-loader.js';

const root = process.cwd();
const output = process.env.HERO_PREVIEW_DIR || path.join(os.tmpdir(), 'sitekit-hero-promos');
await mkdir(output, { recursive: true });
const authored = JSON.parse(await readFile(path.join(root, 'modules/hero/content.json'), 'utf8'));
const first = authored.promos?.[0] || { title: 'First project', description: 'A useful project with a concise description.', action: { label: 'Explore the project →', href: 'https://example.test/' } };
const second = authored.promos?.[1] || { ...first, title: 'Second project', eyebrow: 'New app', description: 'A second project with a longer description to exercise equal-height cards and aligned actions across different amounts of content.', action: { label: 'Download on the App Store', href: '#' } };
const browser = await chromium.launch({ channel: 'chrome', args: ['--allow-file-access-from-files'] });
const records = [];
const errors = [];
const closeEnough = (a, b) => Math.abs(a - b) <= 1;
try {
    for (const width of [1440, 1200, 1024, 700, 390, 320]) {
        const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
        const page = await context.newPage();
        page.on('pageerror', (error) => errors.push(error.message));
        await page.route(/^https?:/, (route) => new URL(route.request().url()).hostname === 'fonts.asplanned.app' ? route.continue() : route.abort());
        await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
        await page.evaluate(() => document.fonts.ready);
        for (const count of [0, 1, 2]) {
            const content = { ...authored, promos: [first, second].slice(0, count) };
            const ctx = { ...buildAssetCtx('hero'), sections: [{ anchor: 'blog', label: 'Posts', count: 3 }] };
            await page.locator('.hero-inner').evaluate((node, markup) => { node.parentElement.outerHTML = markup; }, render({ content, ctx }).html);
            await page.evaluate(async () => {
                await Promise.all([...document.querySelectorAll('.hero-promo img')].map((img) => img.decode()));
                await document.fonts.ready;
            });
            for (const theme of ['light', 'dark']) {
                await page.locator('html').evaluate((node, value) => { node.dataset.theme = value; }, theme);
                const data = await page.evaluate(() => {
                    const rect = (node) => {
                        const { x, y, width, height, right, bottom } = node.getBoundingClientRect();
                        return { x, y, width, height, right, bottom };
                    };
                    const style = (node) => Object.fromEntries([...getComputedStyle(node)].map((key) => [key, getComputedStyle(node).getPropertyValue(key)]));
                    return {
                        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
                        intro: rect(document.querySelector('.hero-copy')),
                        cards: [...document.querySelectorAll('.hero-promo')].map((node) => ({ box: rect(node), style: style(node), image: node.querySelector('img') ? rect(node.querySelector('img')) : null, action: rect(node.querySelector('a')), actionStyle: style(node.querySelector('a')) })),
                        referenceStyle: style(document.querySelector('.hero-cta .btn-ghost') || document.querySelector('.hero-cta .btn')),
                        issueIndex: !!document.querySelector('#issue-index'),
                    };
                });
                const label = `${count} promos, ${width}px, ${theme}`;
                assert.ok(data.overflow <= 1, `${label}: page overflow ${data.overflow}`);
                assert.equal(data.cards.length, count, label);
                assert.equal(data.issueIndex, count === 0, label);
                for (const card of data.cards) {
                    assert.ok(card.box.x >= 0 && card.box.right <= width, `${label}: card bounds`);
                    assert.equal(card.style['background-image'], 'none', label);
                    for (const side of ['top', 'right', 'bottom', 'left']) {
                        assert.equal(card.style[`padding-${side}`], '24px', label);
                        assert.equal(card.style[`border-${side}-width`], '1px', label);
                    }
                    assert.equal(card.style['border-top-left-radius'], '16px', label);
                    if (card.image) assert.deepEqual([card.image.width, card.image.height], [64, 64], label);
                    for (const property of ['display', 'align-items', 'justify-content', 'cursor', 'font-family', 'font-weight', 'border-top-left-radius', 'border-top-width', 'border-top-style', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left']) {
                        assert.equal(card.actionStyle[property], data.referenceStyle[property], `${label}: button ${property}`);
                    }
                    assert.ok(card.action.x >= card.box.x && card.action.right <= card.box.right, `${label}: button bounds`);
                }
                if (count === 1) {
                    if (width > 1024) assert.ok(data.intro.right <= data.cards[0].box.x, `${label}: side slot`);
                    else assert.ok(data.intro.bottom <= data.cards[0].box.y, `${label}: below intro`);
                }
                if (count === 2) {
                    const [a, b] = data.cards;
                    if (width >= 1200) assert.ok(data.intro.right <= a.box.x, `${label}: desktop introduction`);
                    else assert.ok(data.intro.bottom <= a.box.y, `${label}: tablet/mobile introduction`);
                    if (width >= 700) {
                        assert.ok(closeEnough(a.box.y, b.box.y) && a.box.right <= b.box.x, `${label}: side by side`);
                        assert.ok(closeEnough(a.box.height, b.box.height), `${label}: equal heights`);
                        assert.ok(closeEnough(a.action.bottom, b.action.bottom), `${label}: aligned actions`);
                    } else assert.ok(a.box.bottom <= b.box.y, `${label}: stacked cards`);
                }
                if (count) {
                    const action = page.locator('.hero-promo__action').first();
                    await action.focus();
                    assert.equal(await action.evaluate((node) => getComputedStyle(node).outlineStyle), 'solid', `${label}: focus ring`);
                    await action.blur();
                }
                await page.locator('.hero-inner').screenshot({ path: path.join(output, `${count}-${width}-${theme}.png`) });
                records.push({ count, width, theme, ...data });
            }
        }
        await context.close();
    }
    assert.deepEqual(errors, [], 'browser errors');
    await writeFile(path.join(output, 'computed-styles.json'), JSON.stringify(records, null, 2));
    console.log(`PASS: ${records.length} hero scenarios; screenshots and full computed styles in ${output}`);
} finally {
    await browser.close();
}
