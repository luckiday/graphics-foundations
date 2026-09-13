# 0 · Setup and JavaScript for graphics

**You will learn:** how to run WebGL programs locally, and the parts of modern JavaScript that graphics code relies on: modules, classes, closures, arrow functions and typed arrays.

---

## 0.1 Why the browser

Every example in these notes runs in a web browser through **WebGL 2**, a JavaScript interface to the GPU. It is a close cousin of OpenGL ES 3.0. The browser is a good place to learn graphics for three reasons:

- **Nothing to install.** Every laptop and phone already has a GPU driver and a browser.
- **The same concepts as desktop APIs.** Vertex buffers, shaders, matrices and framebuffers work the same way in OpenGL, Vulkan, Metal and Direct3D. The names differ; the pipeline does not.
- **Immediate feedback.** Edit a file, reload, look.

| Name | What it is |
|---|---|
| **OpenGL** | A cross-platform C API for GPU rendering (1992–). |
| **OpenGL ES** | The embedded-systems subset of OpenGL (phones, consoles). |
| **WebGL 1 / 2** | JavaScript bindings for OpenGL ES 2.0 / 3.0, drawing into an HTML `<canvas>`. |
| **GLSL** | The C-like language that shaders are written in. WebGL 2 uses GLSL ES 3.00. |
| **TinyGraphics.js** | A small teaching library over WebGL 2 that these notes use from chapter 2 on. |

## 0.2 Running the demos

Browsers refuse to load JavaScript modules from `file://` URLs, so the demos need a local web server. Either of these works from the repository root:

```bash
node tools/serve.mjs            # then open http://localhost:8000/demos/
python3 -m http.server 8000     # same
```

You also need an editor with a JavaScript debugger, such as VS Code or WebStorm, and the browser's developer tools. Learn these three developer-tool skills early:

1. **Console.** Errors, including shader compile errors, appear here. `console.log` any matrix you doubt.
2. **Sources and breakpoints.** Pause inside `display()` and inspect every variable.
3. **Workspaces / local overrides.** Edit files directly in the browser and save them to disk.

## 0.3 The JavaScript you need

Graphics code uses a small, specific subset of the language.

### Variables: `const` and `let`

```js
const PI_OVER_2 = Math.PI / 2;   // cannot be reassigned
let angle = 0;                   // can be reassigned
angle += 0.01;
```

Both are **block-scoped**. The old `var` is function-scoped and leaks out of loops, so avoid it:

```js
for (var i = 0; i < 3; i++) {}
console.log(i);    // 3 — `var i` is still alive here
for (let j = 0; j < 3; j++) {}
console.log(j);    // ReferenceError — `let j` stayed inside the loop
```

`const` fixes the *binding*, not the value: `const m = Mat4.identity(); m[0][3] = 5;` is legal. Many graphics bugs are two names referring to the same matrix. When you need a separate value, use `.copy()`.

### Objects and classes

```js
class Planet {
    constructor(radius, orbit) {
        this.radius = radius;
        this.orbit = orbit;
    }

    position(t) {
        return [this.orbit * Math.cos(t), 0, this.orbit * Math.sin(t)];
    }
}

class Moon extends Planet {
    constructor(radius, orbit, parent) {
        super(radius, orbit);     // must call super() before using `this`
        this.parent = parent;
    }
}
```

A TinyGraphics program is built from subclasses: your scene `extends Scene`, your shapes `extend Shape`, your shaders `extend Shader`.

### Functions, arrow functions and `this`

```js
function area(r) { return Math.PI * r * r; }
const area2 = r => Math.PI * r * r;          // arrow function
const add = (a, b) => a + b;
```

Arrow functions do **not** get their own `this`; they use the `this` of the surrounding code. That makes them the right choice for callbacks inside a class:

```js
make_control_panel() {
    this.key_triggered_button("Spin", ["s"], () => this.spinning = !this.spinning);   // `this` is the scene
}
```

### Closures

A function remembers the variables in scope where it was created, even after that scope has returned:

```js
function make_counter() {
    let count = 0;
    return () => ++count;
}
const next = make_counter();
next(); next();   // 2
```

Camera controls use closures to keep a live reference to "whatever the camera matrix currently is".

### Modules

Each file is a module. It exports names, and other files import them:

```js
// shapes.js
export class Pyramid extends Shape { /* ... */ }

// main-scene.js
import {Pyramid} from './shapes.js';
```

A page loads modules with `<script type="module">`.

### Arrays and typed arrays

Ordinary arrays hold anything, and their `map`, `filter` and `reduce` methods are used constantly:

```js
const heights = [1, 4, 2];
const doubled = heights.map(h => 2 * h);        // [2, 8, 4]
```

The GPU, however, receives **typed arrays**: fixed-length, fixed-type blocks of memory.

```js
const positions = new Float32Array([0, 0, 0,   1, 0, 0,   0, 1, 0]);   // 3 vertices × 3 floats
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
```

TinyGraphics' vectors are `Float32Array` subclasses for exactly this reason.

## 0.4 How an interactive graphics program runs

Every program in these notes has the same shape:

```
setup, once:        compile shaders, upload shapes, load textures
every frame:        update time and state → set camera & lights → draw each object
on user input:      change state (the next frame shows it)
```

The browser calls your frame function about 60 times a second, via `requestAnimationFrame`. Anything expensive, such as creating a shape or compiling a shader, belongs in setup, never in the per-frame code.

---

## Check yourself

1. Why does `for (var i = 0; i < 3; i++) setTimeout(() => console.log(i))` print `3 3 3`, while the same loop with `let` prints `0 1 2`?
2. You wrote `const a = Mat4.identity(); const b = a; b[0][3] = 5;`. What is `a[0][3]`, and how do you avoid the surprise?
3. Why is `new Cube()` inside a function that runs every frame a performance bug, even though it looks harmless?

<details><summary>Answers</summary>

1. `var` creates one `i` shared by the whole function. By the time the timeouts run, the loop has finished and `i` is 3. `let` creates a fresh binding for each iteration, and each arrow function closes over its own.
2. `5`. `a` and `b` name the same matrix. Use `const b = a.copy()` when you want an independent value.
3. Creating a shape builds its vertex arrays in JavaScript and uploads them to GPU memory. Doing that 60 times a second wastes CPU time, GPU memory and bus transfers. Build it once and draw it many times.

</details>

## Further reading

- [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide): the authoritative reference.
- [MDN: WebGL tutorial](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial).
- [TinyGraphics.js docs: your first scene](https://github.com/intro-graphics/TinyGraphics.js/blob/v2/docs/01-first-scene.md).
