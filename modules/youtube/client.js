/* modules/talks/client.js Reads its data from the <script type="application/json"
 * id="talks-data"> tag template.js embeds (paths already resolved to
 * /assets/talks/... or external URLs -- no ctx knowledge needed here). */

(function () {
    const dataEl = document.getElementById('talks-data');
    if (!dataEl) return;

    const talks = JSON.parse(dataEl.textContent);
    let activeTalkIndex = 0;

    function actionIcon(label) {
        const l = label.toLowerCase();
        if (l.includes('podcast')) return 'ti-microphone-2';
        if (l.includes('youtube') || l.includes('watch')) return 'ti-brand-youtube';
        if (l.includes('download') || l.includes('presentation')) return 'ti-download';
        if (l.includes('article') || l.includes('read')) return 'ti-article';
        return 'ti-arrow-up-right';
    }

    // Real YouTube thumbnails (i.ytimg.com), webp-first with a quality/format
    // fallback chain.
    function getYoutubeCoverCandidates(videoId, files) {
        files = files || ['maxresdefault', 'hq720', 'sddefault', 'hqdefault', 'mqdefault', 'default'];
        const candidates = [];
        files.forEach((file) => {
            candidates.push({ url: `https://i.ytimg.com/vi_webp/${videoId}/${file}.webp`, tiny: file === 'default' });
            candidates.push({ url: `https://i.ytimg.com/vi/${videoId}/${file}.jpg`, tiny: file === 'default' });
        });
        return candidates;
    }

    function loadYoutubeCover(img, videoId, files) {
        const candidates = getYoutubeCoverCandidates(videoId, files);
        let index = 0;

        function tryNext() {
            if (index >= candidates.length) return;
            const candidate = candidates[index];

            img.onerror = () => {
                index += 1;
                tryNext();
            };
            img.onload = () => {
                // YouTube serves a small grey placeholder instead of a 404 when a
                // higher-res thumbnail doesn't exist -- treat that as a miss too.
                if (img.naturalWidth <= 120 && !candidate.tiny) {
                    index += 1;
                    tryNext();
                }
            };
            img.src = candidate.url;
        }

        tryNext();
    }

    // Used both as the direct loader (talks with no local cover) and as the
    // onerror fallback for talks that do have one.
    function loadYoutubeCoverForViewport(img, videoId) {
        const isNarrowViewport = window.matchMedia('(max-width: 640px)').matches;
        loadYoutubeCover(img, videoId, isNarrowViewport
            ? ['sddefault', 'hqdefault', 'mqdefault', 'default']
            : undefined);
    }

    function playInline(cover, videoId, title) {
        if (cover.querySelector('iframe')) return; // already playing, avoid restarting

        cover.innerHTML = '';

        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
        iframe.title = title || 'YouTube video';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.loading = 'lazy';
        iframe.style.cssText = 'width:100%;height:100%;border:0;display:block';

        cover.appendChild(iframe);
    }

    function renderTalks() {
        const stage = document.getElementById('talks-player-stage');
        const titleEl = document.getElementById('talks-player-title');
        const actionsEl = document.getElementById('talks-player-actions');
        const railEl = document.getElementById('talks-rail-inner');

        if (!stage || !titleEl || !actionsEl || !railEl) return;

        const talk = talks[activeTalkIndex];

        stage.innerHTML = '';

        if (talk.videoId) {
            const cover = document.createElement('div');
            cover.className = 'talks-player__cover';
            cover.setAttribute('role', 'button');
            cover.setAttribute('tabindex', '0');
            cover.setAttribute('aria-label', `Play ${talk.title}`);

            const img = document.createElement('img');
            img.alt = talk.title;
            if (talk.img) {
                img.loading = 'eager';
                img.onerror = () => {
                    img.onerror = null;
                    loadYoutubeCoverForViewport(img, talk.videoId);
                };
                img.src = talk.img;
            } else {
                loadYoutubeCoverForViewport(img, talk.videoId);
            }
            cover.appendChild(img);

            const play = document.createElement('span');
            play.className = 'talks-player__play';
            play.setAttribute('aria-hidden', 'true');
            play.innerHTML = '<span></span>';
            cover.appendChild(play);

            const open = () => playInline(cover, talk.videoId, talk.title);
            cover.addEventListener('click', open);
            cover.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    open();
                }
            });

            stage.appendChild(cover);
        } else if (talk.href) {
            const cover = document.createElement('a');
            cover.className = 'talks-player__cover';
            cover.href = talk.href;
            cover.target = '_blank';
            cover.rel = 'noopener noreferrer';

            const img = document.createElement('img');
            img.alt = talk.title;
            img.loading = 'lazy';
            img.src = talk.img || '';
            cover.appendChild(img);

            const overlay = document.createElement('span');
            overlay.className = 'talks-player__play talks-player__play--link';
            overlay.setAttribute('aria-hidden', 'true');
            overlay.innerHTML = '<i class="ti ti-arrow-up-right"></i>';
            cover.appendChild(overlay);

            stage.appendChild(cover);
        }

        titleEl.textContent = talk.title;

        actionsEl.innerHTML = '';
        (talk.actions || []).forEach((action) => {
            const link = document.createElement('a');
            link.className = 'btn btn-ghost btn-sm';
            link.href = action.href;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.title = action.label;
            link.innerHTML = `<i class="ti ${actionIcon(action.label)}"></i><span data-act-label>${action.label}</span>`;
            actionsEl.appendChild(link);
        });

        railEl.innerHTML = '';
        talks.forEach((item, index) => {
            const row = document.createElement('button');
            row.type = 'button';
            row.className = 'talks-rail__item' + (index === activeTalkIndex ? ' is-active' : '');

            const thumbWrap = document.createElement('div');
            thumbWrap.className = 'talks-rail__thumb';
            const thumbImg = document.createElement('img');
            thumbImg.alt = item.title;
            const railYoutubeFiles = ['mqdefault', 'hqdefault', 'sddefault', 'default'];
            if (item.thumb || item.img) {
                thumbImg.loading = 'lazy';
                if (item.videoId) {
                    thumbImg.onerror = () => {
                        thumbImg.onerror = null;
                        loadYoutubeCover(thumbImg, item.videoId, railYoutubeFiles);
                    };
                }
                thumbImg.src = item.thumb || item.img;
            } else if (item.videoId) {
                loadYoutubeCover(thumbImg, item.videoId, railYoutubeFiles);
            }
            thumbWrap.appendChild(thumbImg);

            const titleDiv = document.createElement('div');
            titleDiv.className = 'talks-rail__title';
            titleDiv.textContent = item.title;

            row.appendChild(thumbWrap);
            row.appendChild(titleDiv);

            row.addEventListener('click', () => {
                activeTalkIndex = index;
                renderTalks();
            });

            railEl.appendChild(row);
        });
    }

    function setupTalks() {
        if (!talks.length) return;
        renderTalks();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupTalks);
    } else {
        setupTalks();
    }
})();
