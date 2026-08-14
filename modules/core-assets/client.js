/* core-assets client.js: generic, always-shipped browser behaviors that don't
 * belong to any single content module. Kept deliberately small;
 * image-fallback / download-dropdown wiring join here as the modules that
 * need them land (press, code-activity). */

function setupRevealOnScroll() {
    const items = document.querySelectorAll('[data-rv]');
    if (!items.length) return;

    if (!('IntersectionObserver' in window)) {
        items.forEach((el) => el.classList.add('rv-in'));
        return;
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('rv-in');
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.12 }
    );

    items.forEach((el) => observer.observe(el));

    // Fallback: force-reveal everything after 3s regardless (e.g. an element
    // that never scrolls into view on a short page).
    setTimeout(() => items.forEach((el) => el.classList.add('rv-in')), 3000);
}

function setupStickyHeaderOffset() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    const sync = () => document.documentElement.style.setProperty('--header-h', `${header.offsetHeight - 24}px`);
    sync();

    if ('ResizeObserver' in window) {
        new ResizeObserver(sync).observe(header);
    } else {
        window.addEventListener('resize', sync, { passive: true });
    }
}

function initCoreAssets() {
    setupStickyHeaderOffset();
    setupRevealOnScroll();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCoreAssets);
} else {
    initCoreAssets();
}
