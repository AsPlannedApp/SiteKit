import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

class Classes {
    values = new Set();
    add(value) { this.values.add(value); }
    remove(value) { this.values.delete(value); }
    contains(value) { return this.values.has(value); }
}

class Element extends EventTarget {
    constructor({ dataset = {}, src = '', currentSrc = '' } = {}) {
        super();
        this.dataset = dataset;
        this.src = src;
        this.currentSrc = currentSrc;
        this.classList = new Classes();
        this.attributes = new Map();
        this.style = { values: new Map(), setProperty: (name, value) => this.style.values.set(name, String(value)) };
        this.hidden = false;
        this.textContent = '';
        this.alt = '';
        this.queries = new Map();
    }
    querySelector(selector) { return this.queries.get(selector) || null; }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    removeAttribute(name) {
        this.attributes.delete(name);
        if (name === 'src') this.src = '';
        if (name === 'open') this.open = false;
    }
    focus() { this.focused = true; }
}

function viewerHarness() {
    const media = new Element();
    const preview = new Element();
    const image = new Element();
    const progress = new Element();
    progress.hidden = true;
    const label = new Element();
    const count = new Element();
    const previous = new Element();
    const next = new Element();
    const close = new Element();
    const dialog = new Element();
    dialog.showModal = () => { dialog.open = true; };
    dialog.close = () => { dialog.open = false; dialog.dispatchEvent(new Event('close')); };
    dialog.queries = new Map([
        ['[data-album-media]', media],
        ['[data-album-preview]', preview],
        ['[data-album-image]', image],
        ['[data-album-progress]', progress],
        ['[data-album-label]', label],
        ['[data-album-count]', count],
        ['[data-album-prev]', previous],
        ['[data-album-next]', next],
        ['[data-album-close]', close],
    ]);

    const photos = ['One', 'Two', 'Three'].map((name, index) => {
        const photo = new Element({ dataset: { src: `original-${index + 1}.jpg`, alt: `${name} alt`, label: name } });
        const thumbnail = new Element({ src: `preview-${index + 1}-320.webp`, currentSrc: `preview-${index + 1}-640.webp` });
        thumbnail.naturalWidth = 1600;
        thumbnail.naturalHeight = index === 2 ? 900 : 1200;
        photo.queries.set('img', thumbnail);
        return photo;
    });
    const loaders = [];
    class MockImage {
        constructor() { loaders.push(this); }
        set src(value) { this.source = value; }
        async decode() {}
        async succeed() { await this.onload(); }
        fail() { this.onerror(); }
    }
    const document = {
        querySelector: (selector) => selector === '.album-dialog' ? dialog : null,
        querySelectorAll: (selector) => selector === '[data-album-photo]' ? photos : [],
    };
    return { document, loaders, photos, dialog, media, preview, image, progress, label, count, next, MockImage };
}

async function mountViewer(harness) {
    const source = await readFile(new URL('../modules/photo-album/client.js', import.meta.url), 'utf8');
    vm.runInNewContext(source, {
        document: harness.document,
        Image: harness.MockImage,
        requestAnimationFrame: (callback) => callback(),
    });
}

test('photo viewer shows the chosen preview until its original has decoded', async () => {
    const viewer = viewerHarness();
    await mountViewer(viewer);

    viewer.photos[2].dispatchEvent(new Event('click'));
    assert.equal(viewer.dialog.open, true);
    assert.equal(viewer.preview.src, 'preview-3-640.webp');
    assert.equal(viewer.media.style.values.get('--album-photo-ratio'), String(1600 / 900));
    assert.equal(viewer.image.src, '');
    assert.equal(viewer.label.textContent, 'Three');
    assert.equal(viewer.count.textContent, '3 / 3');
    assert.equal(viewer.media.attributes.get('aria-busy'), 'true');
    assert.equal(viewer.progress.hidden, false);

    await viewer.loaders[0].succeed();
    assert.equal(viewer.image.src, 'original-3.jpg');
    assert.equal(viewer.image.classList.contains('is-ready'), true);
    assert.equal(viewer.media.attributes.get('aria-busy'), 'false');
    assert.equal(viewer.progress.hidden, true);
});

test('photo viewer ignores stale loads and retains the preview on failure', async () => {
    const viewer = viewerHarness();
    await mountViewer(viewer);

    viewer.photos[0].dispatchEvent(new Event('click'));
    viewer.next.dispatchEvent(new Event('click'));
    assert.equal(viewer.preview.src, 'preview-2-640.webp');

    await viewer.loaders[0].succeed();
    assert.equal(viewer.image.src, '');
    assert.equal(viewer.progress.hidden, false);

    viewer.loaders[1].fail();
    assert.equal(viewer.preview.src, 'preview-2-640.webp');
    assert.equal(viewer.image.src, '');
    assert.equal(viewer.media.attributes.get('aria-busy'), 'false');
    assert.equal(viewer.progress.hidden, true);
});
