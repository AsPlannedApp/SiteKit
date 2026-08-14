/** Validate the small, project-level SiteKit configuration contract. */
export function validateConfig(config) {
    const errors = [];

    if (!config.identity || typeof config.identity !== 'object') {
        errors.push('config.identity is required (identity.name at minimum).');
    }
    if (config.identity?.shortName !== undefined && (typeof config.identity.shortName !== 'string' || !config.identity.shortName.trim())) {
        errors.push('config.identity.shortName must be a non-empty string when provided.');
    }
    const seo = config.seo;
    if (seo !== undefined && (typeof seo !== 'object' || Array.isArray(seo))) {
        errors.push('config.seo must be an object when provided.');
    } else if (seo) {
        if (seo.canonicalUrl !== undefined) {
            try {
                const url = new URL(seo.canonicalUrl);
                if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol');
            } catch {
                errors.push('config.seo.canonicalUrl must be an absolute HTTP(S) URL.');
            }
        }
        for (const field of ['ogImage', 'ogImageAlt']) {
            if (seo[field] !== undefined && (typeof seo[field] !== 'string' || !seo[field].trim())) {
                errors.push(`config.seo.${field} must be a non-empty string when provided.`);
            }
        }
        for (const field of ['ogImageWidth', 'ogImageHeight']) {
            if (seo[field] !== undefined && (!Number.isInteger(seo[field]) || seo[field] <= 0)) {
                errors.push(`config.seo.${field} must be a positive integer when provided.`);
            }
        }
    }
    if (!config.modules || !Array.isArray(config.modules.order)) {
        errors.push('config.modules.order must be an array of module ids.');
    }
    if (config.modules?.enabled !== undefined) {
        errors.push('config.modules.enabled was removed; config.modules.order is now the single enabled and ordered module list.');
    }
    if (config.modules?.mode !== undefined) {
        errors.push('config.modules.mode was removed; remote modules are prepared at generation time.');
    }
    if (Array.isArray(config.modules?.order)) {
        const duplicates = config.modules.order.filter((id, index, ids) => ids.indexOf(id) !== index);
        if (duplicates.length) errors.push(`config.modules.order contains duplicate ids: ${[...new Set(duplicates)].join(', ')}.`);
        if (config.modules.order.some((id) => typeof id !== 'string' || !id.trim())) {
            errors.push('config.modules.order entries must be non-empty strings.');
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
