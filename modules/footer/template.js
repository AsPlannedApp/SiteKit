import { escapeHtml } from '../../src/core/html-util.js';

/**
 * modules/footer/template.js
 *
 * The simplest module in the set: no fetchable sources, no live/baked split,
 * one small nested asset (badges/verified.svg) to prove ctx.asset() works
 * end to end.
 *
 * content.extraHtml is the one deliberate exception to this codebase's
 * usual escapeHtml-everything convention: it's raw, author-controlled HTML
 * inserted as-is (e.g. externally-hosted W3C validator badges, whose <img>
 * src is a real absolute URL and can't go through ctx.asset()'s
 * module-relative contract; or a copyright line, an email link). `npm run
 * check` tag-balance-lints it (src/core/html-lint.js) so a malformed entry
 * fails the build rather than silently breaking the page's HTML validity.
 */

export function summary() {
    // Footer is chrome, not a nav-linked content section — nothing to
    // contribute to the header nav / hero "in this issue" list.
    return null;
}

export function render(content, config, mode, ctx) {
    const badges = (content.badges || [])
        .map(
            (badge) => `
                <a class="site-footer__badge" href="${escapeHtml(badge.href || '#')}" target="_blank" rel="noopener">
                    <img src="${ctx.asset(badge.image)}" alt="${escapeHtml(badge.alt)}" loading="lazy">
                </a>`
        )
        .join('');

    const extraHtml = (content.extraHtml || []).join('');

    const html = `
<footer class="site-footer">
    <div class="site-footer__inner">
        <div>
            <div class="site-footer__name">${escapeHtml(content.name)}</div>
            <div class="site-footer__role">${escapeHtml(content.role)}</div>
        </div>
        <div class="site-footer__badges">${badges}${extraHtml}
        </div>
    </div>
</footer>`;

    return { html };
}
