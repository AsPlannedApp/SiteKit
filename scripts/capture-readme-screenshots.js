import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pageUrl = pathToFileURL(path.join(root, 'index.html')).href;

const targets = {
    overview: path.join(root, 'docs', 'images'),
    blog: path.join(root, 'modules', 'blog', 'images'),
    git: path.join(root, 'modules', 'git-contributions', 'images'),
    photos: path.join(root, 'modules', 'photo-album', 'images'),
    jobs: path.join(root, 'modules', 'job-history', 'images'),
    youtube: path.join(root, 'modules', 'youtube', 'images'),
    press: path.join(root, 'modules', 'press', 'images'),
    learning: path.join(root, 'modules', 'learning', 'images')
};

await Promise.all(Object.values(targets).map((directory) => mkdir(directory, { recursive: true })));

async function launchBrowser() {
    try {
        return await chromium.launch({ channel: 'chrome', args: ['--allow-file-access-from-files'] });
    } catch (chromeError) {
        try {
            return await chromium.launch({ args: ['--allow-file-access-from-files'] });
        } catch {
            throw new Error(
                'No Playwright-compatible browser is available. Install Chrome or run `npx playwright install chromium`.',
                { cause: chromeError }
            );
        }
    }
}

async function openPage(browser, { width, height, theme = 'light' }) {
    const context = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: 1,
        colorScheme: theme,
        reducedMotion: 'reduce'
    });
    const page = await context.newPage();
    await page.addInitScript((selectedTheme) => {
        document.documentElement.dataset.theme = selectedTheme;
    }, theme);
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 10_000 });
    await page.addStyleTag({ content: `
        *, *::before, *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition: none !important;
            caret-color: transparent !important;
        }
    ` });
    await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.race([
            Promise.all(Array.from(document.images, (image) => {
                if (image.complete) return undefined;
                return new Promise((resolve) => {
                    image.addEventListener('load', resolve, { once: true });
                    image.addEventListener('error', resolve, { once: true });
                });
            })),
            new Promise((resolve) => setTimeout(resolve, 3_000))
        ]);
    });
    return { context, page };
}

async function sectionShot(page, selector, output) {
    const section = page.locator(selector);
    await section.scrollIntoViewIfNeeded();
    await section.screenshot({ path: output });
}

const browser = await launchBrowser();

try {
    const desktop = { width: 1440, height: 1000 };
    const lightDesktop = await openPage(browser, desktop);
    await lightDesktop.page.screenshot({ path: path.join(targets.overview, 'sitekit-light.png') });
    await sectionShot(lightDesktop.page, '#blog', path.join(targets.blog, 'blog.png'));
    await sectionShot(lightDesktop.page, '#git-contributions', path.join(targets.git, 'git-contributions.png'));
    await sectionShot(lightDesktop.page, '#photo-album', path.join(targets.photos, 'photo-album.png'));
    await sectionShot(lightDesktop.page, '#job-history', path.join(targets.jobs, 'job-history.png'));
    await sectionShot(lightDesktop.page, '#youtube', path.join(targets.youtube, 'youtube.png'));
    await sectionShot(lightDesktop.page, '#press', path.join(targets.press, 'press.png'));
    await sectionShot(lightDesktop.page, '#learning', path.join(targets.learning, 'learning.png'));
    await lightDesktop.page.locator('[data-album-photo]').first().click();
    await lightDesktop.page.locator('.album-dialog[open]').screenshot({ path: path.join(targets.photos, 'photo-viewer.png') });
    await lightDesktop.context.close();

    const darkDesktop = await openPage(browser, { ...desktop, theme: 'dark' });
    await darkDesktop.page.screenshot({ path: path.join(targets.overview, 'sitekit-dark.png') });
    await darkDesktop.context.close();

    const mobile = await openPage(browser, { width: 390, height: 844, theme: 'light' });
    await mobile.page.screenshot({ path: path.join(targets.overview, 'sitekit-mobile.png') });
    await sectionShot(mobile.page, '#photo-album', path.join(targets.photos, 'photo-album-mobile.png'));
    await sectionShot(mobile.page, '#job-history', path.join(targets.jobs, 'job-history-mobile.png'));
    await mobile.context.close();

    const tablet = await openPage(browser, { width: 820, height: 1000, theme: 'light' });
    await sectionShot(tablet.page, '#youtube', path.join(targets.youtube, 'youtube-tablet.png'));
    await tablet.context.close();
} finally {
    await browser.close();
}

console.log('README screenshots updated.');
