# Practice problems II · Lighting, textures, collisions, ray tracing

Covers chapters 7–11. Try each problem before opening its solution. Every numeric answer here is recomputed by [`tools/check-math.mjs`](../tools/check-math.mjs).

---

### 1. Phong versus Blinn–Phong

A surface point at the origin has normal $`𝐧 = (0, 1, 0)`$. A white light is at $`(3, 4, 0)`$ and the viewer is at $`(0, 5, 0)`$. With $`k_a = 0.2`$, $`k_d = 0.5`$, $`k_s = 0.5`$, shininess $`4`$, $`I_a = I_l = 1`$ and no attenuation, compute the intensity with the Phong model and with Blinn–Phong.

<details><summary>Solution</summary>

$`𝐥 = (3, 4, 0)/5 = (0.6, 0.8, 0)`$, $`𝐯 = (0, 1, 0)`$ and $`𝐧\cdot𝐥 = 0.8`$.

**Phong:** $`𝐫 = 2(0.8)(0, 1, 0) - (0.6, 0.8, 0) = (-0.6, 0.8, 0)`$, so $`𝐫\cdot𝐯 = 0.8`$ and $`0.8^4 = 0.4096`$.
$`I = 0.2 + 0.5 \cdot 0.8 + 0.5 \cdot 0.4096 = 0.8048`$.

**Blinn–Phong:** $`𝐡 = \mathrm{normalize}(0.6, 1.8, 0) = (0.3162, 0.9487, 0)`$, so $`𝐧\cdot𝐡 = 0.9487`$ and $`0.9487^4 = 0.81`$.
$`I = 0.2 + 0.5 \cdot 0.8 + 0.5 \cdot 0.81 = 1.005`$, which clamps to $`1`$ on display.

With the same exponent, Blinn–Phong's highlight is broader, so this viewer, who is off the mirror direction, sees more of it.

</details>

### 2. Shading and hidden surfaces

(a) What is the major difference between Gouraud and Phong shading?
(b) List two advantages and two disadvantages of the z-buffer algorithm.

<details><summary>Solution</summary>

(a) Gouraud evaluates the lighting model **per vertex** and interpolates the resulting colors across each triangle. Phong interpolates **normals** (and positions) and evaluates lighting **per fragment**. Gouraud can miss or smear highlights that fall inside a triangle; Phong cannot.

(b) Advantages: there is no need to sort geometry; it handles interpenetrating surfaces correctly; its cost is linear in the number of fragments and it parallelizes trivially in hardware.
Disadvantages: it needs a depth value per pixel of memory; its precision is limited and non-uniform, which causes z-fighting; it cannot handle transparency without sorting; and hidden fragments are still shaded before being rejected (overdraw).

</details>

### 3. Transforming a normal

A surface through the origin has normal $`(1, 1, 0)/\sqrt2`$ and contains the tangent $`(1, -1, 0)`$. The model matrix is $`S(2, 1, 1)`$. Find the correctly transformed unit normal and verify that it is perpendicular to the transformed tangent.

<details><summary>Solution</summary>

$`G = (S^{-1})^{𝖳} = S(\tfrac12, 1, 1)`$. $`G(1, 1, 0) = (0.5, 1, 0)`$, which normalizes to $`(0.4472, 0.8944, 0)`$.

The tangent transforms to $`S(1, -1, 0) = (2, -1, 0)`$, and $`(0.5, 1, 0)\cdot(2, -1, 0) = 1 - 1 = 0`$. ✓

Using $`S`$ itself would give $`(2, 1, 0)`$, and $`(2, 1, 0)\cdot(2, -1, 0) = 3 \ne 0`$: no longer perpendicular.

</details>

### 4. Perspective-correct texture coordinates

An edge runs from $`u = 0`$ at clip-space $`w = 2`$ to $`u = 1`$ at $`w = 4`$. What is $`u`$ at the edge's screen-space midpoint?

<details><summary>Solution</summary>

```math
u = \frac{\tfrac12\cdot\tfrac{0}{2} + \tfrac12\cdot\tfrac{1}{4}}{\tfrac12\cdot\tfrac12 + \tfrac12\cdot\tfrac14} = \frac{0.125}{0.375} = 0.3333.
```

Affine interpolation would give 0.5. The far half of the edge covers fewer pixels, so the screen midpoint is closer to the near end in texture space.

</details>

### 5. Mipmap level

A 4096 × 4096 texture is drawn on a square 100 pixels wide on screen. Which mipmap levels does trilinear filtering blend, and with what weight?

<details><summary>Solution</summary>

