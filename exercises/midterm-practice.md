# Practice problems I · Foundations, transformations, viewing

Covers chapters 1–6. Try each problem before opening its solution. Every numeric answer here is recomputed by [`tools/check-math.mjs`](../tools/check-math.mjs), so if the notes and the arithmetic ever disagree, the check fails.

---

### 1. Buffering

What is the difference between drawing to a single-buffered and a double-buffered display? Which one does a WebGL canvas behave like?

<details><summary>Solution</summary>

With **single buffering** the program draws directly into the image being shown. The viewer can see a half-finished frame, and objects drawn early in a frame stay on screen longer than those drawn late, which produces flicker and tearing.

With **double buffering** the program draws into a hidden *back buffer*. When the frame is finished, the back and front buffers are swapped in one step, so every visible frame is complete.

A WebGL canvas behaves like a double-buffered display. Everything drawn during one `requestAnimationFrame` callback is presented to the compositor together, after the callback returns.

</details>

### 2. Combinations of points

For points $`P`$ and $`Q`$, classify each expression as a vector, a point (and whether affine or convex), or meaningless: (a) $`0.5P + 0.5Q`$; (b) $`1.5P - 0.5Q`$; (c) $`P + Q`$; (d) $`P - Q`$.

<details><summary>Solution</summary>

(a) The weights sum to 1 and are non-negative, so this is a **convex** combination: the midpoint of the segment.
(b) The weights sum to 1 but one is negative, so this is an **affine** combination: a point on line $`PQ`$, outside the segment, beyond $`P`$.
(c) The weights sum to 2, so it is **meaningless** as a geometric object (its $`w`$ would be 2).
(d) The weights sum to 0, so it is a **vector**: the displacement from $`Q`$ to $`P`$.

</details>

### 3. Barycentric coordinates

Find the barycentric coordinates of $`X = (2, 1)`$ with respect to the triangle $`P = (0, 0)`$, $`Q = (4, 0)`$, $`R = (0, 4)`$. Is $`X`$ inside?

<details><summary>Solution</summary>

Write $`X = \alpha P + \beta Q + \gamma R`$. Since $`P`$ is the origin, $`X = \beta(4, 0) + \gamma(0, 4)`$, so $`\beta = 2/4 = 0.5`$ and $`\gamma = 1/4 = 0.25`$. Then $`\alpha = 1 - \beta - \gamma = 0.25`$.

The coordinates are $`(0.25, 0.5, 0.25)`$. All are non-negative, so $`X`$ is **inside**.

</details>

### 4. Resolution and cost

A digital cinema frame at 4K DCI resolution is 4096 × 2160 pixels; a 1080p television frame is 1920 × 1080. If rendering time is proportional to the number of pixels, how much longer does a film frame take? Name one quality concern that grows with resolution besides time.

<details><summary>Solution</summary>

$`4096 \times 2160 = 8{,}847{,}360`$ and $`1920 \times 1080 = 2{,}073{,}600`$, so the film frame has about **4.27×** as many pixels and takes about 4.27× as long.

Detail that looked fine at television resolution can fall apart at film resolution:
- low-resolution textures look blurry;
- faceted silhouettes on coarse meshes become visible;
- aliasing and noise are more noticeable on a large screen.

Assets must be made at higher fidelity, not just rendered at more pixels.

</details>

### 5. Transformation order

A letter F has its local origin at the bottom of its stem, its stem along local $`+y`$ and its arms along local $`+x`$. The code runs:

```js
let model = Mat4.identity();
model = model.times(Mat4.scale(-1, 1, 1));
model = model.times(Mat4.rotation(Math.PI / 2, 0, 0, 1));
model = model.times(Mat4.translation(2, 1, 0));
```

Give the final matrix. Where is the F's origin, and which way do its stem and arms point?

<details><summary>Solution</summary>

$`M = S(-1, 1)\;R_z(90°)\;T(2, 1)`$. Read right to left, the origin is moved to $`(2, 1)`$, rotated to $`(-1, 2)`$, then mirrored to $`(1, 2)`$.

The linear part is

```math
S R = \begin{bmatrix} -1&0 \\ 0&1 \end{bmatrix}\begin{bmatrix} 0&-1 \\ 1&0 \end{bmatrix} = \begin{bmatrix} 0&1 \\ 1&0 \end{bmatrix},
```

and the translation column is $`SR\,(2, 1)^\mathsf{T} = (1, 2)^\mathsf{T}`$, so

```math
M = \begin{bmatrix} 0&1&0&1 \\ 1&0&0&2 \\ 0&0&1&0 \\ 0&0&0&1 \end{bmatrix}.
```

- **Stem** (local $`(0, 1)`$, a direction): $`SR\,(0, 1) = (1, 0)`$, so it points **right**.
- **Arms** (local $`(1, 0)`$): $`SR\,(1, 0) = (0, 1)`$, so they point **up**.
- **Check:** the stem tip $`(0, 2)`$ maps to $`(0\cdot0 + 1\cdot2 + 1,\ 1\cdot0 + 0\cdot2 + 2) = (3, 2)`$, two units right of the origin.

Compare with chapter 4 §4.4, where the same three operations in the opposite order leave the stem pointing left and the arms down.

</details>

### 6. Reflection

Reflect the point $`(1, 2, 3)`$ across the plane $`x = y`$.

<details><summary>Solution</summary>

The unit normal is $`\hat{\mathbf{n}} = (1, -1, 0)/\sqrt2`$, and $`\mathbf{p}\cdot\hat{\mathbf{n}} = (1 - 2)/\sqrt2 = -1/\sqrt2`$. Then

