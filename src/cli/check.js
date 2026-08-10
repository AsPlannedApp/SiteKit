import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import { validateConfig } from '../core/config-schema.js';
import { discoverModules, resolveActiveModuleIds } from '../core/module-loader.js';
import { checkHtmlBalance } from '../core/html-lint.js';

const ROOT = process.cwd();

/**
 * Minimal validation for now: config shape + every enabled module actually
 * exists + has a content.json when it declares a contentSchema, plus a
 * tag-balance lint over any module's content.extraHtml[] (the raw-HTML
 * escape hatch first used by footer -- see modules/footer/content.schema.json
 * -- but checked generically here in case another module grows one later).
 * Full ajv schema validation and asset-existence checking remain a documented
 * follow-up (see PLAN.md / README.md's own roadmap).
 */
export async function run() {
    const configPath = path.join(ROOT, 'site.config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    validateConfig(config);

    const manifests = discoverModules(path.join(ROOT, 'modules'));
    const problems = [];

    const activeIds = resolveActiveModuleIds(manifests, config);

    for (const id of activeIds) {
        const manifest = manifests.get(id);
        const contentPath = path.join(manifest.dir, 'content.json');

        if (manifest.contentSchema && !existsSync(contentPath)) {
            problems.push(`modules/${id}/ declares a contentSchema but has no content.json.`);
            continue;
        }
        if (!existsSync(contentPath)) continue;

        const content = JSON.parse(readFileSync(contentPath, 'utf8'));
        const extraHtml = content.extraHtml;
        if (!Array.isArray(extraHtml)) continue;

        extraHtml.forEach((snippet, i) => {
            const problem = checkHtmlBalance(String(snippet));
            if (problem) {
                problems.push(`modules/${id}/content.json: extraHtml[${i}] is malformed HTML -- ${problem}`);
            }
        });
    }

    if (problems.length) {
        console.error('sitekit check found problems:');
        problems.forEach((p) => console.error(`  - ${p}`));
        process.exitCode = 1;
        return;
    }

    console.log('sitekit check: OK');
}
