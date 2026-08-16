(function () {
    var sourceElement = document.querySelector('[data-blog-source]');
    var grid = document.querySelector('[data-blog-grid]');
    if (!sourceElement || !grid) return;

    var source;
    try {
        source = JSON.parse(sourceElement.textContent);
    } catch (error) {
        return;
    }
    if (!source.url) return;

    function firstElement(node, names) {
        for (var index = 0; index < names.length; index += 1) {
            var match = node.getElementsByTagName(names[index])[0];
            if (match) return match;
        }
        return null;
    }

    function text(node) {
        return node ? node.textContent.trim() : '';
    }

    function excerptAndImage(markup) {
        var doc = new DOMParser().parseFromString(markup || '', 'text/html');
        var clean = (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
        return {
            excerpt: clean ? clean.slice(0, 160) + (clean.length > 160 ? '…' : '') : '',
            image: doc.querySelector('img')?.getAttribute('src') || '',
        };
    }

    function formattedDate(value) {
        if (!value) return '';
        var date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function httpUrl(value, baseUrl) {
        if (!value) return '';
        try {
            var url = new URL(value, baseUrl);
            return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
        } catch (error) {
            return '';
        }
    }

    var blogImageSizes = '(max-width: 760px) calc(100vw - 2rem), (max-width: 1160px) calc((100vw - 8rem) / 3), 344px';
    var blogImageWidths = [480, 800, 1200];

    function contentfulImageUrl(value, width) {
        try {
            var url = new URL(value);
            if (url.hostname !== 'images.ctfassets.net') return '';
            url.searchParams.set('fm', 'webp');
            url.searchParams.set('w', String(width));
            url.searchParams.set('q', '75');
            return url.href;
        } catch (error) {
            return '';
        }
    }

    function atomPost(entry, feedUrl) {
        var links = Array.from(entry.getElementsByTagName('link'));
        var link = links.find(function (item) { return item.getAttribute('rel') === 'alternate'; }) || links[0];
        var content = firstElement(entry, ['content', 'summary']);
        var rich = excerptAndImage(text(content));
        return {
            title: text(firstElement(entry, ['title'])),
            url: httpUrl(link?.getAttribute('href') || text(link), feedUrl),
            date: formattedDate(text(firstElement(entry, ['published', 'updated']))),
            excerpt: rich.excerpt,
            image: httpUrl(rich.image, feedUrl),
        };
    }

    function rssPost(item, feedUrl) {
        var description = text(firstElement(item, ['description']));
        var encoded = text(firstElement(item, ['content:encoded']));
        var rich = excerptAndImage(encoded || description);
        var enclosure = firstElement(item, ['enclosure']);
        var media = firstElement(item, ['media:content', 'media:thumbnail']);
        return {
            title: text(firstElement(item, ['title'])),
            url: httpUrl(text(firstElement(item, ['link', 'guid'])), feedUrl),
            date: formattedDate(text(firstElement(item, ['pubDate', 'dc:date']))),
            excerpt: excerptAndImage(description || encoded).excerpt,
            image: httpUrl(media?.getAttribute('url') || media?.getAttribute('href') || enclosure?.getAttribute('url') || rich.image, feedUrl),
        };
    }

    function parseFeed(xml, feedUrl, limit) {
        var doc = new DOMParser().parseFromString(xml, 'application/xml');
        if (doc.querySelector('parsererror')) return [];
        var atomEntries = Array.from(doc.getElementsByTagName('entry'));
        var rssItems = Array.from(doc.getElementsByTagName('item'));
        var values = atomEntries.length
            ? atomEntries.map(function (entry) { return atomPost(entry, feedUrl); })
            : rssItems.map(function (item) { return rssPost(item, feedUrl); });
        return values.filter(function (post) { return post.title && post.url; }).slice(0, limit);
    }

    function appendTextElement(parent, tag, className, value) {
        var element = document.createElement(tag);
        if (className) element.className = className;
        element.textContent = value;
        parent.appendChild(element);
        return element;
    }

    function renderPosts(posts) {
        var fragment = document.createDocumentFragment();
        posts.forEach(function (post, index) {
            var card = document.createElement('article');
            card.className = 'blog-card rv-in';
            card.setAttribute('data-rv', '');

            var thumb = document.createElement('a');
            thumb.className = 'blog-card__thumb' + (post.image ? '' : ' blog-card__thumb--icon');
            thumb.href = post.url;
            thumb.target = '_blank';
            thumb.rel = 'noopener noreferrer';
            thumb.setAttribute('aria-label', 'Read ' + post.title);
            if (post.image) {
                var image = document.createElement('img');
                var optimized = contentfulImageUrl(post.image, 800);
                image.src = optimized || post.image;
                if (optimized) {
                    image.srcset = blogImageWidths.map(function (width) { return contentfulImageUrl(post.image, width) + ' ' + width + 'w'; }).join(', ');
                    image.sizes = blogImageSizes;
                }
                image.alt = '';
                image.loading = index === 0 ? 'eager' : 'lazy';
                if (index === 0) image.fetchPriority = 'high';
                thumb.appendChild(image);
            } else {
                var icon = document.createElement('i');
                icon.className = 'ti ti-writing-sign';
                icon.setAttribute('aria-hidden', 'true');
                thumb.appendChild(icon);
            }
            card.appendChild(thumb);

            if (post.date) appendTextElement(card, 'div', 'blog-card__date', post.date);
            var heading = document.createElement('h3');
            var link = appendTextElement(heading, 'a', '', post.title);
            link.href = post.url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            card.appendChild(heading);
            appendTextElement(card, 'p', '', post.excerpt || '');
            fragment.appendChild(card);
        });

        grid.replaceChildren(fragment);
        document.querySelector('[data-blog-notice]')?.remove();
    }

    async function refreshPosts() {
        var controller = new AbortController();
        var timeout = setTimeout(function () { controller.abort(); }, 10000);
        try {
            var response = await fetch(source.url, {
                signal: controller.signal,
                headers: { accept: 'application/atom+xml, application/rss+xml, application/xml, text/xml' },
                credentials: 'same-origin',
            });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            var posts = parseFeed(await response.text(), response.url || source.url, source.limit || 3);
            if (posts.length) renderPosts(posts);
        } catch (error) {
            // Progressive enhancement: keep the generated posts when runtime refresh fails.
        } finally {
            clearTimeout(timeout);
        }
    }

    function refreshWhenIdle() {
        if ('requestIdleCallback' in window) window.requestIdleCallback(refreshPosts, { timeout: 2500 });
        else setTimeout(refreshPosts, 1500);
    }

    window.addEventListener('load', refreshWhenIdle, { once: true });
})();
