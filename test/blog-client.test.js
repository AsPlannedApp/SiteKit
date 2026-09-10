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

class ImageElement extends EventTarget {
    constructor(thumb) {
        super();
        this.thumb = thumb;
        this.complete = false;
        this.naturalWidth = 0;
        this.src = 'https://example.test/image.jpg';
        this.currentSrc = this.src;
        this.srcset = 'https://example.test/image-480.jpg 480w';
    }
    closest(selector) { return selector === '.blog-card__thumb' ? this.thumb : null; }
    removeAttribute(name) { this[name] = ''; }
}

async function initialize(image) {
    const source = await readFile(new URL('../modules/blog/client.js', import.meta.url), 'utf8');
    vm.runInNewContext(source, {
        document: {
            querySelector: () => null,
            querySelectorAll: (selector) => selector === '.blog-card__thumb img' ? [image] : [],
        },
    });
}

test('blog images are revealed only after a valid load', async () => {
    const thumb = { classList: new Classes() };
    const image = new ImageElement(thumb);
    await initialize(image);

    image.naturalWidth = 800;
    image.dispatchEvent(new Event('load'));
    assert.equal(thumb.classList.contains('is-image-ready'), true);
    assert.equal(thumb.classList.contains('is-image-broken'), false);
});

test('broken blog images are removed while their placeholder remains', async () => {
    const thumb = { classList: new Classes() };
    const image = new ImageElement(thumb);
    await initialize(image);

    image.dispatchEvent(new Event('error'));
    assert.equal(thumb.classList.contains('is-image-ready'), false);
    assert.equal(thumb.classList.contains('is-image-broken'), true);
    assert.equal(image.src, '');
    assert.equal(image.srcset, '');
});
