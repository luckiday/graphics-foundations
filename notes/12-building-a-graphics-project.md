# 12 · Building an interactive graphics project

**You will learn:** how to plan a small real-time graphics project; how to organize time-based and interactive scenes; the composition and color principles that make a scene look good; and how to implement common features: particles, skyboxes, text, picking and imported models.

---

## 12.1 What makes a project stand out

A project that only puts textured shapes on screen and moves them with sine waves is competent but forgettable. Memorable projects usually do at least one of these well:

- **Technique.** Simulate something hard: water, smoke, cloth, crowds, or physically plausible motion with collisions. Implement an effect beyond the basics: shadows, reflections, particles, or procedural terrain.
- **Interaction.** A game mechanic or a control scheme that makes people want to keep playing.
- **Look.** Deliberate composition, a coherent color palette and consistent lighting. An art direction chosen up front beats photorealism reached halfway.

Pick one of these to excel at, and keep the rest simple.

**Advanced features** are techniques beyond transformations, lighting and texturing. For example:

| Feature | Chapter |
|---|---|
| collision detection and physics-based motion | 9 |
| shadows (shadow mapping) | 10 |
| mirrors, render-to-texture, post-processing | 10 |
| bump / normal / parallax mapping | 8 |
| ray tracing or ray casting | 11 |
| particle systems | §12.4 |
| scene graphs with many articulated parts | 4 |
| mouse picking | §12.4 |
| splines and procedural geometry (terrain, surfaces of revolution) | 3 |

Basic lighting, matrix transformations and texturing on their own are expected, not advanced.

## 12.2 Plan it

A one-page proposal answers:

1. **Theme or story.** What is the experience in one sentence?
2. **Course topics used, and how.** Transformations, cameras, lighting, textures…
3. **Interactivity.** What does the user control?
4. **Advanced features.** Which ones, and which is the stretch goal?
5. **Team and roles**, with a rough schedule and a minimal version you are sure you can finish.

Build the **minimal playable version first**: gray boxes, fixed camera, core interaction. Then add look and features in order of impact, keeping it runnable at every step. Commit often.

## 12.3 Organizing time and state

### Freeze and inspect

Pausing animation time, while the camera and debugger keep working, is the single most useful debugging tool. In TinyGraphics, `program_state.animate = false` stops `animation_time`. Bind it to a key, or type it into the console while paused at a breakpoint.

### Sequencing timed events

For a scripted animation (a short film, an intro sequence), give each part its own clock, offset from global time:

```js
const t = program_state.animation_time / 1000;
const falling_start = 5, falling_length = 7;
const t_fall = t - falling_start;                  // time since the falling scene began

if (t_fall >= 0 && t_fall < falling_length) {
    const progress = t_fall / falling_length;      // 0 → 1 over the scene
    draw_falling_scene(progress);
}
```

A negative local time means the scene has not started. A local time past the scene's length means it has finished. Keep scene lengths in one table so the whole timeline can be retimed in one place.

### Interactive programs: finite-state machines

When input decides what happens next, as in a game, make the program a **finite-state machine**:

```js
const State = {TITLE: 0, PLAYING: 1, GAME_OVER: 2};

display(context, program_state) {
    const now = program_state.animation_time / 1000;
    switch (this.state) {
        case State.TITLE:     this.draw_title(now - this.state_started); break;
        case State.PLAYING:   this.update_and_draw_game(now - this.state_started); break;
        case State.GAME_OVER: this.draw_game_over(now - this.state_started); break;
    }
}

change_state(next, now) {                           // called from key handlers or game logic
    this.state = next;
    this.state_started = now;                       // every state gets its own local clock
}
```

Each state owns its update and draw logic and knows how long it has been active. Transitions happen only through `change_state`.

### Frame-rate independence

Move things by **time**, not by frame count: `position += velocity * dt`. A program written as `position += 0.1` per frame runs twice as fast on a 120 Hz display. For physics, use the fixed-time-step loop from chapter 9.

## 12.4 Common features