```math
\mathbf{p}' = \mathbf{p} - 2(\mathbf{p}\cdot\hat{\mathbf{n}})\hat{\mathbf{n}} = (1,2,3) + 2\cdot\tfrac{1}{\sqrt2}\cdot\tfrac{(1,-1,0)}{\sqrt2} = (1,2,3) + (1,-1,0) = (2, 1, 3).
```

Reflecting across $`x = y`$ swaps $`x`$ and $`y`$, as expected.

</details>

### 7. Change of basis

A frame has origin $`(1, 2, 0)`$ and is rotated $`90°`$ about $`z`$ relative to the world. What are the coordinates, in that frame, of the world point $`(1, 3, 0)`$?

<details><summary>Solution</summary>

The frame matrix is $`M = T(1, 2, 0)\,R_z(90°)`$, and frame coordinates are $`M^{-1}\mathbf{p} = R_z(-90°)\,(\mathbf{p} - O)`$.

$`\mathbf{p} - O = (0, 1, 0)`$, and $`R_z(-90°)`$ maps $`(x, y) \mapsto (y, -x)`$, giving **(1, 0, 0)**.

Check: the frame's $`x`$ axis points along world $`+y`$, and the point lies one unit in world $`+y`$ from the frame's origin.

</details>

### 8. Camera, projection and NDC

A camera at $`(0, 10, 10)`$ looks at the origin with up hint $`(0, 1, 0)`$.

(a) Compute the view matrix.
(b) Find the camera-space coordinates of the world point $`(0, 1, 0)`$.
(c) With a perspective projection of fovy $`60°`$, aspect 1, near 1 and far 100, find its clip coordinates and NDC.

<details><summary>Solution</summary>

(a) $`\mathbf{n} = (0, 10, 10)/\lVert\cdot\rVert = (0, 0.7071, 0.7071)`$. $`\mathbf{u} = (0,1,0) \times \mathbf{n} = (0.7071, 0, 0)`$, which normalizes to $`(1, 0, 0)`$. $`\mathbf{v} = \mathbf{n}\times\mathbf{u} = (0, 0.7071, -0.7071)`$. The translation column is $`(-\mathbf{u}\cdot\text{eye}, -\mathbf{v}\cdot\text{eye}, -\mathbf{n}\cdot\text{eye}) = (0, 0, -14.1421)`$:

```math
V = \begin{bmatrix} 1&0&0&0 \\ 0&0.7071&-0.7071&0 \\ 0&0.7071&0.7071&-14.1421 \\ 0&0&0&1 \end{bmatrix}.
```

(b) $`V(0, 1, 0, 1)^\mathsf{T} = (0,\ 0.7071,\ 0.7071 - 14.1421,\ 1) = (0, 0.7071, -13.435)`$.

(c) $`c = 1/\tan 30° = 1.7321`$, $`a = -\tfrac{101}{99}`$ and $`b = -\tfrac{200}{99}`$. The clip coordinates are
$`(0,\ 1.7321 \cdot 0.7071,\ a(-13.435) + b,\ 13.435) = (0, 1.2247, 11.6862, 13.435)`$,
so the NDC is $`(0, 0.0912, 0.8698)`$. The point appears slightly above center. It is only 13.4 units away in a near–far range of 1 to 100, yet its NDC depth is already 0.87: the non-uniform precision of chapter 6.

</details>

### 9. Perspective by similar triangles

Prove that projecting $`(x, y, z)`$ with $`z \lt 0`$ onto the plane $`z = -d`$, toward an eye at the origin, gives $`\left(\frac{d\,x}{-z}, \frac{d\,y}{-z}, -d\right)`$. Then give a $`4\times4`$ matrix that produces this after division by $`w`$.

<details><summary>Solution</summary>

The projected point lies on the line from the origin through $`(x, y, z)`$, so it has the form $`s(x, y, z)`$. Its $`z`$ coordinate must be $`-d`$: $`sz = -d`$, so $`s = d/(-z)`$. The projection is therefore $`\left(\frac{dx}{-z}, \frac{dy}{-z}, -d\right)`$. Equivalently, the two right triangles with legs $`(y, -z)`$ and $`(y', d)`$ are similar.

The matrix

```math
\begin{bmatrix} 1&0&0&0 \\ 0&1&0&0 \\ 0&0&1&0 \\ 0&0&-1/d&0 \end{bmatrix}
```

maps $`(x, y, z, 1)`$ to $`(x, y, z, -z/d)`$. Dividing by $`w = -z/d`$ gives the result.

</details>

### 10. How viewing parameters change the image

For a perspective camera, describe the effect on the image of each change on its own: (a) the field of view shrinks; (b) the target point slides along the line of sight toward the eye; (c) the up vector is reversed; (d) the eye moves away from the target; (e) the near–far range grows.

<details><summary>Solution</summary>

(a) The image zooms in: objects look larger, and less of the scene fits.
(b) Nothing changes. Only the direction from the eye to the target matters, as long as the target does not pass through the eye.
(c) The image rotates by 180°.
(d) Objects shrink and perspective foreshortening decreases, because the camera is physically farther away.
(e) Fewer objects are clipped, but depth precision gets worse, which increases the risk of z-fighting.

</details>

### 11. Depth precision

With near $`= 0.1`$ and far $`= 100`$, what NDC depth does a point 1 unit in front of the camera get? What does that imply for scene design?

<details><summary>Solution</summary>

$`z_{\text{ndc}} = -a - b/z`$ with $`a = -\tfrac{100.1}{99.9}`$ and $`b = -\tfrac{20}{99.9}`$. At $`z = -1`$ this gives $`z_{\text{ndc}} = 0.8018`$.

The first unit in front of the camera uses about 90% of the depth range, leaving about 10% for the other 99 units. Keep the near plane as far out as the scene allows.

</details>
