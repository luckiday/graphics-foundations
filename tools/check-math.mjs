// Recompute every worked number in notes/ and exercises/, and fail if the text disagrees.
//     node tools/check-math.mjs
// Each check computes a value from first principles (with demos/lib/gl.js for matrices) and
// asserts that the formatted result appears verbatim in the named markdown file.  If you edit a
// worked example, update the computation here too.
import {readFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mat4, vec3} from '../demos/lib/gl.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = {};
const read = f => (files[f] ??= readFileSync(join(root, f), 'utf8'));
let passed = 0, failed = 0;

const f4 = x => String(+x.toFixed(4));                      // 0.80180 → "0.8018", 2 → "2"
const apply = (m, p) => [0, 1, 2, 3].map(r => m[r] * p[0] + m[4 + r] * p[1] + m[8 + r] * p[2] + m[12 + r] * p[3]);
const ndc = q => q.slice(0, 3).map(x => x / q[3]);
const rows = m => mat4.toRows(m);
const inline = body => '$`' + body + '`$';            // GitHub inline math, as written in the notes

function expect(file, label, strings) {
    const text = read(file);
    const missing = [].concat(strings).filter(s => !text.includes(s));
    if (missing.length) {
        failed++;
        console.log(`FAIL  ${file} — ${label}\n      computed value(s) not found in the text: ${missing.map(s => JSON.stringify(s)).join(', ')}`);
    } else passed++;
}

function assert(label, cond) {
    if (cond) passed++;
    else {
        failed++;
        console.log(`FAIL  ${label}`);
    }
}

// ── chapter 2 ────────────────────────────────────────────────────────────────────────────────
{
    const deg = Math.acos(0.3) * 180 / Math.PI;
    expect('notes/02-points-vectors-coordinates.md', 'angle for u·v = 0.3', `${deg.toFixed(1)}°`);
    const n = vec3.cross([2, 0, 0], [0, 3, 0]);
    expect('notes/02-points-vectors-coordinates.md', 'triangle normal and area', [`(0, 0, ${n[2]})`, `\\tfrac12 \\cdot ${n[2]} = ${n[2] / 2}`]);
}

// ── chapter 3 ────────────────────────────────────────────────────────────────────────────────
{
    const gap16 = 1 - Math.cos(Math.PI / 16);
    expect('notes/03-modeling-shapes.md', 'circle gap N=16', `${gap16.toFixed(4)}`);
    const N = Math.ceil(Math.PI / Math.acos(0.999));
    expect('notes/03-modeling-shapes.md', 'N for 0.1% error', `N \\ge ${N}`);
    const uv = 32 * (16 - 2) * 2 + 2 * 32;
    expect('notes/03-modeling-shapes.md', 'UV sphere triangles', `${uv}`);
    const face = vec3.cross([0, 1, 0], [1, 0, 0]);
    assert('ch3 Q4: triangle is back-facing from +z', face[2] < 0);
}

// ── chapter 4 ────────────────────────────────────────────────────────────────────────────────
{
    const M = mat4.chain(mat4.translation(2, 1, 0), mat4.rotation(Math.PI / 2, [0, 0, 1]), mat4.scale(-1, 1, 1));
    const tip = apply(M, [0, 2, 0, 1]), arm = apply(M, [1, 2, 0, 1]), origin = apply(M, [0, 0, 0, 1]);
    assert('ch4 F example: origin at (2,1)', Math.abs(origin[0] - 2) < 1e-9 && Math.abs(origin[1] - 1) < 1e-9);
    assert('ch4 F example: stem tip at (0,1)', Math.abs(tip[0]) < 1e-9 && Math.abs(tip[1] - 1) < 1e-9);
    assert('ch4 F example: arm tip at (0,0)', Math.abs(arm[0]) < 1e-9 && Math.abs(arm[1]) < 1e-9);
    expect('notes/04-transformations.md', 'F example matrix', `M = \\begin{bmatrix} 0&-1&0&2 \\\\ -1&0&0&1`);
    const Ry = apply(mat4.rotation(Math.PI / 2, [0, 1, 0]), [1, 0, 0, 1]);
    assert('ch4 Q1: Ry(90) sends x to −z', Math.abs(Ry[2] + 1) < 1e-9);
    const n = vec3.normalize([1, 1, 0]), p = [1, 2, 3], d = vec3.dot(p, n);
    const refl = p.map((x, i) => x - 2 * d * n[i]);
    expect('notes/04-transformations.md', 'reflection across x+y=0', `(${refl.map(f4).join(', ')})`);
    const TS = apply(mat4.mul(mat4.translation(3, 0, 0), mat4.scale(2, 2, 1)), [1, 1, 0, 1]);
    const ST = apply(mat4.mul(mat4.scale(2, 2, 1), mat4.translation(3, 0, 0)), [1, 1, 0, 1]);
    expect('notes/04-transformations.md', 'TS vs ST', [`(${TS[0]}, ${TS[1]})`, `(${ST[0]}, ${ST[1]})`]);
}

