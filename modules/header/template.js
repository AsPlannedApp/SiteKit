import { escapeHtml } from '../../src/core/html-util.js';

/**
 * modules/header/template.js
 *
 * Nav links are built generically from ctx.sections (Step 2's summary() pass)
 * rather than hardcoding the site's five built-in sections -- so adding a new
 * content-section module later (gallery, timeline, ...) needs zero header
 * changes as long as its module.json declares navLabel/navIcon/anchor.
 */

export function summary() {
    return null; // chrome, not a nav-linked content section
}

export function render(content, config, mode, ctx) {
    const navLinks = ctx.sections
        .map((s) => {
            const icon = s.navIcon
                ? `<i class="ti ${escapeHtml(s.navIcon)}" data-nav-icon aria-hidden="true"></i>`
                : '';
            return `<a href="#${escapeHtml(s.anchor)}" title="${escapeHtml(s.navLabel)}">${icon}<span data-nav-label>${escapeHtml(s.navLabel)}</span></a>`;
        })
        .join('\n            ');

    const note = content.note
        ? `<span class="site-header__note" data-note>${escapeHtml(content.note)}</span>`
        : '';

    const html = `
<header class="site-header">
    <div class="site-header__inner">
        <a href="#top" aria-label="Home" class="site-header__logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 10.5 12 3l9 7.5"></path>
                <path d="M5 9.5V21h14V9.5"></path>
                <path d="M9.5 21v-6h5v6"></path>
            </svg>
        </a>
        <nav class="site-nav" aria-label="Section links">
            ${navLinks}
        </nav>
        ${note}
    </div>
</header>`;

    return { html };
}
