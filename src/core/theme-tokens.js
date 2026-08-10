import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Loads themes/<preset>/tokens.json. Shape is { colors: {...}, fonts: {...} }
 * -- colors are --ap-* raw tokens + their bare-alias derivations (--brand,
 * --fg-body, ...), fonts describe the theme's default font provider/baseUrl/
 * families (see font-tags.js). Module CSS never reads .colors' raw --ap-*
 * keys directly; it reads the bare aliases that tokens.json itself defines
 * in terms of them.
 */
export function loadThemeTokens(themesRoot, presetName) {
    const tokensPath = path.join(themesRoot, presetName, 'tokens.json');
    if (!existsSync(tokensPath)) {
        throw new Error(`Unknown theme preset "${presetName}" -- expected themes/${presetName}/tokens.json to exist.`);
    }
    return JSON.parse(readFileSync(tokensPath, 'utf8'));
}

/**
 * Serializes tokens.colors (+ config.theme.overrides on top -- overrides are
 * always --ap-* raw-token keys, see the plan's "style invariant") into a
 * :root {} CSS block. `colors` is tokens.colors, not the whole tokens.json.
 */
export function buildThemeCss(colors, overrides = {}) {
    const merged = { ...colors, ...overrides };
    const lines = Object.entries(merged).map(([key, value]) => `    ${key}: ${value};`);
    return `:root {\n${lines.join('\n')}\n}`;
}

const CSS_COLOR_LITERAL = /^(#[0-9a-fA-F]{3,8}|(rgb|rgba|hsl|hsla|color-mix)\()/;

/**
 * Resolves a `modules.overrides.<id>.colors.<slot>` value against the
 * merged theme colors map (tokens.colors + config.theme.overrides -- the
 * same map buildThemeCss() serializes). Accepts either:
 *   - a raw CSS color literal (hex, rgb()/rgba()/hsl()/hsla()/color-mix()),
 *     emitted verbatim, or
 *   - a bare alias name (with or without its leading "--", e.g. "brand-fill"
 *     or "--brand-fill") that resolves to a var() reference against the
 *     merged map.
 * Throws if the value is neither -- callers decide whether that's a hard
 * error (check.js) or a warning (generate.js).
 */
export function resolveThemeColorValue(value, mergedColors) {
    const raw = String(value).trim();
    if (CSS_COLOR_LITERAL.test(raw)) {
        return raw;
    }
    const aliasName = raw.startsWith('--') ? raw : `--${raw}`;
    if (Object.prototype.hasOwnProperty.call(mergedColors, aliasName)) {
        return `var(${aliasName})`;
    }
    throw new Error(
        `"${raw}" is neither a CSS color literal (hex/rgb/hsl/color-mix) nor a known theme token alias.`
    );
}
