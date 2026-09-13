#!/usr/bin/env python3
"""Generate every figure in figures/ as SVG.

All figures are original drawings, generated here so they share one visual style and can be
edited as code.  Run:  python3 tools/figures.py   (no dependencies)
"""
import math
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "figures"

INK, MUTED, FAINT = "#222222", "#6b6b70", "#d8d8d2"
BLUE, RED, GREEN, ORANGE, PURPLE = "#2f6fdd", "#d9503f", "#2e9a4f", "#e08a1e", "#8a4fc7"
FILL_BLUE, FILL_RED, FILL_GREY, FILL_GREEN, FILL_ORANGE = "#e3ecfb", "#fbe7e3", "#f3f3f0", "#e2f3e7", "#fcefdc"


class Svg:
    def __init__(self, w, h):
        self.w, self.h, self.parts = w, h, []

    def add(self, s):
        self.parts.append(s)
        return self

    def line(self, x1, y1, x2, y2, color=INK, width=1.6, arrow=False, dash=None, both=False):
        m = f' marker-end="url(#m{color[1:]})"' if arrow else ""
        if both:
            m += f' marker-start="url(#m{color[1:]})"'
        d = f' stroke-dasharray="{dash}"' if dash else ""
        return self.add(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{color}" stroke-width="{width}"{m}{d}/>')

    def path(self, d, color=INK, width=1.6, fill="none", arrow=False, dash=None, opacity=1):
        m = f' marker-end="url(#m{color[1:]})"' if arrow else ""
        ds = f' stroke-dasharray="{dash}"' if dash else ""
        op = f' opacity="{opacity}"' if opacity != 1 else ""
        return self.add(f'<path d="{d}" stroke="{color}" stroke-width="{width}" fill="{fill}"{m}{ds}{op}/>')

    def poly(self, pts, color=INK, width=1.6, fill="none", dash=None, opacity=1):
        d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + " Z"
        return self.path(d, color, width, fill, dash=dash, opacity=opacity)

    def rect(self, x, y, w, h, color=INK, fill="none", width=1.5, rx=6, dash=None):
        ds = f' stroke-dasharray="{dash}"' if dash else ""
        return self.add(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" stroke="{color}" fill="{fill}" stroke-width="{width}"{ds}/>')

    def circle(self, x, y, r, color=INK, fill="none", width=1.6):
        return self.add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" stroke="{color}" fill="{fill}" stroke-width="{width}"/>')

    def dot(self, x, y, color=INK, r=3.5):
        return self.circle(x, y, r, color, color, 1)

    def text(self, x, y, s, color=INK, size=14, anchor="middle", italic=False, bold=False, family=None):
        style = (' font-style="italic"' if italic else "") + (' font-weight="600"' if bold else "")
        fam = f' font-family="{family}"' if family else ""
        s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        # "C_{1}" → C with a subscript 1
        import re
        s = re.sub(r"_\{([^}]*)\}", lambda m: f'<tspan font-size="{size * .72:.1f}" dy="{size * .28:.1f}">{m.group(1)}</tspan><tspan dy="{-size * .28:.1f}">\u200b</tspan>', s)
        return self.add(f'<text x="{x:.1f}" y="{y:.1f}" fill="{color}" font-size="{size}" text-anchor="{anchor}"{style}{fam}>{s}</text>')

    def math(self, x, y, s, color=INK, size=15, anchor="middle"):
        return self.text(x, y, s, color, size, anchor, italic=True, family="Georgia, 'Times New Roman', serif")

    def save(self, name, title):
        colors = [INK, MUTED, BLUE, RED, GREEN, ORANGE, PURPLE]
        markers = "".join(
            f'<marker id="m{c[1:]}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
            f'<path d="M0,0 L10,5 L0,10 z" fill="{c}"/></marker>' for c in colors)
        body = "\n".join(self.parts)
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}" width="{self.w}" height="{self.h}" '
               f'font-family="Helvetica, Arial, sans-serif" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="{title}">\n'
               f'<title>{title}</title><defs>{markers}</defs>\n'
               f'<rect width="{self.w}" height="{self.h}" fill="#ffffff"/>\n{body}\n</svg>\n')
        (OUT / name).write_text(svg)


def box(s, x, y, w, h, title, sub=None, fill=FILL_GREY, color=INK, sub_color=MUTED):
    s.rect(x, y, w, h, color, fill)
    if sub:
        s.text(x + w / 2, y + h / 2 - 3, title)
        s.text(x + w / 2, y + h / 2 + 14, sub, sub_color, 12)
    else:
        s.text(x + w / 2, y + h / 2 + 5, title)


# ─────────────────────────────────────────────────────────────────────────────── 01 pipeline
def pipeline():
    s = Svg(900, 200)
    xs = [10, 185, 365, 545, 720]
    labels = [("vertex data", "buffers", FILL_GREY, INK, MUTED), ("vertex shader", "once per vertex", FILL_BLUE, BLUE, BLUE),
              ("primitive assembly", "+ clipping", FILL_GREY, INK, MUTED), ("rasterizer", "interpolates", FILL_GREY, INK, MUTED),
              ("fragment shader", "once per pixel", FILL_RED, RED, RED)]
    for x, (t, sub, fill, col, subcol) in zip(xs, labels):
        box(s, x, 60, 150, 58, t, sub, fill, col, subcol)
    for a, b in zip(xs, xs[1:]):
        s.line(a + 150, 89, b - 4, 89, arrow=True)
    s.line(870, 89, 894, 89, arrow=True)
    s.text(882, 140, "image", MUTED, 12)
    s.text(260, 42, "programmable", BLUE, 12)
    s.text(795, 42, "programmable", RED, 12)
    s.text(530, 42, "fixed stages", MUTED, 12)
    s.text(260, 146, "writes gl_Position", MUTED, 12)
    s.text(260, 162, "(clip coordinates)", MUTED, 12)
    s.text(620, 146, "divides by w, maps to pixels,", MUTED, 12)
    s.text(620, 162, "finds covered pixels", MUTED, 12)
    s.text(795, 146, "writes a color;", MUTED, 12)
    s.text(795, 162, "then depth test, blending", MUTED, 12)
    s.save("pipeline.svg", "The WebGL rendering pipeline")


