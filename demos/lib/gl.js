// Minimal helpers shared by the demos. Deliberately small: every demo should
// still read as plain WebGL, so nothing here hides a graphics idea the notes teach.
//
// Matrices are 4x4, stored as flat Float32Array in COLUMN-major order, which is
// what gl.uniformMatrix4fv expects. m[col*4 + row].

export const mat4 = {
  identity() {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  },

  // Build from rows as you would write them on paper.
  fromRows(r) {
    const m = new Float32Array(16);
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 4; col++) m[col * 4 + row] = r[row][col];
    return m;
  },

  toRows(m) {
    return [0, 1, 2, 3].map(row => [0, 1, 2, 3].map(col => m[col * 4 + row]));
  },

  // a * b  (apply b first, then a)
  mul(a, b) {
    const o = new Float32Array(16);
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 4; col++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[k * 4 + row] * b[col * 4 + k];
        o[col * 4 + row] = s;
      }
    return o;
  },

  // Multiply any number of matrices left to right: chain(A, B, C) = A * B * C.
  chain(...ms) {
    return ms.reduce((acc, m) => mat4.mul(acc, m));
  },

  translation(x, y, z) {
    return mat4.fromRows([[1, 0, 0, x], [0, 1, 0, y], [0, 0, 1, z], [0, 0, 0, 1]]);
  },

  scale(x, y, z) {
    return mat4.fromRows([[x, 0, 0, 0], [0, y, 0, 0], [0, 0, z, 0], [0, 0, 0, 1]]);
  },

  // Rotation by angle (radians) about a unit axis — Rodrigues' formula.
  rotation(angle, [x, y, z]) {
    const len = Math.hypot(x, y, z);
    x /= len; y /= len; z /= len;
    const c = Math.cos(angle), s = Math.sin(angle), t = 1 - c;
    return mat4.fromRows([
      [t * x * x + c, t * x * y - s * z, t * x * z + s * y, 0],
      [t * x * y + s * z, t * y * y + c, t * y * z - s * x, 0],
      [t * x * z - s * y, t * y * z + s * x, t * z * z + c, 0],
      [0, 0, 0, 1],
    ]);
  },

  // World -> camera. Rows are the camera basis u, v, n; see notes/06.
  lookAt(eye, at, up) {
    const n = vec3.normalize(vec3.sub(eye, at));
    const u = vec3.normalize(vec3.cross(up, n));
    const v = vec3.cross(n, u);
    return mat4.fromRows([
      [u[0], u[1], u[2], -vec3.dot(u, eye)],
      [v[0], v[1], v[2], -vec3.dot(v, eye)],
      [n[0], n[1], n[2], -vec3.dot(n, eye)],
      [0, 0, 0, 1],
    ]);
  },

  // near/far are positive distances in front of the camera (OpenGL convention).
  orthographic(l, r, b, t, n, f) {
    return mat4.fromRows([
      [2 / (r - l), 0, 0, -(r + l) / (r - l)],
      [0, 2 / (t - b), 0, -(t + b) / (t - b)],
      [0, 0, -2 / (f - n), -(f + n) / (f - n)],
      [0, 0, 0, 1],
    ]);
  },

  frustum(l, r, b, t, n, f) {
    return mat4.fromRows([
      [2 * n / (r - l), 0, (r + l) / (r - l), 0],
      [0, 2 * n / (t - b), (t + b) / (t - b), 0],
      [0, 0, -(f + n) / (f - n), -2 * f * n / (f - n)],
      [0, 0, -1, 0],
    ]);
  },

  perspective(fovy, aspect, n, f) {
    const t = n * Math.tan(fovy / 2), r = t * aspect;
    return mat4.frustum(-r, r, -t, t, n, f);
  },

  // Inverse-transpose of the upper 3x3, returned as a mat3 (column-major) — the
  // matrix that transforms normals correctly under non-uniform scale.
  normalMatrix(m) {
    const a = m[0], b = m[4], c = m[8];
    const d = m[1], e = m[5], f = m[9];
    const g = m[2], h = m[6], i = m[10];
    const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
    const det = a * A + b * B + c * C;
    // cofactor matrix / det == inverse-transpose
    const rows = [
      [A, B, C],
      [-(b * i - c * h), a * i - c * g, -(a * h - b * g)],
      [b * f - c * e, -(a * f - c * d), a * e - b * d],
    ];
    const o = new Float32Array(9);
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 3; col++) o[col * 3 + row] = rows[row][col] / det;
    return o;
  },
};

export const vec3 = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  normalize(a) {
    const l = Math.hypot(a[0], a[1], a[2]);
    return [a[0] / l, a[1] / l, a[2] / l];
  },
};

// ---------------------------------------------------------------------------
// WebGL plumbing

export function getContext(canvas) {
  const gl = canvas.getContext('webgl2', { antialias: true });
  if (!gl) {
    document.body.insertAdjacentHTML('afterbegin',
      '<p style="color:#b00">This demo needs WebGL 2, which this browser did not provide.</p>');
    throw new Error('WebGL 2 unavailable');
  }
  return gl;
}

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error((type === gl.VERTEX_SHADER ? 'vertex' : 'fragment') +
      ' shader failed to compile:\n' + gl.getShaderInfoLog(s));
  return s;
}

export function createProgram(gl, vsSource, fsSource) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vsSource));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fsSource));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    throw new Error('program failed to link:\n' + gl.getProgramInfoLog(p));
  // Cache uniform locations by name for convenience.
  const uniforms = {};
  const count = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(p, i);
    uniforms[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, info.name);
  }
  return { program: p, uniforms };
}