// ── chapter 5 ────────────────────────────────────────────────────────────────────────────────
{
    const V = mat4.lookAt([10, 0, 0], [0, 0, 0], [0, 1, 0]);
    const M = rows(V);                                            // view = inverse of the camera frame
    const p = apply(V, [0, 0, -1, 1]);
    expect('notes/05-change-of-basis.md', 'camera-space coordinates', `(${p.slice(0, 3).map(f4).join(', ')})`);
    const cam = mat4.toRows(mat4.lookAt([10, 0, 0], [0, 0, 0], [0, 1, 0]));
    assert('ch5 frame axes: i′ = (0,0,−1)', cam[0][0] === 0 && cam[0][2] === -1);
    const V3 = rows(mat4.lookAt([0, 5, 0], [0, 0, 0], [0, 0, -1]));
    expect('notes/05-change-of-basis.md', 'looking down: i′', `𝐢' = (0,0,-1) \\times (0,1,0) = (${V3[0].slice(0, 3).map(x => f4(x + 0)).join(', ')})`);
}

// ── chapter 6 and midterm practice ───────────────────────────────────────────────────────────
{
    const V = mat4.lookAt([-10, 0, 0], [0, 0, 0], [0, 1, 0]);
    const pc = apply(V, [1, 1, 1, 1]);
    expect('notes/06-viewing-and-projection.md', 'view of (1,1,1)', `(${pc.map(f4).join(', ')})`);
    const o = ndc(apply(mat4.orthographic(-10, 10, -10, 10, 1, 21), pc));
    expect('notes/06-viewing-and-projection.md', 'orthographic NDC', 'NDC ' + inline(`(${o.map(f4).join(', ')})`));
    const clip = apply(mat4.perspective(Math.PI / 2, 1, 1, 21), pc);
    expect('notes/06-viewing-and-projection.md', 'perspective clip', `(${clip.map(f4).join(', ')})`);
    expect('notes/06-viewing-and-projection.md', 'perspective NDC', `(${ndc(clip).map(x => x.toFixed(3)).join(', ')})`);
    const zn = ndc(apply(mat4.perspective(1, 1, 0.1, 100), [0, 0, -1, 1]))[2];
    expect('notes/06-viewing-and-projection.md', 'depth at z=-1', ['\\approx 0.80', f4(zn)]);
    expect('exercises/midterm-practice.md', 'depth at z=-1', f4(zn));
    const frac = (zn + 1) / 2;
    assert(`ch6: "about 90%" of depth range (computed ${(100 * frac).toFixed(1)}%)`, Math.abs(frac - 0.9) < 0.01);
    const near = ndc(apply(mat4.perspective(0.7, 1.3, 2, 50), [0.3, -0.2, -2, 1]))[2];
    assert('ch6 Q4: near plane maps to −1', Math.abs(near + 1) < 1e-6);

    // midterm 8
    const V2 = mat4.lookAt([0, 10, 10], [0, 0, 0], [0, 1, 0]);
    expect('exercises/midterm-practice.md', 'view matrix row 3', `0&0.7071&0.7071&${f4(rows(V2)[2][3])}`);
    const q = apply(V2, [0, 1, 0, 1]);
    expect('exercises/midterm-practice.md', 'camera coordinates', `(0, 0.7071, ${f4(q[2])})`);
    const c2 = apply(mat4.perspective(Math.PI / 3, 1, 1, 100), q);
    expect('exercises/midterm-practice.md', 'clip', `(${c2.map(f4).join(', ')})`);
    expect('exercises/midterm-practice.md', 'ndc', `(${ndc(c2).map(f4).join(', ')})`);
    // midterm 3, 4, 5, 6, 7
    expect('exercises/midterm-practice.md', 'barycentric', '(0.25, 0.5, 0.25)');
    expect('exercises/midterm-practice.md', '4K ratio', `${(4096 * 2160 / (1920 * 1080)).toFixed(2)}×`);
    const M5 = mat4.chain(mat4.scale(-1, 1, 1), mat4.rotation(Math.PI / 2, [0, 0, 1]), mat4.translation(2, 1, 0));
    const r5 = rows(M5).map(r => r.map(x => Math.round(x * 1e6) / 1e6 + 0));
    expect('exercises/midterm-practice.md', 'F order matrix', `M = \\begin{bmatrix} ${r5[0].slice(0, 2).join('&')}&0&${r5[0][3]} \\\\ ${r5[1].slice(0, 2).join('&')}&0&${r5[1][3]}`);
    const tip5 = apply(M5, [0, 2, 0, 1]).map(x => Math.round(x * 1e6) / 1e6 + 0);
    expect('exercises/midterm-practice.md', 'F stem tip', `(${tip5[0]}, ${tip5[1]})`);
    const n6 = vec3.normalize([1, -1, 0]), p6 = [1, 2, 3], d6 = vec3.dot(p6, n6);
    expect('exercises/midterm-practice.md', 'reflection x=y', `(${p6.map((x, i) => f4(x - 2 * d6 * n6[i])).join(', ')})`);
    const F7 = mat4.mul(mat4.translation(1, 2, 0), mat4.rotation(Math.PI / 2, [0, 0, 1]));
    const inv7 = mat4.mul(mat4.rotation(-Math.PI / 2, [0, 0, 1]), mat4.translation(-1, -2, 0));
    const p7 = apply(inv7, [1, 3, 0, 1]).map(x => Math.round(x * 1e9) / 1e9 + 0);
    assert('midterm 7: (1,0,0) in the frame', p7[0] === 1 && p7[1] === 0 && p7[2] === 0);
    const back7 = apply(F7, [1, 0, 0, 1]);
    assert('midterm 7: frame maps (1,0,0) back to world (1,3,0)', Math.abs(back7[0] - 1) < 1e-9 && Math.abs(back7[1] - 3) < 1e-9);
}

