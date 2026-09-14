// Audit how github.com actually renders the notes' math. GitHub turns TeX into
// native MathML, and Chromium implements only MathML Core: anything outside it
// is laid out wrong without an error. Usage: node tools/audit-gh-math.mjs [ref] [outdir]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const ref = process.argv[2] || 'main';
const out = process.argv[3];
const chapters = ['notes', 'exercises'].flatMap(d =>
  fs.readdirSync(new URL(`../${d}`, import.meta.url)).filter(f => f.endsWith('.md')).sort().map(f => `${d}/${f}`));
const launch = { headless: true };
if (process.env.CHROME) launch.executablePath = process.env.CHROME;
const browser = await chromium.launch(launch);
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
let problems = 0;
for (const ch of chapters) {
  await page.goto(`https://github.com/luckiday/graphics-foundations/blob/${ref}/${ch}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.markdown-body', { timeout: 60000 });
  // Rendering is lazy and client-side: scroll through, then wait for it to settle.
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); } });
  await page.waitForFunction(() => [...document.querySelectorAll('.markdown-body math-renderer')].every(e => e.querySelector('math')), null, { timeout: 20000 }).catch(() => {});
  const r = await page.evaluate(() => {
    const NON_CORE = ['mlabeledtr', 'menclose', 'mfenced', 'maction', 'merror'];
    const els = [...document.querySelectorAll('.markdown-body math-renderer')];
    const bad = [];
    els.forEach((e, i) => {
      const why = new Set();
      for (const t of NON_CORE) if (e.querySelector(t)) why.add(t);
      if (!e.querySelector('math')) why.add('not-rendered');
      for (const v of e.querySelectorAll('[mathvariant]:not([mathvariant="normal"])')) why.add('mathvariant=' + v.getAttribute('mathvariant'));
      if (why.size) bad.push({ i, why: [...why], });
    });
    // Math delimiters left in prose mean the renderer never saw them.
    const body = document.querySelector('.markdown-body');
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    const stray = [];
    for (let n; (n = walker.nextNode());) {
      if (n.parentElement.closest('pre, code, math-renderer')) continue;
      if (/\$|\\[a-zA-Z]{2,}/.test(n.textContent)) stray.push(n.textContent.trim().slice(0, 80));
    }
    return { n: els.length, bad, stray };
  });
  const counts = {};
  for (const b of r.bad) for (const w of b.why) counts[w] = (counts[w] || 0) + 1;
  console.log(`${ch}: ${r.n} math, ${JSON.stringify(counts)}${r.stray.length ? ' stray: ' + JSON.stringify(r.stray) : ''}`);
  problems += r.bad.length + r.stray.length;
  if (out) {
    const loc = page.locator('.markdown-body math-renderer');
    for (const b of r.bad)
      await loc.nth(b.i).screenshot({ timeout: 5000, path: `${out}/${ch.replace(/\//g, '_').slice(0, -3)}-${b.i}.png` })
        .catch(() => console.log(`  (no screenshot of #${b.i})`));
  }
}
await browser.close();
console.log(problems ? `${problems} problem(s)` : 'ok');
process.exit(problems ? 1 : 0);
