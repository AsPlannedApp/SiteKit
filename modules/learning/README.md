# Learning module

The Learning module presents major certifications as illustrated medallions and smaller courses or achievements as compact icon badges. All credentials are authored locally and rendered without client-side JavaScript.

## Features

- Prominent certification badges with local artwork, title, and issuer.
- Compact course badges using Tabler icon classes.
- Configurable panel headings and summary text.
- Optional theme override for the certification panel fill.
- Responsive badge grids with automatic dark-mode support.

## Enable the module

Add `learning` to `modules.order` in `site.config.json`. Its array position controls where it appears on the page and in the header navigation.

```json
{
  "modules": {
    "order": ["job-history", "learning"],
    "overrides": {
      "learning": {
        "colors": {
          "trophyFill": "#66AAAA"
        }
      }
    }
  }
}
```

The `trophyFill` override accepts a CSS color or a color alias from the active theme. Without an override, the module uses the theme's brand-fill color.

## Configuration

Edit `modules/learning/content.json`:

```json
{
  "eyebrow": "Colophon",
  "heading": "Certifications & Trainings",
  "note": "Courses and professional credentials",
  "panelLabel": "Certifications",
  "panelNote": "3 certifications · 4 courses",
  "miniBadgesLabel": "Also completed",
  "badges": [
    {
      "image": "badges/accessible-web.webp",
      "title": "Accessible Web Professional",
      "issuer": "Inclusive Interface Guild"
    }
  ],
  "miniBadges": [
    {
      "icon": "ti-code",
      "label": "Practical TypeScript Patterns",
      "issuer": "Systems Craft School"
    }
  ]
}
```

| Field | Description |
| --- | --- |
| `panelLabel` | Heading inside the main certification panel. |
| `panelNote` | Optional summary displayed opposite the panel heading. |
| `miniBadgesLabel` | Heading displayed above compact course badges. |
| `countOverride` | Optional value used instead of the derived certification count. |
| `badges` | Major certification entries with `image`, `title`, and `issuer`. |
| `miniBadges` | Compact entries with a Tabler `icon`, `label`, and `issuer`. |

## Badge assets and icons

Store certification artwork below `modules/learning/assets/` and reference it without the `assets/` prefix:

```text
modules/learning/assets/badges/
  accessible-web.webp
```

Badge artwork is displayed inside a circular medallion using `object-fit: contain`. Mini badges use Tabler icon names such as `ti-code`, `ti-api`, or `ti-shield-check`; the generator includes referenced glyphs in the optimized icon font.

## Responsive and accessible behavior

Major badges display five per row on wide screens and three per row below 680px. Medallions become smaller on narrow screens, and issuer text is hidden below 820px while remaining available through each badge's accessible label and tooltip. Compact badges use two columns on wide screens and one below 760px.

Dark mode follows the global SiteKit theme. The trophy panel keeps its configured fill so certification artwork retains a consistent visual background.

## Known limitations

- Credentials are display-only and do not currently support verification links or expiry dates.
- Badge artwork is copied as authored and is not resized during generation.
- Course icons must exist in SiteKit's bundled Tabler icon map.
- Badge and course order follows `content.json` without automatic sorting.
