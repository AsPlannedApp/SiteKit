import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

/**
 * Copies every loaded module's own assets/** to <outputRoot>/assets/<id>/**,
 * preserving relative subfolder structure exactly (the asset-path contract
 * from the plan: modules/talks/assets/covers/x.webp -> /assets/talks/covers/x.webp).
 *
 * Each module's output folder is cleared before copying so removed files in
 * the source don't linger as stale copies in the generated output.
 */
export function copyModuleAssets(loadedModules, outputRoot) {
    const copied = [];

    for (const mod of loadedModules) {
        if (!mod.assetsDir) continue;

        const dest = path.join(outputRoot, 'assets', mod.id);
        if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
        mkdirSync(dest, { recursive: true });
        cpSync(mod.assetsDir, dest, { recursive: true });
        copied.push(mod.id);
    }

    return copied;
}
