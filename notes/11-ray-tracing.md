# 11 · Ray tracing

**You will learn:** how ray tracing inverts the rasterization pipeline; how to generate a ray for each pixel; ray intersections with spheres, planes and triangles; shadow, reflection and refraction rays; the ray tree and its cost; and how acceleration structures make ray tracing practical.

**Demo:** [06 · Ray tracing](https://luckiday.github.io/graphics-foundations/demos/06-ray-tracing.html) · [source](../demos/06-ray-tracing.html)

---

## 11.1 Rasterization versus ray tracing

| | Rasterization | Ray tracing |
|---|---|---|
| outer loop | for each **triangle** | for each **pixel** |
| inner loop | which pixels does it cover? | which surface does the ray hit first? |
| visibility | z-buffer | nearest intersection |
| shadows, reflections, refraction | extra passes and approximations (chapter 10) | follow more rays |
| cost | grows with scene size; very GPU-friendly | grows with pixels × rays per pixel × cost per ray (about $`\log\, N`$ with an acceleration structure) |

**Ray casting** shoots one ray per pixel and shades the first hit, which gives the same image as rasterization. **Ray tracing**, often called Whitted-style after Turner Whitted's 1980 paper, keeps following rays from each hit toward lights, along mirror reflections and through transparent materials. That gives shadows, reflections and refraction naturally.

## 11.2 Generating primary rays

![Primary ray](../figures/ray-generation.svg)

A ray is a half-line $`𝐫(t) = 𝐨 + t\,𝐝`$ with $`t \gt 0`$. For pixel $`(i, j)`$ of a $`W \times H`$ image, where $`j = 0`$ is the top row, with vertical field of view $`\theta`$ and aspect ratio $`a = W/H`$:

```math
x = \left(\frac{2(i + 0.5)}{W} - 1\right) a \tan\, \frac{\theta}{2},
\qquad
y = \left(1 - \frac{2(j + 0.5)}{H}\right) \tan\, \frac{\theta}{2}.
```

In camera space the ray starts at the eye and passes through $`(x, y, -1)`$. In world space, using the look-at basis $`𝐮, 𝐯, 𝐧`$ from chapter 6:

```math
𝐨 = \text{eye}, \qquad 𝐝 = \mathrm{normalize}(x\,𝐮 + y\,𝐯 - 𝐧).
```

The $`+0.5`$ aims at the pixel's center. Shooting several jittered rays per pixel and averaging them **anti-aliases** the image.

## 11.3 Intersections

For each ray, find the smallest $`t \gt \varepsilon`$ at which it meets any object. The small $`\varepsilon`$ keeps a secondary ray from immediately re-hitting the surface it starts on, a bug called "surface acne".

### Sphere

A sphere with center $`𝐜`$ and radius $`R`$: substitute $`𝐫(t)`$ into $`\lVert 𝐩 - 𝐜 \rVert^2 = R^2`$. With $`𝐝`$ normalized and $`𝐦 = 𝐨 - 𝐜`$:

```math
t^2 + 2(𝐦\cdot𝐝)\,t + (𝐦\cdot𝐦 - R^2) = 0
\quad\Rightarrow\quad
t = -b \pm \sqrt{b^2 - c}, \qquad b = 𝐦\cdot𝐝,\ c = 𝐦\cdot𝐦 - R^2.
```

- A negative discriminant means a miss.
- Otherwise take the smaller root if it is greater than $`\varepsilon`$, else the larger one if it is (the ray starts inside the sphere). If neither is, the sphere is behind the ray: a miss.
- This form needs a unit $`𝐝`$. With an unnormalized $`𝐝`$ the quadratic's leading coefficient is $`𝐝\cdot𝐝`$, not 1.
- The normal at the hit point $`𝐩`$ is $`(𝐩 - 𝐜)/R`$.

### Plane

A plane with normal $`𝐧`$ through point $`𝐪`$, i.e. $`(𝐩 - 𝐪)\cdot𝐧 = 0`$:

```math
t = \frac{(𝐪 - 𝐨)\cdot𝐧}{𝐝\cdot𝐧},
```

with no hit when $`𝐝\cdot𝐧 \approx 0`$ (the ray is parallel to the plane).

### Triangle

1. Intersect the ray with the triangle's plane, whose normal is $`𝐍 = (B - A) \times (C - A)`$.
2. Decide whether the hit point $`𝐩`$ lies inside the triangle. Compute its barycentric coordinates (chapter 2): inside means all three are $`\ge 0`$. Equivalently, $`𝐩`$ must be on the inner side of all three edges: $`\big((B - A)\times(𝐩 - A)\big)\cdot𝐍 \ge 0`$, and likewise for edges $`BC`$ and $`CA`$. Here the direction of $`𝐍`$ matters: it must be $`(B - A)\times(C - A)`$, not its negative. Dividing each edge test by $`𝐍\cdot𝐍`$ gives the barycentric coordinates themselves:

```math
\alpha = \frac{\big((C - B)\times(𝐩 - B)\big)\cdot𝐍}{𝐍\cdot𝐍},\qquad
\beta = \frac{\big((A - C)\times(𝐩 - C)\big)\cdot𝐍}{𝐍\cdot𝐍},\qquad
\gamma = \frac{\big((B - A)\times(𝐩 - A)\big)\cdot𝐍}{𝐍\cdot𝐍}.
```

The **Möller–Trumbore** algorithm combines both steps into one small linear solve for $`(t, \beta, \gamma)`$. It is the standard implementation.

### Worked example

Ray from the origin through $`(1, 1, 1)`$; triangle $`A = (0, 4, 0)`$, $`B = (8, 0, 0)`$, $`C = (0, 0, 8)`$.

1. **Ray:** $`𝐫(t) = (t, t, t)`$.
2. **Plane:** the intercepts $`x = 8`$, $`y = 4`$, $`z = 8`$ give $`\frac{x}{8} + \frac{y}{4} + \frac{z}{8} = 1`$, or $`x + 2y + z = 8`$, with normal $`(1, 2, 1)`$.
3. **Intersection:** $`t + 2t + t = 8`$, so $`t = 2`$ and $`𝐩 = (2, 2, 2)`$.
4. **Inside?** Solve $`𝐩 = \alpha A + \beta B + \gamma C`$. From $`y`$: $`4\alpha = 2`$, so $`\alpha = 0.5`$. From $`x`$: $`8\beta = 2`$, so $`\beta = 0.25`$. From $`z`$: $`8\gamma = 2`$, so $`\gamma = 0.25`$. The weights sum to 1 and are all non-negative, so the hit is **inside**. The formulas above agree: $`𝐍 = (B - A)\times(C - A) = (-32, -64, -32)`$ gives $`(0.5, 0.25, 0.25)`$.
5. **Common mistake.** $`𝐍`$ points *opposite* to the $`(1, 2, 1)`$ of step 2. Any multiple of the normal works for the plane equation, but the edge tests need the right sign: with $`(1, 2, 1)`$ all three come out negative, and the hit is wrongly reported as outside.

## 11.4 Shading a hit: recursive ray tracing

At each hit point $`𝐩`$ with normal $`𝐧`$, the incoming ray direction is $`𝐝`$:

- **Shadow rays.** For each light, cast a ray from $`𝐩 + \varepsilon𝐧`$ toward the light. (Offset toward the side the new ray travels into: $`𝐩 + \varepsilon𝐧`$ for shadow and reflection rays, $`𝐩 - \varepsilon𝐧`$ for a transmitted ray. Requiring $`t \gt \varepsilon`$, as in §11.3, is the other common remedy; demo 06 uses both.) If it hits something before reaching the light, that light contributes nothing, so the point is in shadow for that light. Otherwise add the local diffuse and specular terms (chapter 7).
- **Reflection ray.** Along the mirror direction:

```math
𝐫 = 𝐝 - 2(𝐝\cdot𝐧)\,𝐧.
```

- **Refraction (transmission) ray.** Snell's law relates the angles on either side of the boundary, $`\eta_1 \sin\, \theta_i = \eta_2 \sin\, \theta_t`$. With $`\eta = \eta_1/\eta_2`$ and $`c = -𝐝\cdot𝐧`$:

```math
𝐭 = \eta\,𝐝 + \left(\eta c - \sqrt{1 - \eta^2(1 - c^2)}\right)𝐧.
```

The formula assumes unit vectors, with $`𝐧`$ on the side the ray comes from ($`𝐝\cdot𝐧 \lt 0`$). When a ray *leaves* an object, the outward normal gives $`𝐝\cdot𝐧 \gt 0`$: flip $`𝐧`$ and swap the indices, so that $`\eta = \eta_{\text{inside}}/\eta_{\text{outside}}`$. Forgetting this produces no error, just a wrong ray. Leaving glass at $`30°`$, the correct ray leaves at $`48.6°`$, but the unflipped formula returns $`19.5°`$.

If the quantity under the square root is negative, there is no refracted ray. That is **total internal reflection**. It happens only when going into a medium of lower index ($`\eta_1 \gt \eta_2`$), at an angle from the normal larger than the critical angle $`\theta_c = \arcsin(\eta_2/\eta_1)`$, about $`41.8°`$ from glass into air.

The color at the hit combines everything recursively:

```math
I = I_{\text{local}} + k_r\, I(\text{reflection ray}) + k_t\, I(\text{transmission ray}).
```

The Fresnel equations say how $`k_r`$ and $`k_t`$ should vary with angle: glass is barely reflective head-on and strongly reflective at grazing angles. Schlick's approximation is the usual shortcut.

### The ray tree

![Ray tree](../figures/ray-tree.svg)

Each hit spawns a shadow ray per light, plus a reflection and a transmission ray, which hit other surfaces and spawn more. The rays form a tree rooted at the pixel, evaluated **bottom up**: leaves are shaded first, then combined into their parents.

**Recursion stops when:**
- a ray hits nothing (it takes the background color);
- a maximum depth is reached;
- the accumulated weight (the product of the $`k_r`$ or $`k_t`$ factors taken at each hit along the path) is too small to matter.

**Cost.** With $`m`$ lights and a full binary tree (reflection and transmission at every hit) of depth $`n`$:

```math
\text{surface hits per pixel} = 2^n - 1, \qquad
\text{shadow rays} = m\,(2^n - 1), \qquad
\text{total rays} = (m + 1)(2^n - 1).
```

Here depth $`n`$ counts the eye ray's hit as level 1, so a path makes at most $`n - 1`$ bounces. Demo 06's slider counts bounces instead, so its setting 3 means $`n = 4`$. Demo 06 also follows only mirror rays, which makes each tree a single chain: $`(m + 1)\,n`$ rays, growing linearly rather than exponentially.

Growth is exponential in the depth. In practice most materials are not both reflective and transparent, and weight-based termination prunes most branches.

## 11.5 Making it fast

Intersection tests dominate the running time; commonly quoted figures are 75–95% of it. Several optimizations from rasterization do not apply to ray tracing:

- **Back-face culling.** Secondary rays can legitimately hit the inside or back of surfaces.
- **View-volume clipping.** Reflections can show objects behind the camera.

The main speedups are:

- **Bounding volumes** around complex objects: test the cheap volume first (chapter 9).
- **Acceleration structures:** bounding volume hierarchies, k-d trees and grids. They reduce the cost per ray from $`O(N)`$ to roughly $`O(\log\, N)`$ for $`N`$ primitives (for BVHs and k-d trees on typical scenes; building the structure costs about $`O(N\log\, N)`$, once).
- **Coherence and parallelism.** Pixels are independent, so rays can be traced on many cores or GPUs. Demo 06 traces every pixel in parallel, in a fragment shader. It follows mirror rays only, so each pixel's tree is a single chain, unrolled into a loop because GLSL has no recursion.

## 11.6 Beyond Whitted: path tracing

Whitted ray tracing follows only perfect mirror and refraction directions, so it misses soft shadows, glossy reflections and light bouncing between diffuse surfaces (color bleeding). **Path tracing** randomly samples bounce directions according to each material's reflectance and averages many paths per pixel. It is a Monte Carlo solution of the rendering equation, and it is the basis of film rendering and modern real-time ray tracing. The price is noise that decreases only as $`1/\sqrt{\text{samples}}`$.

---

## Check yourself

1. An eye ray hits a surface whose local color is $`P = (0.0, 0.1, 0.1)`$. The surface has reflectance $`k_r = 0.4`$ and transmittance $`k_t = 0.1`$. The reflection ray returns $`R = (0.1, 0.1, 0.1)`$ and the transmission ray returns $`T = (0.2, 0.0, 0.1)`$. What is the pixel's color?
2. A ray from $`(0, 0, 5)`$ along $`(0, 0, -1)`$ meets a sphere of radius 1 at the origin. Find both roots of the quadratic and the normal at the visible hit.
3. With 2 lights and a maximum depth of 3, where every hit spawns both a reflection and a transmission ray, how many rays can a single pixel require?
4. Why does a shadow ray start at $`𝐩 + \varepsilon𝐧`$ rather than at $`𝐩`$?
5. Light travels from glass ($`\eta_1 = 1.5`$) into air ($`\eta_2 = 1`$) at $`60°`$ from the normal. Is there a refracted ray?
6. Why can't a ray tracer skip back faces the way a rasterizer does?

<details><summary>Answers</summary>

1. $`P + k_r R + k_t T`$, per channel: red $`0.0 + 0.04 + 0.02 = 0.06`$; green $`0.1 + 0.04 + 0.0 = 0.14`$; blue $`0.1 + 0.04 + 0.01 = 0.15`$. The color is $`(0.06, 0.14, 0.15)`$.
2. $`𝐦 = (0, 0, 5)`$, $`b = 𝐦\cdot𝐝 = -5`$, $`c = 25 - 1 = 24`$. $`t = 5 \pm \sqrt{25 - 24} = 4`$ or $`6`$. The visible hit is at $`t = 4`$: the point $`(0, 0, 1)`$, with normal $`(0, 0, 1)`$.
3. $`(m + 1)(2^n - 1) = 3 \times 7 = 21`$ rays: 7 surface-hit rays and 14 shadow rays.
4. Floating-point error puts the computed $`𝐩`$ slightly below or above the surface. A ray starting exactly at $`𝐩`$ can hit the same surface at $`t \approx 0`$ and wrongly report a shadow.
5. $`\eta = 1.5`$ and $`\sin\, \theta_t = 1.5 \sin\, 60° \approx 1.30 \gt 1`$. There is no refracted ray: total internal reflection.
6. Secondary rays can start inside objects (refraction) or reach surfaces from behind the camera's point of view (reflections), so "facing away from the eye" no longer means "invisible".

</details>

## Further reading

- Turner Whitted, "An improved illumination model for shaded display", *Communications of the ACM*, 1980.
- Peter Shirley, [*Ray Tracing in One Weekend*](https://raytracing.github.io/): build a path tracer in a weekend.
- Tomas Möller and Ben Trumbore, "Fast, minimum storage ray–triangle intersection", *Journal of Graphics Tools*, 1997.
- Pharr, Jakob and Humphreys, [*Physically Based Rendering*](https://pbr-book.org/).
