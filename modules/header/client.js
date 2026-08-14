(function () {
    var nav = document.querySelector('.site-nav');
    var headerInner = document.querySelector('.site-header__inner');
    if (!nav || !headerInner) return;

    var links = Array.from(nav.querySelectorAll('a'));
    var canUseIcons = links.length > 0 && links.every(function (link) {
        return Boolean(link.querySelector('[data-nav-icon]'));
    });
    var frame = 0;

    function syncNavigationMode() {
        frame = 0;
        nav.classList.remove('is-icons-only');

        if (!canUseIcons) return;
        nav.classList.toggle('is-icons-only', nav.scrollWidth > nav.clientWidth + 1);
    }

    function scheduleSync() {
        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(syncNavigationMode);
    }

    if ('ResizeObserver' in window) {
        new ResizeObserver(scheduleSync).observe(headerInner);
    } else {
        window.addEventListener('resize', scheduleSync, { passive: true });
    }

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleSync);
    scheduleSync();
})();
