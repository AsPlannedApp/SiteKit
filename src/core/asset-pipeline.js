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

        // module.json may list module-relative paths under "assetsExclude"
        // that are build INPUTS, not shipped output -- e.g. core-assets'
        // vendored full Tabler webfont + codepoint map, which icon-subset.js
        // consumes to generate the real subset that gets written into this
        // same output folder afterwards (see generate.js's sequencing).
        const excludeSet = new Set(mod.manifest.assetsExclude || []);
        const filter = excludeSet.size
            ? (src) => {
                  const rel = path.relative(mod.assetsDir, src).split(path.sep).join('/');
                  return !excludeSet.has(rel);
              }
            : undefined;

        cpSync(mod.assetsDir, dest, { recursive: true, filter });
        copied.push(mod.id);
    }

    return copied;
}

/** Remove generated output belonging to discovered modules that are inactive. */
export function removeInactiveModuleAssets(manifests, activeIds, outputRoot) {
    const active = new Set(activeIds);
    const removed = [];
    for (const id of manifests.keys()) {
        if (active.has(id)) continue;
        const dest = path.join(outputRoot, 'assets', id);
        if (!existsSync(dest)) continue;
        rmSync(dest, { recursive: true, force: true });
        removed.push(id);
    }
    return removed;
}

/** Run optional module-owned derived-asset builders after authored assets copy. */
export async function generateModuleAssets(loadedModules, outputRoot, config = {}, buildContext = {}) {
    const generated = [];
    for (const mod of loadedModules) {
        if (typeof mod.template?.generateAssets !== 'function') continue;
        const outputDir = path.join(outputRoot, 'assets', mod.id);
        mkdirSync(outputDir, { recursive: true });
        await mod.template.generateAssets({
            content: mod.content,
            config,
            ctx: mod.ctx,
            moduleDir: mod.dir,
            outputDir,
            ...buildContext,
        });
        generated.push(mod.id);
    }
    return generated;
}

/**
 * Copies a self-hosted theme's own font files (themes/<preset>/fonts/**) to
 * <outputRoot>/assets/theme-fonts/**, mirroring copyModuleAssets()'s
 * clear-then-copy behaviour and relative-path/file://-safety contract. Only
 * called when the theme's resolved font provider is "self-hosted" and the
 * directory actually exists (the "system" provider and themes with no fonts
 * of their own -- e.g. themes/default -- have nothing to copy).
 * Returns the output-relative base path to use in emitted @font-face urls.
 */
export function copyThemeFonts(themesRoot, presetName, outputRoot) {
    const srcDir = path.join(themesRoot, presetName, 'fonts');
    if (!existsSync(srcDir)) return null;

    const dest = path.join(outputRoot, 'assets', 'theme-fonts');
    if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
    mkdirSync(dest, { recursive: true });
    cpSync(srcDir, dest, { recursive: true });

    return 'assets/theme-fonts';
}