// ── chapter 7 and final 1, 3 ─────────────────────────────────────────────────────────────────
{
    const phong = (n, l, v, ka, kd, ks, a) => {
        const nl = vec3.dot(n, l), r = n.map((x, i) => 2 * nl * x - l[i]);
        return ka + kd * Math.max(nl, 0) + ks * Math.max(vec3.dot(r, v), 0) ** a;
    };
    const blinn = (n, l, v, ka, kd, ks, a) => {
        const h = vec3.normalize(l.map((x, i) => x + v[i]));
        return ka + kd * Math.max(vec3.dot(n, l), 0) + ks * Math.max(vec3.dot(n, h), 0) ** a;
    };
    const l7 = vec3.normalize([0, 3, 4]), v7 = vec3.normalize([0, -3, 4]);
    expect('notes/07-lighting-and-shading.md', 'phong example', `= ${f4(phong([0, 0, 1], l7, v7, .1, .6, .3, 10))}`);
    assert('ch7: Blinn equals Phong at the mirror direction', Math.abs(blinn([0, 0, 1], l7, v7, .1, .6, .3, 10) - 0.88) < 1e-9);
    const newell = pts => pts.reduce((n, p, i) => {
        const q = pts[(i + 1) % pts.length];
        return [n[0] + (p[1] - q[1]) * (p[2] + q[2]), n[1] + (p[2] - q[2]) * (p[0] + q[0]), n[2] + (p[0] - q[0]) * (p[1] + q[1])];
    }, [0, 0, 0]);
    const nw = newell([[0, 0, 0], [1, 0, 0], [0, 1, 0]]);
    assert('ch7: Newell normal of the unit triangle is (0,0,1)', nw[0] === 0 && nw[1] === 0 && nw[2] === 1);

    const l1 = [.6, .8, 0], v1 = [0, 1, 0];
    expect('exercises/final-practice.md', 'phong', `= ${f4(phong([0, 1, 0], l1, v1, .2, .5, .5, 4))}`);
    expect('exercises/final-practice.md', 'blinn', `= ${f4(blinn([0, 1, 0], l1, v1, .2, .5, .5, 4))}`);
    const h1 = vec3.normalize([.6, 1.8, 0]);
    expect('exercises/final-practice.md', 'half vector', `(${h1.map(f4).join(', ')})`);
    const g = vec3.normalize([.5, 1, 0]);
    expect('exercises/final-practice.md', 'normal matrix', `(${g.map(f4).join(', ')})`);
    assert('final 3: transformed normal ⟂ transformed tangent', Math.abs(vec3.dot([.5, 1, 0], [2, -1, 0])) < 1e-12);
}

