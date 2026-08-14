import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { escapeHtml, resolveHref } from '../../src/core/html-util.js';

export const gistLangMeta = {
    PHP: { code: 'php', label: 'PHP' }, JavaScript: { code: 'js', label: 'JS' }, TypeScript: { code: 'ts', label: 'TS' },
    Vue: { code: 'vue', label: 'Vue' }, Shell: { code: 'bash', label: 'Bash' }, Python: { code: 'python', label: 'Python' },
    HTML: { code: 'html', label: 'HTML' }, CSS: { code: 'css', label: 'CSS' }, Markdown: { code: 'md', label: 'MD' },
    JSON: { code: 'json', label: 'JSON' }, YAML: { code: 'yaml', label: 'YAML' }, Dockerfile: { code: 'docker', label: 'Docker' },
};

function usernameFromProfile(value) {
    if (!value) return '';
    try {
        return new URL(value).pathname.split('/').filter(Boolean)[0] || '';
    } catch {
        return '';
    }
}

function normalizeDays(value) {
    const raw = Array.isArray(value?.contributions) ? value.contributions : Array.isArray(value) ? value : value || {};
    const entries = Array.isArray(raw) ? raw : Object.entries(raw).map(([date, count]) => ({ date, count }));
    return entries.map((item) => ({ date: String(item.date || ''), count: Number(item.count || 0) }))
        .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date) && Number.isFinite(item.count) && item.count >= 0);
}

function normalizeGists(value, limit) {
    if (!Array.isArray(value)) return [];
    return value.slice(0, limit).map((gist) => {
        const files = Object.values(gist.files || {});
        return {
            title: gist.title || gist.description || 'Untitled gist',
            url: gist.url || gist.html_url || '',
            language: gist.language || files[0]?.language || '',
        };
    }).filter((gist) => gist.url);
}

async function fetchJson(fetch, url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
        const response = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } finally {
        clearTimeout(timeout);
    }
}

async function readContributionFile(moduleDir, relPath) {
    if (!moduleDir) throw new Error('the module directory is unavailable');
    const assetsRoot = path.resolve(moduleDir, 'assets');
    const fullPath = path.resolve(assetsRoot, relPath);
    if (!fullPath.startsWith(`${assetsRoot}${path.sep}`)) throw new Error('the asset path is unsafe');
    return JSON.parse(await readFile(fullPath, 'utf8'));
}

function githubContributionUrl(provider) {
    const username = usernameFromProfile(provider.profileUrl);
    return provider.contributionsUrl || (username ? `https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(username)}?y=last` : '');
}

function githubGistUrl(content) {
    const githubUser = usernameFromProfile(content.sources?.github?.profileUrl);
    return content.sources?.gists?.url || (githubUser ? `https://api.github.com/users/${encodeURIComponent(githubUser)}/gists` : '');
}

function jsonForHtml(value) {
    return JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');
}

export async function prepare({ content, fetch, moduleDir }) {
    const warnings = [];
    const fallback = content.fallback || {};
    const githubProvider = content.sources.github || {};
    const gitlabProvider = content.sources.gitlab || {};
    const githubUrl = githubContributionUrl(githubProvider);
    const gitlabUrl = gitlabProvider.contributionsUrl || '';
    const gistUrl = githubGistUrl(content);

    async function resolveRemote(label, url, fallbackValue, normalize) {
        if (!url) return fallbackValue || [];
        try {
            const result = normalize(await fetchJson(fetch, url));
            if (!result.length) throw new Error('the response contained no usable entries');
            return result;
        } catch (error) {
            warnings.push(`${label} could not load ${url}; using authored fallback (${error.message})`);
            return fallbackValue || [];
        }
    }

    async function resolveContributions(provider, defaultLabel, url, fallbackValue) {
        const label = provider.label || defaultLabel;
        if (!provider.contributionsFile) return resolveRemote(`${label} contributions`, url, fallbackValue, normalizeDays);
        try {
            const result = normalizeDays(await readContributionFile(moduleDir, provider.contributionsFile));
            if (!result.length) throw new Error('the file contained no usable entries');
            return result;
        } catch (error) {
            warnings.push(`${label} contributions could not load ${provider.contributionsFile}; using authored fallback (${error.message})`);
            return fallbackValue || [];
        }
    }

    const [github, gitlab, gists] = await Promise.all([
        resolveContributions(githubProvider, 'GitHub', githubUrl, fallback.github),
        resolveContributions(gitlabProvider, 'GitLab', gitlabUrl, fallback.gitlab),
        resolveRemote('GitHub gists', gistUrl, fallback.gists, (value) => normalizeGists(value, content.sources.gists.limit || 6)),
    ]);

    return { content: { ...content, resolved: { github, gitlab, gists } }, warnings };
}

export function summary({ content }) {
    return { label: 'Projects', count: (content.repos || []).length };
}

const iso = (date) => date.toISOString().slice(0, 10);

