import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Loads themes/<preset>/tokens.json, applies config.theme.overrides on top
 * (overrides are always --ap-* raw-token keys -- see the plan's "style
 * invariant"), and serializes the merged map into a :root {} CSS block.
 * Module CSS never reads these keys directly; it reads the bare aliases
 * (--brand, --fg-body, ...) that tokens.json itself defines in terms of them.
 */
export function loadThemeTokens(themesRoot, presetName) {
    const tokensPath = path.join(themesRoot, presetName, 'tokens.json');
    if (!existsSync(tokensPath)) {
        throw new Error(`Unknown theme preset "${presetName}" -- expected themes/${presetName}/tokens.json to exist.`);
    }
    return JSON.parse(readFileSync(tokensPath, 'utf8'));
}

export function buildThemeCss(tokens, overrides = {}) {
    const merged = { ...tokens, ...overrides };
    const lines = Object.entries(merged).map(([key, value]) => `    ${key}: ${value};`);
    return `:root {\n${lines.join('\n')}\n}`;
}
