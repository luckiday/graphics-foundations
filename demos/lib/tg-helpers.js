// Small building blocks shared by the TinyGraphics.js demos.  Each one is also a worked example:
// the shortest useful Shader, and Shapes built directly from arrays.
import {tiny} from 'tiny-graphics/common.js';

const {vec3, Matrix, Shape, Shader} = tiny;

// Fills every pixel of a shape with material.color.
export class Flat_Color_Shader extends Shader {
    vertex_glsl_code() {
        return `#version 300 es
            in vec3 position;
            uniform mat4 projection_camera_model_transform;
            void main() { gl_Position = projection_camera_model_transform * vec4(position, 1.0); }`;
    }

    fragment_glsl_code() {
        return `#version 300 es
            precision mediump float;
            uniform vec4 shape_color;
            out vec4 frag_color;
            void main() { frag_color = shape_color; }`;
    }

    update_GPU(gl, gpu, program_state, model_transform, material) {
        const PCM = program_state.projection_transform.times(program_state.view_transform).times(model_transform);
        gl.uniformMatrix4fv(gpu.projection_camera_model_transform, false, Matrix.column_major(PCM));
        gl.uniform4fv(gpu.shape_color, material.color);
    }
}

// A shape from a plain list of [x, y] or [x, y, z] points; draw it as "TRIANGLES", "LINES", "LINE_LOOP", ...
export class Point_List extends Shape {
    constructor(points) {
        super("position");
        this.arrays.position = points.map(([x, y, z = 0]) => vec3(x, y, z));
    }
}

// Drag on a canvas to orbit around a target; the wheel zooms.  Returns a function giving the eye point.
export function orbit_controls(canvas, {radius = 8, yaw = .6, pitch = .35, min = 2, max = 60} = {}) {
    let dragging = false, lx = 0, ly = 0;
    canvas.addEventListener('pointerdown', e => {
        dragging = true;
        [lx, ly] = [e.clientX, e.clientY];
        canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointerup', () => dragging = false);
    canvas.addEventListener('pointermove', e => {
        if (!dragging) return;
        yaw -= (e.clientX - lx) * .01;
        pitch = Math.max(-1.5, Math.min(1.5, pitch + (e.clientY - ly) * .01));
        [lx, ly] = [e.clientX, e.clientY];
    });
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        radius = Math.max(min, Math.min(max, radius * Math.exp(e.deltaY * .001)));
    }, {passive: false});
    return () => vec3(radius * Math.cos(pitch) * Math.sin(yaw), radius * Math.sin(pitch), radius * Math.cos(pitch) * Math.cos(yaw));
}
