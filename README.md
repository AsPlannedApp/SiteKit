# SiteKit

A self-contained-module personal-site generator. Pick your modules, edit each
one's own content JSON, run `generate`, and get a plain HTML/CSS/vanilla-JS
`index.html` — no client framework, no build step in the output — ready to
deploy as-is.

> **Status: work in progress.** The module contract, render pipeline, and
> several modules are built and working; several are not yet started. See
> [Status](#status) below before relying on this for a real site.

## Why

Most "personal site generators" either lock you into a framework/build step
for the *output*, or give you a single monolithic template you have to fork
and hand-edit. SiteKit instead treats each section of the page — hero, blog,
credentials, talks, etc. — as an independent **module**: its own markup
template, its own CSS, its own optional client-side JS, its own content
schema, and its own asset folder. You choose which modules you want, fill in
their content, and the generator assembles one `index.html` from the parts.

Building or forking a module should be as simple as copying a folder.

## Quickstart

```bash
npm install          # one devDependency (subset-font, build-time icon
                      # subsetting) -- zero runtime dependencies in the output
npm run check         # validates site.config.json + enabled modules
npm run generate       # writes index.html + assets/ at the repo root
```

Then open `index.html` in a browser (works straight off disk via `file://` —
no local server required) or deploy the repo root as-is to any static host.

## How it's put together

```
site.config.json             identity, SEO, which modules are enabled + their
                             order, theme preset + token overrides

modules/<id>/                one self-contained module
  module.json                 id, kind, nav label/icon/anchor, sources[],
                                themable[] (colorable slots), assetsExclude[]
                                (build-input files not shipped to output)
  template.js                  summary(), render(content, config, mode, ctx)
  styles.css                    only bare alias custom properties (--brand,
                                 --fg-body, ...), never raw colors
  client.js                     optional -- browser-side behavior
  content.schema.json            what content.json must look like
  content.json                    the module's actual content, edited in place
  assets/                          the module's own images/PDFs/etc., any
                                    subfolder depth

themes/<preset>/tokens.json  { colors: {...}, fonts: {...} } -- colors are
                             the design-token custom properties, fonts is the
                             theme's default font provider/baseUrl/families
                             (see "Fonts" below); "default" is neutral/
                             system-font, "asplanned" is the real brand
                             palette + self-hosted Lato

index.html                  GENERATED -- do not hand-edit, re-run `generate`
assets/<module-id>/...      GENERATED -- copied from each module's own
                             assets/, gitignored (see below)
```

### The module contract

A module's `template.js` exports:

- **`summary(content, config)`** → `{ label, count } | null`. Lets chrome
  modules (header nav, hero's "in this issue" list) describe every enabled
  content-section module generically, without hardcoding section names.
  `content.countOverride`, if set, always wins over a derived count (useful
  when a real count isn't derivable from the data, e.g. "100+" published
  articles).
- **`render(content, config, mode, ctx)`** → `{ html, headExtras?, globalCss? }`.
  `ctx.asset(relPath)` is the *only* sanctioned way a template references its
  own files — see below. `mode` is `'baked'` or `'live'` for modules with a
  fetchable data source (not yet built — see [Status](#status)).

### Module kinds

- **`infra`** (`core-assets`) / **`chrome`** (`header`, `hero`, `footer`) —
  always loaded when present; not part of `config.modules.enabled/order`.
- **`content-section`** — the selectable, orderable ones (`learning`,
  `youtube`, ...). Contributes to `<main>` and to `summary()`'s nav/count data.
- **`extension`** — invisible functionality: contributes only `headExtras`
  (meta tags, inline scripts) and/or `globalCss` (see below), never visible
  markup (`html` is always `''`). Present-on-disk means active, like
  `infra`/`chrome`, but each can be individually opted out via
  `config.extensions.<id>: false`. Built-in extensions: `og-meta`
  (OpenGraph/Twitter meta tags from `config.seo`/`identity`) and `dark-mode`
  (`prefers-color-scheme` + a manual `data-theme` toggle hook). Favicon/
  app-icon generation is a planned future extension (see
  [Status](#status)).

### Themable color slots

A module declares which of its own CSS custom properties are meant to be
site-configurable via `module.json`'s `"themable": ["<slotName>"]` (e.g.
`learning`'s trophy-panel background: `"themable": ["trophyFill"]`). A site
overrides it in `config.modules.overrides.<id>.colors.<slot>`, with either a
theme token alias name (`"gold-500"`, resolved to `var(--gold-500)`) or a raw
CSS color literal (`"#EAC871"`). The module's own CSS reads
`var(--slot-<slotName>, var(--<its-own-default-alias>))`, so an unconfigured
slot silently falls through to the module's default. See
`src/core/theme-tokens.js`'s `resolveThemeColorValue()` for the exact
literal-vs-alias resolution rule.

### Extension `globalCss` and the "globals" layer

An extension's `globalCss` (and a themable-slot override's resolved CSS) is
appended into `<style>` **after** theme tokens and every module's own
`styles.css` — this "globals" layer is what lets `dark-mode` win by source
order without `!important`. See `dark-mode`'s own cascade design in
`modules/dark-mode/template.js` for how the manual toggle and the OS
`prefers-color-scheme` default coexist without one theme-specific "light"
value needing to be hardcoded into a theme-agnostic module.

### The asset-path contract

A module's `content.json` stores **module-relative** paths only
(`"cover": "images/x.jpg"`), never a resolved URL. `template.js` calls
`ctx.asset(relPath)` to turn that into where the generator will actually
place the file: `assets/<module-id>/<relPath>` (relative to `index.html`,
deliberately no leading slash — a root-absolute `/assets/...` would resolve
to the filesystem root and 404 when the page is opened via `file://` instead
of a real HTTP root). Nested paths round-trip exactly, e.g.
`modules/press/assets/magazines/2007/cover.webp` →
`assets/press/magazines/2007/cover.webp`.

This is what makes a module portable: it never hardcodes its own id into its
content, so it can be renamed, forked, or dropped into another SiteKit
checkout unchanged.

Two deliberate, narrow exceptions:

- **`og-meta`'s `og:image`** must be an absolute URL per the OpenGraph spec.
  It's resolved from `config.seo.ogImage` (a module-relative-style path)
  against `config.seo.canonicalUrl` — omitted entirely if `canonicalUrl`
  isn't set, rather than emitting a broken relative URL.
- **`footer`'s `content.extraHtml[]`** (and any future module's own raw-HTML
  field) is inserted as-is, unescaped, bypassing `ctx.asset()` entirely --
  for content that has no module-relative asset of its own, like an
  externally-hosted W3C validator badge `<img>` or a `mailto:` link. `npm run
  check` tag-balance-lints every `extraHtml` entry (`src/core/html-lint.js`)
  so a malformed snippet fails the build instead of silently breaking the
  page's HTML validity.

### Generated output is gitignored

`assets/` at the repo root is entirely generated (copied from each enabled
module's own `assets/` at `generate` time) and is gitignored — only the
*source* copies inside `modules/<id>/assets/` are tracked. `index.html`
itself **is** currently tracked (it's the deployable artifact for a
Netlify-style static host) but always carries a
`<!-- generated-by:sitekit@version -->` marker; `generate` refuses to
overwrite a hand-edited `index.html` without `--force`.

## CLI

| Command | What it does |
|---|---|
| `npm run check` | Validates `site.config.json`, that every active module has a `content.json` when it declares a schema, and tag-balance-lints every `extraHtml[]` entry. |
| `npm run generate` | Renders `index.html`, copies each active module's assets, regenerates the Tabler icon subset (scanned from actually-used `.ti-*` classes), and copies a self-hosted theme's font files. Add `-- --force` to overwrite a non-generated `index.html`. |

More commands (`init`, `modules`, `icons`, `dev`) are planned but not built
yet — see [Status](#status).

## Configuring a site

Edit `site.config.json`:

```json
{
  "identity": { "name": "...", "tagline": "..." },
  "seo": {
    "title": "...", "description": "...",
    "canonicalUrl": "https://example.com/", "ogImage": "images/preview.png"
  },
  "modules": {
    "enabled": ["youtube", "learning"],
    "order": ["youtube", "learning"],
    "mode": {},
    "overrides": { "learning": { "colors": { "trophyFill": "gold-500" } } }
  },
  "theme": {
    "preset": "asplanned",
    "overrides": {},
    "fontOverrides": { "provider": "link", "baseUrl": "https://fonts.asplanned.app/lato" }
  },
  "extensions": { "dark-mode": false }
}
```

`modules.enabled`/`modules.order` only lists **content-section** modules
(the selectable, orderable ones). Chrome (`header`, `hero`, `footer`), infra
(`core-assets`), and extension (`og-meta`, `dark-mode`, ...) modules are
always included automatically when present -- listing one of those in
`modules.order` too is a no-op (deduped), not a double-render. Use
`config.extensions.<id>: false` to opt an extension out.

`theme.fontOverrides` lets a site swap just the font provider/baseUrl (e.g.
to a CDN like `fonts.asplanned.app`) without forking the whole theme --
`families`/`files` (which font weights/styles exist) always stay
theme-owned. See `src/core/font-tags.js` for the `system`/`self-hosted`/
`link` provider behaviors.

Then edit each enabled module's own `modules/<id>/content.json` and drop
your images/PDFs into `modules/<id>/assets/`.

## Status

Built and working:

- Core pipeline: module discovery/loading, two-pass render (`summary()` then
  `render()`), theme token merging, asset copying, `check`/`generate` CLI
- `core-assets` (Tabler icon font + base reset CSS/JS), `header`, `hero`,
  `footer` (chrome)
- `learning` (certifications/badges, with a themable `trophyFill` slot),
  `youtube` (video talks with click-to-embed player)
- `press` (magazine/print archive) — **implemented but currently disabled**
  in `site.config.json` while its content model settles; the module
  code and a handful of scaffolding entries exist under `modules/press/`
- **`extension` module kind**: `og-meta` (OpenGraph/Twitter meta tags) and
  `dark-mode` (`prefers-color-scheme` + manual `data-theme` toggle hook, no
  visible toggle control yet -- see below)
- **Two theme presets**: `default` (neutral, system fonts) and `asplanned`
  (real brand palette, self-hosted Lato); font provider is theme-owned and
  per-site-overridable (`system`/`self-hosted`/`link` -- see `font-tags.js`)
- **Build-time Tabler icon subsetting**: `npm run generate` scans actually-
  used `.ti-*` classes and subsets the vendored full webfont via
  `subset-font` (a devDependency), replacing the old hand-curated,
  hand-maintained subset file
- Footer's `content.extraHtml[]` raw-HTML escape hatch, tag-balance-linted
  by `npm run check`

Known limitation: dark-mode's alias-token promotion (swapping hardcoded
`rgba(26,26,26,...)` literals for theme aliases that flip in dark mode) only
covers `color`/`border`-type literals so far, plus `learning` and
`core-assets`' `box-shadow`. Decorative `box-shadow`/`background`-scrim
literals in `press`/`youtube` haven't been promoted yet -- harmless (merely
less visible on a dark background), not a legibility break, but worth
finishing before calling dark-mode fully done.

Not started yet:

- A blog/writing module and a code-activity module — the two modules meant
  to exercise **baked vs. live** data-fetch modes (build-time fetch vs.
  client-side fetch, per source)
- `npm run init` / `npm run modules` (interactive scaffolding + module
  selection)
- A `favicon`/`app-icon` extension module (single source image → favicon/
  app-icon set via `sharp`) — the `extension` kind is ready for it, per
  `og-meta`/`dark-mode`'s example
- A visible dark-mode toggle control in header/footer chrome (the toggle
  *mechanism* -- `window.sitekitSetTheme()`, `[data-theme-toggle]` auto-wiring
  -- is built; no chrome module calls it yet)
- `npm run dev` (generate + serve + watch)
- Full ajv-based `content.schema.json` validation in `check` (current
  validation is hand-rolled and shape-level only)

## Design notes worth knowing before touching a module

- Every module's CSS reads only **bare alias** custom properties (`--brand`,
  `--fg-body`, `--type-h2`, `--border-hairline`, `--shadow-ambient`,
  `--fg-on-fill`, ...) defined by the active theme's `tokens.json` — never a
  raw color and never a `--ap-*` raw token directly. This is what lets
  `dark-mode` (or an alternate theme) restyle the whole site without
  touching module CSS. `--fg-on-fill` is intentionally *not* overridden by
  `dark-mode`: it's text/labels placed on top of `--brand-fill`-colored
  surfaces, whose tone doesn't flip with the page background.
- Content-driven counts/links that can't be derived from a module's own
  `content.json` (e.g. a hand-rounded "100+") are set via a top-level
  `countOverride` field, read generically by the render pipeline — not
  something each module re-implements.
- External URLs and module-relative asset paths can appear in the same
  content field (e.g. a talk's action link might be a local PDF or an
  external SoundCloud URL); `resolveHref()`/`isExternalHref()` in
  `src/core/html-util.js` sort that out once, shared across modules.