**Particle systems.** Many small, short-lived sprites (fire, smoke, sparks, rain, magic), each with a position, velocity, age and lifetime. Each frame: spawn new particles, integrate their motion (gravity, drag, wind), fade them by age, and delete dead ones. Render them as camera-facing quads with additive or premultiplied blending (chapter 10). For tens of thousands of particles, keep the state in typed arrays and upload it in one buffer, or move the simulation into a shader. For examples and inspiration, see [Shadertoy](https://www.shadertoy.com/).

**Skybox.** A large cube, or a cube map sampled by view direction, drawn around the camera with the **translation removed** from the view matrix. The sky then turns with the camera but never gets closer. Draw it first with depth writing off, or last at maximum depth.

**Text and heads-up displays.** There are three common approaches:
- An HTML element positioned over the canvas: simplest, crisp, and styled with CSS.
- Text drawn into a 2D canvas that is then uploaded as a texture.
- A font atlas texture with one quad per character, like TinyGraphics' `Text_Demo`.

A score display that stays fixed on screen should skip the view and projection matrices, or use an orthographic projection matched to the canvas.

**Mouse picking.** Convert the mouse position to NDC:

```math
x_{\text{ndc}} = \frac{2\,x_{\text{mouse}}}{\text{width}} - 1, \qquad y_{\text{ndc}} = 1 - \frac{2\,y_{\text{mouse}}}{\text{height}}.
```

Then unproject the points $`(x, y, -1)`$ and $`(x, y, 1)`$ with $`(PV)^{-1}`$ to get a world-space ray, and intersect it with object bounding volumes (chapters 9 and 11). The alternative is to render every object in a unique flat color to an off-screen target and read back the pixel under the mouse.

**Imported models.** Model complex objects in a tool such as [Blender](https://www.blender.org/) and export them as `.obj` or glTF. TinyGraphics' `Obj_File_Demo` shows a minimal `.obj` loader. Normalize the model's scale and center on import, and check the normals: some exporters flip them. **Texture baking** in Blender renders expensive lighting, such as ambient occlusion, soft shadows or bounce light, into textures that a simple real-time shader can display.

## 12.5 Making it look good

### Composition

![Rule of thirds](../figures/rule-of-thirds.svg)

- **Rule of thirds.** Divide the frame into thirds. Put the subject on an intersection and the horizon on a line, not dead center.
- **Symmetry and pattern** read as calm and deliberate. Break a pattern once to draw the eye there.
- **Simplify.** Remove whatever does not support the subject. Empty space is a choice.
- **Depth cues.** Overlap, atmospheric fog (fade distant objects toward the sky color), and lighting that separates foreground from background.

### Color

- Choose a **palette** first, with 3–5 colors, using a scheme:
  - *analogous*: neighbours on the color wheel; calm.
  - *complementary*: opposites; high contrast.
  - *monochromatic*: one hue at different lightness.
  - *triadic*: three hues evenly spaced around the wheel.
- Use **one accent color** for what matters, such as the player, a goal or a danger.
- Warm light with cool shadows, or the reverse, reads as natural and adds depth.
- Tools: [Adobe Color](https://color.adobe.com/create), [Coolors](https://coolors.co/).

### Lighting

Three lights go a long way: a **key** light that defines the shape, a dimmer **fill** light on the other side that lifts the shadows, and a **rim** light from behind that separates the subject from the background.

---

## Check yourself

1. Your animation runs noticeably faster on a friend's 144 Hz laptop. What is the bug and the fix?
2. Design the state machine for a simple game: a title screen, a level you can win or lose, and a results screen with a restart key. Which transitions exist?
3. Your skybox gets closer as you walk toward it. What is wrong?
4. A particle effect of 50,000 sparks drops the frame rate to 5 fps. Name two changes that would help.

<details><summary>Answers</summary>

1. Motion is advanced by a fixed amount per frame. Scale every change by the elapsed time $`\Delta t`$, or use a fixed-time-step simulation loop.
2. The states are TITLE, PLAYING, WON, LOST and RESULTS. The transitions: TITLE → PLAYING on the start key; PLAYING → WON or LOST on the game's condition; WON or LOST → RESULTS after a delay; RESULTS → TITLE, or straight to PLAYING, on the restart key.
3. The skybox is drawn with the full view matrix, including its translation. Remove the translation (use only the rotation part) so the sky stays infinitely far away.
4. Any two of these:
   - Draw all particles in one draw call from a single buffer, instead of one call per particle.
   - Keep particle state in typed arrays and upload it with one `bufferSubData`.
   - Simulate on the GPU.
   - Cap the particle lifetime and count.
   - Use point sprites or instancing.

</details>

## Further reading

- [WebGL2 Fundamentals: text](https://webgl2fundamentals.org/webgl/lessons/webgl-text-html.html), [skybox](https://webgl2fundamentals.org/webgl/lessons/webgl-skybox.html), [picking](https://webgl2fundamentals.org/webgl/lessons/webgl-picking.html).
- Bruce Block, *The Visual Story*: composition, space and color for moving images.
- [TinyGraphics.js examples](https://github.com/intro-graphics/TinyGraphics.js/tree/v2/examples): collisions, inertia, text, obj files, render to texture.
