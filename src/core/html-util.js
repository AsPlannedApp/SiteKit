/** Shared small helpers available to every module's template.js. */

const ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

/** Escape untrusted/user-authored text before interpolating into HTML. */
export function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}

const EXTERNAL_HREF_RE = /^([a-z][a-z0-9+.-]*:|#)/i;

/** True for absolute/external hrefs (http:, mailto:, #anchor, ...). */
export function isExternalHref(href) {
    return EXTERNAL_HREF_RE.test(href);
}

/**
 * A content.json field that's either an external URL or a module-relative
 * asset path shows up in several modules (talks' action links, press'
 * cover/download links). Resolve it once here instead of re-deriving the
 * same external-vs-local check in every module's template.js.
 */
export function resolveHref(href, ctx) {
    return isExternalHref(href) ? href : ctx.asset(href);
}
