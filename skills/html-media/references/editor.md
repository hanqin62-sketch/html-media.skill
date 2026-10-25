# Layout editor

[中文](editor.zh-CN.md)

Use this workflow when the user wants to arrange elements or the [skill's layout-review rule](../SKILL.md) applies. A persistent topology with messages travelling along its lines is one scene; do not split it into pages for each animation step. Both single-page and multi-scene projects support playback controls. For scene lists, complete-layout/step views and local animation time, read [timeline.md](timeline.md).

## Present and accept a layout

When review is required, prepare and show an actual layout preview with the major elements, labels, connections and color relationships. Present completed arrangements rather than an arbitrary last frame; for multiple scenes show each scene, with step views when replacement content overlaps. Use `renderLayout` or suitable static layout states so animation entrances do not hide reviewable content.

For editable node compositions such as topologies, declare `layout` (or `timeline`) and provide the running editor URL and brief instructions. Users may drag elements or describe changes; they need not operate the editor themselves. If the editor cannot run or be reached, explain that limitation and show static previews for text-directed changes, retaining the required acceptance before full video rendering.

Identify the shown revision as a draft and ask whether to use it or adjust it. Wait for acceptance of that revision, such as “use this layout, export”, or an explicit waiver of review. Opening a URL, saving a config, silence, progress narration and internal validation do not establish acceptance. If the human user chooses MP4 and clicks export, that action can authorize export of that revision; the agent must not click it on the user's behalf to manufacture acceptance. The current tools do not enforce this conversational requirement.

After acceptance, continue without repeated confirmation unless the agent materially changes the composition. Preserve the accepted arrangement through technical adjustments and minor corrections. Execute specific user-directed changes under their stated authorization; seek another review only for remaining assistant-chosen material changes. While waiting, preparation, static layout renders and editor playback can continue; defer complete-video rendering and encoding until acceptance or waiver.

## Run and edit

```sh
node SKILL_DIR/scripts/editor.cjs --config design.json --out-dir outputs/edit-session --duration 8 --fps 24
```

Open the printed loopback URL. Keep the server running; Ctrl+C stops it. The output directory must be new. If omitted, a timestamped directory is created beside the config. In the repository, `npm run demo:editor` opens a runnable DNS layout example (open the printed URL manually).

Drag nodes, Shift-click for multiple selection, group/ungroup, or enter coordinates in the sidebar. Coordinates refer to the first selected node and move the entire selection. Arrow keys move by 1px; Shift-arrow moves by 10px. Dragging snaps to canvas center guides; Alt disables snapping. Nodes stay inside the canvas. Undo/redo retain up to 100 operations; reset is undoable. History is not persisted between sessions.

Save creates a new `layout-0001.json` revision without changing the source config. Export also saves a snapshot, then invokes the existing renderer and links the media/report. PNG/JPEG use the selected playback time; MP4 uses the entire video duration. For legacy layouts, `--time` selects the initial/reference time (default 0), and `--duration`/`--fps` set video length/rate (defaults 4 and 24). Timeline projects supply their own duration and complete-layout reference times. Use `--browser` or `--ffmpeg` for explicit executable paths.

Saved configs work with `render.cjs --config`, batch jobs, or a later editor session. Template/image/font paths are rebased relative to each saved config. **The output folder is not a standalone asset bundle**: keep the original project and relative locations when moving or sharing it.

## Layout contract

Add `layout` to an existing config. See the complete [network config](../assets/examples/network.json) and [template](../assets/templates/network.html).

```json
{
  "version": 1,
  "template": "scene.html",
  "layout": {
    "version": 1, "root": "#scene", "width": 1280, "height": 720,
    "nodes": [
      { "id": "a", "selector": "#a", "label": "Computer", "x": 100, "y": 200, "width": 180, "height": 120 },
      { "id": "b", "selector": "#b", "label": "Server", "x": 600, "y": 200, "width": 180, "height": 120 }
    ],
    "connections": [
      { "id": "request", "selector": "#request", "from": "a", "to": "b", "fromAnchor": "right", "toAnchor": "left" }
    ]
  }
}
```

- Root: one HTML element directly inside body, canvas dimensions 1–8192px. Declare 1–200 nodes and up to 500 connections; selectors must match exactly one element.
- Nodes: direct HTML children of root, with icon/text inside the same wrapper. The runtime controls wrapper position and dimensions. Optional matching `group` identifiers move nodes together in the editor without reparenting HTML.
- Connections: direct SVG `<line>` children of an SVG directly inside root. Empty `connections: []` is valid. Anchors are center/top/right/bottom/left (center by default). Style strokes/markers in the template.
- No transforms, individual translate/rotate/scale, or zoom on root, body, html, node wrappers, connection SVGs or lines. Animate node descendants instead. Root margin/border/padding and node margins are reset for consistent coordinates.
- IDs/groups start with a lowercase letter and contain lowercase letters, digits, underscores or hyphens, up to 64 characters. Nodes must fit inside the canvas. Editing changes only positions/groups, not content, dimensions, selectors or wiring.
- Renderer width/height default to the layout canvas; explicit values must match. Use `--scale` for higher resolution. Batch defaults must not override the canvas with conflicting dimensions.

## Motion follows layout

After applying content and before calling `renderAt`, both preview and export install `window.htmlMediaLayout`. Derive moving element coordinates from the shared connection API:

```js
window.renderAt = seconds => {
  const point = window.htmlMediaLayout.pointOnConnection('request', (seconds % 2) / 2);
  message.style.transform = `translate(${point.x}px, ${point.y}px)`;
};
```

The result uses canvas coordinates; progress is clamped to 0–1. Subtract half the moving icon size to center it. `get()` returns a copy of the current layout. Do not overwrite node wrapper geometry/transforms in `renderAt`. Legacy layouts without a `renderLayout` hook use their reference `--time` in layout mode; choose a time where elements are visible. A layout hook can explicitly present completed states. Arbitrary animations are not automatically stripped; existing MP4s cannot be decomposed into editable nodes.

## Inspection and boundaries

Playback shares layout data and `renderAt` with export. Layout/step views are editing aids, not a promise that every element is visible at every video time. Matching browsers/fonts improve consistency; pixel identity across environments is not promised. Exports enable strict copy/layout checks when text is declared and retain existing configured font checks. `needs-review` retains media with findings; `error` means export failed. Review final media, especially intermediate motion, occlusion and typography.

The server binds only to 127.0.0.1, validates Host and requires same-origin/token-authenticated writes. Only run inspected, trusted HTML: the scene executes scripts on the editor's origin. **This is not an untrusted HTML sandbox.** Preview permits relative assets inside the template directory and explicitly bound images/fonts; remote assets are blocked. Keep unrelated sensitive files outside the template directory. Bound image formats include PNG/JPEG/SVG/WebP/GIF; other supported relative types are listed in the server's MIME map. Templates need an explicit head element. Put relative resources within the template directory, or bind external images through config. Keyframe editing, resizing, curved paths, scene reordering and automatic visual repair remain future work.