function heatmap(content) {
    const github = content.resolved?.github || content.fallback.github || [];
    const gitlab = content.resolved?.gitlab || content.fallback.gitlab || [];
    const gh = new Map(github.map((day) => [day.date, day.count]));
    const gl = new Map(gitlab.map((day) => [day.date, day.count]));
    const githubLabel = content.sources?.github?.label || 'GitHub';
    const gitlabLabel = content.sources?.gitlab?.label || 'GitLab';
    const end = new Date();
    end.setUTCHours(0, 0, 0, 0);
    end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()));
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (53 * 7 - 1));
    const cells = [];

    for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
        const date = iso(cursor);
        const githubCount = gh.get(date) || 0;
        const gitlabCount = gl.get(date) || 0;
        const count = githubCount + gitlabCount;
        const source = githubCount && gitlabCount ? 'both' : githubCount ? 'github' : gitlabCount ? 'gitlab' : 'none';
        const level = count === 0 ? 0 : count < 3 ? 1 : count < 7 ? 2 : count < 12 ? 3 : 4;
        const sourceLabel = source === 'both' ? `${githubLabel} and ${gitlabLabel}` : source === 'github' ? githubLabel : gitlabLabel;
        const label = `${date}: ${count} contribution${count === 1 ? '' : 's'}${source === 'none' ? '' : ` from ${sourceLabel}`}`;
        cells.push(`<span class="contribution-day contribution-day--${source} contribution-day--level-${level}" data-date="${date}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}"></span>`);
    }
    const weeks = [];
    for (let index = 0; index < cells.length; index += 7) {
        weeks.push(`<span class="contribution-week">${cells.slice(index, index + 7).join('')}</span>`);
    }
    return weeks.join('\n');
}

function repoCard(repo, ctx) {
    const image = repo.coverImage
        ? `<img src="${escapeHtml(resolveHref(repo.coverImage, ctx))}" alt="" loading="lazy">`
        : '';
    return `<a class="repo-card-link${image ? '' : ' is-image-broken'}" href="${escapeHtml(repo.url)}" target="_blank" rel="noopener noreferrer">
        ${image}<strong class="repo-card-link__name">${escapeHtml(repo.title)}</strong><span class="repo-card-link__arrow" aria-hidden="true">↗</span>
        <span class="repo-card-link__desc">${escapeHtml(repo.description)}</span>
    </a>`;
}

function gistPill(gist) {
    const meta = gistLangMeta[gist.language];
    const code = meta ? ` data-lang="${meta.code}"` : '';
    const label = meta?.label || gist.language || 'Unknown';
    return `<a class="gist-pill" href="${escapeHtml(gist.url)}" target="_blank" rel="noopener noreferrer"><span class="gist-pill__label">${escapeHtml(gist.title)}</span><small class="gist-pill__lang"${code}>${escapeHtml(label)}</small></a>`;
}

export function render({ content, ctx }) {
    const gists = content.resolved?.gists || content.fallback.gists || [];
    const githubProvider = content.sources?.github || {};
    const gitlabProvider = content.sources?.gitlab || {};
    const githubLabel = githubProvider.label || 'GitHub';
    const gitlabLabel = gitlabProvider.label || 'GitLab';
    const githubUrl = githubContributionUrl(githubProvider);
    const runtimeSources = [
        { id: 'github', label: githubLabel, url: githubProvider.contributionsFile ? ctx.asset(githubProvider.contributionsFile) : githubUrl },
        { id: 'gitlab', label: gitlabLabel, url: gitlabProvider.contributionsFile ? ctx.asset(gitlabProvider.contributionsFile) : (gitlabProvider.contributionsUrl || '') },
    ];
    const runtimeConfig = {
        contributions: runtimeSources,
        gists: { url: githubGistUrl(content), limit: content.sources?.gists?.limit || 6 },
    };
    return { html: `<section id="git-contributions" class="section" aria-label="Code and contributions">
    <div class="wrap">
        <div class="section-head"><div><span class="eyebrow">${escapeHtml(content.eyebrow || '')}</span><h2>${escapeHtml(content.heading)}</h2></div><span class="section-head__note" data-note>${escapeHtml(content.note || '')}</span></div>
        <div class="terminal" data-rv>
            <div class="terminal__bar"><i></i><i></i><i></i><span>~/activity</span></div>
            <div class="terminal__body">
                <div class="terminal__prompt"><span>$</span> git log --contributions --since "12 months ago"</div>
                <div class="chart-card-wrap">
                    <div class="contribution-panel">
                        <div class="contribution-panel__top"><div class="contribution-legend"><span class="legend-github"><i class="ti ti-brand-github" aria-hidden="true"></i>${escapeHtml(githubLabel)}</span><span class="legend-gitlab"><i class="ti ti-brand-gitlab" aria-hidden="true"></i>${escapeHtml(gitlabLabel)}</span><span class="legend-both"><i class="ti ti-git-merge" aria-hidden="true"></i>Both</span></div><span class="legend-range"><i class="ti ti-calendar-stats" aria-hidden="true"></i>Last 12 months</span></div>
                        <div class="contribution-scroll" tabindex="0" aria-label="Contribution calendar, scroll horizontally"><div class="contribution-chart" role="group">${heatmap(content)}</div></div>
                    </div>
                </div>
                <script type="application/json" data-contribution-sources>${jsonForHtml(runtimeConfig)}</script>
                <div class="terminal__prompt"><span>$</span> ls ~/projects</div>
                <div class="repo-grid">${(content.repos || []).map((repo) => repoCard(repo, ctx)).join('')}</div>
                <div class="terminal__prompt"><span>$</span> gh gist list</div>
                <div class="gist-list" data-gist-list>${gists.map(gistPill).join('')}</div>
            </div>
        </div>
    </div>
</section>` };
}

export { normalizeDays, normalizeGists, usernameFromProfile };