def coordinate_spaces():
    s = Svg(940, 170)
    xs = [10, 200, 390, 580, 790]
    names = [("object space", "shape's own"), ("world space", "the scene"), ("camera space", "eye at origin, looks −z"),
             ("clip space", "homogeneous"), ("NDC → pixels", "÷ w, viewport")]
    for x, (a, b) in zip(xs, names):
        box(s, x, 50, 140, 56, a, b)
    mats = ["M  model", "V  view", "P  projection", "GPU"]
    for (a, b), m in zip(zip(xs, xs[1:]), mats):
        s.line(a + 140, 78, b - 4, 78, BLUE, 1.8, arrow=True)
        s.text((a + 140 + b) / 2, 40, m, BLUE, 13)
    s.math(470, 150, "gl_Position = P · V · M · p", INK, 16)
    s.save("coordinate-spaces.svg", "Coordinate spaces from object to screen")


def fragcoord():
    s = Svg(460, 300)
    x0, y0, c = 70, 250, 56
    for i in range(6):
        s.line(x0 + i * c, y0, x0 + i * c, y0 - 4 * c, FAINT, 1)
    for j in range(5):
        s.line(x0, y0 - j * c, x0 + 5 * c, y0 - j * c, FAINT, 1)
    s.rect(x0, y0 - 4 * c, 5 * c, 4 * c, INK, "none", 1.4, 0)
    for i in range(5):
        for j in range(4):
            s.dot(x0 + (i + .5) * c, y0 - (j + .5) * c, RED, 4)
    s.text(x0 + .5 * c, y0 + 22, "(0.5, 0.5)", RED, 12)
    s.text(x0 + 4.5 * c + 8, y0 - 4 * c - 10, "(4.5, 3.5)", RED, 12)
    s.text(x0 + 2.5 * c, y0 + 42, "a 5 × 4 pixel framebuffer: gl_FragCoord.xy is the pixel center", MUTED, 12)
    s.line(x0 - 30, y0, x0 - 30, y0 - 60, INK, 1.4, arrow=True)
    s.math(x0 - 30, y0 - 68, "y")
    s.text(x0 + 5 * c + 6, y0 + 4, "origin at the", MUTED, 11, "start")
    s.text(x0 + 5 * c + 6, y0 + 18, "bottom-left", MUTED, 11, "start")
    s.save("fragcoord.svg", "gl_FragCoord samples pixel centers")


# ─────────────────────────────────────────────────────────────────────────────── 02 geometry
def barycentric():
    s = Svg(460, 330)
    P, Q, R = (60, 280), (400, 250), (200, 40)
    s.poly([P, Q, R], INK, 1.8, FILL_BLUE)
    a, b, c = .2, .3, .5          # weights of P, Q, R
    X = (a * P[0] + b * Q[0] + c * R[0], a * P[1] + b * Q[1] + c * R[1])
    for V, col in [(P, RED), (Q, GREEN), (R, BLUE)]:
        s.line(X[0], X[1], V[0], V[1], col, 1.2, dash="4 4")
    s.dot(*X, INK, 4.5)
    s.math(X[0] + 14, X[1] + 4, "X", INK, 16, "start")
    s.dot(*P, RED, 5); s.math(P[0] - 16, P[1] + 6, "P", RED, 17)
    s.dot(*Q, GREEN, 5); s.math(Q[0] + 16, Q[1] + 6, "Q", GREEN, 17)
    s.dot(*R, BLUE, 5); s.math(R[0], R[1] - 12, "R", BLUE, 17)
    s.math(230, 316, "X = αP + βQ + γR,   α + β + γ = 1", INK, 15)
    s.text(355, 60, "inside ⇔ α, β, γ ≥ 0", MUTED, 13)
    s.text(355, 80, "here: α = .2, β = .3, γ = .5", MUTED, 13)
    s.save("barycentric.svg", "Barycentric coordinates of a point in a triangle")


def combinations():
    s = Svg(720, 230)
    P, Q = (120, 150), (300, 70)
    # line through P, Q = affine combinations
    dx, dy = Q[0] - P[0], Q[1] - P[1]
    s.line(P[0] - dx * .55, P[1] - dy * .55, Q[0] + dx * .7, Q[1] + dy * .7, ORANGE, 2, dash="6 5")
    s.line(*P, *Q, BLUE, 3.5)
    s.dot(*P, INK, 5); s.dot(*Q, INK, 5)
    s.math(P[0] - 4, P[1] + 22, "P"); s.math(Q[0] + 6, Q[1] - 12, "Q")
    s.text(200, 200, "segment: convex (α, β ≥ 0)", BLUE, 13)
    s.text(200, 218, "whole line: affine (α + β = 1)", ORANGE, 13)
    # triangle
    A, B, C = (470, 180), (680, 170), (560, 40)
    s.poly([A, B, C], BLUE, 2, FILL_BLUE)
    s.dot(*A); s.dot(*B); s.dot(*C)
    s.text(575, 212, "convex combinations of 3 points: the filled triangle", BLUE, 13)
    s.text(575, 22, "affine combinations: the whole plane", ORANGE, 13)
    s.save("combinations.svg", "Affine and convex combinations")


# ─────────────────────────────────────────────────────────────────────────────── 03 shapes
def triangle_strip():
    s = Svg(760, 250)
    top = [(60, 60), (200, 50), (340, 60), (480, 50)]
    bot = [(110, 190), (250, 200), (390, 190), (530, 200)]
    verts = []
    for t, b in zip(top, bot):
        verts += [b, t]
    for i in range(len(verts) - 2):
        s.poly(verts[i:i + 3], INK, 1.4, [FILL_BLUE, FILL_ORANGE][i % 2])
    for i, (x, y) in enumerate(verts):
        s.dot(x, y, RED, 4.5)
        s.text(x, y + (20 if y > 120 else -10), str(i), RED, 13, bold=True)
    s.text(300, 238, "strip 0 1 2 3 4 5 6 7 → triangles (0,1,2) (2,1,3) (2,3,4) (4,3,5) …", MUTED, 13)
    # winding inset
    ox = 610
    s.poly([(ox, 170), (ox + 110, 170), (ox + 55, 70)], INK, 1.4, FILL_GREEN)
    s.text(ox - 6, 190, "0", INK, 13); s.text(ox + 118, 190, "1", INK, 13); s.text(ox + 55, 60, "2", INK, 13)
    s.path(f"M{ox + 35},140 A22,22 0 1,0 {ox + 75},140", GREEN, 1.8, arrow=True)
    s.text(ox + 55, 215, "counter-clockwise on screen", GREEN, 12)
    s.text(ox + 55, 231, "= front face (default)", GREEN, 12)
    s.save("triangle-strip.svg", "Triangle strip vertex order and winding")


