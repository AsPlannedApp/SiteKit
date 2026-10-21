import { escapeHtml } from '../../src/core/html-util.js';

/** The hero shows up to two authored promos, or the derived section index. */

export function summary() {
    return null; // chrome -- hero doesn't appear in its own issue-index
}

function renderCta(cta) {
    const variantClass = cta.variant === 'ghost' ? 'btn-ghost' : 'btn-opposite';
    const icon = cta.icon ? `<i class="ti ${escapeHtml(cta.icon)}"></i>` : '';
    const target = cta.external ? ' target="_blank" rel="noopener"' : '';
    const label = cta.shortLabel
        ? `<span data-cta-long>${escapeHtml(cta.label)}</span><span data-cta-short>${escapeHtml(cta.shortLabel)}</span>`
        : escapeHtml(cta.label);

    return `<a class="btn ${variantClass} btn-md" href="${escapeHtml(cta.href)}"${target}>${icon}${label}</a>`;
}

function renderIssueIndex(content, ctx) {
    const label = content.issueIndexLabel || 'In this issue';
    const items = ctx.sections
        .map(
            (s) =>
                `<a href="#${escapeHtml(s.anchor)}"><span>${escapeHtml(s.label)}</span><span>${s.count !== null && s.count !== undefined ? escapeHtml(String(s.count)) : ''}</span></a>`
        )
        .join('\n            ');

    return `
        <div id="issue-index">
            <div id="issue-index__label">${escapeHtml(label)}</div>
            ${items}
        </div>`;
}

function renderPromos(promos, ctx) {
    return `<div class="hero-promos" aria-label="Featured projects">
        ${promos.map((promo, index) => `<article class="hero-promo" aria-labelledby="hero-promo-title-${index}">
            <div class="hero-promo__header">${promo.image ? `<img class="hero-promo__image" src="${escapeHtml(ctx.asset(promo.image))}" alt="" width="64" height="64">` : ''}
                <div>${promo.eyebrow ? `<p class="hero-promo__eyebrow">${escapeHtml(promo.eyebrow)}</p>` : ''}
                    <h2 id="hero-promo-title-${index}" class="hero-promo__title">${escapeHtml(promo.title)}</h2>
                </div>
            </div>
            <p class="hero-promo__description">${escapeHtml(promo.description)}</p>
            <a class="btn btn-ghost btn-md hero-promo__action" href="${escapeHtml(promo.action.href)}"${promo.action.external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(promo.action.label)}</a>
        </article>`).join('\n')}
    </div>`;
}

export function render({ content, config, ctx }) {
    const avatar = content.avatar
        ? `<img class="hero-avatar" src="${ctx.asset(content.avatar)}" alt="${escapeHtml(content.name)}">`
        : '';

    const ctas = (content.ctas || []).map(renderCta).join('\n                ');

    const promos = content.promos || [];
    const promoClass = promos.length ? ` hero-inner--promos hero-inner--promos-${promos.length}` : '';

    const html = `
<section id="top">
    <div class="hero-inner${promoClass}">
        <div class="hero-copy">
            ${avatar}
            <div class="hero-eyebrow">${escapeHtml(content.eyebrow || '')}</div>
            <h1>${escapeHtml(content.name)}${content.nameHighlight ? ` <span>${escapeHtml(content.nameHighlight)}</span>` : ''}</h1>
            <p>${escapeHtml(content.tagline)}</p>
            <div class="hero-cta">
                ${ctas}
            </div>
        </div>${promos.length ? renderPromos(promos, ctx) : renderIssueIndex(content, ctx)}
    </div>
</section>`;

    return { html };
}
