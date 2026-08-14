# Blog module

The Blog module displays recent posts from an Atom or RSS 2.0 feed. SiteKit fetches and bakes posts during generation, then refreshes the cards from the configured feed after the generated page loads.

## Features

- Build-time feed loading for immediately available, indexable post cards.
- Browser refresh after page load for newer posts.
- Atom and RSS 2.0 parsing with common image formats.
- Authored fallback posts when the feed is unavailable.
- Optional archive link and configurable post limit.

## Enable the module

Add `blog` to `modules.order` in `site.config.json`. Its array position controls where it appears on the page and in the header navigation.

```json
{
  "modules": {
    "order": ["blog", "git-contributions", "photo-album"],
    "overrides": {}
  }
}
```

## Configuration

Edit `modules/blog/content.json`:

```json
{
  "eyebrow": "Reading",
  "heading": "From the blog",
  "archiveLabel": "More articles →",
  "archiveUrl": "/blog/",
  "source": {
    "url": "/blog/feed",
    "limit": 3
  },
  "fallbackNotice": "The live feed is unavailable, so these saved articles are shown instead.",
  "fallback": [
    {
      "title": "Saved post",
      "url": "/blog/saved-post",
      "date": "August 1, 2026",
      "excerpt": "This card remains available if the feed cannot be loaded.",
      "image": "https://images.example.com/saved-post.webp"
    }
  ]
}
```

| Field | Description |
| --- | --- |
| `archiveLabel` | Optional label for the archive link. |
| `archiveUrl` | Optional blog archive destination. |
| `source.url` | Absolute or site-relative Atom/RSS feed URL. |
| `source.limit` | Number of posts to display, from 1 through 12. |
| `fallbackNotice` | Message shown when baked fallback posts are in use. |
| `fallback` | Required authored posts used without a feed or after generation-time failure. |
| `countOverride` | Optional value used instead of the derived post count. |

Fallback posts require `title`, `url`, and `excerpt`; `date`, `image`, and an icon class are optional.

## Runtime loading and CORS

Use a same-origin feed URL such as `/blog/feed` whenever possible. Origin includes protocol, hostname, and port, so a different subdomain is cross-origin too.

A cross-origin feed can work during generation because Node.js does not enforce browser CORS. Browser refresh works only when the feed server returns an appropriate `Access-Control-Allow-Origin` header. If runtime loading or parsing fails, SiteKit leaves the generated cards unchanged.

Relative feed URLs are resolved against `seo.canonicalUrl` during generation and against the deployed page in the browser. Runtime refresh requires an HTTP(S)-served page and is not supported when opening `index.html` directly through `file://`.

## Feed and responsive behavior

Atom entries use an alternate link, `published` or `updated`, and `content` or `summary`. RSS items use `link` or `guid`, `pubDate`, and `description` or `content:encoded`. Images can come from feed content, RSS enclosures, or Media RSS elements.

Post cards use three columns on wide screens and one column below 760px. Dark mode follows the global SiteKit theme without module-specific configuration.

## Known limitations

- Feed dates are formatted using the `en-US` locale.
- Remote post images are loaded from their original host and are not copied locally.
- The browser refresh supports Atom and RSS XML, not JSON Feed.
- Empty, malformed, timed-out, or unavailable feeds keep the generated posts in place.
