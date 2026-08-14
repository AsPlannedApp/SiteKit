# Press module

![A colorful publication shelf with tutorial cards](./images/press.png)

Gather articles, interviews, magazine appearances, downloads, and related tutorials into a small personal newsstand. Everything is chosen and authored by you.

## Add it to your site

Add `press` to `modules.order` in `site.config.json`, then edit `modules/press/content.json`:

```json
{
  "eyebrow": "Archive",
  "heading": "In the Media",
  "note": "Articles, interviews, and tutorials",
  "panelLabel": "Publication Archive",
  "magazines": [
    {
      "title": "Linux Magazine",
      "flag": "🇬🇧",
      "dateLabel": "2007/06",
      "role": "Author",
      "coverImage": "magazines/linux-magazine.webp",
      "action": {
        "type": "single",
        "label": "Read article",
        "href": "https://example.com/article"
      }
    }
  ]
}
```

Put covers, tutorial images, and downloads below `modules/press/assets/`. Image paths are relative to that folder; destinations may be external URLs or local downloads.

## One link or a download menu

A publication can have one `single` action or a `dropdown` with two or more choices:

```json
{
  "action": {
    "type": "dropdown",
    "items": [
      { "label": "English PDF", "href": "downloads/article-en.pdf" },
      { "label": "Italian PDF", "href": "downloads/article-it.pdf" }
    ]
  }
}
```

Use `coverSquare: true` for discs or other artwork that should not receive the magazine-style shadow. Tutorials need a `title`, `note`, `href`, and `image`.

## Good to know

- The publication shelf scrolls sideways rather than shrinking its covers.
- Tutorial cards use four columns on wide screens, two below 1024px, and one below 600px.
- Download menus use native browser controls and remain keyboard accessible without extra JavaScript.
- Dark mode follows the main SiteKit theme.
- Images are copied at their authored size, so prepare web-friendly files before adding them.

For dropdown publications, the cover opens the first item and the visible menu label is currently “Download”. The reserved `tutorialsLabel` field is not displayed yet.
