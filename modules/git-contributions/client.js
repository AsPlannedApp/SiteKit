(function () {
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
})();
