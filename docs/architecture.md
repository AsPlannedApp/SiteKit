# Architecture and module authoring

SiteKit is a build-time assembler. It discovers module folders, validates their content, optionally prepares remote data, renders the modules, copies their assets, and writes one deployable HTML page.

The browser output has no framework or package dependency.

## Project structure

```text
site.config.json
modules/<id>/
  module.json
  content.json
  content.schema.json
  template.js
  styles.css
  client.js
  assets/
themes/<preset>/tokens.json
```

Only `module.json` and `template.js` are required. The other files are included when the module needs them.

## Site configuration

`modules.order` is the single source of truth for enabled content sections and their order. It accepts only modules whose manifest kind is `content-section`.

`modules.overrides.<id>.colors` may override slots declared by a manifest's `themable` list. `extensions.<id>: false` disables an otherwise automatic extension.

`identity.shortName` optionally supplies the compact installable-app label. `seo.canonicalUrl` must be an absolute HTTP(S) URL; the Open Graph extension needs it to publish an absolute generated-image URL. `seo.ogImage` replaces the generated social card when an authored image is preferred.

The old `modules.enabled` and `modules.mode` fields are intentionally unsupported.

## Manifest

```json
{
  "id": "example",
  "kind": "content-section",
  "navLabel": "Example",
  "navIcon": "ti-star",
  "anchor": "example",
  "contentSchema": "./content.schema.json",
  "template": "./template.js",
  "styles": "./styles.css",
  "client": "./client.js",
  "themable": ["panelFill"],
  "assetsExclude": []
}
```

Supported kinds are:

- `infra` for shared assets and behavior.
- `chrome` for header, hero, and footer.
- `content-section` for selectable page sections.
- `extension` for metadata, global CSS, or invisible behavior.

Do not add dependency declarations or source modes to the manifest. A module's implementation and content schema own those details.

## Template contract

Templates export up to three functions:

```js
export async function prepare({ content, config, ctx, fetch }) {
  return { content, warnings: [] };
}

export function summary({ content, config }) {
  return { label: 'Items', count: content.items.length };
}

export function render({ content, config, ctx, themeColors }) {
  return { html: '<section>...</section>' };
}
```

`prepare()` is optional and runs only during generation, before summaries and rendering. It should normalize remote data, use authored fallback content for expected availability failures, and return human-readable warnings.

`summary()` supplies the generic header navigation and hero index. A top-level `countOverride` in content wins over its returned count.

`render()` may also return `headExtras` or `globalCss`. Module CSS and client JavaScript are collected from the paths in the manifest.

## Assets

Store authored files below the module's own `assets/` directory and reference them in content with module-relative paths:

```json
{ "image": "photos/example.webp" }
```

Resolve the path in the template:

```js
ctx.asset(content.image)
```

This becomes `assets/<module-id>/photos/example.webp` in the generated site. `npm run check` reports missing referenced files. Build-generated assets can be declared in `generatedAssets` so they are not mistaken for missing authored files.

Modules that derive assets dynamically can reference them with `ctx.generatedAsset(path)` and export an async `generateAssets({ content, config, moduleDir, outputDir, themeColors })` hook. SiteKit copies authored assets first, runs these hooks, and then verifies that every referenced generated file exists. `themeColors` contains the merged preset tokens and site overrides; raster generators can resolve those aliases to literal colors with `resolveThemeColorLiteral()`. The photo-album module uses this contract to keep only original PNGs in source while emitting responsive WebP previews into generated output.

### Generated site artwork

`og-meta` produces a deterministic 1200×630 PNG and publishes Open Graph and Twitter metadata. It uses the site identity, SEO description, canonical hostname, and resolved theme colors. An authored `seo.ogImage` remains a supported override, with optional `seo.ogImageWidth`, `seo.ogImageHeight`, and `seo.ogImageAlt` metadata.

`favicon` and `app-icon` are separate extensions with separate high-resolution source PNGs. The former creates browser-tab icons; the latter creates 192px and 512px launcher icons, a maskable 512px variant, a 180px Apple touch icon, and a relative-path web manifest. Neither module depends on the other, and neither source PNG is copied into public output.

Raw HTML fields are exceptional and trusted. SiteKit balance-checks `extraHtml` snippets but does not sanitize them.

## Build-time data

### Blog

```json
{
  "source": {
    "url": "https://example.com/feed.xml",
    "limit": 3
  },
  "fallback": [
    {
      "title": "Saved post",
      "url": "https://example.com/blog/saved",
      "date": "August 1, 2026",
      "excerpt": "Available when the feed is not."
    }
  ]
}
```

Atom and RSS 2.0 feeds are fetched with a ten-second timeout. HTTP, parsing, or empty-feed failures use `fallback` without breaking generation.

### Git contributions and gists

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

With a GitHub profile and no explicit contribution source, SiteKit uses the public jogruber contribution service and GitHub's public user-gists endpoint. A provider can instead set `contributionsUrl` for a generation-time remote JSON source or `contributionsFile` for a module-relative JSON file under its `assets/` directory. A local file takes precedence when both fields are present. This is useful for GitLab, which does not publish a stable calendar API and commonly blocks browser cross-origin loading.

Every contribution source accepts either an array of `{ "date": "YYYY-MM-DD", "count": 4 }` objects or a date-to-count object. `label` controls the provider name shown in the legend and accessible day descriptions. Fallback data has the same normalized shape.

Remote data is not written back to `content.json`; it exists only in the generated result. Contribution files are copied to the generated module assets and their labeled source descriptors are embedded in the page, establishing the data contract for a future browser-side refresh. Browser-side Git refresh and authenticated provider adapters are not implemented yet.

## Rendering and styles

The generator performs four steps:

1. Discover and validate active modules.
2. Run optional build-time `prepare()` functions.
3. Collect summaries, then render every module.
4. assemble HTML, copy assets, and subset the icon font.

Module CSS should consume semantic theme aliases such as `--bg-page`, `--bg-panel`, `--fg-body`, `--fg-muted`, `--brand`, and `--border-hairline`. Avoid referring directly to a preset's raw `--ap-*` tokens.

Use `escapeHtml()` for authored text and `resolveHref()` when a field may be either an external URL or a module-relative asset.

Client scripts should contain only behavior that must run in the browser. Data fetching belongs in `prepare()` for the current static-first release.
