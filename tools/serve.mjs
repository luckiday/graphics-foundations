// Static file server for the demos (ES modules do not load from file://).
//
//     node tools/serve.mjs [port]                       then open http://localhost:8000/demos/
//     TINYGRAPHICS=../TinyGraphics.js node tools/serve.mjs
//
// Demos import TinyGraphics.js through an import map that points at its published copy on
// GitHub Pages.  With TINYGRAPHICS set to a local clone, the server rewrites that import map to
// serve the clone at /tinygraphics/ instead: useful offline, or to test library changes.
import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {extname, join, normalize, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const PUBLISHED_TINYGRAPHICS = 'https://intro-graphics.github.io/TinyGraphics.js/v2/';
const types = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.ico': 'image/x-icon',
    '.obj': 'text/plain', '.md': 'text/plain; charset=utf-8', '.json': 'application/json'
};

export function serve(port = 8000, {tinygraphics = process.env.TINYGRAPHICS} = {}) {
    const local = tinygraphics ? resolve(tinygraphics) : null;
    const server = createServer(async (req, res) => {
        const url_path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        let base = root, path = url_path;
        if (local && url_path.startsWith('/tinygraphics/')) {
            base = local;
            path = url_path.slice('/tinygraphics'.length);
        }
        let file = join(base, normalize(path).replace(/^(\.\.[/\\])+/, ''));
        try {
            if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
            let body = await readFile(file);
            if (local && file.endsWith('.html'))
                body = Buffer.from(body.toString('utf8').replaceAll(PUBLISHED_TINYGRAPHICS, '/tinygraphics/'));
            res.writeHead(200, {'content-type': types[extname(file)] || 'application/octet-stream'});
            res.end(body);
        } catch {
            res.writeHead(404);
            res.end('not found');
        }
    });
    return new Promise((resolve_, reject) => {
        server.once('error', reject);              // e.g. EADDRINUSE: say so instead of hanging
        server.listen(port, '127.0.0.1', () => resolve_(server));
    });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const port = Number(process.argv[2] || 8000);
    await serve(port);
    console.log(`serving ${root} at http://localhost:${port}/demos/` +
        (process.env.TINYGRAPHICS ? `\nTinyGraphics.js from ${resolve(process.env.TINYGRAPHICS)}` : ''));
}
