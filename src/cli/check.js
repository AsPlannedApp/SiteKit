import { readFileSync } from 'node:fs';
import path from 'node:path';

import { validateConfig } from '../core/config-schema.js';
import { discoverModules, loadModule, resolveActiveModuleIds, validateModuleConfiguration } from '../core/module-loader.js';
import { loadThemeTokens } from '../core/theme-tokens.js';
import { renderAll } from '../core/render-pipeline.js';
import { validateGeneratedAssetContracts, validateModuleContent, validateReferencedAssets } from '../core/content-validation.js';

const ROOT = process.cwd();

/** Validate configuration, module schemas, trusted HTML snippets, and assets. */
export async function run() {
    const configPath = path.join(ROOT, 'site.config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    validateConfig(config);

    const manifests = discoverModules(path.join(ROOT, 'modules'));
    validateModuleConfiguration(manifests, config);
    const activeIds = resolveActiveModuleIds(manifests, config);
    const loaded = [];
    for (const id of activeIds) loaded.push(await loadModule(manifests.get(id)));

    const tokens = loadThemeTokens(path.join(ROOT, 'themes'), config.theme.preset);
    const themeColors = { ...tokens.colors, ...(config.theme.overrides || {}) };
    renderAll(loaded, config, { themeColors });
    const problems = [...validateModuleContent(loaded), ...validateReferencedAssets(loaded), ...validateGeneratedAssetContracts(loaded)];

    if (problems.length) {
        console.error('sitekit check found problems:');
        problems.forEach((p) => console.error(`  - ${p}`));
        process.exitCode = 1;
        return;
    }

    console.log('sitekit check: OK');
}
