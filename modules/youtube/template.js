import { escapeHtml, resolveHref } from '../../src/core/html-util.js';

/**
 * modules/talks/template.js — the youtube[] data + click-to-embed rendering, which
 * stays entirely client-side, matching the source). This module has no
 * fetchable "sources" -- content.json IS the data, so there's no baked/live
 * split, only the SSR'd shell + an embedded JSON payload for client.js.
 *
 * img/thumb/action-href values in content.json are module-relative asset
 * paths OR external URLs; resolveHref() (shared with press) sorts that out
 * once, server-side, so client.js never needs to know about the
 * ctx.asset()/module-namespacing convention at all.
 */

export function summary(content) {
    const playlist = content.youtube || [];
    return { label: 'Videos & demos', count: playlist.length };
}

export function render(content, config, mode, ctx) {
    const playlist = (content.youtube || []).map((video) => ({
        title: video.title,
        videoId: video.videoId || null,
        href: video.href ? resolveHref(video.href, ctx) : null,
        img: video.img ? ctx.asset(video.img) : null,
        thumb: video.thumb ? ctx.asset(video.thumb) : null,
        actions: (video.actions || []).map((a) => ({ label: a.label, href: resolveHref(a.href, ctx) })),
    }));

    const html = `
    <section id="youtube" class="section" aria-label="Videos and Demos">
        <div class="wrap">
            <div class="section-head">
                <div><span class="eyebrow">${escapeHtml(content.eyebrow || '')}</span><h2>${escapeHtml(content.heading || '')}</h2></div>
                <span class="section-head__note" data-note>${escapeHtml(content.note || '')}</span>
            </div>
            <div class="talks-row" data-rv>
                <div class="talks-player">
                    <div class="talks-player__stage" id="talks-player-stage"></div>
                    <div class="talks-player__meta">
                        <h3 id="talks-player-title">Select a talk to preview</h3>
                        <div class="talks-player__actions" id="talks-player-actions"></div>
                    </div>
                </div>
                <div id="talks-rail" class="talks-rail">
                    <div id="talks-rail-inner" class="talks-rail__inner"></div>
                </div>
            </div>
            <script type="application/json" id="talks-data">${JSON.stringify(playlist)}</script>
        </div>
    </section>`;

    return { html };
}
