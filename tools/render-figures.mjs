// Rasterize figures/*.svg with headless Chromium into tools/shots/figures/ for review.
// (ImageMagick's SVG renderer drops Greek glyphs and stroke colors; a browser is what readers use.)
import {chromium} from 'playwright-core';
import {readdir, mkdir} from 'node:fs/promises';
import {join, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'tools', 'shots', 'figures');
await mkdir(out, {recursive: true});
const browser = await chromium.launch({headless: true});
const page = await browser.newPage({deviceScaleFactor: 1.5});
for (const f of (await readdir(join(root, 'figures'))).filter(f => f.endsWith('.svg')).sort()) {
    await page.goto(pathToFileURL(join(root, 'figures', f)).href);
    await page.locator('svg').screenshot({path: join(out, f.replace('.svg', '.png'))});
}
await browser.close();
console.log('rendered to', out);