// ── chapter 8 and final 4, 5 ─────────────────────────────────────────────────────────────────
{
    const persp_u = (u0, w0, u1, w1, s) => ((1 - s) * u0 / w0 + s * u1 / w1) / ((1 - s) / w0 + s / w1);
    expect('notes/08-texture-mapping.md', 'perspective-correct u', `= ${persp_u(0, 1, 1, 3, .5)}`);
    expect('exercises/final-practice.md', 'perspective-correct u', `= ${f4(persp_u(0, 2, 1, 4, .5))}`);
    assert('ch8: 1024 texels over 64 px is mip level 4', Math.log2(1024 / 64) === 4);
    expect('exercises/final-practice.md', 'mip level', `= ${f4(Math.log2(4096 / 100))}`);
}

// ── chapter 9 and final 6 ────────────────────────────────────────────────────────────────────
{
    assert('ch9 Q1: spheres separated', 3 * 3 + 3 * 3 > 4 * 4);
    const v = [2, -5, 0], n = [0, 1, 0], e = .8, vn = vec3.dot(v, n);
    const out = v.map((x, i) => x - (1 + e) * vn * n[i]);
    expect('notes/09-collision-detection.md', 'bounce', `(${out.map(x => f4(x)).join(', ')})`);
    const c = [3, 3, 3], q = c.map(x => Math.min(Math.max(x, 0), 2));
    const d2 = c.reduce((s, x, i) => s + (x - q[i]) ** 2, 0);
    assert('final 6: sphere and box intersect', d2 === 3 && d2 < 4);
    expect('notes/09-collision-detection.md', 'tunneling step', `= ${30 / 60}` + '`$ m');
}

// ── chapter 10 and final 7, 11, 13 ───────────────────────────────────────────────────────────
{
    const over = layers => layers.reduce(([C, A], [c, a]) => [C.map((x, i) => x + (1 - A) * c[i]), A + (1 - A) * a], [[0, 0, 0], 0]);
    const [C2, A2] = over([[[.1, .1, 0], .2], [[.1, 0, .1], .4]]);
    expect('notes/10-shadows-mirrors-blending.md', 'two particles', `(${C2.map(x => x.toFixed(2)).join(', ')}, ${A2.toFixed(2)})`);
    const [C3, A3] = over([[[.2, 0, 0], .5], [[0, .3, 0], .3], [[0, 0, .4], .8]]);
    expect('exercises/final-practice.md', 'three layers', `(${C3.map(f4).join(', ')}, ${f4(A3)})`);
    const spot = P => vec3.dot(vec3.normalize([P[0], P[1] - 4, P[2]]), [0, -1, 0]);
    expect('exercises/final-practice.md', 'spot lit', f4(spot([1, 0, 0])));
    assert('final 11: (1,0,0) lit, (3,0,0) dark', spot([1, 0, 0]) >= Math.cos(Math.PI / 6) && spot([3, 0, 0]) < Math.cos(Math.PI / 6));
}

