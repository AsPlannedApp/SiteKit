/**
 * Minimal hand-rolled validation for site.config.json -- no ajv dependency
 * yet (that lands in Step 6 alongside full per-module content-schema
 * validation in `npm run check`). This just catches the config shapes the
 * rest of the pipeline assumes exist.
 */
export function validateConfig(config) {
    const errors = [];

    if (!config.identity || typeof config.identity !== 'object') {
        errors.push('config.identity is required (identity.name at minimum).');
    }
    if (!config.modules || !Array.isArray(config.modules.enabled)) {
        errors.push('config.modules.enabled must be an array of module ids.');
    }
    if (!config.modules || !Array.isArray(config.modules.order)) {
        errors.push('config.modules.order must be an array of module ids.');
    }
    if (config.modules && Array.isArray(config.modules.enabled) && Array.isArray(config.modules.order)) {
        const enabledSet = new Set(config.modules.enabled);
        const orderSet = new Set(config.modules.order);
        if (enabledSet.size !== orderSet.size || [...enabledSet].some((id) => !orderSet.has(id))) {
            errors.push('config.modules.order must contain exactly the same ids as config.modules.enabled.');
        }
    }
    if (!config.theme || typeof config.theme.preset !== 'string') {
        errors.push('config.theme.preset must name a theme under themes/<preset>/tokens.json.');
    }
    if (config.extensions !== undefined) {
        if (typeof config.extensions !== 'object' || Array.isArray(config.extensions)) {
            errors.push('config.extensions must be an object keyed by extension module id, with boolean values.');
        } else if (Object.values(config.extensions).some((v) => typeof v !== 'boolean')) {
            errors.push('config.extensions values must be boolean (false to opt an extension out; present-on-disk defaults to true).');
        }
    }
    if (config.modules && config.modules.overrides !== undefined) {
        if (typeof config.modules.overrides !== 'object' || Array.isArray(config.modules.overrides)) {
            errors.push('config.modules.overrides must be an object keyed by module id.');
        } else {
            for (const [id, entry] of Object.entries(config.modules.overrides)) {
                if (entry && entry.colors !== undefined && (typeof entry.colors !== 'object' || Array.isArray(entry.colors))) {
                    errors.push(`config.modules.overrides.${id}.colors must be an object keyed by slot name.`);
                }
            }
        }
    }

    if (errors.length) {
        throw new Error(`Invalid site.config.json:\n  - ${errors.join('\n  - ')}`);
    }
}