// Upload a mesh { positions, normals?, uvs?, indices? } into a VAO bound to
// attribute locations 0 (position), 1 (normal), 2 (uv).
export function createMesh(gl, mesh) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const attrib = (loc, data, size) => {
    if (!data) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
  };
  attrib(0, mesh.positions, 3);
  attrib(1, mesh.normals, 3);
  attrib(2, mesh.uvs, 2);
  let count = mesh.positions.length / 3, indexed = false;
  if (mesh.indices) {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(mesh.indices), gl.STATIC_DRAW);
    count = mesh.indices.length;
    indexed = true;
  }
  gl.bindVertexArray(null);
  return {
    draw(mode = gl.TRIANGLES) {
      gl.bindVertexArray(vao);
      if (indexed) gl.drawElements(mode, count, gl.UNSIGNED_INT, 0);
      else gl.drawArrays(mode, 0, count);
    },
  };
}

// Match the drawing buffer to the element's CSS size (times devicePixelRatio).
export function resize(gl) {
  const c = gl.canvas, dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr);
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  gl.viewport(0, 0, w, h);
  return w / h;
}

// ---------------------------------------------------------------------------
// Geometry. Every shape is built from the same few ideas as notes/03.

// A cube with FLAT normals: 24 vertices, because the 8 corners are each shared
// by three faces that need three different normals.
export function cube() {
  const faces = [
    [[1, 0, 0], [0, 0, -1], [0, 1, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 0, 0], [0, 0, -1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
  ];
  const positions = [], normals = [], uvs = [], indices = [];
  for (const [n, s, t] of faces) {
    const base = positions.length / 3;
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      positions.push(n[0] + a * s[0] + b * t[0], n[1] + a * s[1] + b * t[1], n[2] + a * s[2] + b * t[2]);
      normals.push(...n);
      uvs.push((a + 1) / 2, (b + 1) / 2);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return { positions, normals, uvs, indices };
}

// A UV sphere. smooth=true shares vertices and uses the analytic normal (the
// position itself); smooth=false duplicates vertices per triangle and uses the
// face normal, which is what "flat shading" requires.
export function sphere(slices = 32, stacks = 16, smooth = true) {
  const grid = [];
  for (let i = 0; i <= stacks; i++) {
    const phi = Math.PI * i / stacks;
    for (let j = 0; j <= slices; j++) {
      const theta = 2 * Math.PI * j / slices;
      grid.push([Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta), j / slices, 1 - i / stacks]);
    }
  }
  const tris = [];
  const at = (i, j) => i * (slices + 1) + j;
  for (let i = 0; i < stacks; i++)
    for (let j = 0; j < slices; j++) {
      const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
      if (i !== 0) tris.push([a, d, b]);
      if (i !== stacks - 1) tris.push([d, c, b]);
    }
  if (smooth) {
    return {
      positions: grid.flatMap(p => p.slice(0, 3)),
      normals: grid.flatMap(p => p.slice(0, 3)),
      uvs: grid.flatMap(p => p.slice(3)),
      indices: tris.flat(),
    };
  }
  const positions = [], normals = [], uvs = [];
  for (const [a, b, c] of tris) {
    const [pa, pb, pc] = [grid[a], grid[b], grid[c]];
    const n = vec3.normalize(vec3.cross(vec3.sub(pb, pa), vec3.sub(pc, pa)));
    for (const p of [pa, pb, pc]) { positions.push(p[0], p[1], p[2]); normals.push(...n); uvs.push(p[3], p[4]); }
  }
  return { positions, normals, uvs };
}

export function plane(size = 1, repeat = 1) {
  const s = size;
  return {
    positions: [-s, 0, -s, s, 0, -s, s, 0, s, -s, 0, s],
    normals: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    uvs: [0, 0, repeat, 0, repeat, repeat, 0, repeat],
    indices: [0, 2, 1, 0, 3, 2],
  };
}

// ---------------------------------------------------------------------------
// Drag to orbit, wheel to zoom. Returns a function that yields the eye point.

export function orbit(canvas, { radius = 8, yaw = 0.6, pitch = 0.35, min = 2, max = 40 } = {}) {
  let dragging = false, lx = 0, ly = 0;
  canvas.addEventListener('pointerdown', e => { dragging = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointermove', e => {
    if (!dragging) return;
    yaw -= (e.clientX - lx) * 0.01;
    pitch = Math.max(-1.5, Math.min(1.5, pitch + (e.clientY - ly) * 0.01));
    lx = e.clientX; ly = e.clientY;
  });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    radius = Math.max(min, Math.min(max, radius * Math.exp(e.deltaY * 0.001)));
  }, { passive: false });
  return () => [
    radius * Math.cos(pitch) * Math.sin(yaw),
    radius * Math.sin(pitch),
    radius * Math.cos(pitch) * Math.cos(yaw),
  ];
}

// Bind <input type=range data-key> controls to a params object, showing values.
export function bindControls(root, params, onChange = () => {}) {
  for (const input of root.querySelectorAll('[data-key]')) {
    const key = input.dataset.key;
    const out = root.querySelector(`[data-out="${key}"]`);
    const read = () => {
      params[key] = input.type === 'checkbox' ? input.checked
        : input.tagName === 'SELECT' ? input.value : parseFloat(input.value);
      if (out) out.textContent = typeof params[key] === 'number' ? params[key].toFixed(2) : params[key];
      onChange(key);
    };
    input.addEventListener('input', read);
    read();
  }
}
