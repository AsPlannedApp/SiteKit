import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import { validateConfig } from '../core/config-schema.js';
import { discoverModules } from '../core/module-loader.js';

const ROOT = process.cwd();

/**
 * Minimal validation for now: config shape + every enabled module actually
 * exists + has a content.json when it declares a contentSchema. Full ajv
 * schema validation and asset-existence checking land in Step 6.
 */
export async function run() {
    const configPath = path.join(ROOT, 'config', 'site.config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    validateConfig(config);

    const manifests = discoverModules(path.join(ROOT, 'modules'));
    const problems = [];

    for (const id of config.modules.order) {
        const manifest = manifests.get(id);
        if (!manifest) {
            problems.push(`config.modules.order references unknown module "${id}".`);
            continue;
        }
        if (manifest.contentSchema && !existsSync(path.join(manifest.dir, 'content.json'))) {
            problems.push(`modules/${id}/ declares a contentSchema but has no content.json.`);
        }
    }

    if (problems.length) {
        console.error('sitekit check found problems:');
        problems.forEach((p) => console.error(`  - ${p}`));
        process.exitCode = 1;
        return;
    }

    console.log('sitekit check: OK');
}
