# 5 · Change of basis

**You will learn:** that a transformation matrix can be read either as moving points or as describing a new coordinate frame; how to convert a point's coordinates between two frames; and how this produces the camera's view matrix.

---

## 5.1 One point, two descriptions

Chapter 4 read matrices as operations that **move points**. There is a second, equally useful reading: a matrix **describes a coordinate frame**. The same physical point then has different coordinates depending on which frame you measure it in.

![Change of basis](../figures/change-of-basis.svg)

Let frame $`C_1`$ have origin $`O`$ and orthonormal axes $`\mathbf{i}, \mathbf{j}, \mathbf{k}`$. Apply a transformation $`M_1`$ to the whole frame, and you get a new frame $`C_2`$ with origin $`O'`$ and axes $`\mathbf{i}', \mathbf{j}', \mathbf{k}'`$:

```math
\begin{bmatrix} \mathbf{i}' & \mathbf{j}' & \mathbf{k}' & O' \end{bmatrix}
= M_1 \begin{bmatrix} \mathbf{i} & \mathbf{j} & \mathbf{k} & O \end{bmatrix}.
\tag{1}
```

**Question.** A point $`P`$ has coordinates $`\mathbf{p}_{C_2} = (x', y', z', 1)^\mathsf{T}`$ in frame $`C_2`$. What are its coordinates $`\mathbf{p}_{C_1} = (x, y, z, 1)^\mathsf{T}`$ in $`C_1`$?

**Answer.** Write the one point $`P`$ in both frames (chapter 2) and set the expressions equal:

```math
P = \begin{bmatrix} \mathbf{i} & \mathbf{j} & \mathbf{k} & O \end{bmatrix} \mathbf{p}_{C_1}
  = \begin{bmatrix} \mathbf{i}' & \mathbf{j}' & \mathbf{k}' & O' \end{bmatrix} \mathbf{p}_{C_2}
  = M_1 \begin{bmatrix} \mathbf{i} & \mathbf{j} & \mathbf{k} & O \end{bmatrix} \mathbf{p}_{C_2}.
```

Measured in $`C_1`$ itself, the frame matrix $`[\mathbf{i}\ \mathbf{j}\ \mathbf{k}\ O]`$ is the identity. So

```math
\boxed{\;\mathbf{p}_{C_1} = M_1\, \mathbf{p}_{C_2}, \qquad \mathbf{p}_{C_2} = M_1^{-1}\, \mathbf{p}_{C_1}.\;}
```

The matrix that **moves frame $`C_1`$ onto frame $`C_2`$** converts coordinates the *other* way, from $`C_2`$ back to $`C_1`$. This single fact is behind the view matrix, hierarchical models and cameras attached to moving objects.

## 5.2 What the matrix looks like

Use equation (1) with the old frame matrix equal to the identity. The columns of $`M_1`$ are then the new frame's axes and origin, written in old coordinates:

```math
M_1 = \begin{bmatrix} \mathbf{i}' & \mathbf{j}' & \mathbf{k}' & O' \end{bmatrix}
= \begin{bmatrix}
i'_x & j'_x & k'_x & O'_x \\
i'_y & j'_y & k'_y & O'_y \\
i'_z & j'_z & k'_z & O'_z \\
0 & 0 & 0 & 1
\end{bmatrix}.
```

**To build a frame matrix, write its axes and its origin as columns.**

When the new axes are orthonormal, $`M_1`$ splits into a rotation followed by a translation, $`M_1 = T R`$:

```math
R = \begin{bmatrix} i'_x & j'_x & k'_x & 0 \\ i'_y & j'_y & k'_y & 0 \\ i'_z & j'_z & k'_z & 0 \\ 0&0&0&1 \end{bmatrix},
\qquad
T = \begin{bmatrix} 1&0&0&O'_x \\ 0&1&0&O'_y \\ 0&0&1&O'_z \\ 0&0&0&1 \end{bmatrix}.
```

Its inverse is cheap, because a rotation's inverse is its transpose:

```math
M_1^{-1} = R^{-1} T^{-1} = R^\mathsf{T}\, T(-O')
= \begin{bmatrix}
i'_x & i'_y & i'_z & -\mathbf{i}' \cdot O' \\
j'_x & j'_y & j'_z & -\mathbf{j}' \cdot O' \\
k'_x & k'_y & k'_z & -\mathbf{k}' \cdot O' \\
0&0&0&1
\end{bmatrix}.
```

Reading $`M_1^{-1}`$ row by row: the new coordinate $`x'`$ is the dot product of $`\mathbf{i}'`$ with $`(P - O')`$. You are measuring how far $`P`$ lies along each new axis, starting from the new origin.

## 5.3 Successive frames

Now transform $`C_2`$ by $`M_2`$ to get $`C_3`$, where $`M_2`$ is expressed **in $`C_2`$'s coordinates**. Applying §5.1 twice gives

```math
\mathbf{p}_{C_2} = M_2\, \mathbf{p}_{C_3},
\qquad
\mathbf{p}_{C_1} = M_1\, \mathbf{p}_{C_2} = M_1 M_2\, \mathbf{p}_{C_3}.
```

Composing frame changes, each described relative to the previous frame, multiplies matrices **on the right**. This is exactly the "left to right, moving frame" reading of chapter 4, and exactly what `model = model.times(next)` does. A hierarchical model is a chain of frames, and drawing a part converts its coordinates all the way back to the world.

## 5.4 The camera is just another frame

