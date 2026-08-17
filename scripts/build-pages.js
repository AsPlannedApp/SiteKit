import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outputDir = path.join(root, 'dist');
const indexPath = path.join(root, 'index.html');
const assetsPath = path.join(root, 'assets');

if (!existsSync(indexPath)) {
    throw new Error('Missing generated index.html. Run "npm run generate" first.');
}
if (!existsSync(assetsPath)) {
    throw new Error('Missing generated assets/. Run "npm run generate" first.');
}

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });
cpSync(indexPath, path.join(outputDir, 'index.html'));
cpSync(assetsPath, path.join(outputDir, 'assets'), { recursive: true });

console.log(`Prepared GitHub Pages site in ${outputDir}`);