def indexed_mesh():
    s = Svg(700, 230)
    pts = {0: (60, 180), 1: (160, 60), 2: (260, 180), 3: (360, 60)}
    tris = [(0, 2, 1), (1, 2, 3)]
    for t, f in zip(tris, [FILL_BLUE, FILL_ORANGE]):
        s.poly([pts[i] for i in t], INK, 1.5, f)
    for i, (x, y) in pts.items():
        s.dot(x, y, RED, 4.5)
        s.text(x, y + (22 if y > 100 else -12), f"v{i}", RED, 13, bold=True)
    s.text(470, 50, "positions", INK, 13, "start", bold=True)
    for k in range(4):
        s.text(470, 72 + 18 * k, f"v{k}: (x{k}, y{k}, z{k})", MUTED, 13, "start", family="Menlo, monospace")
    s.text(470, 160, "indices", INK, 13, "start", bold=True)
    s.text(470, 182, "[0, 2, 1,   1, 2, 3]", MUTED, 13, "start", family="Menlo, monospace")
    s.text(210, 215, "4 shared vertices instead of 6 copies", MUTED, 13)
    s.save("indexed-mesh.svg", "An indexed triangle mesh")


def flat_vs_smooth():
    s = Svg(760, 250)

    def half_hexagon(ox, smooth):
        R = 100
        angs = [math.radians(180 - 180 * i / 4) for i in range(5)]
        pts = [(ox + R * math.cos(a), 190 - R * math.sin(a)) for a in angs]
        s.path("M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts), INK, 2.2)
        s.line(ox - R - 10, 190, ox + R + 10, 190, FAINT, 1)
        for i in range(4):
            (x1, y1), (x2, y2) = pts[i], pts[i + 1]
            if not smooth:
                mx, my = (x1 + x2) / 2, (y1 + y2) / 2
                nx, ny = mx - ox, my - 190
                L = math.hypot(nx, ny)
                for t in (.2, .8):
                    px, py = x1 + (x2 - x1) * t, y1 + (y2 - y1) * t
                    s.line(px, py, px + nx / L * 38, py + ny / L * 38, BLUE, 1.8, arrow=True)
        if smooth:
            for (x, y) in pts:
                nx, ny = x - ox, y - 190
                L = math.hypot(nx, ny)
                s.line(x, y, x + nx / L * 40, y + ny / L * 40, RED, 1.8, arrow=True)
                s.dot(x, y, INK, 3.5)
        else:
            for (x, y) in pts:
                s.dot(x, y, INK, 3.5)

    half_hexagon(190, False)
    half_hexagon(570, True)
    s.text(190, 224, "flat: one normal per face", BLUE, 14)
    s.text(190, 242, "corners are duplicated, one copy per face", MUTED, 12)
    s.text(570, 224, "smooth: one normal per vertex", RED, 14)
    s.text(570, 242, "vertices shared; normal from the true surface", MUTED, 12)
    s.save("flat-vs-smooth-normals.svg", "Flat versus smooth vertex normals")


# ─────────────────────────────────────────────────────────────────────────────── 04 transforms
def F_shape(s, M, color, fill, opacity=1):
    """Draw an 'F' (2 by 1.3 units) transformed by 2D affine M = (a, b, c, d, e, f): x' = a x + b y + e ..."""
    bars = [(0, 0, .3, 2), (.3, 1.7, 1.3, 2), (.3, .95, 1, 1.25)]
    for x0, y0, x1, y1 in bars:
        pts = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
        s.poly([M(p) for p in pts], color, 1.2, fill, opacity=opacity)


def transform_order():
    s = Svg(820, 390)

    def panel(ox, title, ops, final_color):
        S = 44
        cx, cy = ox + 130, 290

        def to_px(p):
            return (cx + p[0] * S, cy - p[1] * S)

        for i in range(-2, 5):
            s.line(to_px((i, -1))[0], to_px((0, -1))[1], to_px((i, 4.6))[0], to_px((0, 4.6))[1], "#eeeeea", 1)
        for j in range(-1, 5):
            s.line(to_px((-2.6, j))[0], to_px((0, j))[1], to_px((4.6, j))[0], to_px((0, j))[1], "#eeeeea", 1)
        s.line(*to_px((-2.6, 0)), *to_px((4.8, 0)), MUTED, 1.2, arrow=True)
        s.line(*to_px((0, -1)), *to_px((0, 4.8)), MUTED, 1.2, arrow=True)
        F_shape(s, lambda p: to_px(p), MUTED, "#ececec")
        pts_fn = lambda p: p
        for op in ops:
            prev = pts_fn
            pts_fn = (lambda prev, op: (lambda p: op(prev(p))))(prev, op)
        F_shape(s, lambda p: to_px(pts_fn(p)), final_color, final_color, .85)
        s.text(ox + 180, 30, title, INK, 15, bold=True)

    rot = lambda p: (-p[1], p[0])
    tra = lambda p: (p[0] + 3, p[1])
    panel(20, "T · R : rotate, then translate", [rot, tra], BLUE)
    panel(430, "R · T : translate, then rotate", [tra, rot], RED)
    s.text(410, 350, "The same two matrices: R rotates 90° about the origin, T translates +3 in x.", MUTED, 13)
    s.text(410, 370, "Grey is the original F. A product applies its right-hand factor first.", MUTED, 13)
    s.save("transform-order.svg", "Transformation order changes the result")


# ─────────────────────────────────────────────────────────────────────────────── 05 change of basis
def change_of_basis():
    s = Svg(520, 330)
    O = (90, 260)
    s.line(*O, O[0] + 120, O[1], INK, 2, arrow=True); s.math(O[0] + 132, O[1] + 5, "i")
    s.line(*O, O[0], O[1] - 120, INK, 2, arrow=True); s.math(O[0] - 12, O[1] - 124, "j")
    s.math(O[0] - 14, O[1] + 18, "O"); s.text(O[0] + 40, O[1] + 30, "frame C_{1}", INK, 13)
    ang = math.radians(35)
    O2 = (300, 150)
    u = (math.cos(ang), -math.sin(ang)); v = (math.sin(ang), math.cos(ang))   # screen coords (y down)
    L = 100
    s.line(*O2, O2[0] + u[0] * L, O2[1] + u[1] * L, RED, 2, arrow=True); s.math(O2[0] + u[0] * L + 12, O2[1] + u[1] * L, "i′", RED)
    s.line(*O2, O2[0] - v[0] * L, O2[1] - v[1] * L, RED, 2, arrow=True); s.math(O2[0] - v[0] * L - 6, O2[1] - v[1] * L - 8, "j′", RED)
    s.math(O2[0] + 4, O2[1] + 22, "O′", RED); s.text(O2[0] + 70, O2[1] + 50, "frame C_{2} = M_{1} C_{1}", RED, 13)
    s.path(f"M{O[0] + 30},{O[1] - 30} Q {O[0] + 120},{O[1] - 150} {O2[0] - 20},{O2[1] + 5}", BLUE, 1.6, arrow=True, dash="5 4")
    s.math(175, 160, "M_{1}", BLUE, 16)
    P = (400, 60)
    s.dot(*P, INK, 5); s.math(P[0] + 12, P[1] - 6, "P", INK, 16)
    s.line(*O, *P, MUTED, 1, dash="3 4"); s.line(*O2, *P, MUTED, 1, dash="3 4")
    s.text(260, 318, "one point, two coordinate lists:   P_{C1} = M_{1} · P_{C2}", INK, 14)
    s.save("change-of-basis.svg", "One point expressed in two frames")


# ─────────────────────────────────────────────────────────────────────────────── 06 viewing
def look_at():
    s = Svg(620, 330)
    eye = (150, 230)
    at = (470, 120)
    s.line(*eye, *at, MUTED, 1.4, dash="6 5")
    s.dot(*eye, INK, 5); s.text(eye[0] + 16, eye[1] + 20, "eye", INK, 14, "start")
    s.dot(*at, INK, 5); s.text(at[0] + 10, at[1] - 10, "at", INK, 14, "start")
    dx, dy = at[0] - eye[0], at[1] - eye[1]
    L = math.hypot(dx, dy)
    f = (dx / L, dy / L)
    n = (-f[0], -f[1])
    s.line(*eye, eye[0] + n[0] * 80, eye[1] + n[1] * 80, BLUE, 2.4, arrow=True)
    s.math(eye[0] + n[0] * 80 - 12, eye[1] + n[1] * 80 + 16, "n", BLUE, 17)
    up_dir = (-f[1], f[0])
    if up_dir[1] > 0:
        up_dir = (-up_dir[0], -up_dir[1])
    s.line(*eye, eye[0] + up_dir[0] * 80, eye[1] + up_dir[1] * 80, GREEN, 2.4, arrow=True)
    s.math(eye[0] + up_dir[0] * 80 - 12, eye[1] + up_dir[1] * 80 - 6, "v", GREEN, 17)
    s.line(eye[0], eye[1], eye[0] - 22, eye[1] + 58, RED, 2.4, arrow=True)
    s.math(eye[0] - 34, eye[1] + 66, "u", RED, 17)
    s.text(eye[0] - 70, eye[1] + 92, "(toward the viewer)", RED, 11)
    s.line(60, 100, 60, 30, ORANGE, 2, arrow=True); s.text(72, 40, "up (world hint)", ORANGE, 13, "start")
    s.text(430, 215, "n = normalize(eye − at)", BLUE, 14, "start")
    s.text(430, 238, "u = normalize(up × n)", RED, 14, "start")
    s.text(430, 261, "v = n × u", GREEN, 14, "start")
    s.text(430, 292, "the camera looks along −n", MUTED, 13, "start")
    s.save("look-at.svg", "The camera basis built by look_at")


def view_volumes():
    s = Svg(820, 300)

    def axis(ox):
        s.line(ox, 150, ox + 330, 150, FAINT, 1)
        s.dot(ox + 10, 150, INK, 4)
        s.text(ox + 10, 175, "eye", INK, 12)
        s.text(ox + 320, 170, "−z", MUTED, 12)

    # orthographic
    ox = 20
    axis(ox)
    n, f, h = 90, 300, 70
    s.poly([(ox + n, 150 - h), (ox + f, 150 - h), (ox + f, 150 + h), (ox + n, 150 + h)], BLUE, 2, FILL_BLUE)
    s.text(ox + 190, 30, "orthographic: a box", BLUE, 15, bold=True)
    s.line(ox + 10, 245, ox + n, 245, MUTED, 1, both=True, arrow=True); s.text(ox + 50, 265, "near", MUTED, 12)
    s.line(ox + 10, 280, ox + f, 280, MUTED, 1, both=True, arrow=True); s.text(ox + 155, 296, "far", MUTED, 12)
    s.text(ox + 196, 150 - h - 8, "top", MUTED, 12)
    # perspective
    ox = 440
    axis(ox)
    th = math.radians(24)
    pts = [(ox + n, 150 - n * math.tan(th) + 10), (ox + f, 150 - f * math.tan(th) + 10 * 0), (ox + f, 150 + f * math.tan(th)), (ox + n, 150 + n * math.tan(th) - 10)]
    e = (ox + 10, 150)
    tn, tf = (n - 10) * math.tan(th), (f - 10) * math.tan(th)
    near_top, far_top = (ox + n, 150 - tn), (ox + f, 150 - tf)
    near_bot, far_bot = (ox + n, 150 + tn), (ox + f, 150 + tf)
    s.line(*e, *far_top, MUTED, 1, dash="4 4"); s.line(*e, *far_bot, MUTED, 1, dash="4 4")
    s.poly([near_top, far_top, far_bot, near_bot], RED, 2, FILL_RED)
    s.text(ox + 190, 30, "perspective: a frustum", RED, 15, bold=True)
    s.path(f"M{ox + 60},{150 - 50 * math.tan(th)} A50,50 0 0,1 {ox + 60},{150 + 50 * math.tan(th)}", RED, 1.2)
    s.math(ox + 76, 155, "fovy", RED, 13, "start")
    s.text(410, 60, "both map to the cube [−1, 1]³ (NDC)", MUTED, 13)
    s.save("view-volumes.svg", "Orthographic and perspective view volumes")


def perspective_similar_triangles():
    s = Svg(700, 300)
    E = (60, 220)
    s.line(40, 220, 660, 220, MUTED, 1.2, arrow=True); s.text(650, 242, "−z", MUTED, 13)
    s.dot(*E, INK, 5); s.text(E[0] + 4, E[1] + 40, "eye at origin", INK, 12)
    d_px, z_px, y_px = 200, 480, 150
    plane_x = E[0] + d_px
    s.line(plane_x, 60, plane_x, 250, BLUE, 2); s.text(plane_x, 272, "projection plane z = −d", BLUE, 13)
    P = (E[0] + z_px, 220 - y_px)
    s.dot(*P, RED, 5); s.math(P[0] - 8, P[1] - 12, "P = (x, y, z)", RED, 15, "end")
    s.line(*E, *P, RED, 1.6, dash="6 4")
    yp = y_px * d_px / z_px
    Pp = (plane_x, 220 - yp)
    s.dot(*Pp, BLUE, 5); s.math(Pp[0] - 10, Pp[1] - 10, "P′", BLUE, 15, "end")
    s.line(P[0], P[1], P[0], 220, MUTED, 1, dash="3 3"); s.math(P[0] + 10, 150, "y", MUTED, 14, "start")
    s.line(Pp[0], Pp[1], Pp[0], 220, BLUE, 1, dash="3 3"); s.math(Pp[0] + 8, 200, "y′", BLUE, 14, "start")
    s.line(E[0], 238, plane_x, 238, BLUE, 1, both=True, arrow=True); s.math((E[0] + plane_x) / 2, 256, "d", BLUE, 14)
    s.line(E[0], 100, P[0], 100, MUTED, 1, both=True, arrow=True); s.math((E[0] + P[0]) / 2 - 60, 94, "distance −z", MUTED, 14)
    s.math(350, 34, "similar triangles:   y′ / d = y / (−z)    ⇒    y′ = d · y / (−z)", INK, 16)
    s.save("perspective-similar-triangles.svg", "Perspective projection by similar triangles")


# ─────────────────────────────────────────────────────────────────────────────── 07 lighting
def phong_vectors():
    s = Svg(780, 320)
    P = (310, 250)
    s.path(f"M40,{P[1] + 10} Q {P[0]},{P[1] - 30} 580,{P[1] + 10}", INK, 2.4, FILL_GREY)
    s.dot(*P, INK, 5); s.math(P[0] + 10, P[1] + 26, "P", INK, 16, "start")

    def vec(angle_deg, L, color, label, dx=0, dy=0):
        a = math.radians(angle_deg)
        tip = (P[0] + L * math.cos(a), P[1] - L * math.sin(a))
        s.line(*P, *tip, color, 2.4, arrow=True)
        s.math(tip[0] + dx, tip[1] + dy, label, color, 18)
        return tip

    vec(90, 140, INK, "n", 0, -10)
    Ltip = vec(90 + 50, 150, ORANGE, "l", -12, -6)
    vec(90 - 50, 150, BLUE, "r", 12, -6)
    vec(90 - 22, 150, GREEN, "v", 14, -2)
    vec(90 + 14, 130, PURPLE, "h", -12, -8)
    s.circle(Ltip[0] - 10, Ltip[1] - 16, 12, ORANGE, "#fff4d6", 2)
    s.text(Ltip[0] - 24, Ltip[1] - 36, "light", ORANGE, 12)
    s.path(f"M{P[0]},{P[1] - 55} A55,55 0 0,0 {P[0] + 55 * math.cos(math.radians(140))},{P[1] - 55 * math.sin(math.radians(140))}", ORANGE, 1.2)
    s.math(P[0] - 26, P[1] - 62, "θ", ORANGE, 14)
    for k, (t, col) in enumerate([("n  surface normal", INK), ("l  toward the light", ORANGE), ("r  mirror reflection of l", BLUE),
                                  ("v  toward the viewer", GREEN), ("h  halfway: normalize(l + v)", PURPLE)]):
        s.text(560, 40 + 20 * k, t, col, 13, "start")
    s.save("phong-vectors.svg", "Vectors of the Phong reflection model")


def spotlight():
    s = Svg(520, 300)
    S = (120, 50)
    s.line(40, 250, 490, 250, INK, 2)
    D = (math.cos(math.radians(-60)), -math.sin(math.radians(-60)))  # screen: pointing down-right
    ax = (S[0] + 180 * math.cos(math.radians(62)), S[1] + 180 * math.sin(math.radians(62)))
    s.line(*S, *ax, ORANGE, 2.2, arrow=True); s.math(ax[0] + 14, ax[1] - 4, "D", ORANGE, 16, "start")
    for off in (-22, 22):
        a = math.radians(62 + off)
        s.line(*S, S[0] + 240 * math.cos(a), S[1] + 240 * math.sin(a), ORANGE, 1.2, dash="5 4")
    s.path(f"M{S[0] + 60 * math.cos(math.radians(62))},{S[1] + 60 * math.sin(math.radians(62))} A60,60 0 0,1 {S[0] + 60 * math.cos(math.radians(84))},{S[1] + 60 * math.sin(math.radians(84))}", ORANGE, 1.2)
    s.math(S[0] + 22, S[1] + 76, "α", ORANGE, 15)
    s.circle(*S, 10, ORANGE, "#fff4d6", 2); s.math(S[0] - 18, S[1] - 12, "P_{s}", ORANGE, 15)
    P1 = (230, 250); P2 = (400, 250)
    s.dot(*P1, GREEN, 5); s.math(P1[0], P1[1] + 22, "lit", GREEN, 14)
    s.dot(*P2, RED, 5); s.math(P2[0], P2[1] + 22, "dark", RED, 14)
    s.line(*S, *P2, RED, 1.2, dash="3 3")
    s.text(360, 80, "P is lit if the angle between", INK, 13)
    s.text(360, 100, "D and (P − P_{s}) is at most α:", INK, 13)
    s.math(360, 128, "normalize(P − P_{s}) · D ≥ cos α", INK, 15)
    s.save("spotlight.svg", "Spotlight cone test")


# ─────────────────────────────────────────────────────────────────────────────── 08 textures
def uv_mapping():
    s = Svg(760, 280)
    ox, oy, S = 40, 230, 180
    for i in range(6):
        for j in range(6):
            fill = "#2b3a55" if (i + j) % 2 else "#f2efe6"
            s.rect(ox + i * S / 6, oy - (j + 1) * S / 6, S / 6, S / 6, "none", fill, 0, 0)
    s.rect(ox, oy - S, S, S, INK, "none", 1.5, 0)
    s.text(ox, oy + 20, "(0,0)", MUTED, 12); s.text(ox + S, oy - S - 8, "(1,1)", MUTED, 12)
    s.math(ox + S / 2, oy + 38, "u →", INK, 14); s.math(ox - 22, oy - S / 2, "v", INK, 14)
    s.text(ox + S / 2, 26, "texture space", INK, 14, bold=True)
    tri_uv = [(.15, .15), (.9, .3), (.4, .9)]
    tp = [(ox + u * S, oy - v * S) for u, v in tri_uv]
    s.poly(tp, RED, 2.4, "none")
    for (x, y), lab in zip(tp, ["a", "b", "c"]):
        s.dot(x, y, RED, 4)
    s.line(270, 140, 380, 140, BLUE, 2, arrow=True)
    s.text(325, 128, "each vertex stores (u, v)", BLUE, 12)
    s.text(325, 162, "the rasterizer", BLUE, 12); s.text(325, 176, "interpolates between", BLUE, 12)
    mesh = [(420, 210), (720, 180), (600, 62)]
    s.poly(mesh, INK, 1.5, FILL_GREY)
    s.poly(mesh, RED, 2.4, "none")
    for (x, y), lab, uv in zip(mesh, ["a", "b", "c"], tri_uv):
        s.dot(x, y, RED, 4)
        s.text(x + (26 if lab == "c" else 0), y + (22 if lab != "c" else -4), f"({uv[0]}, {uv[1]})", RED, 12, "start" if lab == "c" else "middle")
    s.text(430, 26, "triangle on screen", INK, 14, "start", bold=True)
    s.text(570, 250, "each pixel: interpolate (u, v), then sample the image there", MUTED, 12)
    s.save("uv-mapping.svg", "Texture coordinates map image to triangle")


def bump_vs_displacement():
    s = Svg(780, 240)

    def surface(ox, displaced):
        pts = []
        for i in range(61):
            x = ox + i * 4
            h = 10 * math.sin(i / 60 * 6 * math.pi)
            y = 150 - (h if displaced else 0)
            pts.append((x, y))
        s.path("M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts), INK, 2.2)
        for i in range(2, 60, 6):
            x, y = pts[i]
            slope = (math.cos(i / 60 * 6 * math.pi) * 10 * 6 * math.pi / 60) / 4
            nx, ny = -(-slope), -1
            L = math.hypot(nx, ny)
            nxs, nys = (slope / L, -1 / L)
            s.line(x, y, x + nxs * 34, y + nys * 34, BLUE, 1.6, arrow=True)

    surface(20, False)
    s.text(140, 205, "bump / normal map", BLUE, 14)
    s.text(140, 223, "flat geometry, perturbed normals", MUTED, 12)
    surface(280, True)
    s.text(400, 205, "displacement map", INK, 14)
    s.text(400, 223, "vertices actually moved", MUTED, 12)
    ox = 560
    s.path(f"M{ox},150 L{ox + 200},150", INK, 2.2)
    s.line(ox + 20, 150, ox + 180, 110, MUTED, 1.2, dash="4 4")
    s.dot(ox + 180, 110, INK, 4); s.text(ox + 186, 106, "eye", MUTED, 12, "start")
    s.line(ox + 110, 150, ox + 110, 132, ORANGE, 1.5)
    s.line(ox + 110, 132, ox + 80, 144, ORANGE, 1.5, arrow=True)
    s.text(660, 205, "parallax map", ORANGE, 14)
    s.text(660, 223, "shift the texture lookup by height", MUTED, 12)
    s.save("bump-vs-displacement.svg", "Bump, displacement and parallax mapping")


# ─────────────────────────────────────────────────────────────────────────────── 09 collision
def bounding_volumes():
    s = Svg(760, 260)
    shape = [(0, -40), (70, -10), (40, 45), (-30, 30), (-55, -20)]

    def draw(ox, kind):
        pts = [(ox + x, 130 + y) for x, y in shape]
        if kind == "sphere":
            r = max(math.hypot(x, y) for x, y in shape)
            s.circle(ox, 130, r, BLUE, FILL_BLUE, 2)
        elif kind == "aabb":
            xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
            s.rect(min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys), GREEN, FILL_GREEN, 2, 0)
        else:
            a = math.radians(-20)
            loc = [(x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a)) for x, y in shape]
            minx, maxx = min(p[0] for p in loc), max(p[0] for p in loc)
            miny, maxy = min(p[1] for p in loc), max(p[1] for p in loc)
            corners = [(minx, miny), (maxx, miny), (maxx, maxy), (minx, maxy)]
            back = [(ox + x * math.cos(-a) - y * math.sin(-a), 130 + x * math.sin(-a) + y * math.cos(-a)) for x, y in corners]
            s.poly(back, ORANGE, 2, FILL_ORANGE)
        s.poly(pts, INK, 1.6, "#9aa3ad")

    draw(120, "sphere"); draw(380, "aabb"); draw(640, "obb")
    s.text(120, 225, "bounding sphere", BLUE, 14); s.text(120, 243, "cheapest test, loosest fit", MUTED, 12)
    s.text(380, 225, "axis-aligned box (AABB)", GREEN, 14); s.text(380, 243, "3 interval overlaps", MUTED, 12)
    s.text(640, 225, "oriented box (OBB)", ORANGE, 14); s.text(640, 243, "tighter; separating axis test", MUTED, 12)
    s.save("bounding-volumes.svg", "Bounding volumes")


