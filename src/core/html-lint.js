/**
 * A minimal, void-element-aware tag-balance checker for raw HTML snippets
 * that bypass this codebase's usual escapeHtml() convention (module content
 * fields like footer's extraHtml -- see modules/footer/content.schema.json).
 * It is NOT a real HTML parser/validator -- it only catches the "you forgot
 * a closing tag" class of mistake that would otherwise silently break the
 * rest of the generated page's markup and undermine the W3C-validity goal.
 * Full W3C validation is out of scope here (that's an external validator's
 * job); this just guards against malformed fragments leaking into an
 * otherwise-valid document.
 */

// Void elements never need (and, per the HTML spec, never have) a closing
// tag -- a naive <(\w+)>...<\/\1> stack check would false-positive on these.
const VOID_ELEMENTS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

const TAG_RE = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g;

/**
 * Checks one HTML fragment for balanced non-void tags. Returns null if
 * balanced, or a string describing the first problem found otherwise.
 */
export function checkHtmlBalance(html) {
    const stack = [];

    for (const match of html.matchAll(TAG_RE)) {
        const [full, rawName, selfClosingSlash] = match;
        const name = rawName.toLowerCase();
        const isClosing = full.startsWith('</');
        const isVoid = VOID_ELEMENTS.has(name);

        if (isClosing) {
            if (isVoid) continue; // </img> etc. is invalid HTML but not our concern here
            if (!stack.length) {
                return `unexpected closing tag "</${name}>" with no matching open tag (at "${full}")`;
            }
            const top = stack[stack.length - 1];
            if (top !== name) {
                return `mismatched closing tag "</${name}>" -- expected "</${top}>" (at "${full}")`;
            }
            stack.pop();
        } else if (!isVoid && !selfClosingSlash) {
            stack.push(name);
        }
        // void elements and explicit self-closing tags (<foo />) never push
    }

    if (stack.length) {
        return `unclosed tag${stack.length > 1 ? 's' : ''} "${stack.map((t) => `<${t}>`).join(', ')}" -- reached end of string still open`;
    }
    return null;
}
