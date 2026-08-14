import path from 'node:path';
import sharp from 'sharp';

const SIZES = [16, 32, 48];

export async function generateAssets({ moduleDir, outputDir }) {
    await Promise.all(SIZES.map((size) => sharp(path.join(moduleDir, 'assets', 'favicon-source.png'))
        .resize(size, size, { fit: 'cover' })
        .png({ compressionLevel: 9 })
        .toFile(path.join(outputDir, `favicon-${size}.png`))));
}

export function render({ ctx }) {
    const headExtras = SIZES.map((size) => `    <link rel="icon" type="image/png" sizes="${size}x${size}" href="${ctx.generatedAsset(`favicon-${size}.png`)}">`);
    return { html: '', headExtras };
}
