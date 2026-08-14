# Git Contributions module

The Git Contributions module combines a rolling contribution calendar, authored repository cards, and public GitHub gists. GitHub and GitLab-style contribution sources are resolved while SiteKit generates the page.

## Features

- Combined 12-month GitHub and GitLab-style contribution calendar.
- Generation-time remote JSON or module-relative static JSON sources.
- Configurable provider labels and independent fallbacks.
- Authored repository cards with optional cover images.
- Public GitHub gist loading with authored fallback entries.

## Enable the module

Add `git-contributions` to `modules.order` in `site.config.json`. Its position controls where it appears on the page and in the header navigation.

```json
{
  "modules": {
    "order": ["blog", "git-contributions", "job-history"],
    "overrides": {}
  }
}
```

## Contribution providers

Each provider has a visible `label` and may use a remote URL or a module-relative JSON asset:

```json
{
  "sources": {
    "github": {
      "label": "GitHub",
      "profileUrl": "https://github.com/octocat",
      "contributionsUrl": ""
    },
    "gitlab": {
      "label": "GitLab",
      "profileUrl": "https://gitlab.com/example",
      "contributionsFile": "contribution.json"
    },
    "gists": {
      "url": "",
      "limit": 6
    }
  }
}
```

- `label` controls the provider name in the legend and accessible day descriptions.
- `contributionsFile` is relative to `modules/git-contributions/assets/` and takes precedence over `contributionsUrl`.
- `contributionsUrl` is fetched during generation.
- A GitHub `profileUrl` derives the public jogruber contribution endpoint when no explicit source is configured.
- A GitHub profile also derives the public user-gists endpoint when `gists.url` is empty.

## Static contribution JSON

Static data can be a date-to-count object:

```json
{
  "2026-08-01": 4,
  "2026-08-02": 7
}
```

Or an array:

```json
[
  { "date": "2026-08-01", "count": 4 },
  { "date": "2026-08-02", "count": 7 }
]
```

Dates use `YYYY-MM-DD`; counts must be non-negative numbers. Static files are copied to the generated module assets, establishing the same source URL contract for future browser-side refresh.

## Fallbacks, repositories, and gists

`fallback.github` and `fallback.gitlab` use the same contribution shape. `fallback.gists` contains authored entries with a title, URL, and optional language. SiteKit uses each fallback independently when its corresponding source fails.

`repos` contains authored project cards with `title`, `description`, `url`, optional `language`, and optional `coverImage`. Cover images may be external URLs or module-relative assets. The number of repository entries supplies the section count unless `countOverride` is set.

## CORS and responsive behavior

Generation-time requests are not restricted by browser CORS. Browser-side contribution loading is not active yet; when added, remote endpoints will need to allow the deployed origin. A module-relative contribution file avoids this issue and is the recommended GitLab-style source.

The contribution panel remains centered and shrinks with its container, while the 53-week calendar scrolls horizontally when necessary. Repository cards reflow automatically, and gist pills wrap across lines. Dark mode follows the global SiteKit theme.

## Known limitations

- Browser-side contribution and gist refresh is not implemented yet.
- GitHub data depends on public third-party and GitHub API availability and rate limits.
- The visual calendar currently has two provider slots: GitHub and GitLab-style data.
- Repository and fallback content must be maintained manually.
