import { escapeHtml } from '../../src/core/html-util.js';

/**
 * modules/hero/template.js
 *
 * The "In this issue" list is NOT hand-authored data on this module --
 * it's built from ctx.sections (every enabled content-section module's summary()/
 * countOverride), so it grows automatically as Step 3/4/5 add modules,
 * with no changes needed here. An optional avatar image (not present in
 * the source site) demonstrates a nested module asset path
 * (images/avatar-placeholder.svg -> /assets/hero/images/avatar-placeholder.svg).
 */

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

export function render(content, config, mode, ctx) {
    const avatar = content.avatar
        ? `<img class="hero-avatar" src="${ctx.asset(content.avatar)}" alt="${escapeHtml(content.name)}">`
        : '';

    const ctas = (content.ctas || []).map(renderCta).join('\n                ');

    const html = `
<section id="top">
    <div class="hero-inner">
        <div class="hero-copy">
            ${avatar}
            <div class="hero-eyebrow">${escapeHtml(content.eyebrow || '')}</div>
            <h1>${escapeHtml(content.name)}${content.nameHighlight ? ` <span>${escapeHtml(content.nameHighlight)}</span>` : ''}</h1>
            <p>${escapeHtml(content.tagline)}</p>
            <div class="hero-cta">
                ${ctas}
            </div>
        </div>${renderIssueIndex(content, ctx)}
    </div>
</section>`;

    return { html };
}
