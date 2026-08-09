/**
 * Two-pass render:
 *
 *   Pass 1 (collectSections) walks every "content-section" module and asks
 *   it for a summary() -- {label, count} -- without rendering full markup.
 *   This is how chrome modules (header's nav links, hero's "in this issue"
 *   list) describe the enabled content sections generically, instead of
 *   hardcoding the six built-in section ids. A module's own content.json
 *   may set a top-level `countOverride` (string or number) when a count
 *   can't be derived -- e.g. press's "100+" articles isn't a count of
 *   anything in content.json. countOverride always wins over summary().
 *
 *   Pass 2 (renderAll) renders every module in the given order. Every
 *   module's ctx additionally carries `sections` (pass 1's output) so
 *   header/hero can build nav links and the issue-index list; content
 *   modules are free to ignore it.
 */
export function collectSections(loadedModules, config) {
    const sections = [];

    for (const mod of loadedModules) {
        if (mod.manifest.kind !== 'content-section') continue;

        const summaryFn = mod.template && typeof mod.template.summary === 'function' ? mod.template.summary : null;
        const summary = summaryFn ? summaryFn(mod.content, config) : null;
        const countOverride = mod.content && mod.content.countOverride;

        sections.push({
            id: mod.id,
            navLabel: mod.manifest.navLabel || mod.id,
            navIcon: mod.manifest.navIcon || null,
            anchor: mod.manifest.anchor || mod.id,
            label: (summary && summary.label) || mod.manifest.navLabel || mod.id,
            count: countOverride !== undefined ? countOverride : summary ? summary.count : null,
        });
    }

    return sections;
}

export function renderAll(loadedModules, config, { alwaysIncludeClient = () => true } = {}) {
    const sections = collectSections(loadedModules, config);

    const rendered = [];
    const styleChunks = [];
    const scriptChunks = [];

    for (const mod of loadedModules) {
        if (mod.stylesText) {
            styleChunks.push(`/* ---- ${mod.id} ---- */\n${mod.stylesText}`);
        }

        if (mod.clientText && alwaysIncludeClient(mod)) {
            scriptChunks.push(`/* ---- ${mod.id} ---- */\n${mod.clientText}`);
        }

        if (mod.template && typeof mod.template.render === 'function') {
            const mode = mod.mode || 'baked';
            const ctx = { ...mod.ctx, sections };
            const result = mod.template.render(mod.content, config, mode, ctx);
            rendered.push({ id: mod.id, kind: mod.manifest.kind, ...result });
        }
    }

    return {
        sections,
        rendered,
        styleText: styleChunks.join('\n\n'),
        scriptText: scriptChunks.join('\n\n'),
    };
}
