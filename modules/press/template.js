import { escapeHtml, resolveHref } from '../../src/core/html-util.js';

/**
 * modules/press/template.js
 *
 * A magazine's cover-link href isn't stored separately in content.json --
 * it's always the same target as the magazine's primary action (the single
 * link, or the first dropdown item), so it's derived here rather than
 * duplicated as data a content editor could let drift out of sync.
 */

export function summary({ content }) {
    return { label: 'Articles in print', count: (content.magazines || []).length };
}

function primaryHref(magazine) {
    return magazine.action.type === 'single' ? magazine.action.href : magazine.action.items[0].href;
}

function renderActions(magazine, ctx) {
    const { action } = magazine;

    if (action.type === 'single') {
        return `<div class="card-actions"><a class="text-link" href="${resolveHref(action.href, ctx)}" title="${escapeHtml(magazine.title)}" target="_blank" rel="noopener noreferrer">${escapeHtml(action.label)}</a></div>`;
    }

    const items = action.items
        .map((item) => `<a href="${resolveHref(item.href, ctx)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.label)}</a>`)
        .join('\n                                    ');

    return `
                        <div class="card-actions">
                            <details class="dl-dropdown">
                                <summary class="dl-summary">Download <i class="ti ti-chevron-down" aria-hidden="true"></i></summary>
                                <div class="dl-menu">
                                    ${items}
                                </div>
                            </details>
                        </div>`;
}

function renderMagazine(magazine, ctx) {
    const articleClass = magazine.coverSquare ? ' magazine-cover--disc' : '';
    const imgStyle = magazine.coverSquare ? ' style="margin: 32px 0; aspect-ratio: 1;"' : '';
    const coverHref = resolveHref(primaryHref(magazine), ctx);

    return `
                    <article class="magazine-cover${articleClass}">
                        <h3>${escapeHtml(magazine.title)} ${magazine.flag}<br><span style="font-size: 12px;">(${escapeHtml(magazine.dateLabel)} - ${escapeHtml(magazine.role)})</span></h3>
                        <a class="cover-link" href="${coverHref}" title="${escapeHtml(magazine.title)}" target="_blank" rel="noopener noreferrer">
                            <img src="${ctx.asset(magazine.coverImage)}" width="200" height="285" alt="${escapeHtml(magazine.title)}" loading="lazy"${imgStyle}>
                        </a>${renderActions(magazine, ctx)}
                    </article>`;
}

function renderTutorial(tutorial, ctx) {
    return `
                <a class="tutorial-card" href="${resolveHref(tutorial.href, ctx)}" title="${escapeHtml(tutorial.title)}" target="_blank" rel="noopener noreferrer">
                    <img src="${ctx.asset(tutorial.image)}" alt="${escapeHtml(tutorial.title)}" loading="lazy">
                    <div><h4>${escapeHtml(tutorial.title)}</h4><span>${escapeHtml(tutorial.note)}</span></div>
                </a>`;
}

export function render({ content, ctx }) {
    const magazines = (content.magazines || []).map((m) => renderMagazine(m, ctx)).join('');
    const tutorials = (content.tutorials || []).map((t) => renderTutorial(t, ctx)).join('');

    const html = `
    <section id="press" class="section" aria-label="In Print">
        <div class="wrap">
            <div class="section-head">
                <div><span class="eyebrow">${escapeHtml(content.eyebrow || '')}</span><h2>${escapeHtml(content.heading || '')}</h2></div>
                <span class="section-head__note" data-note>${escapeHtml(content.note || '')}</span>
            </div>
            <div class="print-panel" data-rv>
                <div class="print-panel__nameplate">
                    <span>${escapeHtml(content.panelLabel || '')}</span>
                </div>
                <div class="magazine-shelf">${magazines}
                </div>
            </div>

            <div id="tutorials" data-rv>${tutorials}
            </div>
        </div>
    </section>`;

    return { html };
}