A camera is a frame too. Its origin is the eye point, and it looks down its own $`-\mathbf{k}'`$ axis with $`\mathbf{j}'`$ pointing up. Put the camera's axes and eye position into $`M_{\text{cam}}`$ as columns, as in §5.2. Then

```math
\mathbf{p}_{\text{camera}} = M_{\text{cam}}^{-1}\, \mathbf{p}_{\text{world}}.
```

$`M_{\text{cam}}^{-1}`$ is the **view matrix**. It is what `program_state.set_camera()` expects and what `Mat4.look_at()` returns.

**Building the camera frame from an eye point, a target and an up hint:**

```math
\mathbf{k}' = \frac{P_{\text{eye}} - P_{\text{ref}}}{\lVert P_{\text{eye}} - P_{\text{ref}} \rVert},
\qquad
\mathbf{i}' = \frac{\mathbf{v}_{\text{up}} \times \mathbf{k}'}{\lVert \mathbf{v}_{\text{up}} \times \mathbf{k}' \rVert},
\qquad
\mathbf{j}' = \mathbf{k}' \times \mathbf{i}',
\qquad
O' = P_{\text{eye}}.
```

Here $`\mathbf{k}'`$ points *backward*, from the target toward the eye, so that the camera looks along $`-\mathbf{k}'`$. The up hint need not be perpendicular to the view direction. The cross products straighten it out, which is why $`\mathbf{j}'`$ is recomputed rather than taken from $`\mathbf{v}_{\text{up}}`$. Chapter 6 continues from here.

## 5.5 Worked example

A camera starts at the origin looking down $`-z`$, with the point $`P = (0, 0, -1)`$ straight ahead. The camera then moves to $`(10, 0, 0)`$ and turns to face the origin, keeping $`+y`$ up.

**(a) Find the camera's frame matrix $`M`$.**

- Backward axis: $`\mathbf{k}' = \dfrac{(10,0,0) - (0,0,0)}{10} = (1, 0, 0)`$.
- Right axis: $`\mathbf{i}' = (0,1,0) \times (1,0,0) = (0, 0, -1)`$.
- Up axis: $`\mathbf{j}' = \mathbf{k}' \times \mathbf{i}' = (1,0,0) \times (0,0,-1) = (0, 1, 0)`$.
- Origin: $`O' = (10, 0, 0)`$.

```math
M = \begin{bmatrix} 0&0&1&10 \\ 0&1&0&0 \\ -1&0&0&0 \\ 0&0&0&1 \end{bmatrix}.
```

As a check, the upper-left block is $`R_y(90°)`$: turning $`90°`$ about $`y`$ swings a camera that looked down $`-z`$ to look down $`-x`$.

**(b) Find $`P`$'s coordinates in the moved camera's frame.**

```math
\mathbf{p}_{\text{cam}} = M^{-1}\mathbf{p}_{\text{world}}:\qquad
P - O' = (-10, 0, -1),\quad
x' = \mathbf{i}'\cdot(P - O') = 1,\quad
y' = \mathbf{j}'\cdot(P - O') = 0,\quad
z' = \mathbf{k}'\cdot(P - O') = -10.
```

So $`\mathbf{p}_{\text{cam}} = (1, 0, -10)`$. $`P`$ is 10 units in front of the camera ($`z' = -10`$) and 1 unit to its right. That matches the picture: standing at $`x = 10`$ facing the origin, $`P`$ at $`z = -1`$ is off to the right.

---

## Check yourself

1. A frame has origin $`(1, 2, 3)`$ and axes equal to the world axes. A point has coordinates $`(0, 0, 0)`$ in that frame. What are its world coordinates? What matrix converts world coordinates into the frame's?
2. Why is $`M^{-1}`$ of a rigid frame (rotation plus translation) easy to compute, while $`M^{-1}`$ of a general $`4 \times 4`$ matrix is not?
3. A camera sits at $`(0, 5, 0)`$ looking at the origin with up hint $`(0, 0, -1)`$. Compute $`\mathbf{i}'`$, $`\mathbf{j}'`$, $`\mathbf{k}'`$.
4. What goes wrong if you pass look-at the up hint $`(0, 1, 0)`$ for the camera in question 3?

<details><summary>Answers</summary>

1. World $`(1, 2, 3)`$. World to frame is $`T(-1, -2, -3)`$.
2. A rigid frame's inverse is $`R^\mathsf{T}`$ combined with a translation by the rotated, negated origin. It needs no division, and no determinant or cofactors. A general matrix needs Gaussian elimination or cofactors, and may not be invertible at all.
3. $`\mathbf{k}' = (0, 1, 0)`$. $`\mathbf{i}' = (0,0,-1) \times (0,1,0) = (1, 0, 0)`$. $`\mathbf{j}' = (0,1,0) \times (1,0,0) = (0, 0, -1)`$. The camera looks straight down, with world $`-z`$ at the top of the image.
4. The up hint is parallel to $`\mathbf{k}'`$, so $`\mathbf{v}_{\text{up}} \times \mathbf{k}' = \mathbf{0}`$. Normalizing a zero vector divides by zero, and the frame is undefined. `Mat4.look_at` throws an error in this case.

</details>

## Further reading

- Shirley and Marschner, *Fundamentals of Computer Graphics*, §7.5 (coordinate transformations).
- [3Blue1Brown, *Change of basis*](https://www.3blue1brown.com/lessons/change-of-basis).
