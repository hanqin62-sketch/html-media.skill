# Single-scene layout editor

[中文](editor.zh-CN.md)

Let the user arrange declared elements before exporting a still or video. A persistent topology with messages travelling along its lines is one scene; do not split it into pages for each animation step. This version edits one HTML scene and has no playback or timeline controls.

## Run and edit

```sh
node SKILL_DIR/scripts/editor.cjs --config design.json --out-dir outputs/edit-session --duration 8 --fps 24
```

Open the printed loopback URL. Keep the server running; Ctrl+C stops it. The output directory must be new. If omitted, a timestamped directory is created beside the config. In the repository, `npm run demo:editor` opens a runnable DNS layout example (open the printed URL manually).

Drag nodes, Shift-click for multiple selection, group/ungroup, or enter coordinates in the sidebar. Coordinates refer to the first selected node and move the entire selection. Arrow keys move by 1px; Shift-arrow moves by 10px. Dragging snaps to canvas center guides; Alt disables snapping. Nodes stay inside the canvas. Undo/redo retain up to 100 operations; reset is undoable. History is not persisted between sessions.

Save creates a new `layout-0001.json` revision without changing the source config. Export also saves a snapshot, then invokes the existing renderer and links the media/report. PNG, JPEG and silent MP4 are supported. `--time` selects the still/editing time (default 0); `--duration` and `--fps` set video length/rate (defaults 4 and 24). Use `--browser` or `--ffmpeg` for explicit executable paths.

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

The result uses canvas coordinates; progress is clamped to 0–1. Subtract half the moving icon size to center it. `get()` returns a copy of the current layout. Do not overwrite node wrapper geometry/transforms in `renderAt`. Choose a `--time` where editable elements are fully visible. Arbitrary animations are not automatically stripped; existing MP4s cannot be decomposed into editable nodes.

## Inspection and boundaries

Preview shows one selected time, sharing layout data and `renderAt` with export. Matching browsers/fonts improve consistency; pixel identity across environments is not promised. Exports enable strict copy/layout checks when text is declared and retain existing configured font checks. `needs-review` retains media with findings; `error` means export failed. Review final media, especially intermediate motion, occlusion and typography.

The server binds only to 127.0.0.1, validates Host and requires same-origin/token-authenticated writes. Only run inspected, trusted HTML: the scene executes scripts on the editor's origin. **This is not an untrusted HTML sandbox.** Preview permits relative assets inside the template directory and explicitly bound images/fonts; remote assets are blocked. Keep unrelated sensitive files outside the template directory. Bound image formats include PNG/JPEG/SVG/WebP/GIF; other supported relative types are listed in the server's MIME map. Templates need an explicit head element. Put relative resources within the template directory, or bind external images through config. Multi-scene editing, timelines, keyframes, resizing, curved paths and automatic visual repair are future work.
