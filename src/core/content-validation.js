import { existsSync } from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';

import { checkHtmlBalance } from './html-lint.js';

const ajv = new Ajv({ allErrors: true, strict: false });

function formatAjvError(error) {
    const location = error.instancePath || '/';
    return `${location} ${error.message}`;
}

export function validateModuleContent(loadedModules) {
    const problems = [];

    for (const mod of loadedModules) {
        if (mod.contentSchema) {
            if (mod.content === null) {
                problems.push(`modules/${mod.id}/ declares a content schema but has no content.json.`);
            } else {
                const validate = ajv.compile(mod.contentSchema);
                if (!validate(mod.content)) {
                    validate.errors.forEach((error) => problems.push(`modules/${mod.id}/content.json: ${formatAjvError(error)}.`));
                }
            }
        }

        const extraHtml = mod.content?.extraHtml;
        if (Array.isArray(extraHtml)) {
            extraHtml.forEach((snippet, index) => {
                const problem = checkHtmlBalance(String(snippet));
                if (problem) problems.push(`modules/${mod.id}/content.json: extraHtml[${index}] is malformed HTML — ${problem}`);
            });
        }
    }

    return problems;
}

export function validateReferencedAssets(loadedModules) {
    const problems = [];
    for (const mod of loadedModules) {
        const generated = new Set(mod.manifest.generatedAssets || []);
        for (const relPath of mod.ctx.referencedAssets) {
            if (generated.has(relPath)) continue;
            if (!mod.assetsDir || !existsSync(path.join(mod.assetsDir, relPath))) {
                problems.push(`modules/${mod.id}/ references missing asset "${relPath}".`);
            }
        }
    }
    return problems;
}

export function validateGeneratedAssetContracts(loadedModules, { requireFiles = false } = {}) {
    const problems = [];
    for (const mod of loadedModules) {
        const generated = mod.ctx.referencedGeneratedAssets || new Set();
        if (generated.size && typeof mod.template?.generateAssets !== 'function') {
            problems.push(`modules/${mod.id}/ references generated assets but does not export generateAssets().`);
            continue;
        }
        if (!requireFiles) continue;
        for (const relPath of generated) {
            if (!existsSync(path.join(process.cwd(), 'assets', mod.id, relPath))) {
                problems.push(`modules/${mod.id}/ did not generate expected asset "${relPath}".`);
            }
        }
    }
    return problems;
}

export function throwForProblems(problems, heading = 'SiteKit validation failed') {
    if (!problems.length) return;
    throw new Error(`${heading}:\n  - ${problems.join('\n  - ')}`);
}
