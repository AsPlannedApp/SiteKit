import { escapeHtml } from '../../src/core/html-util.js';

/**
 * modules/learning/template.js
 */

export function summary(content) {
    const badges = content.badges || [];
    return { label: 'Certifications', count: badges.length };
}

function renderBadge(badge, ctx) {
    const title = `${escapeHtml(badge.issuer)}: ${escapeHtml(badge.title)}`;
    return `
                <div class="credential-badge" role="group" title="${title}" aria-label="${title}">
                    <div class="credential-badge__medallion"><img src="${ctx.asset(badge.image)}" alt="${escapeHtml(badge.issuer)} Logo" loading="lazy"></div>
                    <h3>${escapeHtml(badge.title)}</h3>
                    <span class="credential-badge__issuer" data-issuer>${escapeHtml(badge.issuer)}</span>
                </div>`;
}

function renderMiniBadge(badge) {
    const title = `${escapeHtml(badge.issuer)}: ${escapeHtml(badge.label)}`;
    return `
                <div class="mini-badge" role="group" title="${title}" aria-label="${title}">
                    <i class="ti ${escapeHtml(badge.icon)}" aria-hidden="true"></i>
                    <span class="mini-badge__label">${escapeHtml(badge.label)}</span>
                    <span class="mini-badge__issuer" data-issuer>${escapeHtml(badge.issuer)}</span>
                </div>`;
}

export function render(content, config, mode, ctx) {
    const badges = (content.badges || []).map((b) => renderBadge(b, ctx)).join('');
    const miniBadges = (content.miniBadges || []).map(renderMiniBadge).join('');

    const html = `
    <section id="learning" class="section" aria-label="Credentials">
        <div class="wrap">
            <div class="section-head">
                <div><span class="eyebrow">${escapeHtml(content.eyebrow || '')}</span><h2>${escapeHtml(content.heading || '')}</h2></div>
                <span class="section-head__note" data-note>${escapeHtml(content.note || '')}</span>
            </div>
            <div class="trophy-panel" data-rv>
                <div class="trophy-panel__head">
                    <span>${escapeHtml(content.panelLabel || '')}</span>
                    <span data-note>${escapeHtml(content.panelNote || '')}</span>
                </div>
                <div id="trophies">${badges}
                </div>
            </div>

            <div id="courses" data-rv>
                <div id="mini-badges-label">${escapeHtml(content.miniBadgesLabel || '')}</div>
                <div id="mini-badges" class="mini-badge-grid">${miniBadges}
                </div>
            </div>
        </div>
    </section>`;

    return { html };
}
