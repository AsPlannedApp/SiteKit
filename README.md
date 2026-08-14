# SiteKit

SiteKit builds a personal homepage from small, independent modules. Choose the sections you want, edit their JSON files, and generate a plain `index.html` that works without a framework or server.

The generated site is ordinary HTML, CSS, and JavaScript. You can open it directly from disk or deploy it to any static host. It is required to deploy the `assets/` folder together with your `index.html`

## Make it yours

1. Set your name, page description, and real canonical URL in `site.config.json`.
2. Choose and order sections in `modules.order`.
3. Edit each selected module's `modules/<name>/content.json`.
4. Put images and downloads in that module's `assets/` folder.

For example:

```json
{
  "modules": {
    "order": [
      "blog", "git-contributions", "photo-album",
      "job-history", "youtube", "press", "learning"
    ],
    "overrides": {}
  }
}
```

Removing a name disables that section. Reordering the names changes the page, header navigation, and hero index together.

## Get started

```bash
npm install
npm run check
npm run generate
```

Open `index.html` to see the result.

## Included modules

- [blog](./modules/blog/README.md) — Posts from an Atom or RSS 2.0 feed at generation time, with saved fallback posts.
- [git-contributions](./modules/git-contributions/README.md) — GitHub and GitLab activity, repositories, and public GitHub gists.
- [photo-album](./modules/photo-album/README.md) — A configurable 1–5 column *Polaroid* board with responsive build-generated previews and a full-screen viewer.
- [job-history](./modules/job-history/README.md) — Alternating resume cards on a responsive timeline.
- [youtube](./modules/youtube/README.md) — A video playlist with local or YouTube-provided covers.
- [press](./modules/press/README.md) — publications, downloads, and tutorials.
- [learning](./modules/learning/README.md) — certifications and course badges.

Header, hero, footer, metadata, dark mode, fonts, and icons are included automatically. Optional extensions can be disabled independently in `site.config.json`:

```json
{
  "extensions": {
    "dark-mode": true,
    "og-meta": true,
    "favicon": true,
    "app-icon": true
  }
}
```

- **dark-mode** allows to switch the CSS from light to dark mode and vice-versa. The 'template' you choose should support dark-mode for this to work.
- `og-meta` creates a 1200×630 social card from your identity, description, hostname, and theme. Open Graph crawlers require an absolute URL, so replace the sample `https://example.com/` canonical URL before publishing. Set `seo.ogImage` only when you want to use your own image instead.
- The favicon and installable-app artwork are deliberately separate. Replace `modules/favicon/assets/favicon-source.png` or `modules/app-icon/assets/app-icon-source.png` with an opaque square image at least 1024×1024, then generate again. The app module creates the Chrome/Android manifest icons, a maskable icon, and the iPhone/iPad touch icon; it does not add offline caching.

## Remote content and fallbacks

Blog and contribution data are fetched while `npm run generate` runs. The browser never needs those services to display the finished page.

If a remote source is unavailable, SiteKit prints a warning and uses the corresponding fallback from the module's `content.json`. GitHub, GitLab, and gists fall back independently.

Leave source URLs empty to use only authored sample data. See the examples in [Architecture and module authoring](docs/architecture.md#build-time-data).

## Themes

Choose `default` or `asplanned` in `site.config.json`. Dark mode follows the visitor's operating-system preference and can be overridden with the header button.

The generated page remembers the manual choice without flashing the wrong theme on the next visit.

## Commands

```bash
npm run check      # validate config, module content, HTML snippets, and assets
npm test           # run core and data-adapter tests
npm run generate   # rebuild index.html and generated assets
```

`index.html` and the root `assets/` directory are generated. Edit the source module files instead of changing generated output by hand.

For the photo album, keep only high-resolution PNG, JPG, or JPEG originals in `modules/photo-album/assets/photos/`, list them in its `content.json`, and choose `columns` from 1 through 5. Generation creates responsive WebP previews automatically; the originals remain available to the full-screen viewer.

## Building a module

Modules are intentionally self-contained and can be copied between SiteKit projects. The small public contract, schemas, asset rules, and build-time data lifecycle are documented in [docs/architecture.md](docs/architecture.md).

SiteKit is under active development and licensed under GPL-2.0.