def separating_axis():
    s = Svg(560, 280)
    A = [(80, 80), (200, 60), (220, 150), (100, 170)]
    B = [(300, 140), (420, 110), (450, 200), (320, 230)]
    s.poly(A, BLUE, 2, FILL_BLUE); s.poly(B, RED, 2, FILL_RED)
    s.line(40, 260, 520, 20, MUTED, 1.2)
    s.text(470, 30, "candidate axis", MUTED, 12)
    ax = (480, -240); L = math.hypot(*ax); ax = (ax[0] / L, ax[1] / L)
    base = (40, 260)

    def proj(p):
        t = (p[0] - base[0]) * ax[0] + (p[1] - base[1]) * ax[1]
        return t

    for poly, col in [(A, BLUE), (B, RED)]:
        ts = [proj(p) for p in poly]
        t0, t1 = min(ts), max(ts)
        off = (-ax[1] * 10, ax[0] * 10) if col == BLUE else (ax[1] * 10, -ax[0] * 10)
        p0 = (base[0] + ax[0] * t0 + off[0], base[1] + ax[1] * t0 + off[1])
        p1 = (base[0] + ax[0] * t1 + off[0], base[1] + ax[1] * t1 + off[1])
        s.line(*p0, *p1, col, 5)
    s.text(140, 250, "projections do not overlap on this axis", INK, 13)
    s.text(140, 268, "⇒ the convex shapes are separated", INK, 13)
    s.save("separating-axis.svg", "Separating axis test")


