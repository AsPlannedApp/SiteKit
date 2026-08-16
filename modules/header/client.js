(function () {
    var nav = document.querySelector('.site-nav');
    var headerInner = document.querySelector('.site-header__inner');
    if (!nav || !headerInner) return;

    var links = Array.from(nav.querySelectorAll('a'));
    var canUseIcons = links.length > 0 && links.every(function (link) {
        return Boolean(link.querySelector('[data-nav-icon]'));
    });
    var frame = 0;
    var writeFrame = 0;

    function syncNavigationMode() {
        frame = 0;
        if (!canUseIcons) return;
        var shouldUseIcons = nav.scrollWidth > nav.clientWidth + 1;
        writeFrame = requestAnimationFrame(function () {
            writeFrame = 0;
            nav.classList.toggle('is-icons-only', shouldUseIcons);
        });
    }

    function scheduleSync() {
        if (frame) cancelAnimationFrame(frame);
        if (writeFrame) cancelAnimationFrame(writeFrame);
        nav.classList.remove('is-icons-only');
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
