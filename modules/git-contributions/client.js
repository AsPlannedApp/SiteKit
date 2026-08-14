(function () {
    var sourceElement = document.querySelector('[data-contribution-sources]');

    function safeUrl(value) {
        if (!value) return '';
        try {
            var url = new URL(value, document.baseURI);
            return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
        } catch (error) {
            return '';
        }
    }

    async function fetchJson(value) {
        var url = safeUrl(value);
        if (!url) throw new Error('Invalid source URL');
        var controller = new AbortController();
        var timeout = setTimeout(function () { controller.abort(); }, 10000);
        try {
            var response = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return await response.json();
        } finally {
            clearTimeout(timeout);
        }
    }

    function normalizeDays(value) {
        var raw = Array.isArray(value?.contributions) ? value.contributions : Array.isArray(value) ? value : value || {};
        var entries = Array.isArray(raw) ? raw : Object.entries(raw).map(function (entry) { return { date: entry[0], count: entry[1] }; });
        return entries.map(function (item) { return { date: String(item.date || ''), count: Number(item.count || 0) }; })
            .filter(function (item) { return /^\d{4}-\d{2}-\d{2}$/.test(item.date) && Number.isFinite(item.count) && item.count >= 0; });
    }

    function contributionLevel(count) {
        return count === 0 ? 0 : count < 3 ? 1 : count < 7 ? 2 : count < 12 ? 3 : 4;
    }

    function renderContributions(sources, values) {
        var maps = values.map(function (days) { return new Map(days.map(function (day) { return [day.date, day.count]; })); });
        document.querySelectorAll('.contribution-day[data-date]').forEach(function (cell) {
            var counts = maps.map(function (map) { return map.get(cell.dataset.date) || 0; });
            var count = counts.reduce(function (total, value) { return total + value; }, 0);
            var active = counts.map(function (value, index) { return value > 0 ? sources[index] : null; }).filter(Boolean);
            var source = active.length > 1 ? 'both' : active[0]?.id || 'none';
            var sourceLabel = active.length > 1 ? active.map(function (item) { return item.label; }).join(' and ') : active[0]?.label || '';
            var label = cell.dataset.date + ': ' + count + ' contribution' + (count === 1 ? '' : 's') + (sourceLabel ? ' from ' + sourceLabel : '');
            cell.className = 'contribution-day contribution-day--' + source + ' contribution-day--level-' + contributionLevel(count);
            cell.title = label;
            cell.setAttribute('aria-label', label);
        });
    }

    function gistLanguage(gist) {
        var files = Object.values(gist.files || {});
        return gist.language || files[0]?.language || '';
    }

    var gistMeta = {
        PHP: ['php', 'PHP'], JavaScript: ['js', 'JS'], TypeScript: ['ts', 'TS'], Vue: ['vue', 'Vue'], Shell: ['bash', 'Bash'],
        Python: ['python', 'Python'], HTML: ['html', 'HTML'], CSS: ['css', 'CSS'], Markdown: ['md', 'MD'], JSON: ['json', 'JSON'],
        YAML: ['yaml', 'YAML'], Dockerfile: ['docker', 'Docker'],
    };

    function renderGists(value, limit) {
        var list = document.querySelector('[data-gist-list]');
        if (!list || !Array.isArray(value)) return;
        var gists = value.slice(0, limit).map(function (gist) {
            return { title: gist.title || gist.description || 'Untitled gist', url: safeUrl(gist.html_url || gist.url), language: gistLanguage(gist) };
        }).filter(function (gist) { return gist.url; });
        if (!gists.length) return;

        var fragment = document.createDocumentFragment();
        gists.forEach(function (gist) {
            var link = document.createElement('a');
            link.className = 'gist-pill';
            link.href = gist.url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            var title = document.createElement('span');
            title.className = 'gist-pill__label';
            title.textContent = gist.title;
            var badge = document.createElement('small');
            badge.className = 'gist-pill__lang';
            var meta = gistMeta[gist.language];
            if (meta) badge.dataset.lang = meta[0];
            badge.textContent = meta?.[1] || gist.language || 'Unknown';
            link.append(title, badge);
            fragment.appendChild(link);
        });
        list.replaceChildren(fragment);
    }

    async function refreshRuntimeSources() {
        if (!sourceElement) return;
        var config;
        try { config = JSON.parse(sourceElement.textContent); } catch (error) { return; }

        var sources = (config.contributions || []).filter(function (source) { return safeUrl(source.url); });
        if (sources.length) {
            try {
                var values = await Promise.all(sources.map(function (source) { return fetchJson(source.url).then(normalizeDays); }));
                if (values.every(function (days) { return days.length; })) renderContributions(sources, values);
            } catch (error) {
                // Progressive enhancement: preserve the generated calendar when any source is unavailable.
            }
        }

        if (safeUrl(config.gists?.url)) {
            try { renderGists(await fetchJson(config.gists.url), config.gists.limit || 6); } catch (error) {
                // Progressive enhancement: preserve generated gist links on failure.
            }
        }
    }

    document.querySelectorAll('.contribution-scroll').forEach(function (scroll) {
        requestAnimationFrame(function () { scroll.scrollLeft = scroll.scrollWidth; });
    });

    document.querySelectorAll('.repo-card-link img').forEach(function (img) {
        const card = img.closest('.repo-card-link');
        if (!card) return;

        function markBroken() {
            card.classList.add('is-image-broken');
            card.classList.remove('is-image-ready');
            img.removeAttribute('srcset');
            img.removeAttribute('src');
        }

        function markReady() {
            if (!img.naturalWidth) return markBroken();
            card.classList.add('is-image-ready');
            card.classList.remove('is-image-broken');
        }

        img.addEventListener('load', markReady);
        img.addEventListener('error', markBroken);
        if (img.complete) markReady();
    });

    window.addEventListener('load', refreshRuntimeSources, { once: true });
})();