# ─────────────────────────────────────────────────────────────────────────────── 10 shadows
def shadow_map():
    s = Svg(760, 300)
    Lp = (120, 50)
    s.circle(*Lp, 12, ORANGE, "#fff4d6", 2); s.text(Lp[0], Lp[1] - 20, "light", ORANGE, 13)
    s.line(40, 250, 720, 250, INK, 2)
    s.rect(240, 170, 90, 80, INK, FILL_BLUE, 1.6, 2)
    A = (330, 170)
    Pshadow = (480, 250)
    Plit = (620, 250)
    s.line(*Lp, *A, ORANGE, 1.4); s.line(*A, *Pshadow, ORANGE, 1.4, dash="5 4")
    s.line(*Lp, *Plit, ORANGE, 1.4)
    s.dot(*A, BLUE, 4.5); s.text(A[0] + 8, A[1] - 8, "A: nearest to the light", BLUE, 12, "start")
    s.dot(*Pshadow, RED, 5); s.text(Pshadow[0], Pshadow[1] + 22, "P: farther than the stored depth → in shadow", RED, 12)
    s.dot(*Plit, GREEN, 5); s.text(Plit[0] + 10, Plit[1] - 12, "Q: equal → lit", GREEN, 12, "start")
    s.text(560, 60, "pass 1: render depth from the light", INK, 13)
    s.text(560, 80, "into a texture (the shadow map)", INK, 13)
    s.text(560, 110, "pass 2: for each visible point,", INK, 13)
    s.text(560, 130, "compare its distance to the light", INK, 13)
    s.text(560, 150, "with the shadow map's value", INK, 13)
    s.save("shadow-map.svg", "Shadow mapping compares depths from the light")


