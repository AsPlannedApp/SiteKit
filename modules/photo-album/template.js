import { escapeHtml } from '../../src/core/html-util.js';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export function previewWidths(columns) {
    const maximum = columns === 1 ? 1920 : columns === 2 ? 960 : 720;
    return [320, 640, 960, 1920].filter((width) => width <= maximum).concat(maximum).filter((width, index, values) => values.indexOf(width) === index);
}

export function previewPath(file, width) {
    const parsed = path.parse(file);
    const sourceSuffix = parsed.ext === '.png' ? '' : `-${parsed.ext.slice(1)}`;
    return `previews/${parsed.name}${sourceSuffix}-${width}.webp`;
}

function previewSizes(columns) {
    return `(max-width: 480px) calc(100vw - 7rem), (max-width: 760px) calc(50vw - 4rem), calc((min(100vw, 1160px) - 12rem) / ${columns})`;
}

export async function generateAssets({ content, moduleDir, outputDir }) {
    const widths = previewWidths(content.columns);
    await mkdir(path.join(outputDir, 'previews'), { recursive: true });
    await Promise.all((content.photos || []).flatMap((photo) => widths.map(async (width) => {
        const input = path.join(moduleDir, 'assets', photo.file);
        const output = path.join(outputDir, previewPath(photo.file, width));
        await sharp(input).resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toFile(output);
    })));
}

export function summary({ content }) {
    return { label: 'Photos', count: (content.photos || []).length };
}

export function render({ content, ctx }) {
    const photoItems = content.photos || [];
    const widths = previewWidths(content.columns);
    const photos = photoItems.map((photo, index) => {
        const original = ctx.asset(photo.file);
        const previews = widths.map((width) => ({ width, src: ctx.generatedAsset(previewPath(photo.file, width)) }));
        const srcset = previews.map(({ width, src }) => `${src} ${width}w`).join(', ');
        return `<button class="polaroid" type="button" data-album-photo data-index="${index}" data-src="${escapeHtml(original)}" data-alt="${escapeHtml(photo.alt)}" data-label="${escapeHtml(photo.label)}">
            <span class="polaroid__nail" aria-hidden="true"></span>
            <img src="${escapeHtml(previews[0].src)}" srcset="${escapeHtml(srcset)}" sizes="${escapeHtml(previewSizes(content.columns))}" alt="${escapeHtml(photo.alt)}" loading="lazy">
            <span class="polaroid__label">${escapeHtml(photo.label)}</span>
        </button>`;
    }).join('');
    const firstPhoto = photoItems[0];
    const firstSrc = firstPhoto ? ctx.asset(firstPhoto.file) : '';

    return { html: `<section id="photo-album" class="section" aria-label="Photo album">
    <div class="wrap">
        <div class="section-head"><div><span class="eyebrow">${escapeHtml(content.eyebrow || '')}</span><h2>${escapeHtml(content.heading)}</h2></div><span class="section-head__note" data-note>${escapeHtml(content.note || '')}</span></div>
        <div class="bulletin-board" style="--album-columns: ${content.columns}" data-rv>${photos}</div>
    </div>
    <dialog class="album-dialog" aria-label="Photo viewer">
        <button class="album-dialog__close" type="button" data-album-close aria-label="Close photo viewer"><i class="ti ti-x" aria-hidden="true"></i></button>
        <button class="album-dialog__nav album-dialog__nav--prev" type="button" data-album-prev aria-label="Previous photo"><i class="ti ti-chevron-left" aria-hidden="true"></i></button>
        <figure><img data-album-image src="${escapeHtml(firstSrc)}" alt="${escapeHtml(firstPhoto?.alt || '')}"><figcaption><span data-album-label>${escapeHtml(firstPhoto?.label || '')}</span><small data-album-count>${photoItems.length ? `1 / ${photoItems.length}` : ''}</small></figcaption></figure>
        <button class="album-dialog__nav album-dialog__nav--next" type="button" data-album-next aria-label="Next photo"><i class="ti ti-chevron-right" aria-hidden="true"></i></button>
    </dialog>
</section>` };
}
