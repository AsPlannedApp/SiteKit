import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { render } from '../modules/hero/template.js';
import { buildAssetCtx } from '../src/core/module-loader.js';
import { validateModuleContent } from '../src/core/content-validation.js';

const contentSchema = JSON.parse(readFileSync(new URL('../modules/hero/content.schema.json', import.meta.url), 'utf8'));
const base = { name: 'Example', tagline: 'Building useful things.' };
const promo = { image: 'images/project.svg', title: 'Project', description: 'A useful project.', action: { label: 'Explore →', href: 'https://example.test/', external: true } };
const validate = (promos) => validateModuleContent([{ id: 'hero', contentSchema, content: { ...base, promos } }]);
const ctx = () => ({ ...buildAssetCtx('hero'), sections: [{ anchor: 'blog', label: 'Posts', count: 3 }] });

test('hero retains its derived section index with absent or empty promos', () => {
    for (const content of [base, { ...base, promos: [] }]) {
        const html = render({ content, ctx: ctx() }).html;
        assert.match(html, /id="issue-index"/);
        assert.match(html, /href="#blog"/);
        assert.doesNotMatch(html, /class="hero-promos"/);
    }
    assert.deepEqual(validate([]), []);
});

test('hero accepts one or two ordered promos and rejects a third', () => {
    for (const count of [1, 2]) {
        const promos = Array.from({ length: count }, (_, i) => ({ ...promo, title: `Project ${i}` }));
        assert.deepEqual(validate(promos), []);
        const html = render({ content: { ...base, promos }, ctx: ctx() }).html;
        assert.match(html, new RegExp(`hero-inner--promos-${count}`));
        assert.equal((html.match(/class="hero-promo"/g) || []).length, count);
        assert.doesNotMatch(html, /id="issue-index"/);
        if (count === 2) assert.ok(html.indexOf('Project 0') < html.indexOf('Project 1'));
    }
    assert.match(validate([promo, promo, promo]).join('\n'), /\/promos must NOT have more than 2 items/);
});

test('promo validation requires meaningful text and a supported action destination', () => {
    for (const missing of ['title', 'description', 'action']) {
        const item = { ...promo };
        delete item[missing];
        assert.ok(validate([item]).length, missing);
    }
    for (const key of ['title', 'description']) assert.ok(validate([{ ...promo, [key]: '' }]).length, key);
    for (const href of ['javascript:alert(1)', 'data:text/html,hello', '']) {
        assert.ok(validate([{ ...promo, action: { ...promo.action, href } }]).length, href);
    }
    for (const href of ['https://example.test/', 'http://localhost:3000/', '/project', '#project']) {
        assert.deepEqual(validate([{ ...promo, action: { ...promo.action, href } }]), []);
    }
});

test('promo markup escapes authored text and resolves optional image assets', () => {
    const context = ctx();
    const item = { ...promo, title: '<Project>', description: 'A & B', eyebrow: '<New>', action: { label: 'Go <now>', href: 'https://example.test/?a=1&b=2', external: true } };
    const html = render({ content: { ...base, promos: [item] }, ctx: context }).html;
    assert.deepEqual([...context.referencedAssets], ['images/project.svg']);
    assert.match(html, /src="assets\/hero\/images\/project.svg" alt="" width="64" height="64"/);
    assert.match(html, /&lt;Project&gt;/);
    assert.match(html, /A &amp; B/);
    assert.match(html, /&lt;New&gt;/);
    assert.match(html, /Go &lt;now&gt;/);
    assert.match(html, /href="https:\/\/example.test\/\?a=1&amp;b=2"/);
    const { image, eyebrow, ...minimal } = promo;
    const minimalHtml = render({ content: { ...base, promos: [minimal] }, ctx: ctx() }).html;
    assert.doesNotMatch(minimalHtml, /<img|hero-promo__eyebrow/);
});

test('promo headings and actions remain accessible with multiple projects', () => {
    const html = render({ content: { ...base, promos: [promo, { ...promo, action: { label: 'Read', href: '/read' } }] }, ctx: ctx() }).html;
    for (const i of [0, 1]) {
        assert.match(html, new RegExp(`aria-labelledby="hero-promo-title-${i}"`));
        assert.match(html, new RegExp(`<h2 id="hero-promo-title-${i}"`));
    }
    assert.equal((html.match(/target="_blank" rel="noopener noreferrer"/g) || []).length, 1);
    assert.match(html, /href="\/read">Read<\/a>/);
    assert.match(html, /aria-label="Featured projects"/);
});
