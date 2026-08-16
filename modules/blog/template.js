import { XMLParser } from 'fast-xml-parser';
import { escapeHtml } from '../../src/core/html-util.js';

const htmlText = (value) => String(value || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

function valueText(value) {
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (value && typeof value === 'object') return String(value['#text'] || value.__cdata || '');
    return '';
}

function asList(value) {
    return Array.isArray(value) ? value : value ? [value] : [];
}

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function imageAttribute(value) {
    const item = asList(value)[0];
    if (!item || typeof item !== 'object') return '';
    return item['@_url'] || item['@_href'] || '';
}

function imageFromHtml(value) {
    return String(value || '').match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1] || '';
}

function atomEntries(feed, limit) {
    return asList(feed?.entry).slice(0, limit).map((entry) => {
        const links = asList(entry.link);
        const link = links.find((item) => item?.['@_rel'] === 'alternate') || links[0] || {};
        const rawContent = valueText(entry.content) || valueText(entry.summary);
        const cleanContent = htmlText(rawContent);

        return {
            title: htmlText(valueText(entry.title)),
            url: link['@_href'] || valueText(link),
            date: formatDate(valueText(entry.published) || valueText(entry.updated)),
            excerpt: cleanContent ? `${cleanContent.slice(0, 160)}${cleanContent.length > 160 ? '…' : ''}` : '',
            image: imageFromHtml(rawContent),
        };
    });
}

function rssItems(channel, limit) {
    return asList(channel?.item).slice(0, limit).map((item) => {
        const description = valueText(item.description);
        const richContent = valueText(item['content:encoded']) || description;
        const cleanDescription = htmlText(description || richContent);
        const enclosure = imageAttribute(item.enclosure);
        const media = imageAttribute(item['media:content']) || imageAttribute(item['media:thumbnail']);
        const image = media || enclosure || imageFromHtml(richContent);

        return {
            title: htmlText(valueText(item.title)),
            url: valueText(item.link) || valueText(item.guid),
            date: formatDate(valueText(item.pubDate) || valueText(item['dc:date'])),
            excerpt: cleanDescription ? `${cleanDescription.slice(0, 160)}${cleanDescription.length > 160 ? '…' : ''}` : '',
            image: image.replace(/^http:\/\//i, 'https://'),
        };
    });
}

function feedPosts(xml, limit) {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', cdataPropName: '__cdata' });
    const parsed = parser.parse(xml);
    const posts = parsed?.feed
        ? atomEntries(parsed.feed, limit)
        : rssItems(parsed?.rss?.channel, limit);
    return posts.filter((post) => post.title && post.url);
}

const atomPosts = feedPosts;

function resolveFeedUrl(value, config = {}) {
    const url = String(value || '').trim();
    if (!url) return '';
    try {
        return new URL(url, config.seo?.canonicalUrl).href;
    } catch {
        return '';
    }
}

function jsonForHtml(value) {
    return JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');
}

const BLOG_IMAGE_SIZES = '(max-width: 760px) calc(100vw - 2rem), (max-width: 1160px) calc((100vw - 8rem) / 3), 344px';
const BLOG_IMAGE_WIDTHS = [480, 800, 1200];

function contentfulImageUrl(value, width) {
    try {
        const url = new URL(value);
        if (url.hostname !== 'images.ctfassets.net') return '';
        url.searchParams.set('fm', 'webp');
        url.searchParams.set('w', String(width));
        url.searchParams.set('q', '75');
        return url.href;
    } catch {
        return '';
    }
}

function imageMarkup(post, index) {
    const optimized = contentfulImageUrl(post.image, 800);
    const responsive = optimized
        ? ` srcset="${escapeHtml(BLOG_IMAGE_WIDTHS.map((width) => `${contentfulImageUrl(post.image, width)} ${width}w`).join(', '))}" sizes="${BLOG_IMAGE_SIZES}"`
        : '';
    return `<img src="${escapeHtml(optimized || post.image)}"${responsive} alt="" loading="${index === 0 ? 'eager' : 'lazy'}"${index === 0 ? ' fetchpriority="high"' : ''}>`;
}

export async function prepare({ content, config, fetch }) {
    const authoredUrl = content.source?.url?.trim();
    if (!authoredUrl) return { content: { ...content, posts: content.fallback, sourceStatus: 'authored' } };

    const url = resolveFeedUrl(authoredUrl, config);
    if (!url) {
        return {
            content: { ...content, posts: content.fallback, sourceStatus: 'fallback' },
            warnings: [`could not resolve ${authoredUrl} during generation; using authored fallback (set seo.canonicalUrl to build a relative feed URL)`],
        };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
        const response = await fetch(url, { signal: controller.signal, headers: { accept: 'application/atom+xml, application/xml, text/xml' } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const posts = feedPosts(await response.text(), content.source.limit || 3);
        if (!posts.length) throw new Error('the feed contained no usable entries');
        return { content: { ...content, posts, sourceStatus: 'remote' } };
    } catch (error) {
        return {
            content: { ...content, posts: content.fallback, sourceStatus: 'fallback' },
            warnings: [`could not load ${url}; using authored fallback (${error.message})`],
        };
    } finally {
        clearTimeout(timeout);
    }
}

export function summary({ content }) {
    return { label: 'Posts', count: (content.posts || content.fallback || []).length };
}

function postCard(post, index) {
    const media = post.image
        ? imageMarkup(post, index)
        : `<i class="ti ${escapeHtml(post.icon || 'ti-writing-sign')}" aria-hidden="true"></i>`;
    return `<article class="blog-card" data-rv>
        <a class="blog-card__thumb${post.image ? '' : ' blog-card__thumb--icon'}" href="${escapeHtml(post.url)}" target="_blank" rel="noopener noreferrer" aria-label="Read ${escapeHtml(post.title)}">${media}</a>
        ${post.date ? `<div class="blog-card__date">${escapeHtml(post.date)}</div>` : ''}
        <h3><a href="${escapeHtml(post.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(post.title)}</a></h3>
        <p>${escapeHtml(post.excerpt || '')}</p>
    </article>`;
}

export function render({ content }) {
    const posts = content.posts || content.fallback || [];
    const notice = content.sourceStatus !== 'remote' && content.fallbackNotice
        ? `<p class="blog-notice" data-blog-notice>${escapeHtml(content.fallbackNotice)}</p>` : '';
    const runtimeConfig = content.source?.url?.trim()
        ? `<script type="application/json" data-blog-source>${jsonForHtml({ url: content.source.url.trim(), limit: content.source.limit || 3 })}</script>`
        : '';
    return { html: `<section id="blog" class="section" aria-label="Blog">
    <div class="wrap">
        <div class="section-head">
            <div><span class="eyebrow">${escapeHtml(content.eyebrow || '')}</span><h2>${escapeHtml(content.heading)}</h2></div>
            ${content.archiveUrl ? `<a class="section-head__link" href="${escapeHtml(content.archiveUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(content.archiveLabel || 'All posts →')}</a>` : ''}
        </div>
${notice ? `        ${notice}\n` : ''}        <div class="blog-grid" data-blog-grid>${posts.map(postCard).join('')}</div>
        ${runtimeConfig}
    </div>
</section>` };
}

export { atomPosts, contentfulImageUrl, feedPosts, resolveFeedUrl };