There are $`4096/100 = 40.96`$ texels per pixel, and $`\log_2 40.96 = 5.3561`$. Trilinear filtering blends levels **5** ($`128^2`$) and **6** ($`64^2`$), with about 36% weight on level 6.

</details>

### 6. Sphere against box

Does a sphere with center $`(3, 3, 3)`$ and radius 2 intersect the axis-aligned box $`[0, 2]^3`$?

<details><summary>Solution</summary>

Clamp the sphere's center to the box to get the box's closest point, $`(2, 2, 2)`$. The squared distance from the center is $`1 + 1 + 1 = 3`$, which is less than $`2^2 = 4`$, so they **intersect**.

The same clamp-then-compare works for any sphere and AABB, and never needs a square root.

</details>

### 7. Compositing three layers

Three translucent layers cover one pixel. From front to back, in premultiplied RGBA: $`(0.2, 0, 0, 0.5)`$, $`(0, 0.3, 0, 0.3)`$, $`(0, 0, 0.4, 0.8)`$. The background is transparent black. Composite them.

<details><summary>Solution</summary>

Composite front to back with $`C \leftarrow C + (1 - A)\,C_{\text{layer}}`$ and $`A \leftarrow A + (1 - A)\,A_{\text{layer}}`$:

1. First layer: $`C = (0.2, 0, 0)`$, $`A = 0.5`$.
2. Second layer: $`C = (0.2, 0.15, 0)`$, $`A = 0.5 + 0.5\cdot0.3 = 0.65`$.
3. Third layer: $`C = (0.2, 0.15, 0.14)`$, $`A = 0.65 + 0.35\cdot0.8 = 0.93`$.

Result: $`(0.2, 0.15, 0.14, 0.93)`$. Compositing back to front with the over operator gives the same answer.

</details>

### 8. Ray–sphere intersection

A ray starts at $`(1, -5, 0)`$ with direction $`(0, 1, 0)`$. A sphere of radius 2 is centered at the origin. Find both intersection parameters, the visible hit point, and its unit normal.

<details><summary>Solution</summary>

$`𝐦 = (1, -5, 0)`$, $`b = 𝐦\cdot𝐝 = -5`$, $`c = 𝐦\cdot𝐦 - 4 = 22`$. The discriminant is $`b^2 - c = 3`$.

$`t = 5 \pm \sqrt3`$, so $`t = 3.2679`$ and $`t = 6.7321`$.

The visible hit is at $`t = 3.2679`$, the point $`(1, -1.7321, 0)`$, with normal $`𝐩/2 = (0.5, -0.866, 0)`$.

</details>

### 9. Ray–triangle intersection

A ray starts at the origin and passes through $`(1, 2, 2)`$. The triangle has vertices $`(6, 0, 0)`$, $`(0, 6, 0)`$, $`(0, 0, 6)`$.

(a) Write the ray parametrically.
(b) Find the triangle's plane.
(c) Intersect the ray with the plane.
(d) Decide, and explain how you decided, whether the hit is inside the triangle.

<details><summary>Solution</summary>

(a) $`𝐫(t) = t\,(1, 2, 2)`$.
(b) All three intercepts are 6, so the plane is $`x + y + z = 6`$, with normal $`(1, 1, 1)`$.
(c) $`t + 2t + 2t = 6`$, so $`t = 1.2`$ and the hit point is $`𝐩 = (1.2, 2.4, 2.4)`$.
(d) Compute barycentric coordinates. Each vertex has a single nonzero coordinate equal to 6, so $`\alpha = 1.2/6 = 0.2`$, $`\beta = 2.4/6 = 0.4`$ and $`\gamma = 2.4/6 = 0.4`$. They sum to 1 and are all non-negative, so the hit is **inside**. Equivalently, $`𝐩`$ lies on the inner side of all three edges.

</details>

### 10. The ray tree

