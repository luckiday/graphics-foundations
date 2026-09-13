// Check every Markdown file:
//   - relative links and images resolve to files in the repository (and #anchors to headings);
//   - images are only our own figures/ (no hot-linked or third-party pictures);
//   - no course logistics leaked in (due dates, rooms, Piazza/CCLE, personal email).
//     node tools/check-links.mjs
import {readFileSync, existsSync, readdirSync, statSync} from 'node:fs';
import {join, dirname, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const skip = new Set(['node_modules', '.git', 'tools']);
const markdown = [];
(function walk(dir) {
    for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (skip.has(name)) continue;
        if (statSync(path).isDirectory()) walk(path);
        else if (name.endsWith('.md')) markdown.push(path);
    }
})(root);

const slug = heading => heading.toLowerCase().trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-');
const LOGISTICS = /\b(piazza|ccle|gradescope|classroom\.github|office hours|DODD|BOELTER|Eng-VI|guoyunqi@|due (date|sunday|monday|tuesday|wednesday|thursday|friday|saturday|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))/i;

let failures = 0, links = 0;
const fail = (file, msg) => {
    failures++;
    console.log(`FAIL  ${relative(root, file)}: ${msg}`);
};

for (const file of markdown) {
    const text = readFileSync(file, 'utf8');
    const prose = text.replace(/```[\s\S]*?```/g, '');           // ignore code blocks
    prose.split('\n').forEach((line, i) => {
        const m = line.match(LOGISTICS);
        if (m) fail(file, `line ${i + 1} looks like course logistics: "${m[0]}"`);
    });
    for (const [, bang, target] of prose.matchAll(/(!?)\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
        links++;
        if (/^(https?:|mailto:)/.test(target)) {
            if (bang) fail(file, `external image ${target}: use an original figure in figures/ instead`);
            continue;
        }
        const [path, anchor] = target.split('#');
        const abs = path ? resolve(dirname(file), decodeURI(path)) : file;
        if (!existsSync(abs)) {
            fail(file, `broken link ${target}`);
            continue;
        }
        if (bang && !relative(root, abs).startsWith('figures/')) fail(file, `image outside figures/: ${target}`);
        if (anchor && abs.endsWith('.md')) {
            const headings = readFileSync(abs, 'utf8').match(/^#{1,6} .*/gm) || [];
            if (!headings.map(h => slug(h.replace(/^#+ /, ''))).includes(anchor)) fail(file, `missing anchor #${anchor} in ${path || 'this file'}`);
        }
    }
    for (const [, src] of prose.matchAll(/<img[^>]*src="([^"]+)"/g))
        fail(file, `raw <img src="${src}">: use Markdown images of files in figures/`);
}

// Every figure should be used somewhere; an unused figure is either dead or a missing reference.
const used = markdown.map(f => readFileSync(f, 'utf8')).join('\n');
for (const fig of readdirSync(join(root, 'figures')))
    if (!used.includes(`figures/${fig}`)) fail(join(root, 'figures', fig), 'figure is not referenced by any Markdown file');

console.log(`\n${markdown.length} files, ${links} links checked, ${failures} problem(s)`);
process.exit(failures ? 1 : 0);