// ── chapter 11 and final 8, 9, 10, 12 ────────────────────────────────────────────────────────
{
    const tri = (o, d, A, B, C) => {                               // plane, t, barycentrics (Cramer on a 3×3)
        const nrm = vec3.cross(vec3.sub(B, A), vec3.sub(C, A));
        const t = vec3.dot(vec3.sub(A, o), nrm) / vec3.dot(d, nrm);
        const p = o.map((x, i) => x + t * d[i]);
        const area = (P, Q, R) => vec3.dot(vec3.cross(vec3.sub(Q, P), vec3.sub(R, P)), nrm);
        const total = area(A, B, C);
        return {t, p, bary: [area(p, B, C) / total, area(A, p, C) / total, area(A, B, p) / total]};
    };
    const h11 = tri([0, 0, 0], [1, 1, 1], [0, 4, 0], [8, 0, 0], [0, 0, 8]);
    assert('ch11 worked example: t = 2, p = (2,2,2), bary (.5,.25,.25)', Math.abs(h11.t - 2) < 1e-12 && h11.bary.every((b, i) => Math.abs(b - [.5, .25, .25][i]) < 1e-12));
    expect('notes/11-ray-tracing.md', 'worked example', [inline('t = 2'), '(2, 2, 2)', '\\alpha = 0.5', '\\beta = 0.25', '\\gamma = 0.25']);
    const h9 = tri([0, 0, 0], [1, 2, 2], [6, 0, 0], [0, 6, 0], [0, 0, 6]);
    expect('exercises/final-practice.md', 'ray-triangle', [`t = ${f4(h9.t)}`, `(${h9.p.map(f4).join(', ')})`, `= ${f4(h9.bary[0])}` + '`$', `= ${f4(h9.bary[1])}` + '`$']);

    const color = [0, 1, 2].map(i => [0, .1, .1][i] + .4 * [.1, .1, .1][i] + .1 * [.2, 0, .1][i]);
    const colorText = `(${color.map(x => x.toFixed(2)).join(', ')})`;
    expect('notes/11-ray-tracing.md', 'ray tree color', colorText);
    expect('exercises/final-practice.md', 'ray tree color', colorText);
    expect('notes/11-ray-tracing.md', 'ray count m=2 n=3', `= ${3 * (2 ** 3 - 1)}` + '`$ rays');
    expect('exercises/final-practice.md', 'ray count m=3 n=4', `= ${4 * (2 ** 4 - 1)}` + '`$ rays');

    const sphere = (o, d, c, R) => {
        const m = vec3.sub(o, c), b = vec3.dot(m, d), cc = vec3.dot(m, m) - R * R, s = Math.sqrt(b * b - cc);
        return [-b - s, -b + s];
    };
    const [a1, a2] = sphere([0, 0, 5], [0, 0, -1], [0, 0, 0], 1);
    assert('ch11 Q2: t = 4 and 6', a1 === 4 && a2 === 6);
    const [t1, t2] = sphere([1, -5, 0], [0, 1, 0], [0, 0, 0], 2);
    expect('exercises/final-practice.md', 'ray-sphere', [`t = ${f4(t1)}`, `t = ${f4(t2)}`, `(1, ${f4(-5 + t1)}, 0)`, `(0.5, ${f4((-5 + t1) / 2)}, 0)`]);

    const s = 1.5 * Math.sin(Math.PI / 3);
    assert('ch11 Q5: glass→air at 60° is total internal reflection', s > 1);
    const st = Math.sin(Math.PI / 4) / 1.33;
    expect('exercises/final-practice.md', 'snell', [f4(st), `${f4(Math.asin(st) * 180 / Math.PI)}°`]);
}