(a) An eye ray hits a surface with local color $`P = (0.0, 0.1, 0.1)`$, reflectance $`k_r = 0.4`$ and transmittance $`k_t = 0.1`$. Its reflected ray hits a mirror with local color $`(0.05, 0.05, 0.05)`$ and $`k_r = 0.5`$, whose own reflected ray returns the background $`(0.1, 0.1, 0.1)`$. Its transmitted ray returns $`T = (0.2, 0.0, 0.1)`$. What color is the pixel?
(b) With 3 lights and a ray tree 4 levels deep (the eye ray's hit is level 1), where every hit spawns a reflected and a transmitted ray, how many rays can one pixel need?

<details><summary>Solution</summary>

(a) Evaluate bottom up. First the mirror: $`R = (0.05, 0.05, 0.05) + 0.5\,(0.1, 0.1, 0.1) = (0.1, 0.1, 0.1)`$. Then the pixel: $`P + k_r R + k_t T = (0 + 0.04 + 0.02,\ 0.1 + 0.04 + 0,\ 0.1 + 0.04 + 0.01) = (0.06, 0.14, 0.15)`$.

(b) $`(m + 1)(2^n - 1) = 4 \times 15 = 60`$ rays: 15 rays that hit surfaces and 45 shadow rays.

</details>

### 11. Spotlight

A spotlight at $`(0, 4, 0)`$ points along $`(0, -1, 0)`$ with a $`30°`$ cutoff. Are the floor points $`(1, 0, 0)`$ and $`(3, 0, 0)`$ lit?

<details><summary>Solution</summary>

The test is $`\mathrm{normalize}(P - P_s)\cdot𝐃 \ge \cos\, 30° = 0.866`$.

- $`(1, 0, 0)`$: the direction is $`\mathrm{normalize}(1, -4, 0)`$, which has dot product $`0.9701`$ with $`𝐃`$. That is $`\ge 0.866`$, so it is **lit**.
- $`(3, 0, 0)`$: the direction is $`(3, -4, 0)/5`$, which has dot product $`0.8`$. That is $`\lt 0.866`$, so it is **dark**.

</details>

### 12. Refraction

Light passes from air ($`\eta_1 = 1`$) into water ($`\eta_2 = 1.33`$) at $`45°`$ from the normal. Find the refraction angle. Can total internal reflection happen on this side of the boundary?

<details><summary>Solution</summary>

$`\sin\, \theta_t = \sin\, 45° / 1.33 = 0.5317`$, so $`\theta_t = 32.1176°`$: the ray bends toward the normal.

Total internal reflection cannot happen here, because $`\sin\, \theta_t`$ is at most $`1/1.33 \lt 1`$. It is only possible when light goes from the medium of higher index into the one of lower index.

</details>

### 13. Shadow acne

A shadow-mapped floor shows alternating light and dark stripes. Explain the cause and give two remedies.

<details><summary>Solution</summary>

Each floor fragment compares its own depth from the light against the shadow map's stored depth for the same surface. Limited shadow-map resolution and depth precision make about half of those comparisons come out "slightly farther", so the surface shadows itself in stripes.

Remedies:
- subtract a small, slope-scaled **depth bias** before comparing;
- render **back faces** into the shadow map (this works for closed objects; a single-sided floor still needs the bias);
- increase shadow-map resolution, or tighten the light's frustum around the scene.

</details>

### 14. Generating a primary ray

A camera at the origin has the basis $`𝐮 = (1, 0, 0)`$, $`𝐯 = (0, 1, 0)`$, $`𝐧 = (0, 0, 1)`$. The image is 8 × 4 pixels, with a vertical field of view of $`90°`$.
(a) Find the unit direction of the ray through pixel $`(i, j) = (5, 1)`$, where $`j = 0`$ is the top row.
(b) Does the ray hit the sphere of radius 0.5 centered at $`(1.5, 0.5, -2)`$? If so, give $`t`$, the hit point and the unit normal.

<details><summary>Solution</summary>

(a) The aspect ratio is $`a = 8/4 = 2`$ and $`\tan\, 45° = 1`$ (chapter 11, §11.2).
- $`x = \left(\frac{2(5 + 0.5)}{8} - 1\right)\cdot 2 \cdot 1 = 0.75`$ and $`y = \left(1 - \frac{2(1 + 0.5)}{4}\right)\cdot 1 = 0.25`$.
- $`𝐝 = \mathrm{normalize}(0.75, 0.25, -1) = (0.5883, 0.1961, -0.7845)`$.

(b) $`𝐦 = 𝐨 - 𝐜 = (-1.5, -0.5, 2)`$, so $`b = 𝐦\cdot𝐝 = -2.5495`$ and $`c = 𝐦\cdot𝐦 - R^2 = 6.5 - 0.25 = 6.25`$.
- The discriminant is $`b^2 - c = 6.5 - 6.25 = 0.25`$, so $`t = 2.5495 \pm 0.5`$: $`2.0495`$ or $`3.0495`$.
- The visible hit is at $`t = 2.0495`$: $`𝐩 = (1.2058, 0.4019, -1.6078)`$, with normal $`(𝐩 - 𝐜)/0.5 = (-0.5883, -0.1961, 0.7845)`$.
- The normal is exactly $`-𝐝`$, because the ray passes through the sphere's center: $`(1.5, 0.5, -2) = 2\,(0.75, 0.25, -1)`$.

</details>