def mirror():
    s = Svg(560, 280)
    s.line(280, 30, 280, 250, BLUE, 4)
    s.text(280, 270, "planar mirror", BLUE, 13)
    E = (120, 180); E2 = (440, 180)
    Obj = (170, 70)
    s.dot(*E, INK, 5); s.text(E[0], E[1] + 22, "camera", INK, 13)
    s.dot(*E2, MUTED, 5); s.text(E2[0], E2[1] + 22, "reflected camera", MUTED, 13)
    s.line(E[0], 215, E2[0], 215, MUTED, 1, dash="3 4")
    s.rect(Obj[0] - 20, Obj[1] - 20, 40, 40, INK, FILL_ORANGE, 1.6, 3); s.text(Obj[0], Obj[1] - 28, "object", INK, 12)
    t = (280 - E2[0]) / (Obj[0] - E2[0])
    Hy = E2[1] + (Obj[1] - E2[1]) * t
    s.line(*E2, 280, Hy, MUTED, 1.2, dash="5 4")
    s.line(280, Hy, *Obj, ORANGE, 1.6)
    s.line(*E, 280, Hy, ORANGE, 1.6, arrow=True)
    s.text(420, 60, "render the scene from the camera", INK, 12)
    s.text(420, 76, "reflected through the mirror plane,", INK, 12)
    s.text(420, 92, "then use that image on the mirror", INK, 12)
    s.save("mirror.svg", "Planar mirror by rendering from a reflected camera")