// ── additions: chapters 2, 5, 6, 7, 11, 12 and the new practice problems ────────────────────
{
    const sub = (a, b) => a.map((x, i) => x - b[i]);
    const area2 = (A, B, C) => ((B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0])) / 2;
    const P = [0, 0], Q = [4, 0], R = [0, 4];
    const bary = X => [area2(X, Q, R), area2(P, X, R)].map(a => a / area2(P, Q, R));
    const [a1, b1] = bary([1, 1]), [a3, b3] = bary([3, 3]);
    assert('ch2 example: (1/2, 1/4, 1/4)', a1 === 0.5 && b1 === 0.25);
    expect('notes/02-points-vectors-coordinates.md', 'barycentric of (3,3)',
        [`\\mathrm{area}(X,Q,R) = ${area2([3, 3], Q, R)}`, `\\mathrm{area}(P,X,R) = ${area2(P, [3, 3], R)}`]);
    assert('ch2 Q3: (-1/2, 3/4, 3/4)', a3 === -0.5 && b3 === 0.75);

    const model = mat4.mul(mat4.translation(2, 0, 0), mat4.rotation(Math.PI / 2, [0, 0, 1]));
    const w = apply(model, [1, 0, 0, 1]);
    expect('notes/05-change-of-basis.md', 'ch5 Q5 world', `(${w.slice(0, 3).map(x => f4(x + 0)).join(', ')})`);

    const zndc = (n, f, z) => (f + n) / (f - n) + 2 * f * n / ((f - n) * z);
    expect('notes/06-viewing-and-projection.md', 'ch6 Q5', [f4(zndc(0.1, 1000, -1)), f4(zndc(1, 100, -10))]);

    const l = [0, 0.6, 0.8], h = vec3.normalize([0, 0.6, 1.8]), rv = 0.8, nh = h[2];
    const I = s => 0.1 + 0.6 * 0.8 + 0.3 * s;
    expect('notes/07-lighting-and-shading.md', 'ch7 Q1 moved viewer',
        [I(rv ** 10).toFixed(3), I(nh ** 10).toFixed(3), I(nh ** 40).toFixed(3), f4(nh)]);

    const A = [0, 4, 0], B = [8, 0, 0], C = [0, 0, 8], p = [2, 2, 2], N = vec3.cross(sub(B, A), sub(C, A));
    const nn = vec3.dot(N, N), edge = (U, V) => vec3.dot(vec3.cross(sub(V, U), sub(p, U)), N) / nn;
    expect('notes/11-ray-tracing.md', 'triangle normal', `(${N.join(', ')})`);
    assert('ch11 formula barycentrics (0.5, 0.25, 0.25)', edge(B, C) === 0.5 && edge(C, A) === 0.25 && edge(A, B) === 0.25);
    const deg = x => (x * 180 / Math.PI).toFixed(1);
    expect('notes/11-ray-tracing.md', 'refraction orientation',
        [`${deg(Math.asin(1.5 * 0.5))}°`, `${deg(Math.asin(0.5 / 1.5))}°`, `${deg(Math.asin(1 / 1.5))}°`]);

    // chapter 12: picking, done with a Gauss–Jordan inverse of P·V
    const inv = m => {
        const a = mat4.toRows(m).map((row, i) => [...row, ...[0, 1, 2, 3].map(j => +(i === j))]);
        for (let c = 0; c < 4; c++) {
            const piv = a.slice(c).reduce((best, row, k) => Math.abs(row[c]) > Math.abs(a[best][c]) ? c + k : best, c);
            [a[c], a[piv]] = [a[piv], a[c]];
            const d = a[c][c]; a[c] = a[c].map(x => x / d);
            for (let r = 0; r < 4; r++) if (r !== c) { const k = a[r][c]; a[r] = a[r].map((x, j) => x - k * a[c][j]); }
        }
        return mat4.fromRows(a.map(row => row.slice(4)));
    };
    const PV = inv(mat4.mul(mat4.perspective(Math.PI / 2, 1, 1, 11), mat4.lookAt([0, 0, 5], [0, 0, 0], [0, 1, 0])));
    const near = apply(PV, [0.5, 0.5, -1, 1]), far = apply(PV, [0.5, 0.5, 1, 1]);
    expect('notes/12-building-a-graphics-project.md', 'picking', [
        `(${near.map(f4).join(', ')})`, `(${far.map(f4).join(', ')})`, `(${ndc(far).map(f4).join(', ')})`,
        `(${sub(ndc(far), ndc(near)).map(f4).join(', ')})`, `(${sub(far.slice(0, 3), ndc(near)).map(f4).join(', ')})`,
        `(${[2 * 600 / 1600 - 1, 1 - 2 * 200 / 1600].join(', ')})`]);
    const k = -60 * Math.log(0.9);
    expect('notes/12-building-a-graphics-project.md', 'smoothing', [`0.9^{15} \\approx ${(0.9 ** 15).toFixed(3)}`,
        `0.9^{36} \\approx ${(0.9 ** 36).toFixed(4)}`, `k = ${k.toFixed(2)}`, `\\approx ${Math.exp(-6.32 * 0.25).toFixed(3)}`]);

    const tri = vec3.cross([0, 2, 0], [2, 0, 0]);
    expect('exercises/midterm-practice.md', 'winding', [`(${tri.join(', ')})`, `= ${vec3.dot([0, 0, 5], tri)}`]);
    const T = (x, y) => mat4.translation(x, y, 0), Rz = t => mat4.rotation(t, [0, 0, 1]);
    const upper = mat4.chain(T(1, 1.5), Rz(Math.PI / 2), T(1, 0)), fore = mat4.chain(upper, T(1, 0), Rz(-Math.PI / 2), T(1, 0));
    const at = (m, x) => `(${apply(m, [x, 0, 0, 1]).slice(0, 2).map(v => f4(v + 0)).join(', ')})`;
    expect('exercises/midterm-practice.md', 'two-joint arm',
        [at(upper, 0), at(mat4.mul(upper, T(1, 0)), 0), at(fore, 0), at(fore, 1)]);

    const d = vec3.normalize([(2 * 5.5 / 8 - 1) * 2, 1 - 2 * 1.5 / 4, -1]);
    const m = [-1.5, -0.5, 2], bb = vec3.dot(m, d), cc = vec3.dot(m, m) - 0.25, t1 = -bb - Math.sqrt(bb * bb - cc);
    expect('exercises/final-practice.md', 'primary ray', [`(${d.map(f4).join(', ')})`, f4(bb), f4(t1),
        `(${d.map(x => f4(x * t1)).join(', ')})`]);
}

console.log(`\n${passed} checks passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
