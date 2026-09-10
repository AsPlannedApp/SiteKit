(function () {
    const dialog = document.querySelector('.album-dialog');
    const photos = Array.from(document.querySelectorAll('[data-album-photo]'));
    if (!dialog || !photos.length) return;

    const media = dialog.querySelector('[data-album-media]');
    const preview = dialog.querySelector('[data-album-preview]');
    const image = dialog.querySelector('[data-album-image]');
    const progress = dialog.querySelector('[data-album-progress]');
    const label = dialog.querySelector('[data-album-label]');
    const count = dialog.querySelector('[data-album-count]');
    let active = 0;
    let opener = null;
    let requestVersion = 0;

    function finishLoading(version) {
        if (version !== requestVersion) return false;
        media.classList.remove('is-loading');
        media.setAttribute('aria-busy', 'false');
        progress.hidden = true;
        return true;
    }

    function show(index) {
        active = (index + photos.length) % photos.length;
        const photo = photos[active];
        const thumbnail = photo.querySelector('img');
        const version = ++requestVersion;

        if (thumbnail.naturalWidth && thumbnail.naturalHeight) {
            media.style.setProperty('--album-photo-ratio', thumbnail.naturalWidth / thumbnail.naturalHeight);
        }
        preview.src = thumbnail.currentSrc || thumbnail.src;
        image.classList.remove('is-ready');
        image.removeAttribute('src');
        image.alt = photo.dataset.alt;
        label.textContent = photo.dataset.label;
        count.textContent = `${active + 1} / ${photos.length}`;
        media.classList.add('is-loading');
        media.setAttribute('aria-busy', 'true');
        progress.hidden = false;

        const loader = new Image();
        loader.onload = async () => {
            if (typeof loader.decode === 'function') {
                try { await loader.decode(); } catch { /* A completed image is still safe to display. */ }
            }
            if (!finishLoading(version)) return;
            image.src = photo.dataset.src;
            requestAnimationFrame(() => {
                if (version === requestVersion) image.classList.add('is-ready');
            });
        };
        loader.onerror = () => finishLoading(version);
        loader.src = photo.dataset.src;
    }

    function open(index, button) {
        opener = button;
        show(index);
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
    }

    function close() {
        requestVersion += 1;
        media.classList.remove('is-loading');
        media.setAttribute('aria-busy', 'false');
        progress.hidden = true;
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
    }

    photos.forEach((photo, index) => photo.addEventListener('click', () => open(index, photo)));
    dialog.querySelector('[data-album-prev]').addEventListener('click', () => show(active - 1));
    dialog.querySelector('[data-album-next]').addEventListener('click', () => show(active + 1));
    dialog.querySelector('[data-album-close]').addEventListener('click', close);
    dialog.addEventListener('click', (event) => { if (event.target === dialog) close(); });
    dialog.addEventListener('close', () => opener?.focus());
    dialog.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); show(active - 1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); show(active + 1); }
    });
})();
