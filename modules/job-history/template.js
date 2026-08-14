import { escapeHtml } from '../../src/core/html-util.js';

export function summary({ content }) { return { label: 'Roles', count: (content.entries || []).length }; }

function entryCard(entry, index) {
    const links = (entry.links || []).map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)} <span aria-hidden="true">↗</span></a>`).join('');
    return `<article class="career-entry career-entry--${index % 2 === 0 ? 'right' : 'left'}" data-rv>
        <span class="career-entry__dot" aria-hidden="true"></span>
        <div class="career-card">
            <div class="career-card__period">${escapeHtml(entry.period)}</div>
            <h3>${escapeHtml(entry.role)}</h3>
            <div class="career-card__company">${escapeHtml(entry.company)}${entry.location ? ` · ${escapeHtml(entry.location)}` : ''}</div>
            ${(entry.paragraphs || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}${links ? `<div class="career-card__links">${links}</div>` : ''}
        </div>
    </article>`;
}

export function render({ content }) {
    return { html: `<section id="job-history" class="section" aria-label="Job history"><div class="wrap">
        <div class="section-head"><div><span class="eyebrow">${escapeHtml(content.eyebrow || '')}</span><h2>${escapeHtml(content.heading)}</h2></div><span class="section-head__note" data-note>${escapeHtml(content.note || '')}</span></div>
        <div class="career-timeline">${(content.entries || []).map(entryCard).join('')}</div>
    </div></section>` };
}
