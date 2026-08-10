import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Given every discovered module manifest and the site config, resolves the
 * ordered list of module ids that will actually be loaded/rendered:
 * infra/chrome/extension modules are present-on-disk-means-active (with
 * extension opt-out via config.extensions.<id> = false), plus every id in
 * config.modules.order. An id already auto-included is skipped if it's
 * also (redundantly) listed in modules.order, to avoid silently
 * double-loading/double-rendering it.
 *
 * Shared by generate.js (to actually build the page) and check.js (to know
 * which modules' content.json to validate) so the two never drift apart on
 * what "active" means.
 */
export function resolveActiveModuleIds(manifests, config) {
    const extensionOptOuts = config.extensions || {};
    const ids = [];

    for (const [id, manifest] of manifests) {
        if (manifest.kind === 'infra' || manifest.kind === 'chrome') {
            ids.push(id);
        } else if (manifest.kind === 'extension' && extensionOptOuts[id] !== false) {
            ids.push(id);
        }
    }
    for (const id of config.modules.order) {
        if (!manifests.has(id)) {
            throw new Error(`config.modules.order references unknown module "${id}" (no modules/${id}/module.json found).`);
        }
        if (ids.includes(id)) continue;
        ids.push(id);
    }

    return ids;
}

/**
 * Discovers every module under modulesRoot (modules/<id>/module.json) and
 * returns a Map<id, manifest & {dir}>. Does not load template.js/styles/
 * content yet -- see loadModule() for that.
 */
export function discoverModules(modulesRoot) {
    const found = new Map();
    if (!existsSync(modulesRoot)) return found;

    for (const entry of readdirSync(modulesRoot)) {
        const dir = path.join(modulesRoot, entry);
        if (!statSync(dir).isDirectory()) continue;

        const manifestPath = path.join(dir, 'module.json');
        if (!existsSync(manifestPath)) continue;

        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
        if (manifest.id !== entry) {
            throw new Error(
                `modules/${entry}/module.json declares id "${manifest.id}", which must match its folder name "${entry}".`
            );
        }
        found.set(manifest.id, { ...manifest, dir });
    }

    return found;
}

/**
 * Builds the ctx.asset() helper for a given module id -- the ONLY sanctioned
 * way a template may reference its own files. Resolves a module-relative
 * path to where the asset pipeline will have copied it: assets/<id>/<path>,
 * relative to index.html (deliberately no leading slash). index.html always
 * lives at the repo root next to assets/, so a relative path resolves the
 * same way whether the page is opened straight off disk (file://.../index.html
 * -- a root-absolute "/assets/..." would instead resolve to the filesystem
 * root and 404) or served over HTTP at a domain root.
 */
export function buildAssetCtx(id) {
    return {
        asset(relPath) {
            const clean = String(relPath).replace(/^\/+/, '');
            return `assets/${id}/${clean}`;
        },
    };
}

/**
 * Fully loads one module: its template.js exports (if any), styles.css /
 * client.js text (if present), and content.schema.json / content.json (if
 * present). `manifest` is one value from discoverModules()'s map.
 */
export async function loadModule(manifest) {
    const { dir, id } = manifest;

    const readIfExists = (relPath) => {
        const full = path.join(dir, relPath);
        return existsSync(full) ? readFileSync(full, 'utf8') : null;
    };

    let template = null;
    if (manifest.template) {
        const templateUrl = pathToFileURL(path.join(dir, manifest.template)).href;
        template = await import(templateUrl);
    }

    const stylesText = manifest.styles ? readIfExists(manifest.styles) : null;
    const clientText = manifest.client ? readIfExists(manifest.client) : null;

    let contentSchema = null;
    if (manifest.contentSchema) {
        const raw = readIfExists(manifest.contentSchema);
        if (raw) contentSchema = JSON.parse(raw);
    }

    let content = null;
    const contentPath = path.join(dir, 'content.json');
    if (existsSync(contentPath)) {
        content = JSON.parse(readFileSync(contentPath, 'utf8'));
    }

    const assetsDir = path.join(dir, 'assets');
    const hasAssets = existsSync(assetsDir) && statSync(assetsDir).isDirectory();

    return {
        id,
        manifest,
        dir,
        template,
        stylesText,
        clientText,
        contentSchema,
        content,
        assetsDir: hasAssets ? assetsDir : null,
        ctx: buildAssetCtx(id),
    };
}