# ─────────────────────────────────────────────────────────────────────────────── 11 ray tracing
def ray_generation():
    s = Svg(680, 320)
    E = (60, 210)
    s.dot(*E, INK, 5); s.text(E[0], E[1] + 24, "eye", INK, 13)
    # image plane seen at an angle: a parallelogram with a 6 × 5 grid
    o, ux, uy = (250, 50), (16, 14), (0, 32)          # origin, column step, row step
    cols, rows = 6, 5
    corner = lambda i, j: (o[0] + ux[0] * i + uy[0] * j, o[1] + ux[1] * i + uy[1] * j)
    s.poly([corner(0, 0), corner(cols, 0), corner(cols, rows), corner(0, rows)], INK, 1.6, "#fafaf7")
    for i in range(1, cols):
        s.line(*corner(i, 0), *corner(i, rows), FAINT, 1)
    for j in range(1, rows):
        s.line(*corner(0, j), *corner(cols, j), FAINT, 1)
    pc = corner(3.5, 2.5)
    s.poly([corner(3, 2), corner(4, 2), corner(4, 3), corner(3, 3)], "none", 0, "#f6c9c2")
    r = 48
    dx, dy = pc[0] - E[0], pc[1] - E[1]
    L = math.hypot(dx, dy); d = (dx / L, dy / L)
    C = (E[0] + d[0] * 520 - d[1] * 18, E[1] + d[1] * 520 + d[0] * 18)   # a sphere the ray really hits
    oc = (E[0] - C[0], E[1] - C[1]); b = oc[0] * d[0] + oc[1] * d[1]; c = oc[0] ** 2 + oc[1] ** 2 - r * r
    t_hit = -b - math.sqrt(max(b * b - c, 0))
    H = (E[0] + d[0] * t_hit, E[1] + d[1] * t_hit)
    s.circle(*C, r, INK, FILL_BLUE, 1.6)
    s.line(*E, *H, RED, 1.8, arrow=True)
    s.dot(*pc, RED, 4); s.dot(*H, INK, 4)
    s.text(H[0] - 6, H[1] - 10, "first hit", INK, 12, "end")
    s.text(330, 305, "image plane: one cell per pixel; the ray passes through the pixel's center", MUTED, 12)
    s.text(470, 40, "ray(t) = eye + t · d,   t > 0", RED, 14)
    s.text(470, 60, "d = normalize(pixel center − eye)", RED, 13)
    s.save("ray-generation.svg", "Generating a primary ray through a pixel")


