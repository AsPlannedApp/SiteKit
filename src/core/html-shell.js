import { escapeHtml } from './html-util.js';

export const GENERATED_MARKER_PREFIX = '<!-- generated-by:sitekit@';

/**
 * Assembles the final index.html document from render-pipeline's output.
 * Fixed chrome slots (header/hero/footer) go where the source site put
 * them; every module of kind "content-section" is wrapped in <main>, in
 * the order it was rendered.
 */
export function buildDocument({ config, version, themeCss, styleText, scriptText, rendered, headExtras = [] }) {
    const seo = config.seo || {};
    const title = seo.title || config.identity?.name || 'My Site';
    const description = seo.description || '';

    const byId = (id) => rendered.find((r) => r.id === id);
    const header = byId('header');
    const hero = byId('hero');
    const footer = byId('footer');
    const contentSections = rendered.filter((r) => r.kind === 'content-section');

    const mainHtml = contentSections.length
        ? `<main>\n${contentSections.map((s) => s.html).join('\n')}\n</main>`
        : '';

    const bodyParts = [header?.html, hero?.html, mainHtml, footer?.html].filter(Boolean);

    const allHeadExtras = rendered.flatMap((r) => r.headExtras || []).concat(headExtras);

    return `<!DOCTYPE html>
<html lang="${escapeHtml(seo.locale ? seo.locale.split('_')[0] : 'en')}">
<head>
${GENERATED_MARKER_PREFIX}${version} -- do not hand-edit; edit config/ and modules/*/content.json, then re-run "npm run generate" -->
    <title>${escapeHtml(title)}</title>

    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${description ? `<meta name="description" content="${escapeHtml(description)}">` : ''}
    ${seo.canonicalUrl ? `<link rel="canonical" href="${escapeHtml(seo.canonicalUrl)}">` : ''}
${allHeadExtras.join('\n')}

    <style>
${themeCss}

${styleText}
    </style>
</head>
<body>
${bodyParts.join('\n\n')}

<script>
${scriptText}
</script>
</body>
</html>
`;
}
