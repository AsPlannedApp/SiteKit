# Job History module

<img src="./images/job-history.png" alt="Job History module showing alternating career cards on a timeline" width="600">

The Job History module presents roles and career milestones as an alternating vertical timeline. Entries are authored directly in `content.json` and collapse into a single readable column on smaller screens.

## Features

- Alternating left and right timeline cards on wide screens.
- Period, role, company, location, and multiple description paragraphs.
- Optional links for company pages, projects, or supporting material.
- Automatically derived role count for the header and hero index.
- Static HTML output with no client-side JavaScript.

## Enable the module

Add `job-history` to `modules.order` in `site.config.json`. Its array position controls where it appears on the page and in the header navigation.

```json
{
  "modules": {
    "order": ["photo-album", "job-history", "learning"],
    "overrides": {}
  }
}
```

## Configuration

Edit `modules/job-history/content.json`:

```json
{
  "eyebrow": "Experience",
  "heading": "Job History",
  "note": "A few chapters from the journey",
  "entries": [
    {
      "period": "2024 — Present",
      "role": "Lead Software Engineer",
      "company": "Northstar Studio",
      "location": "Remote",
      "paragraphs": [
        "Leading a product team building dependable tools.",
        "Focused on clear architecture and useful feedback loops."
      ],
      "links": [
        { "label": "Company", "url": "https://example.com" }
      ]
    }
  ]
}
```

| Field | Description |
| --- | --- |
| `eyebrow` | Small label displayed above the section heading. |
| `heading` | Required section heading. |
| `note` | Optional note displayed beside the heading. |
| `countOverride` | Optional value used instead of the derived role count. |
| `entries` | Ordered array containing at least one career entry. |
| `period` | Authored date range or period label. |
| `role` | Job title or role. |
| `company` | Company, client, or organization name. |
| `location` | Optional office, city, or remote-work label. |
| `paragraphs` | One or more descriptive paragraphs. |
| `links` | Optional array of labeled URLs. |

Entries appear in the same order as `content.json`; SiteKit does not parse or sort `period` values.

## Responsive and accessible behavior

On wide screens, entries alternate across the central timeline. Below 760px, every card moves into one left-aligned column with the timeline running along the left edge. Dark mode follows the global SiteKit theme without module-specific configuration.

The timeline itself is decorative. Entry content remains ordinary semantic articles, while optional resources are keyboard-accessible links that open in a new tab.

## Known limitations

- Dates and entries are not sorted automatically.
- Links are rendered as URLs and are not treated as module-relative assets.
- The module does not provide filtering, expandable entries, or downloadable résumé generation.
- Content changes require running SiteKit generation again.