def ray_tree():
    s = Svg(820, 330)
    # scene on the left
    E = (40, 150)
    s.dot(*E, INK, 5); s.text(E[0], E[1] + 22, "eye", INK, 12)
    s.circle(200, 150, 50, INK, "#e7eef7", 1.6); s.text(200, 215, "glass sphere", MUTED, 12)
    s.line(300, 40, 300, 270, INK, 3); s.text(300, 290, "mirror wall", MUTED, 12)
    Lp = (120, 40); s.circle(*Lp, 10, ORANGE, "#fff4d6", 2); s.text(Lp[0] - 22, Lp[1] - 4, "light", ORANGE, 12, "end")
    H1 = (152, 138)
    s.line(*E, *H1, INK, 1.6, arrow=True)
    s.line(*H1, *Lp, ORANGE, 1.2, dash="4 3")
    s.line(*H1, 90, 60, BLUE, 1.6, arrow=True)
    H2 = (246, 162)
    s.line(*H1, *H2, GREEN, 1.6)
    s.line(*H2, *Lp, ORANGE, 1.2, dash="4 3")
    s.line(*H2, 300, 180, GREEN, 1.6, arrow=True)
    s.dot(*H1, INK, 4); s.dot(*H2, INK, 4); s.dot(300, 180, INK, 4)
    s.text(146, 124, "1", INK, 13, bold=True); s.text(250, 150, "2", INK, 13, bold=True); s.text(314, 186, "3", INK, 13, "start", bold=True)
    # tree on the right
    nodes = {"1": (520, 50), "L1": (400, 140), "R1": (520, 140), "2": (660, 140),
             "L2": (560, 230), "R2": (660, 230), "3": (780, 230)}
    def node(p, label, col):
        s.circle(*p, 14, col, "#ffffff", 1.8); s.text(p[0], p[1] + 5, label, col, 12, bold=True)
    edges = [("1", "L1", ORANGE, "shadow"), ("1", "R1", BLUE, "reflect"), ("1", "2", GREEN, "transmit"),
             ("2", "L2", ORANGE, "shadow"), ("2", "R2", BLUE, "reflect"), ("2", "3", GREEN, "transmit")]
    for a, b, col, lab in edges:
        pa, pb = nodes[a], nodes[b]
        s.line(pa[0], pa[1] + 14, pb[0], pb[1] - 14, col, 1.6)
        mx, my = (pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2
        s.text(mx + (-10 if pb[0] < pa[0] else 10 if pb[0] > pa[0] else 8), my, lab, col, 11, "end" if pb[0] < pa[0] else "start")
    node(nodes["1"], "1", INK); node(nodes["2"], "2", INK); node(nodes["3"], "3", INK)
    s.text(nodes["L1"][0], nodes["L1"][1] + 5, "L", ORANGE, 13, bold=True)
    s.text(nodes["R1"][0], nodes["R1"][1] + 5, "R", BLUE, 13, bold=True)
    s.text(nodes["L2"][0], nodes["L2"][1] + 5, "L", ORANGE, 13, bold=True)
    s.text(nodes["R2"][0], nodes["R2"][1] + 5, "R", BLUE, 13, bold=True)
    s.text(590, 300, "each hit spawns shadow (L), reflection (R) and transmission rays;", MUTED, 12)
    s.text(590, 318, "colors are combined from the leaves upward", MUTED, 12)
    s.save("ray-tree.svg", "A ray tree")


# ─────────────────────────────────────────────────────────────────────────────── 12 project
def rule_of_thirds():
    s = Svg(480, 290)
    x0, y0, W, H = 30, 20, 420, 236
    s.rect(x0, y0, W, H, INK, "#f7f5ef", 1.6, 4)
    s.path(f"M{x0},{y0 + H * .72} C {x0 + 120},{y0 + H * .62} {x0 + 300},{y0 + H * .8} {x0 + W},{y0 + H * .68} L{x0 + W},{y0 + H} L{x0},{y0 + H} Z", "none", 0, "#dfe7d5")
    for k in (1, 2):
        s.line(x0 + W * k / 3, y0, x0 + W * k / 3, y0 + H, RED, 1.2, dash="6 5")
        s.line(x0, y0 + H * k / 3, x0 + W, y0 + H * k / 3, RED, 1.2, dash="6 5")
    cx, cy = x0 + W * 2 / 3, y0 + H / 3
    s.circle(cx, cy, 26, ORANGE, "#fbd38d", 2)
    s.circle(cx, cy, 5, RED, RED, 1)
    s.text(240, 280, "put the subject on an intersection, the horizon on a third line", MUTED, 12)
    s.save("rule-of-thirds.svg", "Rule of thirds")


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for old in OUT.glob("*.svg"):
        old.unlink()
    for f in [pipeline, coordinate_spaces, fragcoord, barycentric, combinations, triangle_strip, indexed_mesh,
              flat_vs_smooth, transform_order, change_of_basis, look_at, view_volumes, perspective_similar_triangles,
              phong_vectors, spotlight, uv_mapping, bump_vs_displacement, bounding_volumes, separating_axis,
              shadow_map, mirror, ray_generation, ray_tree, rule_of_thirds]:
        f()
    print("\n".join(sorted(p.name for p in OUT.glob("*.svg"))))
