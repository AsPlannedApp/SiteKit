(function () {
    const dialog = document.querySelector('.album-dialog');
    const photos = Array.from(document.querySelectorAll('[data-album-photo]'));
    if (!dialog || !photos.length) return;

    const image = dialog.querySelector('[data-album-image]');
    const label = dialog.querySelector('[data-album-label]');
    const count = dialog.querySelector('[data-album-count]');
    let active = 0;
    let opener = null;

    function show(index) {
        active = (index + photos.length) % photos.length;
        const photo = photos[active];
        image.src = photo.dataset.src;
        image.alt = photo.dataset.alt;
        label.textContent = photo.dataset.label;
        count.textContent = `${active + 1} / ${photos.length}`;
    }

    function open(index, button) {
        opener = button;
        show(index);
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
    }

    function close() {
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
