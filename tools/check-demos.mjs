// Open every demo in headless Chromium (real GPU WebGL 2), exercise every <select>
// option and checkbox, and fail on any console error, page error, or a blank canvas.
// Screenshots land in tools/shots/ (not committed) — look at them.
//
// Usage: node tools/check-demos.mjs            (uses Playwright's cached Chromium)
//        CHROME=/path/to/chrome node tools/check-demos.mjs
//        TINYGRAPHICS=../TinyGraphics.js node tools/check-demos.mjs   (test against a local library clone)
//        ONLY=03 node tools/check-demos.mjs                           (just the demos whose name contains 03)
// Without TINYGRAPHICS the demos load the library from its published GitHub Pages copy.
import { chromium } from 'playwright-core';
import { readdir, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const shots = join(here, 'shots');
await mkdir(shots, { recursive: true });

const port = 8765;
const server = await serve(port);
const demos = (await readdir(join(here, '..', 'demos'))).filter(f => /^\d\d-.*\.html$/.test(f))
    .filter(f => !process.env.ONLY || f.includes(process.env.ONLY)).sort();
console.log(process.env.TINYGRAPHICS ? `TinyGraphics.js from local clone ${process.env.TINYGRAPHICS}` : 'TinyGraphics.js from GitHub Pages');

const launch = { headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] };
if (process.env.CHROME) launch.executablePath = process.env.CHROME;
const browser = await chromium.launch(launch);
const page = await browser.newPage({ viewport: { width: 1200, height: 760 }, deviceScaleFactor: 1 });

let failures = 0;
const fail = (demo, msg) => { failures++; console.log(`  FAIL ${demo}: ${msg}`); };

// Count distinct colors in a screenshot of the canvas, decoded by the browser itself.
async function distinct_colors(png) {
  return page.evaluate(async b64 => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = new OffscreenCanvas(img.width, img.height);
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, img.width, img.height).data;
    const seen = new Set();
    for (let i = 0; i < d.length; i += 4 * 7) seen.add((d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | (d[i + 2] >> 3));
    return seen.size;
  }, png.toString('base64'));
}

for (const demo of demos) {
  const errors = [];
  const onConsole = m => { if (m.type() === 'error') errors.push(m.text()); };
  const onError = e => errors.push(String(e));
  page.on('console', onConsole);
  page.on('pageerror', onError);

  await page.goto(`http://127.0.0.1:${port}/demos/${demo}`);
  await page.waitForTimeout(600);
  const canvas = page.locator('canvas').first();
  const name = demo.replace('.html', '');
  const shot = async (suffix = '') => {
    const png = await canvas.screenshot({ path: join(shots, `${name}${suffix}.png`) });
    const n = await distinct_colors(png);
    if (n < 6) fail(demo + suffix, `canvas looks blank (${n} distinct colors)`);
    return n;
  };
  const base = await shot();

  // Exercise every option of every select, then every checkbox, screenshotting each state.
  const selects = page.locator('select');
  for (let s = 0; s < await selects.count(); s++) {
    const sel = selects.nth(s);
    const key = await sel.getAttribute('data-key');
    const values = await sel.locator('option').evaluateAll(os => os.map(o => o.value));
    const initial = await sel.inputValue();
    for (const v of values) {
      await sel.selectOption(v);
      await page.waitForTimeout(250);
      await shot(`.${key}-${v.replace(/\W+/g, '_')}`);
    }
    await sel.selectOption(initial);
  }
  // TinyGraphics control panels: press every button, drag every slider to both ends.
  const buttons = page.locator('.tg-panel button');
  for (let b = 0; b < await buttons.count(); b++) {
    const button = buttons.nth(b);
    const label = (await button.locator('span').last().textContent()).replace(/\W+/g, '_').slice(0, 30);
    await button.dispatchEvent('pointerdown');
    await button.dispatchEvent('pointerup');
    await page.waitForTimeout(250);
    await shot(`.button-${label}`);
  }
  const sliders = page.locator('.tg-panel input[type=range]');
  for (let i = 0; i < await sliders.count(); i++) {
    const slider = sliders.nth(i);
    for (const end of ['min', 'max']) {
      await slider.evaluate((el, end) => { el.value = el[end]; el.dispatchEvent(new Event('input')); }, end);
      await page.waitForTimeout(120);
    }
    await slider.evaluate(el => { el.value = el.defaultValue; el.dispatchEvent(new Event('input')); });
  }
  await page.waitForTimeout(250);
  await shot('.after-sliders');
  const overlay = await page.locator('.tg-error').allTextContents();
  for (const text of overlay) fail(demo, 'TinyGraphics error overlay: ' + text.split('\n').slice(0, 5).join(' | '));

  const boxes = page.locator('input[type=checkbox]');
  for (let b = 0; b < await boxes.count(); b++) {
    const box = boxes.nth(b);
    const key = await box.getAttribute('data-key');
    await box.click();
    await page.waitForTimeout(250);
    await shot(`.${key}-toggled`);
    await box.click();
  }

  for (const e of errors) fail(demo, e.split('\n').slice(0, 4).join(' | '));
  if (!errors.length) console.log(`  ok   ${demo} (${base} colors)`);
  page.off('console', onConsole);
  page.off('pageerror', onError);
}

// The index page must link every demo.
await page.goto(`http://127.0.0.1:${port}/demos/`);
const links = await page.locator('a').evaluateAll(as => as.map(a => a.getAttribute('href')));
for (const d of demos) if (!links.includes(d)) fail('index.html', `does not link ${d}`);

await browser.close();
server.close();
console.log(failures ? `\n${failures} demo check(s) failed` : `\nall ${demos.length} demos passed; screenshots in tools/shots/`);
process.exit(failures ? 1 : 0);
