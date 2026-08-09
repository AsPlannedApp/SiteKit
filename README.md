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
npm install          # currently a no-op: zero runtime dependencies yet
npm run check         # validates config/site.config.json + enabled modules
npm run generate       # writes index.html + assets/ at the repo root
```

Then open `index.html` in a browser (works straight off disk via `file://` —
no local server required) or deploy the repo root as-is to any static host.

## How it's put together

```
config/site.config.json     identity, SEO, which modules are enabled + their
                             order, theme preset + token overrides

modules/<id>/                one self-contained module
  module.json                 id, kind, nav label/icon/anchor, sources[]
  template.js                  summary(), render(content, config, mode, ctx)
  styles.css                    only bare alias custom properties (--brand,
                                 --fg-body, ...), never raw colors
  client.js                     optional -- browser-side behavior
  content.schema.json            what content.json must look like
  content.json                    the module's actual content, edited in place
  assets/                          the module's own images/PDFs/etc., any
                                    subfolder depth

themes/<preset>/tokens.json  a set of CSS custom properties (design tokens);
                             "default" is neutral/system-font, other presets
                             are opt-in

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
- **`render(content, config, mode, ctx)`** → `{ html, headExtras?, footScripts? }`.
  `ctx.asset(relPath)` is the *only* sanctioned way a template references its
  own files — see below. `mode` is `'baked'` or `'live'` for modules with a
  fetchable data source (not yet built — see [Status](#status)).

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
| `npm run check` | Validates `config/site.config.json` and that every enabled module has a `content.json`. |
| `npm run generate` | Renders `index.html` and copies each enabled module's assets. Add `-- --force` to overwrite a non-generated `index.html`. |

More commands (`init`, `modules`, `icons`, `dev`) are planned but not built
yet — see [Status](#status).

## Configuring a site

Edit `config/site.config.json`:

```json
{
  "identity": { "name": "...", "tagline": "..." },
  "seo": { "title": "...", "description": "..." },
  "modules": {
    "enabled": ["youtube", "learning"],
    "order": ["youtube", "learning"],
    "mode": {}
  },
  "theme": { "preset": "default", "overrides": {} }
}
```

`modules.enabled`/`modules.order` only lists **content-section** modules
(the selectable, orderable ones). Chrome modules (`header`, `hero`,
`footer`) and infra (`core-assets`) are always included automatically when
present. Then edit each enabled module's own `modules/<id>/content.json` and
drop your images/PDFs into `modules/<id>/assets/`.

## Status

Built and working:

- Core pipeline: module discovery/loading, two-pass render (`summary()` then
  `render()`), theme token merging, asset copying, `check`/`generate` CLI
- `core-assets` (Tabler icon font + base reset CSS/JS), `header`, `hero`,
  `footer` (chrome)
- `learning` (certifications/badges), `youtube` (video talks with
  click-to-embed player)
- `press` (magazine/print archive) — **implemented but currently disabled**
  in `config/site.config.json` while its content model settles; the module
  code and a handful of scaffolding entries exist under `modules/press/`

Not started yet:

- A blog/writing module and a code-activity module — the two modules meant
  to exercise **baked vs. live** data-fetch modes (build-time fetch vs.
  client-side fetch, per source)
- `npm run init` / `npm run modules` (interactive scaffolding + module
  selection)
- `npm run icons` (single source image → favicon/app-icon set via `sharp`)
- A second, opt-in theme preset (the neutral `default` theme is the only one
  so far)
- `npm run dev` (generate + serve + watch)

## Design notes worth knowing before touching a module

- Every module's CSS reads only **bare alias** custom properties (`--brand`,
  `--fg-body`, `--type-h2`, ...) defined by the active theme's
  `tokens.json` — never a raw color and never a `--ap-*` raw token directly.
  This is what will let a future dark-mode or alternate theme restyle the
  whole site without touching module CSS.
- Content-driven counts/links that can't be derived from a module's own
  `content.json` (e.g. a hand-rounded "100+") are set via a top-level
  `countOverride` field, read generically by the render pipeline — not
  something each module re-implements.
- External URLs and module-relative asset paths can appear in the same
  content field (e.g. a talk's action link might be a local PDF or an
  external SoundCloud URL); `resolveHref()`/`isExternalHref()` in
  `src/core/html-util.js` sort that out once, shared across modules.
